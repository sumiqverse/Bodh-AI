"""Package containing all SQLAlchemy ORM models for BodhAI."""

from app.db.base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.assessment import Attempt, Mastery, Question, QuestionTranslation, Recommendation
from app.models.auth import Role, Session, User
from app.models.curriculum import Curriculum, Prerequisite, Skill, Topic
from app.models.organization import Consent, Enrollment, Guardian, School, SchoolClass
from app.models.system import AuditLog, Embedding, SyncEvent

__all__ = [
    "Attempt",
    "AuditLog",
    "Base",
    "Consent",
    "Curriculum",
    "Embedding",
    "Enrollment",
    "Guardian",
    "Mastery",
    "Prerequisite",
    "Question",
    "QuestionTranslation",
    "Recommendation",
    "Role",
    "School",
    "SchoolClass",
    "Session",
    "Skill",
    "SoftDeleteMixin",
    "SyncEvent",
    "TimestampMixin",
    "Topic",
    "UUIDPrimaryKeyMixin",
    "User",
]
