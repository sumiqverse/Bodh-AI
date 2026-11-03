"""Store teacher-authored lessons by skill, language, and difficulty.

Revision ID: 0011_classroom_lessons
Revises: 0010_class_mastery
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0011_classroom_lessons"
down_revision = "0010_class_mastery"
branch_labels = None
depends_on = None


def upgrade() -> None:
    uid = postgresql.UUID(as_uuid=True)
    op.create_table(
        "classroom_lessons",
        sa.Column("id", uid, primary_key=True),
        sa.Column("class_id", uid, sa.ForeignKey("classes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("skill_id", uid, sa.ForeignKey("skills.id", ondelete="CASCADE"), nullable=False),
        sa.Column("language", sa.String(10), nullable=False),
        sa.Column("difficulty", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint(
            "class_id", "skill_id", "language", "difficulty", name="uq_class_lesson_level"
        ),
    )
    op.create_index("ix_classroom_lessons_class_id", "classroom_lessons", ["class_id"])
    op.create_index("ix_classroom_lessons_skill_id", "classroom_lessons", ["skill_id"])


def downgrade() -> None:
    op.drop_index("ix_classroom_lessons_skill_id", table_name="classroom_lessons")
    op.drop_index("ix_classroom_lessons_class_id", table_name="classroom_lessons")
    op.drop_table("classroom_lessons")
