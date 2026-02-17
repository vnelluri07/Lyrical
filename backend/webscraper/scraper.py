"""
Song scraper using ytmusicapi.
Discovers songs, fetches lyrics, saves to JSON.
Usage: python scraper.py --language te --count 500
       python scraper.py --language hi --count 100
"""
import argparse, json, os, time, re, random
from pathlib import Path
from ytmusicapi import YTMusic

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

yt = YTMusic()

# --- Search queries by language ---
TELUGU_QUERIES = [
    "Telugu songs {y}", "Telugu hit songs {y}", "Telugu movie songs {y}",
    "Tollywood hits {y}", "Telugu romantic songs {y}", "Telugu mass songs {y}",
    "Telugu melody songs {y}", "Telugu latest songs {y}", "Telugu blockbuster songs {y}",
    "Telugu love songs {y}", "Telugu dance songs {y}", "Telugu sad songs {y}",
    "Telugu folk songs {y}", "Telugu item songs {y}", "Telugu devotional songs {y}",
    "best Telugu songs {y}", "top Telugu songs {y}", "new Telugu songs {y}",
    "Telugu chartbusters {y}", "Telugu super hit songs {y}",
    # Top artists
    "Sid Sriram Telugu songs", "Anurag Kulkarni Telugu songs", "Armaan Malik Telugu songs",
    "Haricharan Telugu songs", "Shreya Ghoshal Telugu songs", "SP Balasubrahmanyam Telugu songs",
    "Mangli Telugu songs", "Anirudh Telugu songs", "Thaman Telugu songs",
    "DSP Telugu songs", "Keeravani Telugu songs", "Chinmayi Telugu songs",
    "Sunitha Telugu songs", "Chitra Telugu songs", "Shankar Mahadevan Telugu songs",
    "Vijay Prakash Telugu songs", "Karthik Telugu songs", "Sagar Telugu songs",
    "Rahul Sipligunj Telugu songs", "Mohana Bhogaraju Telugu songs",
    "Ramya Behara Telugu songs", "Geetha Madhuri Telugu songs",
    "Yazin Nizar Telugu songs", "Hesham Abdul Wahab Telugu songs",
    "Javed Ali Telugu songs", "Benny Dayal Telugu songs",
    "Kaala Bhairava Telugu songs", "Roll Rida Telugu songs",
    # Top movies / albums
    "Pushpa songs", "RRR songs", "Baahubali songs", "Ala Vaikunthapurramuloo songs",
    "Arjun Reddy songs", "Bheemla Nayak songs", "Sita Ramam songs",
    "Kushi songs", "Hi Nanna songs", "Guntur Kaaram songs", "Salaar songs",
    "Devara songs", "Tillu Square songs", "Lucky Bhaskar songs",
    "Pushpa 2 songs", "Game Changer songs", "OG songs", "Kalki songs",
    "Rangasthalam songs", "Geetha Govindam songs", "Fidaa songs",
    "Mahanati songs", "Jersey songs", "Uppena songs", "Shyam Singha Roy songs",
    "Bimbisara songs", "Waltair Veerayya songs", "Veera Simha Reddy songs",
    "Dasara songs", "Agent songs", "Virupaksha songs", "Miss Shetty Mr Polishetty songs",
    "Bhagavanth Kesari songs", "Extra Ordinary Man songs", "Hanu Man songs",
    "Tillu Square songs", "Aadikeshava songs", "Naa Saami Ranga songs",
    "Guntur Kaaram songs", "Eagle songs", "Saindhav songs",
    "Ramabanam songs", "Bhimaa songs", "Skanda songs",
    "Adipurush Telugu songs", "Saaho Telugu songs", "Maharshi songs",
    "iSmart Shankar songs", "Sarileru Neekevvaru songs", "Vakeel Saab songs",
    "Krack songs", "Naandhi songs", "Love Story Telugu songs",
    "Most Eligible Bachelor songs", "Tuck Jagadish songs",
    "Sarkaru Vaari Paata songs", "Acharya songs", "Radhe Shyam songs",
    "Major songs", "Liger songs", "Godfather Telugu songs",
    "Dhamaka Telugu songs", "Ante Sundaraniki songs",
    # More specific searches
    "Telugu patalu {y}", "Telugu paatalu {y}",
    "Telugu private songs {y}", "Telugu album songs {y}",
    "Telugu indie songs", "Telugu unplugged songs",
]

HINDI_QUERIES = [
    "Hindi songs {y}", "Bollywood hits {y}", "Hindi romantic songs {y}",
    "Bollywood latest songs {y}", "Hindi love songs {y}", "Hindi party songs {y}",
    "Hindi sad songs {y}", "Hindi dance songs {y}", "Bollywood blockbuster songs {y}",
    "Arijit Singh songs", "Jubin Nautiyal songs", "Shreya Ghoshal Hindi songs",
    "Atif Aslam songs", "Neha Kakkar songs", "Darshan Raval songs",
    "Pritam songs", "AR Rahman Hindi songs", "Vishal Mishra songs",
    "Animal songs", "Jawan songs", "Pathaan songs", "Brahmastra songs",
    "Kabir Singh songs", "Stree 2 songs", "Fighter songs",
]


def get_queries(lang: str) -> list[str]:
    templates = TELUGU_QUERIES if lang == "te" else HINDI_QUERIES
    queries = []
    for t in templates:
        if "{y}" in t:
            for y in range(2026, 2018, -1):
                queries.append(t.replace("{y}", str(y)))
        else:
            queries.append(t)
    return queries


