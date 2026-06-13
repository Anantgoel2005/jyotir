"""
Chart router — handles birth data submission, chart calculation,
and breakdown generation via SSE streaming.
"""

import asyncio
import json as _json
import logging
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.database import get_db, async_session
from app.models.chart import Chart
from app.models.user import User
from app.models.chat import ChartConversation, ChatMessage  # noqa: F401
from app.models.credit import CreditLedger  # noqa: F401
from app.schemas.chart import (
    BirthDataRequest,
    ChartSummary,
    ChartDetail,
    ChartCreateResponse,
)
from app.services.astro_api import calculate_chart
from app.services.chart_enrichment import enrich_chart
from app.services.llm_client import chat_completion, stream_chat_completion as _stream
from app.services.prompt_builder import build_breakdown_messages

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Hardcoded dev user for MVP ─────────────────────────
DEV_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


async def _get_dev_user(db: AsyncSession) -> User:
    """Ensure the dev user exists in the database."""
    user = await db.get(User, DEV_USER_ID)
    if user is None:
        user = User(
            id=DEV_USER_ID,
            email="dev@jyotir.app",
            name="Dev User",
            credits=10,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


def _tz_offset_from_iana(tz_name: str) -> float:
    """Convert an IANA timezone string to a UTC offset in hours."""
    from zoneinfo import ZoneInfo
    from datetime import datetime

    tz = ZoneInfo(tz_name)
    now = datetime.now(tz)
    offset = now.utcoffset()
    if offset is None:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot determine UTC offset for timezone: {tz_name}"
        )
    return offset.total_seconds() / 3600.0


# ── Routes ──────────────────────────────────────────────

@router.get("/charts", response_model=list[ChartSummary])
async def list_charts(db: AsyncSession = Depends(get_db)):
    """List all charts for the current user (dev user for MVP)."""
    user = await _get_dev_user(db)
    result = await db.execute(
        select(Chart)
        .where(Chart.user_id == user.id)
        .order_by(Chart.created_at.desc())
    )
    charts = result.scalars().all()
    return [ChartSummary.model_validate(c) for c in charts]


