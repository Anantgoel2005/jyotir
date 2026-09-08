"""Persisted normalized chart and generation state."""

import uuid
from datetime import date, datetime, time, timezone

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text, Time, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Chart(Base):
    __tablename__ = "charts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("anonymous_sessions.id", ondelete="CASCADE"), index=True
    )
    system: Mapped[str] = mapped_column(String(20), nullable=False)
    person_name: Mapped[str] = mapped_column(String(255), nullable=False)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    birth_time: Mapped[time] = mapped_column(Time, nullable=False)
    birth_timezone: Mapped[str] = mapped_column(String(64), nullable=False)
    birth_city: Mapped[str] = mapped_column(String(255), nullable=False)
    birth_country: Mapped[str] = mapped_column(String(100), nullable=False)
    birth_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    birth_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    gender: Mapped[str | None] = mapped_column(String(20))
    calculation: Mapped[dict] = mapped_column(JSON, nullable=False)
    enriched_text: Mapped[str] = mapped_column(Text, nullable=False)
    breakdown: Mapped[str | None] = mapped_column(Text)
    breakdown_draft: Mapped[str | None] = mapped_column(Text)
    breakdown_model: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    generation_attempts: Mapped[int] = mapped_column(Integer, default=0)
    lease_owner: Mapped[str | None] = mapped_column(String(64))
    lease_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    generation_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    breakdown_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(64))
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    session = relationship("AnonymousSession", back_populates="charts")
    conversations = relationship(
        "ChartConversation", back_populates="chart", cascade="all, delete-orphan"
    )
