from pydantic import BaseModel


# --- Song Search/Import ---

class SongSearchResult(BaseModel):
    video_id: str
    title: str
    artist: str
    album: str | None = None
    thumbnail_url: str | None = None

class SongSearchResponse(BaseModel):
    results: list[SongSearchResult]

class SongImportRequest(BaseModel):
    video_id: str
    language: str | None = None

class SongImportResponse(BaseModel):
    id: int
    title: str
    artist: str
    lyric_count: int

class LyricLineOut(BaseModel):
    line_number: int
    text: str

class SongOut(BaseModel):
    id: int
    title: str
    artist: str
    album: str | None = None
    thumbnail_url: str | None = None
    language: str | None = None


# --- Challenges ---

class ChallengeCreate(BaseModel):
    song_id: int
    start_line: int
    end_line: int

class ChallengeUpdate(BaseModel):
    start_line: int | None = None
    end_line: int | None = None
    is_active: bool | None = None

class ChallengeOut(BaseModel):
    id: int
    song_id: int
    song_title: str
    song_artist: str
    start_line: int
    end_line: int
    is_active: bool
    preview: str


# --- Game ---

class GameChallenge(BaseModel):
    challenge_id: int
    lines: list[str]

class GuessRequest(BaseModel):
    challenge_id: int
    guess: str
    user_id: int | None = None

class GuessResponse(BaseModel):
    correct: bool
    message: str
    near_match: bool = False
    suggestion: str | None = None

class HintResponse(BaseModel):
    challenge_id: int
    before: list[str]
    after: list[str]

class RevealResponse(BaseModel):
    title: str
    artist: str
    album: str | None = None
    thumbnail_url: str | None = None
    platform_links: dict[str, str]


# --- Users ---

class UserRegister(BaseModel):
    username: str
    first_name: str
    last_name: str

class UserOut(BaseModel):
    id: int
    username: str
    first_name: str
    last_name: str


# --- Issues ---

class IssueCreate(BaseModel):
    user_id: int
    username: str
    subject: str
    message: str

class IssueOut(BaseModel):
    id: int
    user_id: int
    username: str
    subject: str
    message: str
    status: str
    created_at: str


# --- Bulk Import ---

class BulkImportRequest(BaseModel):
    source: str  # ytmusic, spotify
    language: str | None = None
    count: int = 50
    challenges_per_song: int = 1
    year_from: int | None = None
    year_to: int | None = None
    search_query: str | None = None

class BulkImportJobOut(BaseModel):
    id: int
    source: str
    language: str | None
    requested_count: int
    challenges_per_song: int
    year_from: int | None
    year_to: int | None
    search_query: str | None
    status: str
    total_found: int
    imported: int
    skipped: int
    failed: int
    challenges_created: int
    log: str | None
    created_at: str
