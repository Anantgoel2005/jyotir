"""
Database module — auto-detects PostgreSQL vs SQLite.
Uses SQLite for local dev (no Docker needed).
PostgreSQL for production via DATABASE_URL env var.
"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

# Auto-detect: if DATABASE_URL is set (e.g. on Render), use it. Otherwise SQLite.
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Local fallback — SQLite in the backend directory
    db_dir = os.path.dirname(os.path.dirname(__file__))
    DATABASE_URL = f"sqlite+aiosqlite:///{os.path.join(db_dir, 'jyotir.db')}"
elif DATABASE_URL.startswith("postgres://"):
    # Render uses "postgres://" — SQLAlchemy needs "postgresql://"
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

IS_SQLITE = DATABASE_URL.startswith("sqlite")

connect_args = {"check_same_thread": False} if IS_SQLITE else {}
echo = os.getenv("APP_ENV") == "development"

if IS_SQLITE:
    engine = create_async_engine(
        DATABASE_URL,
        echo=echo,
        connect_args=connect_args,
    )
else:
    engine = create_async_engine(
        DATABASE_URL,
        echo=echo,
        connect_args=connect_args,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
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
    """Create all tables."""
    from app.models.user import User           # noqa: F401
    from app.models.chart import Chart          # noqa: F401
    from app.models.chat import ChartConversation, ChatMessage  # noqa: F401
    from app.models.credit import CreditLedger  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print(f"[DB] Initialized — {DATABASE_URL.split('://')[0]}")
