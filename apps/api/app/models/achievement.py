"""Persisted achievement awards for classroom learning."""

import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Achievement(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "achievements"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    class_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    resource_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "student_id", "class_id", "kind", "resource_id", name="uq_achievement_award"
        ),
    )
