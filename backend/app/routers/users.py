from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.models import User
from app.schemas import UserRegister, UserOut

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/register", response_model=UserOut)
async def register(req: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.username == req.username.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Username already taken")
    user = User(username=req.username.lower(), first_name=req.first_name, last_name=req.last_name)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserOut(id=user.id, username=user.username, first_name=user.first_name, last_name=user.last_name)


@router.get("/check/{username}")
async def check_username(username: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == username.lower()))
    return {"available": result.scalar_one_or_none() is None}
