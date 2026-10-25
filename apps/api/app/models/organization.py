"""Schools, classes, enrollments, guardians, and consent models."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class School(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Institutional school entity indexed by official UDISE+ code."""

    __tablename__ = "schools"

    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    block: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pincode: Mapped[str] = mapped_column(String(10), nullable=False)

    classes: Mapped[list["SchoolClass"]] = relationship(
        back_populates="school", cascade="all, delete-orphan"
    )


class SchoolClass(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """School classroom section grouped by grade (Classes 6-10) and academic year."""

    __tablename__ = "classes"

    school_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("schools.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    grade: Mapped[int] = mapped_column(Integer, nullable=False)
    section: Mapped[str] = mapped_column(String(10), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False)

    school: Mapped["School"] = relationship(back_populates="classes")
    enrollments: Mapped[list["Enrollment"]] = relationship(
        back_populates="school_class", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint(
            "school_id", "grade", "section", "academic_year", name="uq_school_class_year"
        ),
        Index("idx_classes_school_grade", "school_id", "grade"),
    )


class Enrollment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Student enrollment linking student users to specific school classes."""

    __tablename__ = "enrollments"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    class_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("classes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    roll_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)

    school_class: Mapped["SchoolClass"] = relationship(back_populates="enrollments")

    __table_args__ = (
        UniqueConstraint("student_id", "class_id", name="uq_student_class_enrollment"),
    )


class Guardian(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Parent or legal guardian associated with a minor student."""

    __tablename__ = "guardians"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    guardian_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    relation_type: Mapped[str] = mapped_column("relationship", String(50), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    consents: Mapped[list["Consent"]] = relationship(back_populates="guardian")


class Consent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Parental and student consent record compliant with DPDP Act 2023."""

    __tablename__ = "consents"

    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    guardian_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("guardians.id", ondelete="SET NULL"),
        nullable=True,
    )
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    scope: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="e.g. diagnostic, learning, data_sharing, offline_sync",
    )
    is_granted: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)

    guardian: Mapped["Guardian | None"] = relationship(back_populates="consents")

    __table_args__ = (Index("idx_consents_student_scope", "student_id", "scope"),)
