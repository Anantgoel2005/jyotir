"""Database-leased, reconnectable in-process breakdown generation."""

import asyncio
import json
import logging
import secrets
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import or_, select, update

from app.config import get_settings
from app.database import async_session
from app.models.chart import Chart
from app.services.llm_client import stream_chat_completion
from app.services.prompt_builder import build_breakdown_messages

logger = logging.getLogger(__name__)
settings = get_settings()
_tasks: dict[UUID, asyncio.Task] = {}
_subscribers: dict[UUID, set[asyncio.Queue]] = defaultdict(set)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def event(event_type: str, chart_id: UUID, sequence: int, data) -> dict:
    return {"type": event_type, "chart_id": str(chart_id), "sequence": sequence, "data": data}


async def broadcast(chart_id: UUID, payload: dict) -> None:
    for queue in tuple(_subscribers.get(chart_id, ())):
        await queue.put(payload)


async def recover_stale_jobs() -> None:
    async with async_session() as db:
        await db.execute(
            update(Chart)
            .where(
                Chart.status == "generating",
                Chart.lease_expires_at < utcnow(),
            )
            .values(status="pending", lease_owner=None, lease_expires_at=None)
        )
        await db.commit()


async def start_generation(chart_id: UUID, session_id: UUID) -> None:
    existing = _tasks.get(chart_id)
    if existing and not existing.done():
        return
    task = asyncio.create_task(_run_generation(chart_id, session_id))
    _tasks[chart_id] = task
    task.add_done_callback(lambda _: _tasks.pop(chart_id, None))


async def _run_generation(chart_id: UUID, session_id: UUID) -> None:
    lease_owner = secrets.token_hex(16)
    now = utcnow()
    async with async_session() as db:
        claim = await db.execute(
            update(Chart)
            .where(
                Chart.id == chart_id,
                Chart.session_id == session_id,
                Chart.generation_attempts < settings.generation_max_attempts,
                or_(
                    Chart.status.in_(["pending", "failed"]),
                    Chart.lease_expires_at < now,
                ),
            )
            .values(
                status="generating",
                lease_owner=lease_owner,
                lease_expires_at=now + timedelta(seconds=settings.generation_lease_seconds),
                generation_started_at=now,
                generation_attempts=Chart.generation_attempts + 1,
                error_code=None,
                error_message=None,
            )
        )
        await db.commit()
        if not claim.rowcount:
            return
        chart = await db.get(Chart, chart_id)
        enriched_text = chart.enriched_text
        system = chart.system
        draft = chart.breakdown_draft or ""

    messages = build_breakdown_messages(enriched_text, system=system)
    full: list[str] = []
    sequence = 0
    last_checkpoint = asyncio.get_running_loop().time()
    try:
        async for token in stream_chat_completion(
            messages=messages,
            model=settings.deepseek_model,
            temperature=0.7,
            max_tokens=4096,
        ):
            full.append(token)
            sequence += 1
            await broadcast(chart_id, event("token", chart_id, sequence, token))
            now_loop = asyncio.get_running_loop().time()
            if now_loop - last_checkpoint >= 1.5:
                draft = "".join(full)
                async with async_session() as db:
                    chart = await db.get(Chart, chart_id)
                    if chart and chart.lease_owner == lease_owner:
                        chart.breakdown_draft = draft
                        chart.lease_expires_at = utcnow() + timedelta(
                            seconds=settings.generation_lease_seconds
                        )
                        await db.commit()
                last_checkpoint = now_loop

        result = "".join(full)
        async with async_session() as db:
            chart = await db.get(Chart, chart_id)
            if chart and chart.lease_owner == lease_owner:
                chart.breakdown = result
                chart.breakdown_draft = result
                chart.breakdown_model = settings.deepseek_model
                chart.breakdown_at = utcnow()
                chart.status = "ready"
                chart.lease_owner = None
                chart.lease_expires_at = None
                await db.commit()
        await broadcast(chart_id, event("complete", chart_id, sequence + 1, {"status": "ready"}))
    except Exception:
        logger.exception("generation_failed", extra={"chart_id": str(chart_id)})
        async with async_session() as db:
            chart = await db.get(Chart, chart_id)
            if chart and chart.lease_owner == lease_owner:
                chart.breakdown_draft = "".join(full) or draft
                chart.status = "failed"
                chart.error_code = "GENERATION_FAILED"
                chart.error_message = "The reading could not be completed. Please retry."
                chart.lease_owner = None
                chart.lease_expires_at = None
                await db.commit()
        await broadcast(
            chart_id,
            event("error", chart_id, sequence + 1, {"code": "GENERATION_FAILED"}),
        )


async def stream_events(chart_id: UUID, session_id: UUID):
    queue: asyncio.Queue = asyncio.Queue()
    _subscribers[chart_id].add(queue)
    try:
        async with async_session() as db:
            result = await db.execute(
                select(Chart).where(Chart.id == chart_id, Chart.session_id == session_id)
            )
            chart = result.scalar_one_or_none()
            if chart is None:
                return
            snapshot = {
                "status": chart.status,
                "draft": chart.breakdown or chart.breakdown_draft or "",
                "attempts": chart.generation_attempts,
            }
        yield json.dumps(event("snapshot", chart_id, 0, snapshot), ensure_ascii=False) + "\n"
        if snapshot["status"] == "ready":
            yield json.dumps(
                event("complete", chart_id, 1, {"status": "ready"}), ensure_ascii=False
            ) + "\n"
            return
        await start_generation(chart_id, session_id)
        while True:
            try:
                payload = await asyncio.wait_for(queue.get(), timeout=12)
                yield json.dumps(payload, ensure_ascii=False) + "\n"
                if payload["type"] in {"complete", "error"}:
                    return
            except asyncio.TimeoutError:
                async with async_session() as db:
                    chart = await db.get(Chart, chart_id)
                    state = chart.status if chart else "missing"
                yield json.dumps(
                    event("progress", chart_id, 0, {"status": state}), ensure_ascii=False
                ) + "\n"
                if state in {"ready", "failed", "missing"}:
                    return
    finally:
        _subscribers[chart_id].discard(queue)
        if not _subscribers[chart_id]:
            _subscribers.pop(chart_id, None)
