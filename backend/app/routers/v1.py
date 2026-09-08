"""Versioned private API for the reading studio."""

import json
from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.chart import Chart
from app.models.chat import ChartConversation, ChatMessage
from app.models.session import AnonymousSession
from app.schemas.chart import (
    BirthDataRequest,
    ChartCreateResponse,
    ChartDetail,
    ChartSummary,
    GenerationResponse,
    LocationResult,
    SessionResponse,
)
from app.security import (
    create_anonymous_session,
    ip_hash,
    purge_expired_sessions,
    require_session,
)
from app.services.calculations import calculate_normalized
from app.services.chart_enrichment import enrich_chart
from app.services.generation import start_generation, stream_events
from app.services.geocoding import search_locations
from app.services.llm_client import stream_chat_completion
from app.services.prompt_builder import build_chat_messages
from app.services.rate_limit import consume

router = APIRouter(prefix="/api/v1")
settings = get_settings()


async def owned_chart(chart_id: UUID, session_id: UUID, db: AsyncSession) -> Chart:
    result = await db.execute(
        select(Chart).where(Chart.id == chart_id, Chart.session_id == session_id)
    )
    chart = result.scalar_one_or_none()
    if chart is None:
        raise HTTPException(status_code=404, detail="CHART_NOT_FOUND")
    return chart


async def lock_session_and_find_active(
    session_id: UUID, db: AsyncSession, exclude_chart_id: UUID | None = None
) -> Chart | None:
    await db.execute(
        select(AnonymousSession)
        .where(AnonymousSession.id == session_id)
        .with_for_update()
    )
    query = select(Chart).where(
        Chart.session_id == session_id,
        Chart.status.in_(["pending", "generating"]),
    )
    if exclude_chart_id is not None:
        query = query.where(Chart.id != exclude_chart_id)
    return (await db.execute(query.limit(1))).scalar_one_or_none()


@router.post("/sessions", response_model=SessionResponse, status_code=201)
async def create_session(db: AsyncSession = Depends(get_db)):
    await purge_expired_sessions(db)
    session, token = await create_anonymous_session(db)
    return SessionResponse(token=token, expires_at=session.expires_at)


@router.get("/locations", response_model=list[LocationResult])
async def locations(
    request: Request,
    query: str = Query(min_length=2, max_length=100),
    language: str = Query(default="en", pattern="^(en|hi)$"),
    session: AnonymousSession = Depends(require_session),
    db: AsyncSession = Depends(get_db),
):
    await consume(
        db,
        kind="location",
        limit=settings.location_limit_minute,
        window=timedelta(minutes=1),
        ip_hash=ip_hash(request),
    )
    try:
        return await search_locations(query, language)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="GEOCODING_UNAVAILABLE") from exc


@router.post("/charts", response_model=ChartCreateResponse, status_code=201)
async def create_chart(
    payload: BirthDataRequest,
    session: AnonymousSession = Depends(require_session),
    db: AsyncSession = Depends(get_db),
):
    active = await db.execute(
        select(Chart).where(
            Chart.session_id == session.id,
            Chart.status.in_(["pending", "generating"]),
        ).limit(1)
    )
    if active.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="ACTIVE_GENERATION")
    await consume(
        db,
        kind="reading",
        limit=settings.reading_limit_daily,
        window=timedelta(days=1),
        session_id=session.id,
    )
    if await lock_session_and_find_active(session.id, db):
        raise HTTPException(status_code=409, detail="ACTIVE_GENERATION")
    try:
        calculation = await calculate_normalized(payload)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail="CALCULATION_UNAVAILABLE") from exc
    provider_data = calculation.get("data", calculation)
    enriched = enrich_chart(
        provider_data,
        payload.system,
        person_name=payload.person_name,
        birth_date=payload.birth_date.isoformat(),
        birth_time=payload.birth_time,
        timezone=payload.birth_timezone,
        city=payload.birth_city,
        country=payload.birth_country,
        lat=payload.birth_latitude,
        lng=payload.birth_longitude,
    )
    hour, minute = map(int, payload.birth_time.split(":"))
    chart = Chart(
        session_id=session.id,
        system=payload.system,
        person_name=payload.person_name,
        birth_date=payload.birth_date,
        birth_time=__import__("datetime").time(hour, minute),
        birth_timezone=payload.birth_timezone,
        birth_city=payload.birth_city,
        birth_country=payload.birth_country,
        birth_latitude=payload.birth_latitude,
        birth_longitude=payload.birth_longitude,
        gender=payload.gender,
        calculation=calculation,
        enriched_text=enriched,
        status="pending",
    )
    db.add(chart)
    await db.commit()
    await db.refresh(chart)
    await start_generation(chart.id, session.id)
    return ChartCreateResponse(chart_id=chart.id, status=chart.status)


@router.get("/charts", response_model=list[ChartSummary])
async def list_charts(
    session: AnonymousSession = Depends(require_session),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Chart)
        .where(Chart.session_id == session.id)
        .order_by(Chart.created_at.desc())
    )
    return list(result.scalars())


@router.get("/charts/{chart_id}", response_model=ChartDetail)
async def get_chart(
    chart_id: UUID,
    session: AnonymousSession = Depends(require_session),
    db: AsyncSession = Depends(get_db),
):
    return await owned_chart(chart_id, session.id, db)


@router.delete("/charts/{chart_id}", status_code=204)
async def delete_chart(
    chart_id: UUID,
    session: AnonymousSession = Depends(require_session),
    db: AsyncSession = Depends(get_db),
):
    chart = await owned_chart(chart_id, session.id, db)
    await db.delete(chart)
    await db.commit()


