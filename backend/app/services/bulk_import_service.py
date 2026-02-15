import asyncio
import random
import logging
from collections import Counter
from ytmusicapi import YTMusic
from langdetect import detect, DetectorFactory
DetectorFactory.seed = 0
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Song, Lyric, Challenge, BulkImportJob

logger = logging.getLogger(__name__)
yt = YTMusic()

# Language → search terms for discovery
LANG_QUERIES = {
    "en": ["top hits", "popular songs", "best songs", "greatest hits", "hit songs"],
    "es": ["éxitos musicales", "canciones populares", "mejores canciones", "hits latinos"],
    "hi": ["bollywood hits", "hindi songs", "best hindi songs", "bollywood popular"],
    "ko": ["kpop hits", "인기 가요", "korean popular songs", "kpop best"],
    "ja": ["jpop hits", "日本の人気曲", "japanese popular songs"],
    "pt": ["músicas populares", "hits brasileiros", "melhores músicas"],
    "fr": ["chansons populaires", "hits français", "meilleures chansons"],
    "de": ["deutsche hits", "beliebte lieder", "beste deutsche songs"],
    "it": ["canzoni italiane", "hits italiani", "musica italiana"],
    "te": ["telugu hit songs", "telugu popular songs", "telugu melody songs"],
    "ta": ["tamil hit songs", "tamil popular songs", "tamil melody hits"],
}

DEFAULT_QUERIES = ["top songs", "popular songs", "greatest hits", "best songs ever", "hit songs"]


async def discover_ytmusic(language: str | None, count: int, year_from: int | None, year_to: int | None) -> list[dict]:
    """Discover songs from YT Music via search queries."""
    queries = LANG_QUERIES.get(language, DEFAULT_QUERIES) if language else DEFAULT_QUERIES
    seen_ids = set()
    seen_titles = set()  # normalized title+artist to avoid same song from different videos
    results = []

    for year in _year_range(year_from, year_to):
        for base_q in queries:
            if len(results) >= count:
                break
            q = f"{base_q} {year}" if year else base_q
            try:
                hits = yt.search(q, filter="songs", limit=min(50, count - len(results) + 10))
            except Exception as e:
                logger.warning(f"Search failed for '{q}': {e}")
                continue
            for h in hits:
                vid = h.get("videoId")
                if not vid or vid in seen_ids:
                    continue
                seen_ids.add(vid)
                artists = ", ".join(a["name"] for a in h.get("artists", []))
                # Deduplicate by normalized title+artist
                key = (h["title"].strip().lower(), artists.strip().lower())
                if key in seen_titles:
                    continue
                seen_titles.add(key)
                thumbs = h.get("thumbnails", [])
                results.append({
                    "video_id": vid,
                    "title": h["title"],
                    "artist": artists,
                    "album": (h.get("album") or {}).get("name"),
                    "thumbnail_url": thumbs[-1]["url"] if thumbs else None,
                })
                if len(results) >= count:
                    break
            await asyncio.sleep(0.5)  # rate limit

    random.shuffle(results)
    return results[:count]


def _year_range(year_from: int | None, year_to: int | None) -> list[int | None]:
    if year_from and year_to:
        return list(range(year_from, year_to + 1))
    if year_from:
        return [year_from]
    if year_to:
        return [year_to]
    return [None]


async def import_single(video_id: str, db: AsyncSession, language_override: str | None = None) -> tuple[Song, int] | None:
    """Import one song with lyrics. Returns (song, lyric_count) or None on failure."""
    # Check duplicate by video_id
    existing = await db.execute(select(Song).where(Song.yt_video_id == video_id))
    if existing.scalar_one_or_none():
        return None  # already exists

    try:
        song_data = yt.get_song(video_id)
        details = song_data.get("videoDetails", {})
        title = details.get("title", "Unknown")
        artist = details.get("author", "Unknown")

        # Check duplicate by title+artist (same song, different video)
        dup = await db.execute(
            select(Song).where(func.lower(Song.title) == title.strip().lower(), func.lower(Song.artist) == artist.strip().lower())
        )
        if dup.scalar_one_or_none():
            return None
        thumbs = details.get("thumbnail", {}).get("thumbnails", [])

        watch = yt.get_watch_playlist(videoId=video_id)
        lyrics_browse_id = watch.get("lyrics")
        if not lyrics_browse_id:
            return None

        lyrics_data = yt.get_lyrics(lyrics_browse_id)
        if not lyrics_data or not lyrics_data.get("lyrics"):
            return None

        raw = lyrics_data["lyrics"]
        lines = [l for l in (raw.split("\n") if isinstance(raw, str) else [l.text for l in raw]) if l.strip()]
        if len(lines) < 6:
            return None  # too short for a challenge

        language = language_override
        if not language:
            language = _detect_language(lines)

        song = Song(title=title, artist=artist, yt_video_id=video_id,
                    thumbnail_url=thumbs[-1]["url"] if thumbs else None, language=language)
        db.add(song)
        await db.flush()

        for i, text in enumerate(lines):
            db.add(Lyric(song_id=song.id, line_number=i, text=text))

        await db.commit()
        await db.refresh(song)
        return song, len(lines)
    except Exception as e:
        logger.warning(f"Import failed for {video_id}: {e}")
        await db.rollback()
        return None


