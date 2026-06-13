"""
Pydantic schemas for chart request/response.
"""

from datetime import date, time, datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, field_validator
from uuid import UUID


# ── Request ──────────────────────────────────────────────

class BirthDataRequest(BaseModel):
    """Data the user submits through the birth form."""
    system: str = Field(
        ...,
        description="Astrological system: 'tropical', 'vedic', or 'bazi'",
        pattern="^(tropical|vedic|bazi)$",
    )
    person_name: str = Field(
        ..., min_length=1, max_length=255,
        description="Name of the person (for the reading)"
    )
    birth_date: date = Field(
        ..., description="Birth date in YYYY-MM-DD format"
    )
    birth_time: str = Field(
        ..., description="Birth time in HH:MM format (24h, local wall-clock time)",
        pattern="^([01]\\d|2[0-3]):[0-5]\\d$",
    )
    birth_timezone: str = Field(
        ..., description="IANA timezone e.g. 'Asia/Kolkata'"
    )
    birth_city: str = Field(
        ..., min_length=1, max_length=255
    )
    birth_country: str = Field(
        ..., min_length=1, max_length=100
    )
    birth_latitude: float = Field(
        ..., ge=-90, le=90,
        description="Latitude in decimal degrees"
    )
    birth_longitude: float = Field(
        ..., ge=-180, le=180,
        description="Longitude in decimal degrees"
    )
    gender: Optional[str] = Field(
        default=None,
        description="Optional: 'male', 'female', 'other'"
    )
    ayanamsha: Optional[str] = Field(
        default="lahiri",
        description="For Vedic only: 'lahiri', 'raman', 'krishnamurti'"
    )


# ── Response ─────────────────────────────────────────────

class ChartSummary(BaseModel):
    """Lightweight chart info for listing."""
    id: UUID
    system: str
    person_name: str
    birth_date: date
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChartDetail(BaseModel):
    """Full chart including raw data and breakdown."""
    id: UUID
    user_id: UUID
    system: str
    person_name: str
    birth_date: date
    birth_time: str
    birth_timezone: str
    birth_city: str
    birth_country: str
    birth_latitude: float
    birth_longitude: float
    gender: Optional[str]
    raw_chart: Any  # list or dict depending on API
    enriched_chart: Optional[dict[str, Any]]
    breakdown: Optional[str]
    breakdown_model: Optional[str]
    status: str
    error_message: Optional[str]
    created_at: datetime

    @field_validator("birth_time", mode="before")
    @classmethod
    def coerce_birth_time(cls, v):
        if isinstance(v, time):
            return v.strftime("%H:%M")
        return v

    class Config:
        from_attributes = True


class ChartCreateResponse(BaseModel):
    """Immediate response after chart submission — before calculation."""
    chart_id: UUID
    status: str
    message: str


class BreakdownResponse(BaseModel):
    """Response when breakdown is ready or streaming."""
    chart_id: UUID
    status: str
    breakdown: Optional[str]
