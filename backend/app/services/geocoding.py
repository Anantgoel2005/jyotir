"""Open-Meteo geocoding adapter."""

import asyncio

import httpx

from app.config import get_settings

settings = get_settings()


async def search_locations(query: str, language: str = "en") -> list[dict]:
    params = {"name": query, "count": 8, "language": language, "format": "json"}
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.get(f"{settings.geocoding_base_url}/search", params=params)
                response.raise_for_status()
                payload = response.json()
            return [
                {
                    "id": str(item["id"]),
                    "name": item["name"],
                    "country": item.get("country", item.get("country_code", "")),
                    "admin1": item.get("admin1"),
                    "latitude": item["latitude"],
                    "longitude": item["longitude"],
                    "timezone": item.get("timezone", "UTC"),
                }
                for item in payload.get("results", [])
            ]
        except (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError) as exc:
            last_error = exc
            if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code < 500:
                break
            await asyncio.sleep(0.25 * (2**attempt))
    raise RuntimeError("GEOCODING_UNAVAILABLE") from last_error
