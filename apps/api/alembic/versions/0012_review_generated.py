"""Put unchanged generic generated questions back into the review queue.

Revision ID: 0012_review_generated
Revises: 0011_classroom_lessons
"""

import json
from pathlib import Path

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0012_review_generated"
down_revision = "0011_classroom_lessons"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Freeze generator output for this revision: changed or manually authored prompts
    # are not matched. Keep previous status for a safe, conditional downgrade.
    manifest = op.create_table(
        "migration_0012_question_manifest",
        sa.Column("code", sa.String(100), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
    )
    path = (
        Path(__file__).resolve().parent.parent / "data" / "0012_unreviewed_generic_questions.json"
    )
    entries = json.loads(path.read_text(encoding="utf-8"))
    op.bulk_insert(manifest, entries)
    op.create_table(
        "migration_0012_question_status_backup",
        sa.Column("question_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("needs_teacher_review", sa.Boolean(), nullable=False),
        sa.Column("previous_updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.execute(
        "INSERT INTO migration_0012_question_status_backup "
        "(question_id, status, needs_teacher_review, previous_updated_at) "
        "SELECT DISTINCT q.id, q.status, q.needs_teacher_review, q.updated_at FROM questions q "
        "JOIN question_translations t ON t.question_id=q.id AND t.language='en' "
        "JOIN migration_0012_question_manifest m ON m.code=q.code AND m.prompt=t.prompt "
        "WHERE q.status='published'"
    )
    op.execute(
        "UPDATE questions SET status='draft', needs_teacher_review=true "
        "WHERE id IN (SELECT question_id FROM migration_0012_question_status_backup)"
    )
    op.drop_table("migration_0012_question_manifest")


def downgrade() -> None:
    # Do not overwrite a review decision made after the migration.
    op.execute(
        "UPDATE questions q SET status=b.status, needs_teacher_review=b.needs_teacher_review "
        "FROM migration_0012_question_status_backup b "
        "WHERE q.id=b.question_id AND q.status='draft' AND q.needs_teacher_review=true "
        "AND q.updated_at=b.previous_updated_at"
    )
    op.drop_table("migration_0012_question_status_backup")
