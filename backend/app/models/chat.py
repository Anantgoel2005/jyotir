"""
Chat models — conversations and messages linked to a chart.
SQLite + PostgreSQL dual-compatible.
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    String, Integer, Boolean, DateTime, Text, ForeignKey,
    BigInteger, Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ChartConversation(Base):
    __tablename__ = "chart_conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    chart_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("charts.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    title: Mapped[str] = mapped_column(
        String(255), nullable=False, default="New Reading"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    message_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    # -- Relationships ------------------------------------
    chart = relationship("Chart", back_populates="conversations")
    user = relationship("User", back_populates="conversations")
    messages = relationship(
        "ChatMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("chart_conversations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int | None] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True
    )

    # -- Relationships ------------------------------------
    conversation = relationship("ChartConversation", back_populates="messages")
