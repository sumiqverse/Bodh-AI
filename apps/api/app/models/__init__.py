"""Package containing all SQLAlchemy ORM models for BodhAI."""

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.assessment import (
    Attempt,
    Mastery,
    Question,
    QuestionTranslation,
    QuestionVersion,
    Recommendation,
)
from app.models.auth import Role, Session, User
from app.models.curriculum import Curriculum, GlossaryTerm, Prerequisite, Skill, Topic
from app.models.organization import Consent, Enrollment, Guardian, School, SchoolClass
from app.models.system import AuditLog, Embedding, SyncEvent
from app.models.teacher import (
    Assignment,
    AssignmentStudent,
    ClassSkillAggregate,
    TeacherDecision,
)

__all__ = [
    "Assignment",
    "AssignmentStudent",
    "Attempt",
    "AuditLog",
    "Base",
    "ClassSkillAggregate",
    "Consent",
    "Curriculum",
    "Embedding",
    "Enrollment",
    "GlossaryTerm",
    "Guardian",
    "Mastery",
    "Prerequisite",
    "Question",
    "QuestionTranslation",
    "QuestionVersion",
    "Recommendation",
    "Role",
    "School",
    "SchoolClass",
    "Session",
    "Skill",
    "SoftDeleteMixin",
    "SyncEvent",
    "TeacherDecision",
    "TimestampMixin",
    "Topic",
    "UUIDPrimaryKeyMixin",
    "User",
]
