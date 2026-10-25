"""Add content engine questions, translations, glossary, and version history.

Revision ID: 0003_content_engine
Revises: 0002_auth_classes_rls
Create Date: 2026-10-25 20:35:00

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision = "0003_content_engine"
down_revision = "0002_auth_classes_rls"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"
    uuid_type = postgresql.UUID(as_uuid=True) if is_postgres else sa.String(36)
    json_type = postgresql.JSONB if is_postgres else sa.JSON()

    # 1. Update questions table
    op.add_column("questions", sa.Column("code", sa.String(100), nullable=True))
    op.create_unique_constraint("uq_questions_code", "questions", ["code"])
    op.create_index("ix_questions_code", "questions", ["code"])

    op.add_column(
        "questions",
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
    )
    op.create_index("ix_questions_status", "questions", ["status"])

    op.add_column(
        "questions",
        sa.Column(
            "needs_teacher_review",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )
    op.create_index("ix_questions_needs_teacher_review", "questions", ["needs_teacher_review"])

    op.add_column(
        "questions",
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )

    op.add_column(
        "questions",
        sa.Column(
            "reviewer_id",
            uuid_type,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_questions_reviewer_id", "questions", ["reviewer_id"])

    # 2. Update question_translations table
    op.add_column(
        "question_translations",
        sa.Column("verified_answer", sa.String(500), nullable=False, server_default=""),
    )
    op.add_column(
        "question_translations",
        sa.Column("worked_solution", sa.Text(), nullable=False, server_default=""),
    )

    # 3. Create glossary_terms table
    op.create_table(
        "glossary_terms",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column(
            "curriculum_id",
            uuid_type,
            sa.ForeignKey("curricula.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("term_en", sa.String(150), nullable=False, index=True),
        sa.Column("term_hi", sa.String(150), nullable=False, index=True),
        sa.Column("definition_en", sa.Text(), nullable=False),
        sa.Column("definition_hi", sa.Text(), nullable=False),
        sa.Column("category", sa.String(50), nullable=True, index=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("term_en", "category", name="uq_glossary_term_category"),
    )

    # 4. Create question_versions table
    op.create_table(
        "question_versions",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column(
            "question_id",
            uuid_type,
            sa.ForeignKey("questions.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("snapshot", json_type, nullable=False),
        sa.Column(
            "changed_by_id",
            uuid_type,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("change_reason", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("question_id", "version_number", name="uq_question_version"),
        sa.Index("idx_question_versions_qid_v", "question_id", "version_number"),
    )


def downgrade() -> None:
    op.drop_table("question_versions")
    op.drop_table("glossary_terms")

    op.drop_column("question_translations", "worked_solution")
    op.drop_column("question_translations", "verified_answer")

    op.drop_index("ix_questions_reviewer_id", table_name="questions")
    op.drop_column("questions", "reviewer_id")
    op.drop_column("questions", "version")
    op.drop_index("ix_questions_needs_teacher_review", table_name="questions")
    op.drop_column("questions", "needs_teacher_review")
    op.drop_index("ix_questions_status", table_name="questions")
    op.drop_column("questions", "status")
    op.drop_index("ix_questions_code", table_name="questions")
    op.drop_constraint("uq_questions_code", "questions", type_="unique")
    op.drop_column("questions", "code")
