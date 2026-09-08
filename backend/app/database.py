"""Async SQLAlchemy database configuration."""

import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()
DATABASE_URL = settings.database_url or os.getenv("DATABASE_URL")
if not DATABASE_URL:
    db_dir = os.path.dirname(os.path.dirname(__file__))
    DATABASE_URL = f"sqlite+aiosqlite:///{os.path.join(db_dir, 'jyotir_overhaul.db')}"
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

IS_SQLITE = DATABASE_URL.startswith("sqlite")

connect_args = {"check_same_thread": False} if IS_SQLITE else {}
echo = os.getenv("SQL_ECHO") == "1"

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
    """Yield a request-scoped database session."""
    async with async_session() as session:
        yield session
