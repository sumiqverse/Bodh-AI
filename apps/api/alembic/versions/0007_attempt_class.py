"""Attribute attempts to their classroom without assigning legacy attempts.

Revision ID: 0007_attempt_class
Revises: 0006_enrollment_diagnostic
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0007_attempt_class"
down_revision = "0006_enrollment_diagnostic"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("attempts", sa.Column("class_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_attempts_class_id", "attempts", "classes", ["class_id"], ["id"], ondelete="SET NULL"
    )
    op.create_index("ix_attempts_class_id", "attempts", ["class_id"])


def downgrade() -> None:
    op.drop_index("ix_attempts_class_id", table_name="attempts")
    op.drop_constraint("fk_attempts_class_id", "attempts", type_="foreignkey")
    op.drop_column("attempts", "class_id")
