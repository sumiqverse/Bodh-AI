"""Teacher-authored lesson content for an individual classroom."""

import uuid

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ClassroomLesson(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "classroom_lessons"

    class_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True
    )
    language: Mapped[str] = mapped_column(String(10), nullable=False)
    difficulty: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "class_id", "skill_id", "language", "difficulty", name="uq_class_lesson_level"
        ),
    )
