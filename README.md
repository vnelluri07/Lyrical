# Lyricle — Guess the Song from the Lyrics

A full-stack web app where users guess songs from lyric snippets. Built with React + FastAPI + PostgreSQL.

**Live concept:** Users see 3–4 lines of lyrics and try to guess the song title. Features fuzzy matching, hints, a leaderboard, and an admin panel for bulk-importing songs from YouTube Music.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS v4, TypeScript |
| Backend | Python 3.12, FastAPI (async), SQLAlchemy 2 (async), Pydantic |
| Database | PostgreSQL (async via asyncpg) |
| Music Data | ytmusicapi (search, metadata, lyrics) |
| Auth | Google OAuth 2.0 (Sign In with Google) |
| Package Manager | Bun (frontend), pip (backend) |

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, router registration
│   │   ├── db.py                # Async engine + session factory
│   │   ├── models.py            # SQLAlchemy models (7 tables)
│   │   ├── schemas.py           # Pydantic request/response DTOs
│   │   ├── init_db.py           # DB + table creation script
│   │   ├── middleware/
│   │   │   └── admin_auth.py    # X-Admin-Key header validation
│   │   ├── routers/
│   │   │   ├── admin.py         # Song import, challenge CRUD, bulk import
│   │   │   ├── game.py          # Challenge fetch, guess, hint, reveal
│   │   │   ├── users.py         # Registration, username check
│   │   │   ├── auth.py          # Google OAuth token verification
│   │   │   ├── leaderboard.py   # Top users by points
│   │   │   └── issues.py        # Bug/contact report submission
│   │   └── services/
│   │       ├── ytmusic_service.py       # YT Music search + import + lyrics
│   │       ├── bulk_import_service.py   # Bulk discovery + auto-challenge creation
│   │       └── game_service.py          # Fuzzy matching + platform URL generation
│   └── sql/
│       └── 001_schema.sql       # Full database schema
├── frontend/
│   ├── index.html               # Entry point, favicon, meta tags
│   ├── public/favicon.svg       # Lyricle logo SVG
│   └── src/
│       ├── App.tsx              # Router setup (/, /leaderboard, /contact, /admin)
│       ├── ThemeContext.tsx      # Dark/light theme with localStorage persistence
│       ├── index.css            # CSS variables for theming + Tailwind @theme mapping
│       ├── api/client.ts        # All API calls, typed interfaces
│       ├── components/
│       │   ├── AppShell.tsx     # Header nav + theme toggle + logo
│       │   ├── UserRegistration.tsx  # Google Sign-In + manual username fallback
│       │   ├── LyricDisplay.tsx     # Lyric snippet card
│       │   ├── GuessInput.tsx       # Text input for guesses
│       │   ├── HintLines.tsx        # Before/after hint lines
│       │   ├── SongReveal.tsx       # Song details + platform links (YT/Spotify/Apple)
│       │   ├── Snackbar.tsx         # Toast notifications
│       │   ├── ErrorBoundary.tsx    # React error boundary
│       │   ├── SongSearch.tsx       # Admin: search YT Music
│       │   ├── LyricSelector.tsx    # Admin: pick lyric ranges for challenges
│       │   ├── ChallengeList.tsx    # Admin: manage challenges
│       │   └── BulkImportTab.tsx    # Admin: bulk import form + progress
│       └── pages/
│           ├── HomePage.tsx         # Welcome + language picker + game
│           ├── GamePage.tsx         # Game state machine
│           ├── LeaderboardPage.tsx  # Ranked users with avatars
│           ├── ContactPage.tsx      # Bug report / contact form
│           └── AdminPage.tsx        # 4-tab admin panel
└── .gitignore
```

---

## Database Schema (7 tables)

```
songs          — id, title, artist, yt_video_id (unique), album, thumbnail_url, language
lyrics         — id, song_id (FK), line_number, text
challenges     — id, song_id (FK), start_line, end_line, is_active
users          — id, username (unique), first_name, last_name, google_id, avatar_url
scores         — id, user_id (FK), challenge_id (FK), guessed_correct, used_hint, revealed, points
issues         — id, user_id (FK), username, subject, message, status
bulk_import_jobs — id, source, language, requested_count, challenges_per_song, year_from, year_to, status, progress counters, log
```

Full DDL in `backend/sql/001_schema.sql`.

---

## App Flow

### Player Flow
```
Register (Google OAuth or manual username)
  → Home (greeting + language filter: English/Hindi/Telugu)
    → Game loads random active challenge
      → See 3-4 lyric lines → type guess
        → Fuzzy match (difflib SequenceMatcher):
            ≥90% → Correct! (+10 pts, or +5 if hint used)
            60-89% → "Did you mean: {title}?" (accept/reject)
            <60% → "Not quite — try again!"
        → "Need a hint?" → shows 1 line before + 1 line after
        → "Reveal song" → shows title, artist, album, thumbnail, platform links
        → "Skip →" → loads next challenge
      → "Next Song →" after reveal
