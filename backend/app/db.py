import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

# Auto-convert postgres:// or postgresql:// to async driver
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Add sslmode for cloud providers (Neon, Supabase, etc.)
if "neon.tech" in DATABASE_URL or "supabase" in DATABASE_URL:
    if "sslmode" not in DATABASE_URL:
        DATABASE_URL += "?sslmode=require" if "?" not in DATABASE_URL else "&sslmode=require"

# Remove params not supported by asyncpg
import re
DATABASE_URL = re.sub(r'[&?]channel_binding=[^&]*', '', DATABASE_URL)

engine = create_async_engine(DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        yield session
