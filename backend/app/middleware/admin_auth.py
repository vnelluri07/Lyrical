import os
from fastapi import Header, HTTPException
from dotenv import load_dotenv

load_dotenv()
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "")


async def require_admin(x_admin_key: str = Header(...)):
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(401, "Invalid admin key")
