-- Lyricle Database Schema
-- PostgreSQL — run against 'lyricguess' database

CREATE TABLE IF NOT EXISTS songs (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    yt_video_id VARCHAR(64) UNIQUE NOT NULL,
    album TEXT,
    thumbnail_url TEXT,
    language VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_songs_language ON songs(language);

CREATE TABLE IF NOT EXISTS lyrics (
    id SERIAL PRIMARY KEY,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL,
    first_name VARCHAR(64) NOT NULL,
    last_name VARCHAR(64) NOT NULL,
    google_id VARCHAR(128) UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    guessed_correct BOOLEAN DEFAULT FALSE,
    used_hint BOOLEAN DEFAULT FALSE,
    revealed BOOLEAN DEFAULT FALSE,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);

CREATE TABLE IF NOT EXISTS issues (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(32) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_issues_user_id ON issues(user_id);

CREATE TABLE IF NOT EXISTS bulk_import_jobs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(20) NOT NULL,
    language VARCHAR(10),
    requested_count INTEGER NOT NULL,
    challenges_per_song INTEGER DEFAULT 1,
    year_from INTEGER,
    year_to INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    total_found INTEGER DEFAULT 0,
    imported INTEGER DEFAULT 0,
    skipped INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    challenges_created INTEGER DEFAULT 0,
    log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
