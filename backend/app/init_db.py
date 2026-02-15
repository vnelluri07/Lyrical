"""Create the lyricguess database and tables.

Usage: python -m app.init_db
Requires DATABASE_URL in .env (or set DB_HOST, DB_PORT, DB_USER, DB_PASS)
"""

import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv
from sqlalchemy import create_engine
from app.models import Base

load_dotenv()

DB_NAME = os.getenv("DB_NAME", "lyricguess")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "")


def create_database():
    conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASS, dbname="postgres")
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
    if not cur.fetchone():
        cur.execute(f"CREATE DATABASE {DB_NAME} ENCODING 'UTF8'")
        print(f"Created database '{DB_NAME}'")
    else:
        print(f"Database '{DB_NAME}' already exists")
    cur.close()
    conn.close()


def create_tables():
    sync_url = os.getenv("DATABASE_URL", "").replace("+asyncpg", "+psycopg2")
    if not sync_url:
        sync_url = f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    engine = create_engine(sync_url)
    Base.metadata.create_all(engine)
    engine.dispose()
    print("Tables created successfully")


if __name__ == "__main__":
    create_database()
    create_tables()
