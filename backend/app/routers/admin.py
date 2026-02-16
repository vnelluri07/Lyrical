from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db, async_session
from app.models import Song, Lyric, Challenge, BulkImportJob
from app.middleware.admin_auth import require_admin
from app.schemas import (
    SongSearchResponse, SongImportRequest, SongImportResponse,
    SongOut, LyricLineOut,
    ChallengeCreate, ChallengeUpdate, ChallengeOut,
    BulkImportRequest, BulkImportJobOut,
)
from app.services import ytmusic_service
from app.services import bulk_import_service
import asyncio

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# --- Songs ---

@router.post("/songs/search", response_model=SongSearchResponse)
async def search_songs(q: str = Query(..., min_length=1)):
    return SongSearchResponse(results=ytmusic_service.search_songs(q))


@router.post("/songs/import", response_model=SongImportResponse)
async def import_song(req: SongImportRequest, db: AsyncSession = Depends(get_db)):
    try:
        song, lyric_count = await ytmusic_service.import_song(req.video_id, db, language_override=req.language)
    except ValueError:
        raise HTTPException(409, "Song already imported")
    except LookupError as e:
        raise HTTPException(404, str(e))
    return SongImportResponse(id=song.id, title=song.title, artist=song.artist, lyric_count=lyric_count)


@router.get("/songs", response_model=list[SongOut])
async def list_songs(language: str | None = Query(None), db: AsyncSession = Depends(get_db)):
    q = select(Song).order_by(Song.created_at.desc())
    if language:
        q = q.where(Song.language == language.lower())
    result = await db.execute(q)
    return [SongOut(id=s.id, title=s.title, artist=s.artist, album=s.album, thumbnail_url=s.thumbnail_url, language=s.language)
            for s in result.scalars()]


@router.get("/songs/{song_id}/lyrics", response_model=list[LyricLineOut])
async def get_song_lyrics(song_id: int, db: AsyncSession = Depends(get_db)):
    song = await db.get(Song, song_id)
    if not song:
        raise HTTPException(404, "Song not found")
    result = await db.execute(select(Lyric).where(Lyric.song_id == song_id).order_by(Lyric.line_number))
    return [LyricLineOut(line_number=l.line_number, text=l.text) for l in result.scalars()]


@router.put("/songs/{song_id}/language")
async def set_language(song_id: int, language: str = Query(..., min_length=2, max_length=10), db: AsyncSession = Depends(get_db)):
    song = await db.get(Song, song_id)
    if not song:
        raise HTTPException(404, "Song not found")
    song.language = language.lower()
    await db.commit()
    return {"ok": True, "language": song.language}


@router.delete("/songs/{song_id}")
async def delete_song(song_id: int, db: AsyncSession = Depends(get_db)):
    song = await db.get(Song, song_id)
    if not song:
        raise HTTPException(404, "Song not found")
    await db.delete(song)
    await db.commit()
    return {"ok": True}


# --- Challenges ---

@router.post("/challenges", response_model=ChallengeOut)
async def create_challenge(req: ChallengeCreate, db: AsyncSession = Depends(get_db)):
    song = await db.get(Song, req.song_id)
    if not song:
        raise HTTPException(404, "Song not found")
    if req.start_line > req.end_line:
        raise HTTPException(422, "start_line must be <= end_line")

    # Verify lines exist
    result = await db.execute(
        select(func.count()).select_from(Lyric)
        .where(Lyric.song_id == req.song_id, Lyric.line_number.between(req.start_line, req.end_line))
    )
    if result.scalar() == 0:
        raise HTTPException(422, "Selected lines do not exist for this song")

    # Check for duplicate
    dup = await db.execute(
        select(Challenge).where(
            Challenge.song_id == req.song_id,
            Challenge.start_line == req.start_line,
            Challenge.end_line == req.end_line,
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(409, "Challenge with these lines already exists")

    challenge = Challenge(song_id=req.song_id, start_line=req.start_line, end_line=req.end_line)
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)
    return await _challenge_out(challenge, db)


@router.get("/challenges", response_model=list[ChallengeOut])
async def list_challenges(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Challenge).order_by(Challenge.created_at.desc()))
    return [await _challenge_out(c, db) for c in result.scalars()]


@router.put("/challenges/{challenge_id}", response_model=ChallengeOut)
async def update_challenge(challenge_id: int, req: ChallengeUpdate, db: AsyncSession = Depends(get_db)):
    challenge = await db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(404, "Challenge not found")

    if req.start_line is not None:
        challenge.start_line = req.start_line
    if req.end_line is not None:
        challenge.end_line = req.end_line
    if req.is_active is not None:
        challenge.is_active = req.is_active

    if challenge.start_line > challenge.end_line:
        raise HTTPException(422, "start_line must be <= end_line")

    await db.commit()
    await db.refresh(challenge)
    return await _challenge_out(challenge, db)


@router.delete("/challenges/{challenge_id}")
async def delete_challenge(challenge_id: int, db: AsyncSession = Depends(get_db)):
    challenge = await db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(404, "Challenge not found")
    await db.delete(challenge)
    await db.commit()
    return {"ok": True}


async def _challenge_out(challenge: Challenge, db: AsyncSession) -> ChallengeOut:
    song = await db.get(Song, challenge.song_id)
    result = await db.execute(
        select(Lyric.text).where(
            Lyric.song_id == challenge.song_id,
            Lyric.line_number.between(challenge.start_line, challenge.end_line),
        ).order_by(Lyric.line_number)
    )
    lines = [r[0] for r in result]
    preview = " / ".join(lines)[:120]
    return ChallengeOut(
        id=challenge.id, song_id=challenge.song_id,
        song_title=song.title, song_artist=song.artist,
        start_line=challenge.start_line, end_line=challenge.end_line,
        is_active=challenge.is_active, preview=preview,
    )


# --- Bulk Import ---

@router.post("/bulk-import", response_model=BulkImportJobOut)
async def start_bulk_import(req: BulkImportRequest, db: AsyncSession = Depends(get_db)):
    job = BulkImportJob(
        source=req.source, language=req.language, requested_count=req.count,
        challenges_per_song=req.challenges_per_song,
        year_from=req.year_from, year_to=req.year_to, search_query=req.search_query,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    # Fire and forget background task
    asyncio.create_task(bulk_import_service.run_bulk_import(job.id, async_session))
    return _job_out(job)


@router.get("/bulk-import/jobs", response_model=list[BulkImportJobOut])
async def list_bulk_imports(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BulkImportJob).order_by(BulkImportJob.created_at.desc()).limit(20))
    return [_job_out(j) for j in result.scalars()]


@router.get("/bulk-import/jobs/{job_id}", response_model=BulkImportJobOut)
async def get_bulk_import(job_id: int, db: AsyncSession = Depends(get_db)):
    job = await db.get(BulkImportJob, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return _job_out(job)


def _job_out(job: BulkImportJob) -> BulkImportJobOut:
    return BulkImportJobOut(
        id=job.id, source=job.source, language=job.language,
        requested_count=job.requested_count, challenges_per_song=job.challenges_per_song,
        year_from=job.year_from, year_to=job.year_to, search_query=job.search_query,
        status=job.status, total_found=job.total_found, imported=job.imported,
        skipped=job.skipped, failed=job.failed, challenges_created=job.challenges_created,
        log=job.log, created_at=str(job.created_at),
    )
