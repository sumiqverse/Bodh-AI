"""Factory-boy definitions for generating model instances in tests."""

import uuid
from datetime import UTC, datetime

import factory

from app.models.assessment import Attempt, Mastery, Question, QuestionTranslation
from app.models.auth import Role, User
from app.models.curriculum import Curriculum, Prerequisite, Skill, Topic
from app.models.organization import Consent, Enrollment, Guardian, School, SchoolClass


class RoleFactory(factory.Factory):
    class Meta:
        model = Role

    id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"role_{n}")
    description = "Test Role"
    permissions = factory.LazyFunction(lambda: ["practice:read", "practice:submit"])
    created_at = factory.LazyFunction(lambda: datetime.now(UTC))
    updated_at = factory.LazyFunction(lambda: datetime.now(UTC))


class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.LazyFunction(uuid.uuid4)
    email = factory.Sequence(lambda n: f"student_{n}@example.com")
    phone = factory.Sequence(lambda n: f"+9198765{n:05d}")
    hashed_password = "mock_scrypt_hash"
    full_name = factory.Sequence(lambda n: f"Test Student {n}")
    preferred_language = "en"
    is_active = True
    is_verified = True
    role_id = None
    created_at = factory.LazyFunction(lambda: datetime.now(UTC))
    updated_at = factory.LazyFunction(lambda: datetime.now(UTC))


class SchoolFactory(factory.Factory):
    class Meta:
        model = School

    id = factory.LazyFunction(uuid.uuid4)
    code = factory.Sequence(lambda n: f"SCH{n:04d}")
    name = factory.Sequence(lambda n: f"Government High School {n}")
    state = "Rajasthan"
    district = "Jaipur"
    block = "Jaipur Central"
    pincode = "302001"
    created_at = factory.LazyFunction(lambda: datetime.now(UTC))
    updated_at = factory.LazyFunction(lambda: datetime.now(UTC))


class SchoolClassFactory(factory.Factory):
    class Meta:
        model = SchoolClass

    id = factory.LazyFunction(uuid.uuid4)
    school_id = factory.LazyFunction(uuid.uuid4)
    grade = 8
    section = "A"
    academic_year = "2024-2025"
    created_at = factory.LazyFunction(lambda: datetime.now(UTC))
    updated_at = factory.LazyFunction(lambda: datetime.now(UTC))


class EnrollmentFactory(factory.Factory):
    class Meta:
        model = Enrollment

    id = factory.LazyFunction(uuid.uuid4)
    student_id = factory.LazyFunction(uuid.uuid4)
    class_id = factory.LazyFunction(uuid.uuid4)
    roll_number = factory.Sequence(lambda n: f"{n:02d}")
    status = "active"
    created_at = factory.LazyFunction(lambda: datetime.now(UTC))
    updated_at = factory.LazyFunction(lambda: datetime.now(UTC))


class GuardianFactory(factory.Factory):
    class Meta:
        model = Guardian

    id = factory.LazyFunction(uuid.uuid4)
    student_id = factory.LazyFunction(uuid.uuid4)
    relation_type = "Parent"
    phone = factory.Sequence(lambda n: f"+9199887{n:05d}")
    is_verified = True
    created_at = factory.LazyFunction(lambda: datetime.now(UTC))
    updated_at = factory.LazyFunction(lambda: datetime.now(UTC))


class ConsentFactory(factory.Factory):
    class Meta:
        model = Consent

    id = factory.LazyFunction(uuid.uuid4)
    student_id = factory.LazyFunction(uuid.uuid4)
    guardian_id = None
    version = "2024.1"
    timestamp = factory.LazyFunction(lambda: datetime.now(UTC))
    scope = "diagnostic"
    is_granted = True
    revoked_at = None
    ip_address = "127.0.0.1"
    created_at = factory.LazyFunction(lambda: datetime.now(UTC))
    updated_at = factory.LazyFunction(lambda: datetime.now(UTC))


class CurriculumFactory(factory.Factory):
    class Meta:
        model = Curriculum

    id = factory.LazyFunction(uuid.uuid4)
    code = factory.Sequence(lambda n: f"NCERT_MATH_G{n}")
    board = "NCERT"
    grade = 8
    subject = "Mathematics"
    version = "2024"
    created_at = factory.LazyFunction(lambda: datetime.now(UTC))
    updated_at = factory.LazyFunction(lambda: datetime.now(UTC))


