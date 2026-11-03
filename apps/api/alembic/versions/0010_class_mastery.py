"""Keep knowledge state separate for each classroom.

Revision ID: 0010_class_mastery
Revises: 0009_question_class
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0010_class_mastery"
down_revision = "0009_question_class"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("mastery", sa.Column("class_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_mastery_class_id", "mastery", "classes", ["class_id"], ["id"], ondelete="CASCADE"
    )
    op.create_index("ix_mastery_class_id", "mastery", ["class_id"])
    op.drop_constraint("uq_mastery_student_skill", "mastery", type_="unique")
    op.create_index(
        "uq_mastery_unscoped",
        "mastery",
        ["student_id", "skill_id"],
        unique=True,
        postgresql_where=sa.text("class_id IS NULL"),
    )
    op.create_index(
        "uq_mastery_class",
        "mastery",
        ["student_id", "skill_id", "class_id"],
        unique=True,
        postgresql_where=sa.text("class_id IS NOT NULL"),
    )


def downgrade() -> None:
    # Refuse to discard classroom-specific states during downgrade.
    op.execute(
        "DO $$ BEGIN IF EXISTS (SELECT 1 FROM mastery WHERE class_id IS NOT NULL) "
        "THEN RAISE EXCEPTION 'Class mastery exists; export before downgrade'; END IF; END $$"
    )
    op.drop_index("uq_mastery_class", table_name="mastery")
    op.drop_index("uq_mastery_unscoped", table_name="mastery")
    op.create_unique_constraint("uq_mastery_student_skill", "mastery", ["student_id", "skill_id"])
    op.drop_index("ix_mastery_class_id", table_name="mastery")
    op.drop_constraint("fk_mastery_class_id", "mastery", type_="foreignkey")
    op.drop_column("mastery", "class_id")
