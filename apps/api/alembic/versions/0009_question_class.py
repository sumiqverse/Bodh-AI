"""Scope teacher-created questions to a classroom.

Revision ID: 0009_question_class
Revises: 0008_achievements
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0009_question_class"
down_revision = "0008_achievements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("questions", sa.Column("class_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_questions_class_id", "questions", "classes", ["class_id"], ["id"], ondelete="CASCADE"
    )
    op.create_index("ix_questions_class_id", "questions", ["class_id"])
    # Older custom questions lack a reliable classroom association. Preserve them as drafts
    # until their owner can assign them, instead of exposing them to every classroom.
    op.execute(
        "UPDATE questions SET status = 'draft', needs_teacher_review = true "
        "WHERE code LIKE 'Q-CUSTOM-%' AND class_id IS NULL"
    )


def downgrade() -> None:
    op.drop_index("ix_questions_class_id", table_name="questions")
    op.drop_constraint("fk_questions_class_id", "questions", type_="foreignkey")
    op.drop_column("questions", "class_id")
