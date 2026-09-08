"""Anonymous bearer-session authentication and privacy helpers."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.session import AnonymousSession

bearer = HTTPBearer(auto_error=False)
settings = get_settings()


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def ip_hash(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    value = forwarded.split(",", 1)[0].strip() or (request.client.host if request.client else "unknown")
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


async def purge_expired_sessions(db: AsyncSession) -> int:
    result = await db.execute(
        delete(AnonymousSession).where(AnonymousSession.expires_at <= utcnow())
    )
    await db.commit()
    return int(result.rowcount or 0)


async def create_anonymous_session(db: AsyncSession) -> tuple[AnonymousSession, str]:
    token = secrets.token_urlsafe(32)
    now = utcnow()
    session = AnonymousSession(
        token_hash=token_hash(token),
        created_at=now,
        last_seen_at=now,
        expires_at=now + timedelta(days=settings.session_days),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session, token


async def require_session(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> AnonymousSession:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="SESSION_REQUIRED")
    result = await db.execute(
        select(AnonymousSession).where(
            AnonymousSession.token_hash == token_hash(credentials.credentials),
            AnonymousSession.revoked.is_(False),
        )
    )
    session = result.scalar_one_or_none()
    if session is None or aware(session.expires_at) <= utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="SESSION_EXPIRED")
    if aware(session.last_seen_at) < utcnow() - timedelta(minutes=15):
        session.last_seen_at = utcnow()
        await db.commit()
    return session