async def auto_create_challenge(song_id: int, db: AsyncSession, count: int = 1) -> int:
    """Pick the best non-overlapping snippets and create challenges. Returns number created."""
    result = await db.execute(
        select(Lyric).where(Lyric.song_id == song_id).order_by(Lyric.line_number)
    )
    lines = list(result.scalars())
    if len(lines) < 6:
        return 0

    margin = max(1, len(lines) // 7)
    candidates = lines[margin:-margin] if margin < len(lines) // 2 else lines
    window = min(4, len(candidates) - 1)

    # Score all windows
    scored = []
    for i in range(len(candidates) - window + 1):
        chunk = candidates[i:i + window]
        words = [w for l in chunk for w in l.text.split()]
        unique_ratio = len(set(w.lower() for w in words)) / max(len(words), 1)
        avg_len = sum(len(l.text) for l in chunk) / window
        distinct_lines = len(set(l.text.lower().strip() for l in chunk))
        if distinct_lines < 2:
            continue
        score = len(words) * unique_ratio * (avg_len / 30) * (distinct_lines / window)
        scored.append((score, chunk[0].line_number, chunk[-1].line_number))

    scored.sort(reverse=True)

    # Pick top N non-overlapping
    created = 0
    used_ranges = []
    for score, start, end in scored:
        if created >= count:
            break
        if any(not (end < us or start > ue) for us, ue in used_ranges):
            continue  # overlaps

        dup = await db.execute(
            select(Challenge).where(Challenge.song_id == song_id, Challenge.start_line == start, Challenge.end_line == end)
        )
        if dup.scalar_one_or_none():
            continue

        db.add(Challenge(song_id=song_id, start_line=start, end_line=end))
        used_ranges.append((start, end))
        created += 1

    if created:
        await db.commit()
    return created


async def run_bulk_import(job_id: int, db_factory):
    """Main orchestrator — runs as background task."""
    async with db_factory() as db:
        job = await db.get(BulkImportJob, job_id)
        if not job:
            return
        job.status = "running"
        job.log = ""
        await db.commit()

    try:
        # Discover
        async with db_factory() as db:
            job = await db.get(BulkImportJob, job_id)
            _log(job, f"Discovering songs from {job.source}...")
            await db.commit()

        songs = await discover_ytmusic(
            language=job.language, count=job.requested_count,
            year_from=job.year_from, year_to=job.year_to,
        )

        async with db_factory() as db:
            job = await db.get(BulkImportJob, job_id)
            job.total_found = len(songs)
            _log(job, f"Found {len(songs)} candidates")
            await db.commit()

        # Import each
        for i, s in enumerate(songs):
            async with db_factory() as db:
                result = await import_single(s["video_id"], db, language_override=job.language)
                job = await db.get(BulkImportJob, job_id)

                if result is None:
                    # Check if it was a duplicate vs no lyrics
                    existing = await db.execute(select(Song).where(Song.yt_video_id == s["video_id"]))
                    if existing.scalar_one_or_none():
                        job.skipped += 1
                        _log(job, f"[{i+1}/{len(songs)}] Skipped (exists): {s['title']}")
                    else:
                        job.failed += 1
                        _log(job, f"[{i+1}/{len(songs)}] No lyrics: {s['title']}")
                else:
                    song, lc = result
                    job.imported += 1
                    _log(job, f"[{i+1}/{len(songs)}] Imported: {s['title']} ({lc} lines)")
                    # Auto-create challenges
                    ch = await auto_create_challenge(song.id, db, count=job.challenges_per_song)
                    job.challenges_created += ch

                await db.commit()
            await asyncio.sleep(1)  # rate limit between imports

        async with db_factory() as db:
            job = await db.get(BulkImportJob, job_id)
            job.status = "completed"
            _log(job, f"Done! Imported {job.imported}, skipped {job.skipped}, failed {job.failed}, challenges {job.challenges_created}")
            await db.commit()

    except Exception as e:
        logger.error(f"Bulk import job {job_id} failed: {e}")
        async with db_factory() as db:
            job = await db.get(BulkImportJob, job_id)
            if job:
                job.status = "failed"
                _log(job, f"ERROR: {e}")
                await db.commit()


def _log(job: BulkImportJob, msg: str):
    job.log = (job.log or "") + msg + "\n"


def _detect_language(lines: list[str]) -> str:
    """Majority-vote language detection across line chunks."""
    votes = []
    for i in range(0, len(lines), 3):
        chunk = " ".join(lines[i:i+3])
        if len(chunk.strip()) < 10:
            continue
        try:
            votes.append(detect(chunk))
        except Exception:
            pass
    if not votes:
        return "unknown"
    return Counter(votes).most_common(1)[0][0]