@router.post("/chart", response_model=ChartCreateResponse, status_code=201)
async def create_chart(
    request: BirthDataRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit birth data for chart calculation.

    1. Calls AstrologyAPI.com (or calculates locally for Bazi)
    2. Stores raw chart + enriched version in DB
    3. Returns chart_id — frontend then opens SSE stream for breakdown
    """
    user = await _get_dev_user(db)

    # ── Calculate chart ─────────────────────────────────
    tz_offset = _tz_offset_from_iana(request.birth_timezone)

    try:
        raw_chart = await calculate_chart(
            system=request.system,
            name=request.person_name,
            birth_date=request.birth_date.isoformat(),
            birth_time=request.birth_time,
            lat=request.birth_latitude,
            lng=request.birth_longitude,
            tz_offset=tz_offset,
            gender=request.gender,
        )
    except Exception as e:
        logger.exception(f"Chart calculation failed: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Astrology API error: {str(e)}"
        )

    # ── Enrich ───────────────────────────────────────────
    enriched_text = enrich_chart(
        raw_chart,
        request.system,
        person_name=request.person_name,
        birth_date=request.birth_date.isoformat(),
        birth_time=request.birth_time,
        timezone=request.birth_timezone,
        city=request.birth_city,
        country=request.birth_country,
        lat=request.birth_latitude,
        lng=request.birth_longitude,
    )

    # ── Save to DB ───────────────────────────────────────
    from datetime import time as dt_time
    hour, minute = map(int, request.birth_time.split(":"))
    chart = Chart(
        user_id=user.id,
        system=request.system,
        person_name=request.person_name,
        birth_date=request.birth_date,
        birth_time=dt_time(hour, minute),
        birth_timezone=request.birth_timezone,
        birth_city=request.birth_city,
        birth_country=request.birth_country,
        birth_latitude=request.birth_latitude,
        birth_longitude=request.birth_longitude,
        gender=request.gender,
        raw_chart=raw_chart,
        enriched_chart={"text": enriched_text},
        status="calculating",  # breakdown is done via SSE
    )

    db.add(chart)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A chart with this data already exists")
    await db.refresh(chart)

    return ChartCreateResponse(
        chart_id=chart.id,
        status="calculating",
        message="Chart calculated. Open SSE stream for AI breakdown.",
    )


@router.get("/chart/{chart_id}/breakdown-stream")
async def stream_breakdown(
    chart_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Stream AI breakdown as SSE tokens — real-time rendering.
    Persists the result to the DB on completion or failure."""
    user = await _get_dev_user(db)
    result = await db.execute(
        select(Chart).where(Chart.id == chart_id, Chart.user_id == user.id)
    )
    chart = result.scalar_one_or_none()
    if chart is None:
        raise HTTPException(status_code=404, detail="Chart not found")
    if not chart.enriched_chart or "text" not in (chart.enriched_chart or {}):
        raise HTTPException(status_code=400, detail="Chart enrichment not ready")

    # If already generated, serve cached breakdown as a single SSE chunk
    if chart.status == "ready" and chart.breakdown:
        async def cached_stream():
            yield f"data: {_json.dumps({'token': chart.breakdown})}\n\n"
            yield f"data: {_json.dumps({'done': True})}\n\n"
        return StreamingResponse(
            cached_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    enriched_text = chart.enriched_chart["text"]
    messages = build_breakdown_messages(enriched_text, system=chart.system)

    model = "deepseek-chat"

    async def event_stream():
        full: list[str] = []
        try:
            async for token in _stream(
                messages=messages,
                model=model,
                temperature=0.7,
                max_tokens=8192,
            ):
                full.append(token)
                yield f"data: {_json.dumps({'token': token})}\n\n"

            breakdown_text = "".join(full)

            # Persist the breakdown via a fresh DB session
            async with async_session() as write_db:
                try:
                    result = await write_db.execute(select(Chart).where(Chart.id == chart_id))
                    c = result.scalar_one_or_none()
                    if c is not None:
                        c.breakdown = breakdown_text
                        c.breakdown_model = model
                        c.status = "ready"
                        await write_db.commit()
                        logger.info(f"Breakdown persisted for chart {chart_id}: {len(breakdown_text)} chars")
                except Exception as e:
                    logger.exception(f"Failed to persist breakdown for {chart_id}: {e}")

            yield f"data: {_json.dumps({'done': True})}\n\n"

        except Exception as e:
            logger.exception(f"Stream breakdown failed for {chart_id}: {e}")

            # Persist the failure
            async with async_session() as write_db:
                try:
                    result = await write_db.execute(select(Chart).where(Chart.id == chart_id))
                    c = result.scalar_one_or_none()
                    if c is not None:
                        c.status = "failed"
                        c.error_message = str(e)
                        await write_db.commit()
                except Exception as db_err:
                    logger.exception(f"Failed to persist error state for {chart_id}: {db_err}")

            yield f"data: {_json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/chart/{chart_id}", response_model=ChartDetail)
async def get_chart(
    chart_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a chart by ID, including raw data and breakdown."""
    user = await _get_dev_user(db)

    result = await db.execute(
        select(Chart).where(
            Chart.id == chart_id,
            Chart.user_id == user.id,
        )
    )
    chart = result.scalar_one_or_none()

    if chart is None:
        raise HTTPException(status_code=404, detail="Chart not found")

    return ChartDetail.model_validate(chart)


@router.delete("/chart/{chart_id}", status_code=204)
async def delete_chart(
    chart_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a chart and its associated conversations."""
    user = await _get_dev_user(db)

    result = await db.execute(
        select(Chart).where(
            Chart.id == chart_id,
            Chart.user_id == user.id,
        )
    )
    chart = result.scalar_one_or_none()

    if chart is None:
        raise HTTPException(status_code=404, detail="Chart not found")

    await db.delete(chart)
    await db.commit()
