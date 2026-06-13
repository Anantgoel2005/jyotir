"""
Jyotir — AI-Powered Astrology Platform
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
FastAPI application entry point.
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.database import init_db
from app.routers import chart, chat

# ── Logging ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.app_env == "development":
        await init_db()
    yield


app = FastAPI(
    title="Jyotir API",
    description="AI-Powered Astrology Platform — chart calculation + LLM consultation",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chart.router, prefix="/api", tags=["chart"])
app.include_router(chat.router, prefix="/api", tags=["chat"])




@app.get("/")
async def root():
    return {"status": "ok", "app": "Jyotir", "docs": "/docs"}

@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "Jyotir", "version": "0.1.0"}
