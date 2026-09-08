from datetime import datetime, timedelta, timezone
from uuid import UUID

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import update

from app.database import async_session
from app.main import app
from app.models.chart import Chart


async def new_session(client):
    response = await client.post("/api/v1/sessions")
    assert response.status_code == 201
    return response.json()["token"]


def payload(name="Synthetic Person"):
    return {
        "system": "bazi",
        "person_name": name,
        "birth_date": "1990-01-15",
        "birth_time": "12:00",
        "birth_timezone": "Asia/Kolkata",
        "birth_city": "New Delhi",
        "birth_country": "India",
        "birth_latitude": 28.6139,
        "birth_longitude": 77.209,
    }


@pytest.mark.asyncio
async def test_session_required_and_readings_are_isolated(monkeypatch):
    async def no_generation(*_args):
        return None

    monkeypatch.setattr("app.routers.v1.start_generation", no_generation)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        assert (await client.get("/api/v1/charts")).status_code == 401
        first = await new_session(client)
        second = await new_session(client)
        created = await client.post(
            "/api/v1/charts",
            headers={"Authorization": f"Bearer {first}"},
            json=payload(),
        )
        assert created.status_code == 201
        chart_id = created.json()["chart_id"]
        assert (await client.get(
            f"/api/v1/charts/{chart_id}",
            headers={"Authorization": f"Bearer {second}"},
        )).status_code == 404
        own = await client.get(
            "/api/v1/charts", headers={"Authorization": f"Bearer {first}"}
        )
        assert [item["id"] for item in own.json()] == [chart_id]


@pytest.mark.asyncio
async def test_reading_limit_is_database_backed(monkeypatch):
    async def no_generation(*_args):
        return None

    monkeypatch.setattr("app.routers.v1.start_generation", no_generation)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await new_session(client)
        headers = {"Authorization": f"Bearer {token}"}
        for number in range(3):
            response = await client.post(
                "/api/v1/charts", headers=headers, json=payload(f"Synthetic {number}")
            )
            assert response.status_code == 201
            async with async_session() as db:
                await db.execute(
                    update(Chart)
                    .where(Chart.id == UUID(response.json()["chart_id"]))
                    .values(status="ready")
                )
                await db.commit()
        limited = await client.post(
            "/api/v1/charts", headers=headers, json=payload("Synthetic 4")
        )
        assert limited.status_code == 429
        assert limited.json()["detail"]["code"] == "RATE_LIMITED"


@pytest.mark.asyncio
async def test_only_one_generation_can_be_active_per_session(monkeypatch):
    async def no_generation(*_args):
        return None

    monkeypatch.setattr("app.routers.v1.start_generation", no_generation)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await new_session(client)
        headers = {"Authorization": f"Bearer {token}"}
        first = await client.post("/api/v1/charts", headers=headers, json=payload("First"))
        second = await client.post("/api/v1/charts", headers=headers, json=payload("Second"))
        assert first.status_code == 201
        assert second.status_code == 409
        assert second.json()["detail"] == "ACTIVE_GENERATION"


@pytest.mark.asyncio
async def test_retired_api_returns_gone():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/chart/example")
        assert response.status_code == 410