def extract_year(song: dict) -> int | None:
    """Try to extract year from song metadata."""
    for key in ("year", "release_year"):
        if song.get(key):
            try:
                return int(song[key])
            except (ValueError, TypeError):
                pass
    album = song.get("album", {})
    if isinstance(album, dict):
        for key in ("year", "release_year"):
            if album.get(key):
                try:
                    return int(album[key])
                except (ValueError, TypeError):
                    pass
    return None


def get_song_year(video_id: str) -> int | None:
    """Try to get year from detailed song info."""
    try:
        info = yt.get_song(video_id)
        details = info.get("videoDetails", {})
        # Try microformat
        micro = info.get("microformat", {}).get("microformatDataRenderer", {})
        if micro.get("publishDate"):
            return int(micro["publishDate"][:4])
        # Try from album
        album_id = None
        for run in (info.get("header", {}).get("musicImmersiveHeaderRenderer", {}).get("menu", {}).get("menuRenderer", {}).get("items", []) or []):
            pass
    except Exception:
        pass
    return None


def fetch_lyrics(video_id: str) -> str | None:
    """Fetch lyrics for a song via ytmusicapi."""
    try:
        watch = yt.get_watch_playlist(video_id)
        lyrics_id = watch.get("lyrics")
        if not lyrics_id:
            return None
        lyrics_data = yt.get_lyrics(lyrics_id)
        if lyrics_data and lyrics_data.get("lyrics"):
            return lyrics_data["lyrics"]
    except Exception:
        pass
    return None


def has_target_script(text: str, lang: str) -> bool:
    """Check if lyrics contain the expected script."""
    if lang == "te":
        # Telugu Unicode range: 0C00-0C7F
        telugu_chars = len(re.findall(r'[\u0C00-\u0C7F]', text))
        return telugu_chars > 20
    elif lang == "hi":
        # Devanagari range: 0900-097F, or romanized Hindi is also OK
        devanagari = len(re.findall(r'[\u0900-\u097F]', text))
        latin = len(re.findall(r'[a-zA-Z]', text))
        return devanagari > 20 or latin > 50
    return True


def is_garbage(text: str) -> bool:
    """Reject garbage lyrics."""
    lines = text.strip().split("\n")
    if len(lines) < 4 or len(lines) > 300:
        return True
    # Check for common garbage patterns
    lower = text.lower()
    for marker in ["contributors", "embed", "you might also like", "[instrumental]"]:
        if marker in lower[:200]:
            return True
    return False


def search_songs(query: str, limit: int = 20) -> list[dict]:
    """Search YTMusic for songs."""
    try:
        results = yt.search(query, filter="songs", limit=limit)
        return results
    except Exception as e:
        print(f"  Search error for '{query}': {e}")
        return []


def scrape(lang: str, target_count: int):
    out_file = DATA_DIR / f"{lang}_songs.json"

    # Load existing progress
    existing = []
    if out_file.exists():
        existing = json.loads(out_file.read_text())
    seen_ids = {s["video_id"] for s in existing}
    songs = list(existing)

    print(f"Starting {lang} scrape. Target: {target_count}, existing: {len(songs)}")

    queries = get_queries(lang)
    random.shuffle(queries)

    for qi, query in enumerate(queries):
        if len(songs) >= target_count:
            break
        print(f"\n[{len(songs)}/{target_count}] Query {qi+1}/{len(queries)}: {query}")

        results = search_songs(query, limit=20)
        time.sleep(0.5)

        for r in results:
            if len(songs) >= target_count:
                break

            vid = r.get("videoId")
            if not vid or vid in seen_ids:
                continue

            title = r.get("title", "")
            artists = ", ".join(a.get("name", "") for a in r.get("artists", []))
            album_info = r.get("album", {}) or {}
            album_name = album_info.get("name", "") if isinstance(album_info, dict) else ""
            thumb = None
            thumbs = r.get("thumbnails", [])
            if thumbs:
                thumb = thumbs[-1].get("url")
            year = extract_year(r)
            if not year:
                year = get_song_year(vid)

            # Fetch lyrics
            lyrics = fetch_lyrics(vid)
            if not lyrics:
                print(f"  SKIP (no lyrics): {title} - {artists}")
                seen_ids.add(vid)
                continue

            if is_garbage(lyrics):
                print(f"  SKIP (garbage): {title} - {artists}")
                seen_ids.add(vid)
                continue

            if not has_target_script(lyrics, lang):
                print(f"  SKIP (wrong script): {title} - {artists}")
                seen_ids.add(vid)
                continue

            song = {
                "video_id": vid,
                "title": title,
                "artist": artists,
                "album": album_name,
                "thumbnail_url": thumb,
                "language": lang,
                "year": year,
                "lyrics": lyrics,
            }
            songs.append(song)
            seen_ids.add(vid)
            print(f"  ✓ [{len(songs)}] {title} - {artists} ({year or '?'})")

            # Save progress every 10 songs
            if len(songs) % 10 == 0:
                out_file.write_text(json.dumps(songs, ensure_ascii=False, indent=2))
                print(f"  [saved {len(songs)} songs]")

            time.sleep(random.uniform(0.3, 0.8))

    # Final save
    out_file.write_text(json.dumps(songs, ensure_ascii=False, indent=2))
    print(f"\nDone! Scraped {len(songs)} {lang} songs → {out_file}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--language", "-l", required=True, choices=["te", "hi"])
    parser.add_argument("--count", "-c", type=int, default=500)
    args = parser.parse_args()
    scrape(args.language, args.count)
