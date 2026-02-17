from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, case, literal
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.models import Song, Lyric, Challenge, Score, User
from app.schemas import GameChallenge, GuessRequest, GuessResponse, HintResponse, RevealResponse
from app.services.game_service import check_guess, platform_urls

router = APIRouter(prefix="/game", tags=["game"])


@router.get("/languages")
async def get_languages(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Song.language).where(Song.language.isnot(None)).distinct().order_by(Song.language)
    )
    return [r[0] for r in result]


@router.get("/challenge", response_model=GameChallenge)
async def get_challenge(language: str | None = Query(None), exclude: str | None = Query(None), db: AsyncSession = Depends(get_db)):
    q = select(Challenge).join(Song, Challenge.song_id == Song.id).where(Challenge.is_active == True)
    if language:
        q = q.where(Song.language == language.lower())
    if exclude:
        try:
            ids = [int(x) for x in exclude.split(",") if x.strip()]
            if ids:
                q = q.where(Challenge.id.notin_(ids))
        except ValueError:
            pass
    # Weight newer songs higher: year 2025+ → weight 5, 2022-2024 → 3, older/unknown → 1
    weight = case(
        (Song.year >= 2025, literal(5)),
        (Song.year >= 2022, literal(3)),
        else_=literal(1),
    )
    result = await db.execute(q.order_by((func.random() * weight).desc()).limit(1))
    challenge = result.scalar_one_or_none()
    if not challenge:
        raise HTTPException(404, "No active challenges available")

    lines_result = await db.execute(
        select(Lyric.text).where(
            Lyric.song_id == challenge.song_id,
            Lyric.line_number.between(challenge.start_line, challenge.end_line),
        ).order_by(Lyric.line_number)
    )
    return GameChallenge(challenge_id=challenge.id, lines=[r[0] for r in lines_result])


@router.post("/guess", response_model=GuessResponse)
async def guess_song(req: GuessRequest, db: AsyncSession = Depends(get_db)):
    challenge = await db.get(Challenge, req.challenge_id)
    if not challenge:
        raise HTTPException(404, "Challenge not found")

    song = await db.get(Song, challenge.song_id)
    result = check_guess(req.guess, song.title)

    # Track score if user provided
    if req.user_id and result["correct"]:
        user = await db.get(User, req.user_id)
        if user:
            existing = await db.execute(
                select(Score).where(Score.user_id == req.user_id, Score.challenge_id == req.challenge_id, Score.guessed_correct == True)
            )
            if not existing.first():
                used_hint = await _has_hint(req.user_id, req.challenge_id, db)
                points = 5 if used_hint else 10
                db.add(Score(user_id=req.user_id, challenge_id=req.challenge_id, guessed_correct=True, used_hint=used_hint, points=points))
                await db.commit()

    return GuessResponse(**result)


@router.get("/hint/{challenge_id}", response_model=HintResponse)
async def get_hint(challenge_id: int, user_id: int | None = Query(None), db: AsyncSession = Depends(get_db)):
    challenge = await db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(404, "Challenge not found")

    # Record hint usage
    if user_id:
        user = await db.get(User, user_id)
        if user:
            existing = await db.execute(
                select(Score).where(Score.user_id == user_id, Score.challenge_id == challenge_id)
            )
            if not existing.first():
                db.add(Score(user_id=user_id, challenge_id=challenge_id, used_hint=True))
                await db.commit()

    before_result = await db.execute(
        select(Lyric.text).where(Lyric.song_id == challenge.song_id, Lyric.line_number == challenge.start_line - 1)
    )
    after_result = await db.execute(
        select(Lyric.text).where(Lyric.song_id == challenge.song_id, Lyric.line_number == challenge.end_line + 1)
    )
    return HintResponse(challenge_id=challenge_id, before=[r[0] for r in before_result], after=[r[0] for r in after_result])


@router.get("/reveal/{challenge_id}", response_model=RevealResponse)
async def reveal_song(challenge_id: int, user_id: int | None = Query(None), db: AsyncSession = Depends(get_db)):
    challenge = await db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(404, "Challenge not found")

    # Record reveal (0 points)
    if user_id:
        user = await db.get(User, user_id)
        if user:
            existing = await db.execute(
                select(Score).where(Score.user_id == user_id, Score.challenge_id == challenge_id)
            )
            if not existing.first():
                db.add(Score(user_id=user_id, challenge_id=challenge_id, revealed=True, points=0))
                await db.commit()

    song = await db.get(Song, challenge.song_id)
    return RevealResponse(
        title=song.title, artist=song.artist, album=song.album,
        thumbnail_url=song.thumbnail_url,
        platform_links=platform_urls(song.artist, song.title),
    )


async def _has_hint(user_id: int, challenge_id: int, db: AsyncSession) -> bool:
    result = await db.execute(
        select(Score).where(Score.user_id == user_id, Score.challenge_id == challenge_id, Score.used_hint == True)
    )
    return result.scalar_one_or_none() is not None
