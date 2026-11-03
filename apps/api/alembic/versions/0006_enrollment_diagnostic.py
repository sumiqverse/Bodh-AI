"""Track each classroom enrollment's diagnostic choice.

Revision ID: 0006_enrollment_diagnostic
Revises: 0005_diagnostic_sessions
"""

import sqlalchemy as sa

from alembic import op

revision = "0006_enrollment_diagnostic"
down_revision = "0005_diagnostic_sessions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "enrollments",
        sa.Column("diagnostic_status", sa.String(20), server_default="pending", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("enrollments", "diagnostic_status")
