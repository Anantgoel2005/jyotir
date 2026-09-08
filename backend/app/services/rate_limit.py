"""Small database-backed rolling-window rate limiter."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import UsageEvent


async def consume(
    db: AsyncSession,
    *,
    kind: str,
    limit: int,
    window: timedelta,
    session_id: UUID | None = None,
    ip_hash: str | None = None,
) -> None:
    now = datetime.now(timezone.utc)
    query = select(func.count(UsageEvent.id)).where(
        UsageEvent.kind == kind,
        UsageEvent.created_at >= now - window,
    )
    query = query.where(
        UsageEvent.session_id == session_id if session_id else UsageEvent.ip_hash == ip_hash
    )
    count = int((await db.execute(query)).scalar_one())
    if count >= limit:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "RATE_LIMITED",
                "retry_after_seconds": int(window.total_seconds()),
            },
        )
    db.add(UsageEvent(kind=kind, session_id=session_id, ip_hash=ip_hash, created_at=now))
    await db.commit()
