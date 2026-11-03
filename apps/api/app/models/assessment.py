"""Question, translations, student attempts, mastery state, and recommendations."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Question(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Assessment item calibrated for cognitive diagnosis."""

    __tablename__ = "questions"

    code: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    class_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=True, index=True
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    difficulty: Mapped[int] = mapped_column(
        Integer, default=3, nullable=False, comment="Difficulty level 1-5"
    )
    question_type: Mapped[str] = mapped_column(
        String(30),
        default="mcq",
        nullable=False,
        comment="mcq, numeric, short_text",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="draft",
        nullable=False,
        index=True,
        comment="draft, reviewed, published",
    )
    needs_teacher_review: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    reviewer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    default_language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    translations: Mapped[list["QuestionTranslation"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
    )
    version_history: Mapped[list["QuestionVersion"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuestionVersion.version_number.desc()",
    )


class QuestionTranslation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Localized question prompt, distractors, progressive hints, and step explanations."""

    __tablename__ = "question_translations"

    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    language: Mapped[str] = mapped_column(String(10), nullable=False, comment="en, hi, etc.")
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Array of option objects: [{id: 'A', text: '...', is_correct: true}]",
    )
    verified_answer: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        default="",
        comment="Exact canonical verified answer for automated evaluation",
    )
    worked_solution: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
        comment="Step-by-step worked mathematical solution",
    )
    explanation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    hints: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        comment="Ordered progressive scaffold hints (exactly 3)",
    )

    question: Mapped["Question"] = relationship(back_populates="translations")

    __table_args__ = (
        UniqueConstraint("question_id", "language", name="uq_question_translation_lang"),
        Index("idx_translations_question_lang", "question_id", "language"),
    )


class QuestionVersion(Base, UUIDPrimaryKeyMixin):
    """Immutable audit snapshot of question and translations per version update."""

    __tablename__ = "question_versions"

    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    changed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    change_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    question: Mapped["Question"] = relationship(back_populates="version_history")

    __table_args__ = (
        UniqueConstraint("question_id", "version_number", name="uq_question_version"),
        Index("idx_question_versions_qid_v", "question_id", "version_number"),
    )


class Attempt(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Student practice or diagnostic attempt.

    Partitioned monthly on created_at in PostgreSQL, indexed on (student_id, skill_id, created_at).
    """

    __tablename__ = "attempts"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    class_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("classes.id", ondelete="SET NULL"), nullable=True, index=True
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("questions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    idempotency_key: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
        comment="Prevents double-submission from offline sync or duplicate network clicks",
    )
    selected_answer: Mapped[str] = mapped_column(String(255), nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    time_spent_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    client_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("idx_attempts_student_skill_created", "student_id", "skill_id", "created_at"),
        {"postgresql_partition_by": "RANGE (created_at)"},
    )


class Mastery(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Bayesian knowledge state reflecting competency mastery for a specific student and skill."""

    __tablename__ = "mastery"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    class_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=True, index=True
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    p_mastery: Mapped[float] = mapped_column(
        Float,
        default=0.1,
        nullable=False,
        comment="Posterior probability of mastery [0.0 - 1.0]",
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        default=0.5,
        nullable=False,
        comment="Statistical confidence metric [0.0 - 1.0]",
    )
    attempts_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    correct_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_attempted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        Index(
            "uq_mastery_unscoped",
            "student_id",
            "skill_id",
            unique=True,
            postgresql_where=class_id.is_(None),
            sqlite_where=class_id.is_(None),
        ),
        Index(
            "uq_mastery_class",
            "student_id",
            "skill_id",
            "class_id",
            unique=True,
            postgresql_where=class_id.is_not(None),
            sqlite_where=class_id.is_not(None),
        ),
        Index("idx_mastery_student_p", "student_id", "p_mastery"),
    )


class Recommendation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Personalized learning pathway recommendation generated by the adaptive engine."""

    __tablename__ = "recommendations"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reason: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="prerequisite_gap, next_in_sequence, revision, challenge",
    )
    priority_score: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False,
        comment="pending, completed, skipped",
    )

    __table_args__ = (Index("idx_recommendations_student_status", "student_id", "status"),)


class DiagnosticSession(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Durable diagnostic state, owned by a single student."""

    __tablename__ = "diagnostic_sessions"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    snapshot: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
