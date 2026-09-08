"""Purge the shared demo and create the private reading-studio schema."""

from alembic import op
import sqlalchemy as sa

revision = "0002_private_studio"
down_revision = "0001_legacy_baseline"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())
    for table in (
        "credit_ledger",
        "chat_messages",
        "chart_conversations",
        "charts",
        "users",
        "usage_events",
        "anonymous_sessions",
    ):
        if table in existing:
            op.drop_table(table)

    op.create_table(
        "anonymous_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_anonymous_sessions_token_hash", "anonymous_sessions", ["token_hash"])
    op.create_index("ix_anonymous_sessions_expires_at", "anonymous_sessions", ["expires_at"])

    op.create_table(
        "charts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("anonymous_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("system", sa.String(20), nullable=False),
        sa.Column("person_name", sa.String(255), nullable=False),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column("birth_time", sa.Time(), nullable=False),
        sa.Column("birth_timezone", sa.String(64), nullable=False),
        sa.Column("birth_city", sa.String(255), nullable=False),
        sa.Column("birth_country", sa.String(100), nullable=False),
        sa.Column("birth_latitude", sa.Float(), nullable=False),
        sa.Column("birth_longitude", sa.Float(), nullable=False),
        sa.Column("gender", sa.String(20)),
        sa.Column("calculation", sa.JSON(), nullable=False),
        sa.Column("enriched_text", sa.Text(), nullable=False),
        sa.Column("breakdown", sa.Text()),
        sa.Column("breakdown_draft", sa.Text()),
        sa.Column("breakdown_model", sa.String(100)),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("generation_attempts", sa.Integer(), nullable=False),
        sa.Column("lease_owner", sa.String(64)),
        sa.Column("lease_expires_at", sa.DateTime(timezone=True)),
        sa.Column("generation_started_at", sa.DateTime(timezone=True)),
        sa.Column("breakdown_at", sa.DateTime(timezone=True)),
        sa.Column("error_code", sa.String(64)),
        sa.Column("error_message", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_charts_session_id", "charts", ["session_id"])
    op.create_index("ix_charts_status", "charts", ["status"])

    op.create_table(
        "chart_conversations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("chart_id", sa.Uuid(), sa.ForeignKey("charts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("anonymous_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("message_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_chart_conversations_chart_id", "chart_conversations", ["chart_id"])
    op.create_index("ix_chart_conversations_session_id", "chart_conversations", ["session_id"])

    op.create_table(
        "chat_messages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("conversation_id", sa.Uuid(), sa.ForeignKey("chart_conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_chat_messages_conversation_id", "chat_messages", ["conversation_id"])
    op.create_index("ix_chat_messages_created_at", "chat_messages", ["created_at"])

    op.create_table(
        "usage_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("session_id", sa.Uuid(), sa.ForeignKey("anonymous_sessions.id", ondelete="CASCADE")),
        sa.Column("ip_hash", sa.String(64)),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_usage_events_session_id", "usage_events", ["session_id"])
    op.create_index("ix_usage_events_ip_hash", "usage_events", ["ip_hash"])
    op.create_index("ix_usage_events_kind", "usage_events", ["kind"])
    op.create_index("ix_usage_events_created_at", "usage_events", ["created_at"])
    op.create_index("ix_usage_kind_session_created", "usage_events", ["kind", "session_id", "created_at"])
    op.create_index("ix_usage_kind_ip_created", "usage_events", ["kind", "ip_hash", "created_at"])


def downgrade():
    for table in ("usage_events", "chat_messages", "chart_conversations", "charts", "anonymous_sessions"):
        op.drop_table(table)