```

### Admin Flow
```
Login with admin API key (X-Admin-Key header)
  → 4 tabs:
    Songs    — Search YT Music → import song (fetches lyrics automatically)
               Set/override language per song
    Challenges — View all, toggle active, edit line ranges, delete
    Import   — Bulk import: pick source, language, count (1-500),
               challenges per song (1-5), year range
               → Background task discovers songs, imports lyrics,
                 auto-creates challenges from best lyric snippets
               → Live progress bar + scrolling log
    Issues   — View submitted bug reports / contact messages
```

### Bulk Import Algorithm
1. **Discovery**: Searches YT Music with language-specific queries (e.g., "bollywood hits 2023", "éxitos musicales 2022") combined with year range
2. **Deduplication**: Filters by both video_id AND normalized title+artist (prevents same song from different videos)
3. **Import**: For each song, fetches lyrics via `get_watch_playlist` → `get_lyrics`. Skips songs with <6 lyric lines
4. **Language detection**: Majority-vote across 3-line chunks using langdetect (with seed=0 for determinism)
5. **Auto-challenge**: Scores all 4-line windows in the middle 70% of lyrics by: word count × unique word ratio × line length × line diversity. Picks top N non-overlapping windows
6. **Rate limiting**: 0.5s between searches, 1s between imports

---

## API Endpoints

### Game (`/game`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/game/languages` | List available languages |
| GET | `/game/challenge?language=xx` | Random active challenge |
| POST | `/game/guess` | Submit guess (fuzzy matched) |
| GET | `/game/hint/{id}` | Get hint lines |
| GET | `/game/reveal/{id}` | Reveal song + platform links |

### Admin (`/admin`) — requires `X-Admin-Key` header
| Method | Path | Description |
|--------|------|-------------|
| POST | `/admin/songs/search?q=` | Search YT Music |
| POST | `/admin/songs/import` | Import song + lyrics |
| GET | `/admin/songs` | List all songs |
| GET | `/admin/songs/{id}/lyrics` | Get song lyrics |
| PUT | `/admin/songs/{id}/language` | Set language |
| POST | `/admin/challenges` | Create challenge |
| GET | `/admin/challenges` | List challenges |
| PUT | `/admin/challenges/{id}` | Update challenge |
| DELETE | `/admin/challenges/{id}` | Delete challenge |
| POST | `/admin/bulk-import` | Start bulk import job |
| GET | `/admin/bulk-import/jobs` | List import jobs |
| GET | `/admin/bulk-import/jobs/{id}` | Get job status + log |

### Users & Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/users/register` | Register new user |
| GET | `/users/check/{username}` | Check username availability |
| POST | `/auth/google` | Verify Google OAuth token |
| GET | `/leaderboard` | Top users by total_points |
| POST | `/issues` | Submit bug report |
| GET | `/admin/issues` | List all issues (admin) |

---

## Theme System

CSS variables in `index.css` with light (`:root`) and dark (`:root.dark`) modes:

```css
--c-bg, --c-card, --c-hover, --c-border, --c-input-border,
--c-txt, --c-txt2, --c-muted, --c-accent, --c-accent-hover, --c-accent-soft
```

Mapped to Tailwind via `@theme` block → use classes like `bg-card`, `text-txt`, `border-bdr`, `text-muted`, `bg-accent`. Theme persisted in `localStorage("theme")`, defaults to light.

---

## Setup

### Prerequisites
- Python 3.12+, PostgreSQL, Bun (or npm)

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install fastapi uvicorn sqlalchemy[asyncio] asyncpg psycopg2-binary python-dotenv ytmusicapi langdetect google-auth pydantic

# Create .env
echo 'DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/lyricguess' > .env
echo 'ADMIN_KEY=your-admin-secret' >> .env
echo 'GOOGLE_CLIENT_ID=your-google-client-id' >> .env

# Init database
python -m app.init_db

# Run
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
bun install
bun run dev          # dev server on :5173
bun run build        # production build → dist/
```

### Environment Variables
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL async connection string |
| `ADMIN_KEY` | Admin panel API key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS` | Used by init_db.py if DATABASE_URL not set |

---

## Key Design Decisions

- **Async everywhere**: FastAPI + SQLAlchemy async sessions + asyncpg for non-blocking DB access
- **Fuzzy matching**: difflib SequenceMatcher with 90%/60% thresholds — forgiving but not too loose
- **Lyrics from YT Music only**: Spotify and Apple Music don't expose lyrics APIs. All sources cross-reference to YT Music for lyrics
- **Background bulk import**: Uses `asyncio.create_task` — doesn't block the API. Frontend polls every 3s for progress
- **Language detection**: Majority-vote across line chunks to avoid misclassifying similar scripts (e.g., Telugu vs Tamil)
- **Auto-challenge scoring**: Prefers lyric snippets with high word diversity, avoids chorus repetitions and intro/outro lines
