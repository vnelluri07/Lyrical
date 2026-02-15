from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.models import User, Score

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("")
async def get_leaderboard(limit: int = Query(20, le=100), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            User.id, User.username, User.first_name, User.last_name, User.avatar_url,
            func.sum(Score.points).label("total_points"),
            func.count(Score.id).label("games_played"),
        )
        .join(Score, Score.user_id == User.id)
        .group_by(User.id)
        .order_by(func.sum(Score.points).desc())
        .limit(limit)
    )
    return [
        {"user_id": r.id, "username": r.username, "first_name": r.first_name, "last_name": r.last_name,
         "avatar_url": r.avatar_url, "total_points": r.total_points, "games_played": r.games_played}
        for r in result
    ]
