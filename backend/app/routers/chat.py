"""
Chat router — SSE streaming endpoint for the interactive AI consultation.
"""

import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db, async_session
from pydantic import BaseModel, Field


class VercelMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    # Accept both legacy format (message: str) and Vercel AI SDK format (messages: list)
    message: str | None = Field(None, min_length=1, max_length=4000)
    messages: list[VercelMessage] | None = None

    def extract_message(self) -> str:
        """Extract the user message from either format."""
        if self.messages:
            # Vercel AI SDK format — get the last user message
            for msg in reversed(self.messages):
                if msg.role == "user":
                    return msg.content
            raise ValueError("No user message found in messages array")
        elif self.message:
            return self.message
        else:
            raise ValueError("No message provided")



from app.models.chart import Chart
from app.models.chat import ChartConversation, ChatMessage
from app.models.user import User
from app.models.credit import CreditLedger  # noqa: F401 — SQLAlchemy relationship resolution
from app.schemas.chat import ChatMessageResponse, ConversationSummary, ConversationDetail
from app.services.llm_client import stream_chat_completion
from app.services.prompt_builder import build_chat_messages

logger = logging.getLogger(__name__)
router = APIRouter()

DEV_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
CHAT_HISTORY_LIMIT = 20  # keep last 20 turns (40 messages) in context


# ── Helpers ─────────────────────────────────────────────

async def _get_or_create_conversation(
    chart_id: UUID,
    user_id: UUID,
    db: AsyncSession,
) -> ChartConversation:
    """Get the active conversation for a chart, or create one."""
    result = await db.execute(
        select(ChartConversation).where(
            ChartConversation.chart_id == chart_id,
            ChartConversation.user_id == user_id,
            ChartConversation.is_active == True,
        ).order_by(ChartConversation.created_at.desc())
    )
    conv = result.scalar_one_or_none()

    if conv is None:
        conv = ChartConversation(
            chart_id=chart_id,
            user_id=user_id,
            title="New Reading",
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)

    return conv


async def _load_chart(chart_id: UUID, user_id: UUID, db: AsyncSession) -> Chart:
    """Load and validate chart ownership."""
    result = await db.execute(
        select(Chart).where(
            Chart.id == chart_id,
            Chart.user_id == user_id,
        )
    )
    chart = result.scalar_one_or_none()
    if chart is None:
        raise HTTPException(status_code=404, detail="Chart not found")
    if chart.status != "ready":
        raise HTTPException(status_code=400, detail="Chart breakdown not ready yet")
    if not chart.enriched_chart or "text" not in chart.enriched_chart:
        raise HTTPException(status_code=500, detail="Chart enrichment data missing")
    return chart


async def _load_chat_history(
    conversation_id: UUID,
    db: AsyncSession,
) -> list[dict[str, str]]:
    """Load the last N messages for context injection."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(CHAT_HISTORY_LIMIT * 2)  # 40 messages = 20 turns
    )
    messages = result.scalars().all()
    messages.reverse()  # chronological order

    return [
        {"role": msg.role, "content": msg.content}
        for msg in messages
    ]


# ── Routes ──────────────────────────────────────────────

@router.post("/chat/{chart_id}")
async def chat_stream(
    chart_id: UUID,
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message to the AI astrologer and stream the response.

    Request body: {"message": "What does my Moon in Scorpio mean?"}

    Returns: SSE stream of tokens, ending with [DONE].
    Frontend consumes this with the Vercel AI SDK's useChat() hook.
    """
    message_text = request.extract_message()
    if not message_text or len(message_text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Message is required")

    user = await db.get(User, DEV_USER_ID)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    chart = await _load_chart(chart_id, user.id, db)
    conversation = await _get_or_create_conversation(chart_id, user.id, db)

    # ── Build context ────────────────────────────────────
    chart_context = chart.enriched_chart["text"]
    chat_history = await _load_chat_history(conversation.id, db)

    messages = build_chat_messages(
        chart_context=chart_context,
        system=chart.system,
        chat_history=chat_history,
        user_message=message_text.strip(),
    )

    # ── Save user message ────────────────────────────────
    user_msg = ChatMessage(
        conversation_id=conversation.id,
        role="user",
        content=message_text.strip(),
    )
    db.add(user_msg)
    await db.commit()

    # ── Streaming response ───────────────────────────────
    # AI SDK v3 stream protocol format: 0:"token text"\n
    async def event_stream():
        full_response: list[str] = []

        try:
            async for token in stream_chat_completion(
                messages=messages,
                model="deepseek-chat",
                temperature=0.8,
                max_tokens=1024,
                frequency_penalty=0.3,
            ):
                full_response.append(token)
                # AI SDK stream protocol: 0:"text"\n
                escaped = json.dumps(token)
                yield f"0:{escaped}\n"

        except Exception as e:
            logger.exception(f"Chat stream error: {e}")
            yield f"3:{json.dumps(f'Error: {str(e)}')}\n"

        finally:
            # ── Save assistant message ──────────────────
            if full_response:
                async with async_session() as write_db:
                    try:
                        assistant_msg = ChatMessage(
                            conversation_id=conversation.id,
                            role="assistant",
                            content="".join(full_response),
                        )
                        write_db.add(assistant_msg)

                        # Update message count
                        conv = await write_db.get(ChartConversation, conversation.id)
                        if conv:
                            conv.message_count = (
                                conv.message_count + 2
                            )  # user + assistant
                            # updated_at is auto-handled by onupdate in the model

                        await write_db.commit()
                    except Exception as e:
                        logger.exception(f"Failed to save assistant message: {e}")

    return StreamingResponse(
        event_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # disable nginx buffering
        },
    )


@router.get("/conversations/{chart_id}", response_model=list[ConversationSummary])
async def list_conversations(
    chart_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """List all conversations for a chart."""
    user = await db.get(User, DEV_USER_ID)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    result = await db.execute(
        select(ChartConversation)
        .where(
            ChartConversation.chart_id == chart_id,
            ChartConversation.user_id == user.id,
        )
        .order_by(ChartConversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    return [ConversationSummary.model_validate(c) for c in conversations]


@router.get("/conversation/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a conversation with all messages."""
    user = await db.get(User, DEV_USER_ID)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    result = await db.execute(
        select(ChartConversation).where(
            ChartConversation.id == conversation_id,
            ChartConversation.user_id == user.id,
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return ConversationDetail.model_validate(conv)
