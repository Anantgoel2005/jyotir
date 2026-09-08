"""
AstrologyAPI.com client — fetches natal chart calculations.
Auth: x-astrologyapi-key header (Access Token / Wallet Token)
Base: https://json.astrologyapi.com/v1/
"""

import asyncio
from typing import Any
import httpx
from app.config import get_settings

settings = get_settings()

ASTROLOGY_API_BASE = "https://json.astrologyapi.com/v1"


def _headers() -> dict[str, str]:
    if not settings.astrology_api_key:
        raise RuntimeError("ASTROLOGY_API_NOT_CONFIGURED")
    return {
        "x-astrologyapi-key": settings.astrology_api_key,
        "Content-Type": "application/json",
    }


def _build_payload(
    name: str,
    birth_date: str,     # YYYY-MM-DD
    birth_time: str,     # HH:MM
    lat: float,
    lng: float,
    tz_offset: float,    # e.g. 5.5 for IST
    gender: str | None = None,
    house_type: str = "placidus",
) -> dict[str, Any]:
    """Build payload matching AstrologyAPI's expected format."""
    parts = birth_date.split("-")
    time_parts = birth_time.split(":")
    return {
        "name": name,
        "day": int(parts[2]),
        "month": int(parts[1]),
        "year": int(parts[0]),
        "hour": int(time_parts[0]),
        "min": int(time_parts[1]),
        "lat": lat,
        "lon": lng,                    # API uses "lon" not "lng"
        "tzone": tz_offset,            # API uses "tzone" not "timezone"
        "house_type": house_type,
        "is_asteroids": "false",
    }


async def fetch_tropical_chart(
    name: str,
    birth_date: str,
    birth_time: str,
    lat: float,
    lng: float,
    tz_offset: float,
    gender: str | None = None,
) -> dict[str, Any]:
    """
    Fetch Western (Tropical) horoscope from AstrologyAPI.
    Uses /western_horoscope endpoint.
    """
    payload = _build_payload(name, birth_date, birth_time, lat, lng, tz_offset, gender)

    return await _post("western_horoscope", payload)


async def fetch_vedic_chart(
    name: str,
    birth_date: str,
    birth_time: str,
    lat: float,
    lng: float,
    tz_offset: float,
    gender: str | None = None,
) -> dict[str, Any]:
    """
    Fetch Vedic (sidereal) planetary positions.
    Uses /planets/extended endpoint for full data.
    """
    payload = _build_payload(name, birth_date, birth_time, lat, lng, tz_offset, gender)

    return await _post("planets/extended", payload)


async def _post(endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{ASTROLOGY_API_BASE}/{endpoint}",
                    json=payload,
                    headers=_headers(),
                )
                response.raise_for_status()
                data = response.json()
                if not isinstance(data, (dict, list)):
                    raise RuntimeError("ASTROLOGY_API_INVALID_RESPONSE")
                return data
        except (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError) as exc:
            last_error = exc
            if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code < 500:
                break
            await asyncio.sleep(0.4 * (2**attempt))
    raise RuntimeError("ASTROLOGY_API_UNAVAILABLE") from last_error


async def calculate_bazi_chart(
    birth_date: str,
    birth_time: str,
    gender: str | None = None,
) -> dict[str, Any]:
    """
    Calculate Bazi (Four Pillars) chart — calendar math, no API needed.
    """
    from datetime import datetime

    dt = datetime.strptime(f"{birth_date} {birth_time}", "%Y-%m-%d %H:%M")

    heavenly_stems = [
        "Jia", "Yi", "Bing", "Ding", "Wu", "Ji", "Geng", "Xin", "Ren", "Gui"
    ]
    earthly_branches = [
        "Zi", "Chou", "Yin", "Mao", "Chen", "Si",
        "Wu", "Wei", "Shen", "You", "Xu", "Hai",
    ]

    year_stem_idx = (dt.year - 4) % 10
    year_branch_idx = (dt.year - 4) % 12
    month_stem_idx = (year_stem_idx * 2 + dt.month) % 10
    month_branch_idx = (dt.month + 1) % 12
    day_cycle = (dt - datetime(1900, 1, 1)).days
    day_stem_idx = (day_cycle + 9) % 10
    day_branch_idx = (day_cycle + 3) % 12
    hour_branch_idx = (dt.hour + 1) // 2 % 12
    hour_stem_idx = (day_stem_idx * 2 + hour_branch_idx) % 10

    elements = ["Wood", "Wood", "Fire", "Fire", "Earth", "Earth",
                "Metal", "Metal", "Water", "Water"]

    return {
        "system": "bazi",
        "year_pillar": f"{heavenly_stems[year_stem_idx]} {earthly_branches[year_branch_idx]}",
        "month_pillar": f"{heavenly_stems[month_stem_idx]} {earthly_branches[month_branch_idx]}",
        "day_pillar": f"{heavenly_stems[day_stem_idx]} {earthly_branches[day_branch_idx]}",
        "hour_pillar": f"{heavenly_stems[hour_stem_idx]} {earthly_branches[hour_branch_idx]}",
        "day_master_element": elements[day_stem_idx],
        "day_master_stem": heavenly_stems[day_stem_idx],
    }


async def calculate_chart(
    system: str,
    name: str,
    birth_date: str,
    birth_time: str,
    lat: float,
    lng: float,
    tz_offset: float,
    gender: str | None = None,
) -> dict[str, Any]:
    """Route to correct calculation based on system."""
    if system == "tropical":
        return await fetch_tropical_chart(name, birth_date, birth_time, lat, lng, tz_offset, gender)
    elif system == "vedic":
        return await fetch_vedic_chart(name, birth_date, birth_time, lat, lng, tz_offset, gender)
    elif system == "bazi":
        return await calculate_bazi_chart(birth_date, birth_time, gender)
    else:
        raise ValueError(f"Unsupported astrological system: {system}")
