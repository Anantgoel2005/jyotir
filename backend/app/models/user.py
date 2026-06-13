"""
User model — authentication, credits, profile.
SQLite + PostgreSQL dual-compatible.
"""

import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    auth_provider: Mapped[str] = mapped_column(
        String(50), nullable=False, default="email"
    )
    password_hash: Mapped[str | None] = mapped_column(Text)

    credits: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # Relationships
    charts = relationship("Chart", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship(
        "ChartConversation", back_populates="user", cascade="all, delete-orphan"
    )
    credit_entries = relationship(
        "CreditLedger", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"
