import os
from pathlib import Path

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./pytest_jyotir.db"
os.environ["APP_ENV"] = "development"
os.environ["READING_LIMIT_DAILY"] = "3"

import pytest_asyncio

from app.database import Base, engine
from app.models import AnonymousSession, Chart, ChartConversation, ChatMessage, UsageEvent


@pytest_asyncio.fixture(autouse=True)
async def clean_database():
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
