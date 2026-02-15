import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token


@router.post("/google")
async def google_login(req: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    try:
        info = id_token.verify_oauth2_token(req.credential, google_requests.Request(), GOOGLE_CLIENT_ID)
    except Exception:
        raise HTTPException(401, "Invalid Google token")

    google_id = info["sub"]
    email = info.get("email", "")
    first_name = info.get("given_name", "")
    last_name = info.get("family_name", "")
    avatar = info.get("picture", "")

    # Find or create user
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if not user:
        # Generate username from email prefix
        username = email.split("@")[0][:32] if email else f"user_{google_id[:8]}"
        # Ensure unique
        existing = await db.execute(select(User).where(User.username == username))
        if existing.scalar_one_or_none():
            username = f"{username}_{google_id[:6]}"

        user = User(username=username, first_name=first_name, last_name=last_name, google_id=google_id, avatar_url=avatar)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return {"id": user.id, "username": user.username, "first_name": user.first_name,
            "last_name": user.last_name, "avatar_url": user.avatar_url}
