"""Unit tests for repository layer and database operations."""

import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import Role
from app.models.curriculum import Curriculum, Topic
from app.models.organization import School
from app.repositories.attempt_repo import AttemptRepository
from app.repositories.base import BaseRepository
from app.repositories.class_repo import ClassRepository
from app.repositories.consent_repo import ConsentRepository
from app.repositories.curriculum_repo import CurriculumRepository
from app.repositories.mastery_repo import MasteryRepository
from app.repositories.question_repo import QuestionRepository
from app.repositories.skill_repo import SkillRepository
from app.repositories.user_repo import UserRepository
from tests.factories import (
    CurriculumFactory,
    QuestionFactory,
    SchoolFactory,
    SkillFactory,
    TopicFactory,
    UserFactory,
)


@pytest.mark.asyncio
async def test_base_repository_crud(db_session: AsyncSession) -> None:
    """Test BaseRepository generic CRUD operations: create, get, list, count, update, delete."""
    repo = BaseRepository[Role](Role, db_session)

    # 1. Create
    role = Role(
        id=uuid.uuid4(),
        name="test_curator",
        description="Curates learning content",
        permissions=["content:write"],
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    created = await repo.create(role)
    assert created.id == role.id

    # 2. Get by ID
    fetched = await repo.get_by_id(role.id)
    assert fetched is not None
    assert fetched.name == "test_curator"

    # 3. List & Count
    items = await repo.list(skip=0, limit=10)
    assert any(r.id == role.id for r in items)
    count = await repo.count()
    assert count >= 1

    # 4. Update
    fetched.description = "Updated description"
    updated = await repo.update(fetched)
    assert updated.description == "Updated description"

    # 5. Delete (hard delete)
    await repo.delete(fetched, soft=False)

    # Confirm gone
    after_delete = await repo.get_by_id(role.id)
    assert after_delete is None

    # 6. Soft delete on model with is_deleted
    from app.models.auth import User

    user_repo_base = BaseRepository[User](User, db_session)
    temp_user = await user_repo_base.create(UserFactory.build(role_id=role.id))
    await user_repo_base.delete(temp_user, soft=True)
    assert temp_user.is_deleted is True
    assert temp_user.deleted_at is not None
    # Count with filters
    c_filtered = await user_repo_base.count(filters=[User.id == temp_user.id])
    assert c_filtered == 0


@pytest.mark.asyncio
async def test_user_repository(db_session: AsyncSession) -> None:
    """Test UserRepository lookups: email, phone, and default role."""
    user_repo = UserRepository(db_session)

    # Retrieve existing or create custom role
    custom_role_name = f"role_{uuid.uuid4().hex[:6]}"
    role = await user_repo.get_or_create_default_role(custom_role_name)
    assert role.name == custom_role_name

    user = UserFactory.build(
        email="unique_student@bodhai.org",
        phone="+919999912345",
        role_id=role.id,
    )
    await user_repo.create(user)

    # Lookup by email
    by_email = await user_repo.get_by_email("unique_student@bodhai.org")
    assert by_email is not None
    assert by_email.id == user.id

    # Lookup by non-existent email
    assert await user_repo.get_by_email("unknown@bodhai.org") is None

    # Lookup by phone
    by_phone = await user_repo.get_by_phone("+919999912345")
    assert by_phone is not None
    assert by_phone.id == user.id

    # Lookup by non-existent phone
    assert await user_repo.get_by_phone("+910000000000") is None


@pytest.mark.asyncio
async def test_curriculum_repository(db_session: AsyncSession) -> None:
    """Test CurriculumRepository lookup by code, filter by grade/board, and topics."""
    curr_repo = CurriculumRepository(db_session)
    topic_repo = BaseRepository[Topic](Topic, db_session)

    curriculum = await curr_repo.create(
        CurriculumFactory.build(code="NCERT_TEST_MATH_8", board="NCERT", grade=8)
    )
    await topic_repo.create(TopicFactory.build(curriculum_id=curriculum.id, sequence_order=1))
    await topic_repo.create(TopicFactory.build(curriculum_id=curriculum.id, sequence_order=2))

    # Lookup by code
    fetched = await curr_repo.get_by_code("NCERT_TEST_MATH_8")
    assert fetched is not None
    assert fetched.id == curriculum.id

    assert await curr_repo.get_by_code("NON_EXISTENT") is None

    # List by grade and board
    filtered_list = await curr_repo.list_by_grade_and_board(grade=8, board="NCERT")
    assert any(c.id == curriculum.id for c in filtered_list)

    # Topics by curriculum
    topics = await curr_repo.get_topics(curriculum.id)
    assert len(topics) == 2
    assert topics[0].sequence_order <= topics[1].sequence_order


@pytest.mark.asyncio
async def test_skill_repository(db_session: AsyncSession) -> None:
    """Test SkillRepository: lookup by code, topic, prerequisites."""
    curr_repo = BaseRepository[Curriculum](Curriculum, db_session)
    topic_repo = BaseRepository[Topic](Topic, db_session)
    skill_repo = SkillRepository(db_session)

    curriculum = await curr_repo.create(CurriculumFactory.build())
    topic = await topic_repo.create(TopicFactory.build(curriculum_id=curriculum.id))

    parent_skill = await skill_repo.create(
        SkillFactory.build(topic_id=topic.id, code="SKILL_PREREQ")
    )
    child_skill = await skill_repo.create(
        SkillFactory.build(topic_id=topic.id, code="SKILL_TARGET")
    )

    # Add prerequisite
    prereq = await skill_repo.add_prerequisite(parent_skill.id, child_skill.id)
    assert prereq.parent_skill_id == parent_skill.id

    # Lookup by code
    by_code = await skill_repo.get_by_code("SKILL_TARGET")
    assert by_code is not None
    assert by_code.id == child_skill.id

    # Lookup by topic
    topic_skills = await skill_repo.list_by_topic(topic.id)
    assert len(topic_skills) >= 2

    # Lookup prerequisites
    prereqs = await skill_repo.get_prerequisites(child_skill.id)
    assert len(prereqs) == 1
    assert prereqs[0].parent_skill_id == parent_skill.id


@pytest.mark.asyncio
async def test_question_repository(db_session: AsyncSession) -> None:
    """Test QuestionRepository: lookup with translations and add translation."""
    curr_repo = BaseRepository[Curriculum](Curriculum, db_session)
    topic_repo = BaseRepository[Topic](Topic, db_session)
    skill_repo = SkillRepository(db_session)
    question_repo = QuestionRepository(db_session)

    curriculum = await curr_repo.create(CurriculumFactory.build())
    topic = await topic_repo.create(TopicFactory.build(curriculum_id=curriculum.id))
    skill = await skill_repo.create(SkillFactory.build(topic_id=topic.id))

    question = await question_repo.create(QuestionFactory.build(skill_id=skill.id))
    await question_repo.add_translation(
        question_id=question.id,
        language="en",
        prompt="What is 3/7 + 2/7?",
        options=[
            {"id": "A", "text": "5/7", "is_correct": True},
            {"id": "B", "text": "5/14", "is_correct": False},
        ],
        explanation="Add numerators: 3+2=5.",
        hints=["Keep denominator 7."],
    )
    await question_repo.add_translation(
        question_id=question.id,
        language="hi",
        prompt="3/7 + 2/7 का मान क्या है?",
        options=[
            {"id": "A", "text": "5/7", "is_correct": True},
            {"id": "B", "text": "5/14", "is_correct": False},
        ],
        explanation="अंश जोड़ें: 3+2=5.",
        hints=["हर 7 को अपरिवर्तित रखें।"],
    )

    # Get by ID with translations
    q_loaded = await question_repo.get_with_translations(question.id)
    assert q_loaded is not None
    assert len(q_loaded.translations) == 2

    # List by skill
    by_skill = await question_repo.list_by_skill(skill.id)
    assert len(by_skill) >= 1


@pytest.mark.asyncio
async def test_attempt_repository(db_session: AsyncSession) -> None:
    """Test AttemptRepository: record, idempotency lookup, list by student and skill."""
    attempt_repo = AttemptRepository(db_session)

    student_id = uuid.uuid4()
    skill_id = uuid.uuid4()
    question_id = uuid.uuid4()
    idempotency_key = f"idem_test_{uuid.uuid4()}"

    created = await attempt_repo.record_attempt(
        student_id=student_id,
        question_id=question_id,
        skill_id=skill_id,
        idempotency_key=idempotency_key,
        selected_answer="A",
        is_correct=True,
        time_spent_ms=12000,
        client_timestamp=datetime.now(UTC),
    )
    assert created.idempotency_key == idempotency_key

    # Lookup by idempotency key
    found = await attempt_repo.get_by_idempotency_key(idempotency_key)
    assert found is not None
    assert found.id == created.id

    assert await attempt_repo.get_by_idempotency_key("non_existent_key") is None

    # List by student and skill
    recent = await attempt_repo.list_by_student_and_skill(student_id, skill_id, limit=5)
    assert len(recent) == 1
    assert recent[0].id == created.id


@pytest.mark.asyncio
async def test_mastery_repository(db_session: AsyncSession) -> None:
    """Test MasteryRepository: get, upsert, list."""
    mastery_repo = MasteryRepository(db_session)

    student_id = uuid.uuid4()
    skill_id = uuid.uuid4()

    # Initial upsert
    m1 = await mastery_repo.upsert_mastery(
        student_id=student_id,
        skill_id=skill_id,
        p_mastery=0.6,
        confidence=0.8,
        is_correct=True,
    )
    assert m1.p_mastery == 0.6
    assert m1.attempts_count == 1
    assert m1.correct_count == 1

    # Second upsert
    m2 = await mastery_repo.upsert_mastery(
        student_id=student_id,
        skill_id=skill_id,
        p_mastery=0.75,
        confidence=0.85,
        is_correct=True,
    )
    assert m2.id == m1.id
    assert m2.p_mastery == 0.75
    assert m2.attempts_count == 2
    assert m2.correct_count == 2

    # Third upsert (incorrect)
    m3 = await mastery_repo.upsert_mastery(
        student_id=student_id,
        skill_id=skill_id,
        p_mastery=0.5,
        confidence=0.8,
        is_correct=False,
    )
    assert m3.attempts_count == 3
    assert m3.correct_count == 2

    # List student mastery
    overview = await mastery_repo.list_student_mastery(student_id)
    assert len(overview) == 1
    assert overview[0].skill_id == skill_id


@pytest.mark.asyncio
async def test_consent_repository(db_session: AsyncSession) -> None:
    """Test ConsentRepository: grant consent, check has_consent, list active, revoke."""
    consent_repo = ConsentRepository(db_session)
    student_id = uuid.uuid4()

    consent = await consent_repo.grant_consent(
        student_id=student_id,
        scope="diagnostic",
        version="2024.1",
        ip_address="127.0.0.1",
    )
    assert consent.student_id == student_id
    assert consent.scope == "diagnostic"
    assert consent.is_granted is True

    # Has active consent
    has_active = await consent_repo.has_consent(student_id, "diagnostic")
    assert has_active is True

    has_not = await consent_repo.has_consent(student_id, "marketing")
    assert has_not is False

    # Get active consents
    active = await consent_repo.get_active_consents(student_id)
    assert len(active) >= 1
    assert any(c.scope == "diagnostic" for c in active)

    # Revoke consent
    revoked = await consent_repo.revoke_consent(consent.id)
    assert revoked is not None
    assert revoked.is_granted is False
    assert revoked.revoked_at is not None

    # Confirm no longer active
    assert await consent_repo.has_consent(student_id, "diagnostic") is False


@pytest.mark.asyncio
async def test_class_repository(db_session: AsyncSession) -> None:
    """Test ClassRepository operations: create, get by id with teacher, join code, enrollments."""
    role_repo = BaseRepository[Role](Role, db_session)
    role = await role_repo.create(
        Role(id=uuid.uuid4(), name="cls_test_role", description="", permissions=[])
    )
    user_repo = UserRepository(db_session)
    teacher = await user_repo.create(UserFactory.build(role_id=role.id))
    student = await user_repo.create(UserFactory.build(role_id=role.id))
    school_repo = BaseRepository[School](School, db_session)
    school = await school_repo.create(SchoolFactory.build())

    class_repo = ClassRepository(db_session)
    cls = await class_repo.create_class(
        teacher_id=teacher.id,
        school_id=school.id,
        name="Test Class 10A",
        grade=10,
        section="A",
        academic_year="2024-2025",
    )
    assert cls.id is not None
    assert cls.name == "Test Class 10A"
    assert cls.join_code is not None

    # Fetch by ID with teacher
    fetched = await class_repo.get_by_id_with_teacher(cls.id)
    assert fetched is not None
    assert fetched.teacher.id == teacher.id

    # Fetch by join code
    by_code = await class_repo.get_by_join_code(cls.join_code)
    assert by_code is not None
    assert by_code.id == cls.id

    # Rotate join code
    rotated = await class_repo.rotate_join_code(cls.id, "NEWCODE123")
    assert rotated is not None
    assert rotated.join_code == "NEWCODE123"

    # Classes by teacher
    teacher_classes = await class_repo.get_classes_by_teacher(teacher.id)
    assert len(teacher_classes) >= 1

    # Active classes
    all_classes = await class_repo.get_all_active_classes()
    assert len(all_classes) >= 1

    # Enrollments
    enrollment = await class_repo.add_enrollment(
        class_id=cls.id,
        student_id=student.id,
        roll_number="01",
        status="pending",
    )
    assert enrollment.class_id == cls.id
    assert enrollment.student_id == student.id

    approved = await class_repo.approve_enrollment(cls.id, student.id)
    assert approved is not None
    assert approved.status == "active"

    enrollments = await class_repo.get_enrollments(cls.id)
    assert len(enrollments) >= 1

    single_enrollment = await class_repo.get_enrollment(cls.id, student.id)
    assert single_enrollment is not None
    assert single_enrollment.roll_number == "01"

    # Re-enroll / update existing
    updated = await class_repo.add_enrollment(cls.id, student.id, roll_number="02", status="active")
    assert updated.roll_number == "02"

    # Student enrollments
    st_enrollments = await class_repo.get_student_enrollments(student.id)
    assert len(st_enrollments) >= 1

    # Remove enrollment
    removed = await class_repo.remove_enrollment(cls.id, student.id)
    assert removed is True
