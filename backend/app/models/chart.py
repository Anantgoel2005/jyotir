"""
Chart model — stores birth data, computed chart, and AI breakdown.
SQLite + PostgreSQL dual-compatible.
"""

import uuid
from datetime import datetime, date, time
from sqlalchemy import (
    String, Integer, Float, Date, Time as SATime,
    DateTime, Text, ForeignKey, UniqueConstraint, Uuid, JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Chart(Base):
    __tablename__ = "charts"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # -- System selection ---------------------------------
    system: Mapped[str] = mapped_column(String(20), nullable=False)

    # -- Birth data ---------------------------------------
    person_name: Mapped[str] = mapped_column(String(255), nullable=False)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    birth_time: Mapped[time] = mapped_column(SATime, nullable=False)
    birth_timezone: Mapped[str] = mapped_column(String(50), nullable=False)
    birth_city: Mapped[str] = mapped_column(String(255), nullable=False)
    birth_country: Mapped[str] = mapped_column(String(100), nullable=False)
    birth_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    birth_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    gender: Mapped[str | None] = mapped_column(String(20))

    # -- Computed chart -----------------------------------
    raw_chart: Mapped[dict] = mapped_column(JSON, nullable=False)
    enriched_chart: Mapped[dict | None] = mapped_column(JSON)

    # -- AI Breakdown -------------------------------------
    breakdown: Mapped[str | None] = mapped_column(Text)
    breakdown_model: Mapped[str | None] = mapped_column(String(100))
    breakdown_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # -- State --------------------------------------------
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="pending"
    )
    error_message: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    # -- Constraints --------------------------------------
    __table_args__ = ()

    # -- Relationships ------------------------------------
    user = relationship("User", back_populates="charts")
    conversations = relationship(
        "ChartConversation", back_populates="chart", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<Chart(id={self.id}, system={self.system}, "
            f"person={self.person_name}, status={self.status})>"
        )
