"""Allow independent subject classrooms and store their explicit subject.

Revision ID: 0004_class_subject
Revises: 0003_content_engine
"""

import sqlalchemy as sa

from alembic import op

revision = "0004_class_subject"
down_revision = "0003_content_engine"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("classes", sa.Column("subject", sa.String(50), nullable=True))
    op.drop_constraint("uq_school_class_year", "classes", type_="unique")


def downgrade() -> None:
    # This will fail safely if duplicate sections were created after the upgrade.
    op.create_unique_constraint(
        "uq_school_class_year", "classes", ["school_id", "grade", "section", "academic_year"]
    )
    op.drop_column("classes", "subject")
