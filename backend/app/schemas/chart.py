"""Versioned request and response contracts."""

from datetime import date, datetime, time
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class BirthDataRequest(BaseModel):
    system: Literal["tropical", "vedic", "bazi"]
    person_name: str = Field(min_length=1, max_length=255)
    birth_date: date
    birth_time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    birth_timezone: str = Field(min_length=1, max_length=64)
    birth_city: str = Field(min_length=1, max_length=255)
    birth_country: str = Field(min_length=1, max_length=100)
    birth_latitude: float = Field(ge=-90, le=90)
    birth_longitude: float = Field(ge=-180, le=180)
    gender: Literal["male", "female"] | None = None


class ChartSummary(BaseModel):
    id: UUID
    system: str
    person_name: str
    birth_date: date
    birth_city: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChartDetail(ChartSummary):
    birth_time: str
    birth_timezone: str
    birth_country: str
    birth_latitude: float
    birth_longitude: float
    gender: str | None
    calculation: dict[str, Any]
    breakdown: str | None
    breakdown_draft: str | None
    breakdown_model: str | None
    error_code: str | None
    error_message: str | None
    generation_attempts: int
    breakdown_at: datetime | None

    @field_validator("birth_time", mode="before")
    @classmethod
    def format_time(cls, value):
        return value.strftime("%H:%M") if isinstance(value, time) else value


class ChartCreateResponse(BaseModel):
    chart_id: UUID
    status: str


class GenerationResponse(BaseModel):
    chart_id: UUID
    status: str
    attempts: int


class SessionResponse(BaseModel):
    token: str
    expires_at: datetime


class LocationResult(BaseModel):
    id: str
    name: str
    country: str
    admin1: str | None = None
    latitude: float
    longitude: float
    timezone: str
