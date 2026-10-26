"""Teacher dashboard models: assignments, allocations, decisions, and aggregates."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
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

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.auth import User
    from app.models.curriculum import Skill
    from app.models.organization import SchoolClass


class Assignment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Targeted learning assignment pushed to a student group or whole class."""

    __tablename__ = "assignments"

    class_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("classes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    skill_ids: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        comment="Array of skill UUIDs or skill codes assigned for practice",
    )
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        String(30),
        default="active",
        nullable=False,
        comment="active, completed, archived",
    )

    school_class: Mapped[SchoolClass] = relationship(foreign_keys=[class_id])
    teacher: Mapped[User] = relationship(foreign_keys=[teacher_id])
    student_assignments: Mapped[list[AssignmentStudent]] = relationship(
        back_populates="assignment", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("idx_assignments_class_status", "class_id", "status"),)


class AssignmentStudent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Tracking assignment completion per student."""

    __tablename__ = "assignment_students"

    assignment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assignments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="assigned",
        nullable=False,
        comment="assigned, in_progress, completed",
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    assignment: Mapped[Assignment] = relationship(back_populates="student_assignments")
    student: Mapped[User] = relationship(foreign_keys=[student_id])

    __table_args__ = (
        UniqueConstraint("assignment_id", "student_id", name="uq_assignment_student"),
        Index("idx_assignment_student_status", "assignment_id", "status"),
    )


class TeacherDecision(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Audit record capturing teacher's decision on AI/engine recommendations."""

    __tablename__ = "teacher_decisions"

    class_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("classes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    suggestion_id: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Identifier of the system suggestion (e.g. gap-cluster or pathway recommendation)",
    )
    action: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        comment="accepted, edited, ignored, overridden",
    )
    evidence: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        comment="Snapshot of student diagnostic evidence and attempt signals",
    )
    rationale: Mapped[str] = mapped_column(Text, nullable=False, default="")
    teacher_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    custom_payload: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
        comment="Payload when edited or overridden (e.g. custom skill order)",
    )

    school_class: Mapped[SchoolClass] = relationship(foreign_keys=[class_id])
    teacher: Mapped[User] = relationship(foreign_keys=[teacher_id])
    student: Mapped[User | None] = relationship(foreign_keys=[student_id])

    __table_args__ = (
        Index("idx_teacher_decisions_class_teacher", "class_id", "teacher_id"),
        Index("idx_teacher_decisions_suggestion", "suggestion_id"),
    )


class ClassSkillAggregate(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Precomputed summary of mastery state per class and skill for sub-300ms heatmap response."""

    __tablename__ = "class_skill_aggregates"

    class_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("classes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mastered_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    partial_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    not_learned_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_students: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_p_mastery: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    last_computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    school_class: Mapped[SchoolClass] = relationship(foreign_keys=[class_id])
    skill: Mapped[Skill] = relationship(foreign_keys=[skill_id])

    __table_args__ = (
        UniqueConstraint("class_id", "skill_id", name="uq_class_skill_aggregate"),
        Index("idx_class_skill_agg_class_skill", "class_id", "skill_id"),
    )
