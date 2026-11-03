"""Persist diagnostic sessions independently of API worker processes.

Revision ID: 0005_diagnostic_sessions
Revises: 0004_class_subject
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0005_diagnostic_sessions"
down_revision = "0004_class_subject"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "diagnostic_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("snapshot", postgresql.JSONB, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_diagnostic_sessions_student_id", "diagnostic_sessions", ["student_id"])


def downgrade() -> None:
    op.drop_index("ix_diagnostic_sessions_student_id", table_name="diagnostic_sessions")
    op.drop_table("diagnostic_sessions")
