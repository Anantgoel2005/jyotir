"""
Credit ledger — immutable audit trail for freemium credit system.
SQLite + PostgreSQL dual-compatible.
"""

import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class CreditLedger(Base):
    __tablename__ = "credit_ledger"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(100), nullable=False)
    chart_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("charts.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )

    # -- Relationships ------------------------------------
    user = relationship("User", back_populates="credit_entries")