class TopicFactory(factory.Factory):
    class Meta:
        model = Topic

    id = factory.LazyFunction(uuid.uuid4)
    curriculum_id = factory.LazyFunction(uuid.uuid4)
    code = factory.Sequence(lambda n: f"TOPIC_{n}")
    name = factory.Sequence(lambda n: f"Rational Numbers {n}")
    description = "Study of rational numbers"
    sequence_order = 1
    created_at = factory.LazyFunction(lambda: datetime.now(UTC))
    updated_at = factory.LazyFunction(lambda: datetime.now(UTC))


class SkillFactory(factory.Factory):
    class Meta:
        model = Skill

    id = factory.LazyFunction(uuid.uuid4)
    topic_id = factory.LazyFunction(uuid.uuid4)
    code = factory.Sequence(lambda n: f"MATH8_RAT_{n:03d}")
    name = factory.Sequence(lambda n: f"Add Rational Numbers {n}")
    description = "Add two rational numbers with same denominator"
    difficulty = 0.5
    blooms_level = "understand"
    created_at = factory.LazyFunction(lambda: datetime.now(UTC))
    updated_at = factory.LazyFunction(lambda: datetime.now(UTC))


class PrerequisiteFactory(factory.Factory):
    class Meta:
        model = Prerequisite

    id = factory.LazyFunction(uuid.uuid4)
    parent_skill_id = factory.LazyFunction(uuid.uuid4)
    child_skill_id = factory.LazyFunction(uuid.uuid4)
    relation_type = "hard"
    created_at = factory.LazyFunction(lambda: datetime.now(UTC))
    updated_at = factory.LazyFunction(lambda: datetime.now(UTC))


class QuestionFactory(factory.Factory):
    class Meta:
        model = Question

    id = factory.LazyFunction(uuid.uuid4)
    skill_id = factory.LazyFunction(uuid.uuid4)
    difficulty = 0.5
    question_type = "mcq"
    default_language = "en"
    is_active = True
    created_at = factory.LazyFunction(lambda: datetime.now(UTC))
    updated_at = factory.LazyFunction(lambda: datetime.now(UTC))


class QuestionTranslationFactory(factory.Factory):
    class Meta:
        model = QuestionTranslation

    id = factory.LazyFunction(uuid.uuid4)
    question_id = factory.LazyFunction(uuid.uuid4)
    language = "en"
    prompt = "What is 3/7 + 2/7?"
    options = factory.LazyFunction(
        lambda: [
            {"id": "A", "text": "5/7", "is_correct": True},
            {"id": "B", "text": "5/14", "is_correct": False},
            {"id": "C", "text": "1/7", "is_correct": False},
            {"id": "D", "text": "6/7", "is_correct": False},
        ]
    )
    explanation = "When denominators are equal, add numerators: 3 + 2 = 5."
    hints = factory.LazyFunction(lambda: ["Keep the denominator 7 unchanged."])
    created_at = factory.LazyFunction(lambda: datetime.now(UTC))
    updated_at = factory.LazyFunction(lambda: datetime.now(UTC))


class AttemptFactory(factory.Factory):
    class Meta:
        model = Attempt

    id = factory.LazyFunction(uuid.uuid4)
    student_id = factory.LazyFunction(uuid.uuid4)
    skill_id = factory.LazyFunction(uuid.uuid4)
    question_id = factory.LazyFunction(uuid.uuid4)
    idempotency_key = factory.Sequence(lambda n: f"idem_{n}_{uuid.uuid4()}")
    selected_answer = "A"
    is_correct = True
    time_spent_ms = 12000
    client_timestamp = factory.LazyFunction(lambda: datetime.now(UTC))
    created_at = factory.LazyFunction(lambda: datetime.now(UTC))
    updated_at = factory.LazyFunction(lambda: datetime.now(UTC))


class MasteryFactory(factory.Factory):
    class Meta:
        model = Mastery

    id = factory.LazyFunction(uuid.uuid4)
    student_id = factory.LazyFunction(uuid.uuid4)
    skill_id = factory.LazyFunction(uuid.uuid4)
    p_mastery = 0.5
    confidence = 0.8
    attempts_count = 1
    correct_count = 1
    last_attempted_at = factory.LazyFunction(lambda: datetime.now(UTC))
    created_at = factory.LazyFunction(lambda: datetime.now(UTC))
    updated_at = factory.LazyFunction(lambda: datetime.now(UTC))
