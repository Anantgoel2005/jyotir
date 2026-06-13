"""
Pydantic schemas for chat.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from uuid import UUID


class ChatMessageRequest(BaseModel):
    """A single message sent by the user in the chat."""
    message: str = Field(..., min_length=1, max_length=4000)


class ChatMessageResponse(BaseModel):
    """A message in the conversation history."""
    id: int
    role: str
    content: str
    token_count: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationSummary(BaseModel):
    """Lightweight conversation info for the sidebar."""
    id: UUID
    chart_id: UUID
    title: str
    message_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationDetail(BaseModel):
    """Full conversation with messages."""
    id: UUID
    chart_id: UUID
    title: str
    is_active: bool
    message_count: int
    messages: list[ChatMessageResponse]
    created_at: datetime

    class Config:
        from_attributes = True
