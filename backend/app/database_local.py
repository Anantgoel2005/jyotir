"""
SQLite-aware database module for local testing.
Replaces PostgreSQL + Redis with SQLite (aiosqlite) + in-memory cache.
"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

# Use SQLite for local testing (no Docker needed)
LOCAL_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "jyotir.db")
DATABASE_URL = f"sqlite+aiosqlite:///{LOCAL_DB_PATH}"

engine = create_async_engine(
    DATABASE_URL,
    echo=settings.debug,
    connect_args={"check_same_thread": False},
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields a database session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Create all tables (development only; use Alembic in prod)."""
    from app.models.user import User           # noqa: F401
    from app.models.chart import Chart          # noqa: F401
    from app.models.chat import ChartConversation, ChatMessage  # noqa: F401
    from app.models.credit import CreditLedger  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# Simple in-memory cache to replace Redis for local testing
class SimpleCache:
    """Dict-based cache — replaces Redis for local dev."""
    def __init__(self):
        self._store: dict = {}

    async def get(self, key: str) -> str | None:
        return self._store.get(key)

    async def set(self, key: str, value: str, ttl: int = 86400):
        self._store[key] = value

    async def delete(self, key: str):
        self._store.pop(key, None)


cache = SimpleCache()