@router.post("/charts/{chart_id}/generation", response_model=GenerationResponse)
async def generate_chart(
    chart_id: UUID,
    session: AnonymousSession = Depends(require_session),
    db: AsyncSession = Depends(get_db),
):
    chart = await owned_chart(chart_id, session.id, db)
    if chart.status in {"pending", "generating"}:
        return GenerationResponse(
            chart_id=chart.id, status=chart.status, attempts=chart.generation_attempts
        )
    if await lock_session_and_find_active(session.id, db, exclude_chart_id=chart.id):
        raise HTTPException(status_code=409, detail="ACTIVE_GENERATION")
    if chart.status == "failed" and chart.generation_attempts >= settings.generation_max_attempts:
        chart.status = "pending"
        chart.generation_attempts = 0
        chart.error_code = None
        chart.error_message = None
        chart.lease_owner = None
        chart.lease_expires_at = None
        await db.commit()
    await start_generation(chart.id, session.id)
    return GenerationResponse(
        chart_id=chart.id, status=chart.status, attempts=chart.generation_attempts
    )


@router.get("/charts/{chart_id}/generation/stream")
async def generation_stream(
    chart_id: UUID,
    session: AnonymousSession = Depends(require_session),
    db: AsyncSession = Depends(get_db),
):
    await owned_chart(chart_id, session.id, db)
    return StreamingResponse(
        stream_events(chart_id, session.id),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/charts/{chart_id}/chat")
async def chat(
    chart_id: UUID,
    request: Request,
    session: AnonymousSession = Depends(require_session),
    db: AsyncSession = Depends(get_db),
):
    body = await request.json()
    message = str(body.get("message", "")).strip()
    if not message or len(message) > 4000:
        raise HTTPException(status_code=422, detail="INVALID_MESSAGE")
    await consume(
        db,
        kind="chat",
        limit=settings.chat_limit_hourly,
        window=timedelta(hours=1),
        session_id=session.id,
    )
    chart = await owned_chart(chart_id, session.id, db)
    if chart.status != "ready":
        raise HTTPException(status_code=409, detail="READING_NOT_READY")
    result = await db.execute(
        select(ChartConversation)
        .where(
            ChartConversation.chart_id == chart.id,
            ChartConversation.session_id == session.id,
            ChartConversation.is_active.is_(True),
        )
        .order_by(ChartConversation.created_at.desc())
    )
    conversation = result.scalars().first()
    if conversation is None:
        conversation = ChartConversation(chart_id=chart.id, session_id=session.id)
        db.add(conversation)
        await db.flush()
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(40)
    )
    history = list(reversed(history_result.scalars().all()))
    messages = build_chat_messages(
        chart_context=chart.enriched_text,
        system=chart.system,
        chat_history=[{"role": item.role, "content": item.content} for item in history],
        user_message=message,
    )
    db.add(ChatMessage(conversation_id=conversation.id, role="user", content=message))
    await db.commit()

    async def chat_stream():
        chunks: list[str] = []
        sequence = 0
        try:
            async for token in stream_chat_completion(
                messages, model=settings.deepseek_model, temperature=0.8, max_tokens=1200
            ):
                chunks.append(token)
                sequence += 1
                yield json.dumps(
                    {"type": "token", "chart_id": str(chart_id), "sequence": sequence, "data": token},
                    ensure_ascii=False,
                ) + "\n"
            async with __import__("app.database", fromlist=["async_session"]).async_session() as write_db:
                write_db.add(
                    ChatMessage(
                        conversation_id=conversation.id,
                        role="assistant",
                        content="".join(chunks),
                    )
                )
                saved = await write_db.get(ChartConversation, conversation.id)
                if saved:
                    saved.message_count += 2
                await write_db.commit()
            yield json.dumps(
                {"type": "complete", "chart_id": str(chart_id), "sequence": sequence + 1, "data": {}}
            ) + "\n"
        except Exception:
            yield json.dumps(
                {
                    "type": "error",
                    "chart_id": str(chart_id),
                    "sequence": sequence + 1,
                    "data": {"code": "CHAT_UNAVAILABLE"},
                }
            ) + "\n"

    return StreamingResponse(chat_stream(), media_type="application/x-ndjson")


@router.get("/charts/{chart_id}/conversations")
async def conversations(
    chart_id: UUID,
    session: AnonymousSession = Depends(require_session),
    db: AsyncSession = Depends(get_db),
):
    await owned_chart(chart_id, session.id, db)
    result = await db.execute(
        select(ChartConversation)
        .where(
            ChartConversation.chart_id == chart_id,
            ChartConversation.session_id == session.id,
        )
        .order_by(ChartConversation.updated_at.desc())
    )
    return [
        {
            "id": str(item.id),
            "title": item.title,
            "message_count": item.message_count,
            "updated_at": item.updated_at,
        }
        for item in result.scalars()
    ]


@router.get("/conversations/{conversation_id}")
async def conversation(
    conversation_id: UUID,
    session: AnonymousSession = Depends(require_session),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChartConversation).where(
            ChartConversation.id == conversation_id,
            ChartConversation.session_id == session.id,
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="CONVERSATION_NOT_FOUND")
    messages = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == item.id)
        .order_by(ChatMessage.created_at)
    )
    return {
        "id": str(item.id),
        "title": item.title,
        "messages": [
            {"id": str(message.id), "role": message.role, "content": message.content}
            for message in messages.scalars()
        ],
    }
