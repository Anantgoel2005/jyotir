"""
Chart enrichment — transforms AstrologyAPI JSON into a token-efficient,
LLM-friendly structured text block for prompt injection.

Handles the actual API response format from json.astrologyapi.com.
"""

from typing import Any


def _format_degree(full_degree: float) -> str:
    """Convert 330.7916 → '0°47' (degree within sign)."""
    deg = int(full_degree) % 30
    min_part = int(round((full_degree % 1) * 60))
    return f"{deg}°{min_part:02d}'"


def _retro_mark(is_retro: str) -> str:
    """Convert 'true'/'false' to ' (R)' for retrograde planets."""
    return " (R)" if is_retro == "true" else ""


def enrich_chart(
    raw: dict[str, Any] | list[dict[str, Any]],
    system: str,
    *,
    person_name: str = "Unknown",
    birth_date: str = "",
    birth_time: str = "",
    timezone: str = "",
    city: str = "",
    country: str = "",
    lat: float = 0.0,
    lng: float = 0.0,
) -> str:
    """
    Convert raw API response into a formatted text block ready for
    injection into an LLM system prompt. Target: ~2-4K tokens.

    Accepts optional person metadata for the header — AstrologyAPI
    returns only planetary data (a flat list), so router callers
    should pass through the birth form fields to populate the header.
    """
    lines: list[str] = []
    spaces = "  "

    # ── Handle API response format ────────────────────
    if isinstance(raw, list):
        # Direct array response from API — wrap it
        api_planets = raw
        raw = {}
    elif isinstance(raw, dict):
        api_planets = raw.get("planets", [])
    else:
        api_planets = []

    # ── Header ─────────────────────────────────────────
    lines.append("CHART CONTEXT")
    lines.append("=" * 45)

    lines.append(f"Person: {person_name}")
    lines.append(f"Birth:  {birth_date} at {birth_time} ({timezone})")
    lines.append(f"Place:  {city}, {country} ({lat}, {lng})")
    lines.append(f"System: {system.upper()}")
    lines.append("")

    # ── Separate ascendant from planets ────────────────
    ascendant = None
    planets = []
    for p in (api_planets or []):
        if p.get("name") == "Ascendant":
            ascendant = p
        elif p.get("name") not in ("URANUS", "NEPTUNE", "PLUTO"):
            # Skip outer planets unless explicitly requested
            # (keep them for now, LLM can ignore them)
            planets.append(p)
        else:
            planets.append(p)

    # ── Ascendant ──────────────────────────────────────
    if ascendant:
        lines.append(f"ASCENDANT: {ascendant.get('sign', '')} {_format_degree(ascendant.get('fullDegree', 0))}")
        if ascendant.get("nakshatra"):
            lines.append(f"  Nakshatra: {ascendant.get('nakshatra')} (pada {ascendant.get('nakshatra_pad', '')})")
        lines.append("")

    # ── Planets table ───────────────────────────────────
    if planets:
        lines.append("PLANETARY POSITIONS")
        lines.append("-" * 65)
        header = (
            f"{'Planet':<12} {'Sign':<14} {'Degree':<9} "
            f"{'House':<6} {'Nakshatra':<18} {'Dignity'}"
        )
        lines.append(header)
        lines.append("-" * 65)

        for p in planets:
            name_p = p.get("name", "")
            sign = p.get("sign", "")
            degree = _format_degree(p.get("fullDegree", 0))
            retro = _retro_mark(p.get("isRetro", "false"))
            house = p.get("house", "")
            nakshatra = p.get("nakshatra", "")
            pada = p.get("nakshatra_pad", "")
            nk_str = f"{nakshatra} (p{pada})" if nakshatra else ""
            awastha = p.get("planet_awastha", "")

            lines.append(
                f"{name_p:<12} {sign:<14} {degree}{retro:<3} "
                f"House {str(house):<3} {nk_str:<18} {awastha}"
            )
        lines.append("")

    # ── House cusps ─────────────────────────────────────
    houses = raw.get("houses", [])
    if houses:
        lines.append("HOUSE CUSPS")
        lines.append("-" * 30)
        for h in houses:
            num = h.get("number") or h.get("house", "")
            sign = h.get("sign_name") or h.get("sign", "")
            deg = h.get("degree_formatted") or (
                _format_degree(h.get("fullDegree", 0)) if h.get("fullDegree") else ""
            )
            lines.append(f"  House {str(num):<3} {sign} {deg}")
        lines.append("")

    # ── Major aspects ───────────────────────────────────
    aspects = raw.get("aspects", [])
    if aspects:
        lines.append("MAJOR ASPECTS")
        lines.append("-" * 30)
        for a in aspects:
            p1 = a.get("planet1", "")
            p2 = a.get("planet2", "")
            atype = a.get("aspect_type", "")
            orb = a.get("orb", "")
            lines.append(f"  {p1} {atype} {p2} (orb {orb}°)")
        lines.append("")

    # ── Bazi extras ─────────────────────────────────────
    if system == "bazi":
        lines.append("FOUR PILLARS")
        lines.append("-" * 30)
        lines.append(f"  Year:  {raw.get('year_pillar', '')}")
        lines.append(f"  Month: {raw.get('month_pillar', '')}")
        lines.append(f"  Day:   {raw.get('day_pillar', '')}")
        lines.append(f"  Hour:  {raw.get('hour_pillar', '')}")
        lines.append("")
        lines.append(f"  Day Master: {raw.get('day_master_element', '')} "
                      f"({raw.get('day_master_stem', '')})")

    # ── Vedic dasha extras ──────────────────────────────
    if system == "vedic":
        dasha = raw.get("dasha", {})
        if dasha:
            lines.append("CURRENT DASHA")
            lines.append("-" * 30)
            md = dasha.get("current_mahadasha", "")
            sd = dasha.get("start_date", "")
            ed = dasha.get("end_date", "")
            ad = dasha.get("current_antardasha", "")
            lines.append(f"  Mahadasha:  {md} ({sd} to {ed})")
            if ad:
                lines.append(f"  Antardasha: {ad}")

    return "\n".join(lines)
