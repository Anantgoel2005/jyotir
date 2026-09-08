"""Jyotir FastAPI application."""

import asyncio
import json
import logging
import time
import uuid
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import get_settings
from app.database import async_session
from app.routers.v1 import router as v1_router
from app.security import purge_expired_sessions
from app.services.generation import recover_stale_jobs

settings = get_settings()


class JsonFormatter(logging.Formatter):
    def format(self, record):
        payload = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        for key in ("request_id", "chart_id", "status_code", "provider", "error_code"):
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value
        return json.dumps(payload)


handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logging.basicConfig(level=logging.INFO, handlers=[handler], force=True)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logger = logging.getLogger("jyotir")


async def cleanup_loop():
    while True:
        await asyncio.sleep(6 * 60 * 60)
        async with async_session() as db:
            count = await purge_expired_sessions(db)
            logger.info("session_cleanup count=%s", count)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await recover_stale_jobs()
    task = asyncio.create_task(cleanup_loop())
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task


app = FastAPI(
    title="Jyotir API",
    description="Private AI astrology reading studio",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)
app.include_router(v1_router)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("request_failed path=%s request_id=%s", request.url.path, request_id)
        return JSONResponse(status_code=500, content={"detail": "INTERNAL_ERROR"})
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "request method=%s path=%s status=%s duration_ms=%s request_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        round((time.perf_counter() - started) * 1000),
        request_id,
    )
    return response


@app.get("/api/health/live")
async def live():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/health/ready")
async def ready():
    try:
        async with async_session() as db:
            await db.execute(text("SELECT 1"))
            migration = (
                await db.execute(text("SELECT version_num FROM alembic_version"))
            ).scalar_one_or_none()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="DATABASE_NOT_READY") from exc
    if migration != "0002_private_studio":
        raise HTTPException(status_code=503, detail="MIGRATIONS_OUTDATED")
    return {"status": "ready", "database": "ok", "migration": migration}


@app.api_route("/api/{legacy_path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def legacy(legacy_path: str):
    return JSONResponse(
        status_code=410,
        content={"detail": "API_RETIRED", "replacement": "/api/v1"},
    )
