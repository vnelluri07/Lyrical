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

# Remove params not supported by asyncpg
import re
DATABASE_URL = re.sub(r'[&?](channel_binding|sslmode)=[^&]*', '', DATABASE_URL)
# Clean up trailing ? if all params were stripped
DATABASE_URL = DATABASE_URL.rstrip('?')

# Use SSL for cloud providers
_use_ssl = "neon.tech" in DATABASE_URL or "supabase" in DATABASE_URL
engine = create_async_engine(DATABASE_URL, echo=False, connect_args={"ssl": "require"} if _use_ssl else {})
async_session = async_sessionmaker(engine, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        yield session
