import re
import unicodedata
from difflib import SequenceMatcher
from urllib.parse import quote_plus


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).lower()
    text = re.sub(r"[^\w\s]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def similarity(guess: str, title: str) -> float:
    return SequenceMatcher(None, normalize_text(guess), normalize_text(title)).ratio()


def check_guess(guess: str, title: str) -> dict:
    """Returns {correct, near_match, suggestion, message}."""
    s = similarity(guess, title)
    if s >= 0.9:
        return {"correct": True, "near_match": False, "suggestion": None, "message": "Correct! 🎉"}
    if s >= 0.6:
        return {"correct": False, "near_match": True, "suggestion": title, "message": f"Did you mean: {title}?"}
    return {"correct": False, "near_match": False, "suggestion": None, "message": "Not quite — try again or ask for a hint!"}


def platform_urls(artist: str, title: str) -> dict[str, str]:
    q = quote_plus(f"{artist} {title}")
    return {
        "youtube_music": f"https://music.youtube.com/search?q={q}",
        "spotify": f"https://open.spotify.com/search/{q}",
        "apple_music": f"https://music.apple.com/us/search?term={q}",
    }
