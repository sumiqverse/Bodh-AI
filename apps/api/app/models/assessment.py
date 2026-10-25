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
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Question(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Assessment item calibrated for cognitive diagnosis."""

    __tablename__ = "questions"

    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    difficulty: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    question_type: Mapped[str] = mapped_column(
        String(30),
        default="mcq",
        nullable=False,
        comment="mcq, numeric, multi_step",
    )
    default_language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    translations: Mapped[list["QuestionTranslation"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
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
    options: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        comment="Array of option objects: [{id: 'A', text: '...', is_correct: true}]",
    )
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    hints: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        comment="Ordered progressive scaffold hints",
    )

    question: Mapped["Question"] = relationship(back_populates="translations")

    __table_args__ = (
        UniqueConstraint("question_id", "language", name="uq_question_translation_lang"),
        Index("idx_translations_question_lang", "question_id", "language"),
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
        UniqueConstraint("student_id", "skill_id", name="uq_mastery_student_skill"),
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
