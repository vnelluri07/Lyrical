from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.models import Issue, User
from app.schemas import IssueCreate, IssueOut
import os

router = APIRouter()

@router.post("/issues", response_model=IssueOut)
async def create_issue(data: IssueCreate, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, data.user_id)
    if not user:
        raise HTTPException(404, "User not found")
    issue = Issue(user_id=data.user_id, username=data.username, subject=data.subject, message=data.message)
    db.add(issue)
    await db.commit()
    await db.refresh(issue)
    return IssueOut(id=issue.id, user_id=issue.user_id, username=issue.username,
                    subject=issue.subject, message=issue.message, status=issue.status,
                    created_at=issue.created_at.isoformat())

@router.get("/admin/issues", response_model=list[IssueOut])
async def list_issues(x_admin_key: str = Header(...), db: AsyncSession = Depends(get_db)):
    if x_admin_key != os.getenv("ADMIN_API_KEY"):
        raise HTTPException(403, "Invalid admin key")
    result = await db.execute(select(Issue).order_by(Issue.created_at.desc()))
    issues = result.scalars().all()
    return [IssueOut(id=i.id, user_id=i.user_id, username=i.username,
                     subject=i.subject, message=i.message, status=i.status,
                     created_at=i.created_at.isoformat()) for i in issues]
