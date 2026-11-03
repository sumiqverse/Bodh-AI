"""Persist classroom badge and certificate awards.

Revision ID: 0008_achievements
Revises: 0007_attempt_class
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0008_achievements"
down_revision = "0007_attempt_class"
branch_labels = None
depends_on = None


def upgrade() -> None:
    uid = postgresql.UUID(as_uuid=True)
    op.create_table(
        "achievements",
        sa.Column("id", uid, primary_key=True),
        sa.Column("student_id", uid, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("class_id", uid, sa.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("resource_id", uid, nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint(
            "student_id", "class_id", "kind", "resource_id", name="uq_achievement_award"
        ),
    )
    op.create_index("ix_achievements_student_id", "achievements", ["student_id"])
    op.create_index("ix_achievements_class_id", "achievements", ["class_id"])


def downgrade() -> None:
    op.drop_index("ix_achievements_class_id", table_name="achievements")
    op.drop_index("ix_achievements_student_id", table_name="achievements")
    op.drop_table("achievements")
