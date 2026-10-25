"""Curriculum, topics, skills, and prerequisite graph models."""

import uuid

from sqlalchemy import (
    CheckConstraint,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Curriculum(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Educational board curriculum framework (e.g., NCERT Class 6 Mathematics)."""

    __tablename__ = "curricula"

    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    board: Mapped[str] = mapped_column(
        String(50), nullable=False, comment="e.g. NCERT, CBSE, State Board"
    )
    grade: Mapped[int] = mapped_column(Integer, nullable=False, comment="Classes 6-10")
    subject: Mapped[str] = mapped_column(String(50), nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False)

    topics: Mapped[list["Topic"]] = relationship(
        back_populates="curriculum", cascade="all, delete-orphan"
    )


class Topic(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Curriculum chapter or thematic unit."""

    __tablename__ = "topics"

    curriculum_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("curricula.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sequence_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    curriculum: Mapped["Curriculum"] = relationship(back_populates="topics")
    skills: Mapped[list["Skill"]] = relationship(
        back_populates="topic", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("curriculum_id", "code", name="uq_curriculum_topic_code"),
        Index("idx_topics_curriculum_order", "curriculum_id", "sequence_order"),
    )


class Skill(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Atomic competency node within the knowledge graph."""

    __tablename__ = "skills"

    topic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("topics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    blooms_level: Mapped[str] = mapped_column(
        String(30),
        default="understand",
        nullable=False,
        comment="remember, understand, apply, analyze, evaluate, create",
    )

    topic: Mapped["Topic"] = relationship(back_populates="skills")
    prerequisites: Mapped[list["Prerequisite"]] = relationship(
        foreign_keys="Prerequisite.child_skill_id",
        back_populates="child_skill",
        cascade="all, delete-orphan",
    )
    dependent_skills: Mapped[list["Prerequisite"]] = relationship(
        foreign_keys="Prerequisite.parent_skill_id",
        back_populates="parent_skill",
        cascade="all, delete-orphan",
    )


class Prerequisite(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Directed dependency edge representing knowledge graph prerequisite relationships."""

    __tablename__ = "prerequisites"

    parent_skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    child_skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("skills.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    relation_type: Mapped[str] = mapped_column(
        String(30),
        default="hard",
        nullable=False,
        comment="hard, soft, reinforcing",
    )

    parent_skill: Mapped["Skill"] = relationship(
        foreign_keys=[parent_skill_id], back_populates="dependent_skills"
    )
    child_skill: Mapped["Skill"] = relationship(
        foreign_keys=[child_skill_id], back_populates="prerequisites"
    )

    __table_args__ = (
        CheckConstraint("parent_skill_id != child_skill_id", name="ck_no_self_prerequisite"),
        UniqueConstraint("parent_skill_id", "child_skill_id", name="uq_prerequisite_pair"),
    )


class GlossaryTerm(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """Shared multilingual terminology definition (e.g. Rational Number / परिमेय संख्या)."""

    __tablename__ = "glossary_terms"

    curriculum_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("curricula.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    term_en: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    term_hi: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    definition_en: Mapped[str] = mapped_column(Text, nullable=False)
    definition_hi: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)

    curriculum: Mapped["Curriculum | None"] = relationship()

    __table_args__ = (UniqueConstraint("term_en", "category", name="uq_glossary_term_category"),)
