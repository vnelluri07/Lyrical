from ytmusicapi import YTMusic
from langdetect import detect, DetectorFactory
DetectorFactory.seed = 0  # deterministic results
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Song, Lyric
from app.schemas import SongSearchResult

yt = YTMusic()


def search_songs(query: str) -> list[SongSearchResult]:
    results = yt.search(query, filter="songs", limit=10)
    out = []
    for r in results:
        artists = ", ".join(a["name"] for a in r.get("artists", []))
        album = r.get("album", {})
        thumbs = r.get("thumbnails", [])
        out.append(SongSearchResult(
            video_id=r["videoId"],
            title=r["title"],
            artist=artists,
            album=album.get("name") if album else None,
            thumbnail_url=thumbs[-1]["url"] if thumbs else None,
        ))
    return out


async def import_song(video_id: str, db: AsyncSession, language_override: str | None = None) -> Song:
    # Check duplicate
    existing = await db.execute(select(Song).where(Song.yt_video_id == video_id))
    if existing.scalar_one_or_none():
        raise ValueError("Song already imported")

    # Get song metadata
    song_data = yt.get_song(video_id)
    details = song_data.get("videoDetails", {})
    title = details.get("title", "Unknown")
    artist = details.get("author", "Unknown")
    thumbs = details.get("thumbnail", {}).get("thumbnails", [])
    thumbnail_url = thumbs[-1]["url"] if thumbs else None

    # Get lyrics via watch playlist
    watch = yt.get_watch_playlist(videoId=video_id)
    lyrics_browse_id = watch.get("lyrics")
    if not lyrics_browse_id:
        raise LookupError("No lyrics available for this song")

    lyrics_data = yt.get_lyrics(lyrics_browse_id)
    if not lyrics_data or not lyrics_data.get("lyrics"):
        raise LookupError("No lyrics available for this song")

    # Parse lyrics into lines
    raw_lyrics = lyrics_data["lyrics"]
    if isinstance(raw_lyrics, str):
        lines = [l for l in raw_lyrics.split("\n") if l.strip()]
    else:
        lines = [l.text for l in raw_lyrics if l.text.strip()]

    # Detect language from lyrics (or use override)
    if language_override:
        language = language_override.lower()
    else:
        language = _detect_language(lines)

    # Persist
    song = Song(
        title=title,
        artist=artist,
        yt_video_id=video_id,
        thumbnail_url=thumbnail_url,
        language=language,
    )
    db.add(song)
    await db.flush()

    for i, text in enumerate(lines):
        db.add(Lyric(song_id=song.id, line_number=i, text=text))

    await db.commit()
    await db.refresh(song)
    return song, len(lines)


def _detect_language(lines: list[str]) -> str:
    """Majority-vote language detection across line chunks."""
    from collections import Counter
    votes = []
    # Sample chunks of 3-5 lines for more reliable detection
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
