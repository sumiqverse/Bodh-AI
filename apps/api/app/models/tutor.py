"""AI Tutor RAG vector storage, privacy interaction logs, and cost budget models."""

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CurriculumChunkEmbedding(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Semantic vector embedding chunk of published, teacher-approved curriculum content."""

    __tablename__ = "curriculum_chunk_embeddings"

    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    language: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="en",
        index=True,
        comment="en, hi, etc.",
    )
    version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
        comment="Curriculum version snapshot",
    )
    source_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="question_explanation, worked_solution, hint, curriculum_note",
    )
    source_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Verified teacher-approved text content chunk",
    )
    vector: Mapped[list[float]] = mapped_column(
        Vector(384),
        nullable=False,
        comment="Dense 384-dimensional vector embedding",
    )

    __table_args__ = (
        Index(
            "idx_curriculum_chunk_skill_lang_v",
            "skill_id",
            "language",
            "version",
        ),
    )


class TutorInteractionLog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Privacy-compliant interaction log storing scrubbed queries without student PII."""

    __tablename__ = "tutor_interaction_logs"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Pseudonymous student UUID only",
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    query_scrubbed: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="PII-scrubbed student prompt",
    )
    response_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    tokens_used: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    cost_usd: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    retrieval_similarity: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    flagged_injection: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    flagged_off_topic: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    static_fallback_used: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    __table_args__ = (
        Index("idx_tutor_logs_student_created", "student_id", "created_at"),
        Index("idx_tutor_logs_skill_created", "skill_id", "created_at"),
    )


class TutorMonthlyCostBudget(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Tracks monthly LLM token consumption, accumulated cost, and budget alert states."""

    __tablename__ = "tutor_monthly_cost_budgets"

    billing_month: Mapped[str] = mapped_column(
        String(7),
        unique=True,
        nullable=False,
        index=True,
        comment="Format: YYYY-MM",
    )
    total_tokens: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    total_cost_usd: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    budget_limit_usd: Mapped[float] = mapped_column(
        Float,
        default=50.0,
        nullable=False,
    )
    alert_triggered: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    last_reset_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )
