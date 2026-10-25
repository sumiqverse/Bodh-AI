"""Audit logging, client synchronization events, and vector embeddings."""

import uuid
from datetime import datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AuditLog(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Immutable audit log for security, compliance, and DPDP tracking."""

    __tablename__ = "audit_logs"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(100), nullable=False)
    changes: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)

    __table_args__ = (
        Index("idx_audit_logs_action_created", "action", "created_at"),
        Index("idx_audit_logs_resource", "resource_type", "resource_id"),
    )


class SyncEvent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Offline-first synchronization event queue item."""

    __tablename__ = "sync_events"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    client_event_id: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        nullable=False,
        index=True,
        comment="Client UUID preventing duplicate event replaying",
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    synced_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        default="processed",
        nullable=False,
        comment="processed, failed, duplicate",
    )
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)

    __table_args__ = (Index("idx_sync_events_student_status", "student_id", "status"),)


class Embedding(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Vector embeddings for semantic search across curriculum skills and questions."""

    __tablename__ = "embeddings"

    resource_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="skill, question, topic",
    )
    resource_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    vector: Mapped[list[float]] = mapped_column(
        Vector(384),
        nullable=False,
        comment="Sentence transformer 384-dimensional dense embedding",
    )
    model_version: Mapped[str] = mapped_column(
        String(50), default="all-MiniLM-L6-v2", nullable=False
    )

    __table_args__ = (Index("idx_embeddings_resource", "resource_type", "resource_id"),)
