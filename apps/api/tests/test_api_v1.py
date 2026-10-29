"""Integration tests for all /api/v1 core learning endpoints."""

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import User
from app.models.curriculum import Curriculum, Topic
from app.repositories.base import BaseRepository
from app.repositories.consent_repo import ConsentRepository
from app.repositories.curriculum_repo import CurriculumRepository
from app.repositories.question_repo import QuestionRepository
from app.repositories.skill_repo import SkillRepository
from tests.factories import (
    CurriculumFactory,
    QuestionFactory,
    SkillFactory,
    TopicFactory,
)


@pytest.mark.asyncio
async def test_curricula_endpoints(
    client: AsyncClient,
    db_session: AsyncSession,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test GET /curricula, GET /curricula/{code}, and GET /curricula/{code}/topics."""
    _, _, headers = student_auth
    curr_repo = CurriculumRepository(db_session)
    topic_repo = BaseRepository[Topic](Topic, db_session)

    curriculum = await curr_repo.create(
        CurriculumFactory.build(code="NCERT_TEST_MATH_9", board="NCERT", grade=9)
    )
    await topic_repo.create(TopicFactory.build(curriculum_id=curriculum.id, name="Number Systems"))
    await db_session.commit()

    # 1. List curricula
    res = await client.get("/api/v1/curricula", headers=headers)
    assert res.status_code == 200
    curricula = res.json()
    assert any(c["code"] == "NCERT_TEST_MATH_9" for c in curricula)

    # 2. Get by code
    res_code = await client.get("/api/v1/curricula/NCERT_TEST_MATH_9", headers=headers)
    assert res_code.status_code == 200
    assert res_code.json()["code"] == "NCERT_TEST_MATH_9"

    # 3. Get non-existent curriculum
    res_404 = await client.get("/api/v1/curricula/NON_EXISTENT_CODE", headers=headers)
    assert res_404.status_code == 404
    assert res_404.headers["content-type"] == "application/problem+json"

    # 4. Get topics
    res_topics = await client.get("/api/v1/curricula/NCERT_TEST_MATH_9/topics", headers=headers)
    assert res_topics.status_code == 200
    topics = res_topics.json()
    assert len(topics) >= 1
    assert topics[0]["name"] == "Number Systems"

    res_topics_404 = await client.get("/api/v1/curricula/NON_EXISTENT_CODE/topics", headers=headers)
    assert res_topics_404.status_code == 404


@pytest.mark.asyncio
async def test_skills_endpoints(
    client: AsyncClient,
    db_session: AsyncSession,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test GET /api/v1/skills/{skill_id}, prerequisites, and by-topic."""
    _, _, headers = student_auth
    curr_repo = BaseRepository[Curriculum](Curriculum, db_session)
    topic_repo = BaseRepository[Topic](Topic, db_session)
    skill_repo = SkillRepository(db_session)

    curriculum = await curr_repo.create(CurriculumFactory.build())
    topic = await topic_repo.create(TopicFactory.build(curriculum_id=curriculum.id))

    p_skill = await skill_repo.create(SkillFactory.build(topic_id=topic.id, code="SKILL_PARENT"))
    c_skill = await skill_repo.create(SkillFactory.build(topic_id=topic.id, code="SKILL_CHILD"))
    await skill_repo.add_prerequisite(p_skill.id, c_skill.id)
    await db_session.commit()

    # 1. Get skill by ID
    res = await client.get(f"/api/v1/skills/{c_skill.id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["code"] == "SKILL_CHILD"

    # 2. Get non-existent skill
    res_skill_404 = await client.get(f"/api/v1/skills/{uuid.uuid4()}", headers=headers)
    assert res_skill_404.status_code == 404

    # 2. Get prerequisites
    res_prereq = await client.get(f"/api/v1/skills/{c_skill.id}/prerequisites", headers=headers)
    assert res_prereq.status_code == 200
    prereqs = res_prereq.json()
    assert len(prereqs) == 1
    assert prereqs[0]["parent_skill_id"] == str(p_skill.id)

    # 3. Get skills by topic
    res_topic = await client.get(f"/api/v1/skills/by-topic/{topic.id}", headers=headers)
    assert res_topic.status_code == 200
    assert len(res_topic.json()) >= 2


@pytest.mark.asyncio
async def test_questions_endpoints(
    client: AsyncClient,
    db_session: AsyncSession,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test GET /api/v1/questions and GET /api/v1/questions/{question_id}."""
    _, _, headers = student_auth
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
        language="hi",
        prompt="3/5 + 1/5 का मान क्या है?",
        options=[
            {"id": "A", "text": "4/5", "is_correct": True},
            {"id": "B", "text": "4/10", "is_correct": False},
        ],
        explanation="अंश जोड़ें: 3+1=4.",
    )
    await db_session.commit()

    # 1. List questions by skill and language
    res = await client.get(f"/api/v1/questions?skill_id={skill.id}&language=hi", headers=headers)
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 1
    assert "3/5 + 1/5" in items[0]["prompt"]

    # 2. Get question by ID with translations
    res_q = await client.get(f"/api/v1/questions/{question.id}?language=hi", headers=headers)
    assert res_q.status_code == 200
    data = res_q.json()
    assert data["id"] == str(question.id)
    assert len(data["options"]) == 2

    # 3. Fallback translation and 404 check
    res_fb = await client.get(f"/api/v1/questions/{question.id}?language=en", headers=headers)
    assert res_fb.status_code == 200
    res_q_404 = await client.get(f"/api/v1/questions/{uuid.uuid4()}", headers=headers)
    assert res_q_404.status_code == 404


@pytest.mark.asyncio
async def test_attempts_endpoints(
    client: AsyncClient,
    db_session: AsyncSession,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test POST /api/v1/attempts submission and duplicate idempotency."""
    student, _, headers = student_auth
    consent_repo = ConsentRepository(db_session)
    await consent_repo.grant_consent(student_id=student.id, scope="practice", version="2026.1")

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
        prompt="What is 5+5?",
        options=[
            {"id": "A", "text": "10", "is_correct": True},
            {"id": "B", "text": "20", "is_correct": False},
        ],
        explanation="5+5=10.",
    )
    await db_session.commit()

    idempotency_key = f"api_attempt_{uuid.uuid4()}"

    payload = {
        "question_id": str(question.id),
        "skill_id": str(skill.id),
        "selected_answer": "A",
        "idempotency_key": idempotency_key,
        "time_spent_ms": 4500,
        "client_timestamp": datetime.now(UTC).isoformat(),
    }

    # 1. First submission
    res = await client.post(
        "/api/v1/attempts",
        json=payload,
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["is_correct"] is True
    assert data["is_duplicate"] is False

    # 2. Resubmission with same idempotency key
    res_dup = await client.post(
        "/api/v1/attempts",
        json=payload,
        headers=headers,
    )
    assert res_dup.status_code == 200
    assert res_dup.json()["attempt_id"] == data["attempt_id"]
    assert res_dup.json()["is_duplicate"] is True

    # 3. Retrieve student attempts history
    res_history = await client.get(f"/api/v1/attempts/student/{student.id}", headers=headers)
    assert res_history.status_code == 200
    assert len(res_history.json()) >= 1


@pytest.mark.asyncio
async def test_mastery_endpoints(
    client: AsyncClient,
    db_session: AsyncSession,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test GET /api/v1/mastery and GET /api/v1/mastery/{skill_id}."""
    student, _, headers = student_auth
    consent_repo = ConsentRepository(db_session)
    await consent_repo.grant_consent(student_id=student.id, scope="practice", version="2026.1")

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
        prompt="Is math fun?",
        options=[{"id": "A", "text": "Yes", "is_correct": True}],
        explanation="Yes it is.",
    )
    await db_session.commit()

    # Submit attempt to generate mastery
    await client.post(
        "/api/v1/attempts",
        json={
            "question_id": str(question.id),
            "skill_id": str(skill.id),
            "selected_answer": "A",
            "idempotency_key": f"mastery_test_{uuid.uuid4()}",
            "time_spent_ms": 2000,
            "client_timestamp": datetime.now(UTC).isoformat(),
        },
        headers=headers,
    )

    # 1. Get mastery list
    res_list = await client.get(f"/api/v1/mastery?student_id={student.id}", headers=headers)
    assert res_list.status_code == 200
    masteries = res_list.json()
    assert len(masteries) >= 1
    assert masteries[0]["skill_id"] == str(skill.id)

    # 2. Get specific skill mastery
    res_single = await client.get(
        f"/api/v1/mastery/{skill.id}?student_id={student.id}", headers=headers
    )
    assert res_single.status_code == 200
    assert res_single.json()["skill_id"] == str(skill.id)

    # 3. Get non-existent mastery
    res_m_404 = await client.get(
        f"/api/v1/mastery/{uuid.uuid4()}?student_id={student.id}", headers=headers
    )
    assert res_m_404.status_code == 404


@pytest.mark.asyncio
async def test_consents_endpoints(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test POST /api/v1/consents and GET /api/v1/consents/student/{student_id}."""
    student, _, headers = student_auth

    # 1. Record consent
    consent_payload = {
        "student_id": str(student.id),
        "guardian_name": "Ramesh Kumar",
        "guardian_phone": "+919876543210",
        "guardian_relationship": "Father",
        "scopes": ["diagnostic", "learning"],
        "version": "2024.1",
    }
    res = await client.post(
        "/api/v1/consents",
        json=consent_payload,
        headers=headers,
    )
    assert res.status_code == 201
    records = res.json()
    assert len(records) == 2
    assert any(c["scope"] == "diagnostic" for c in records)

    # 2. Retrieve student consents
    res_get = await client.get(f"/api/v1/consents/student/{student.id}", headers=headers)
    assert res_get.status_code == 200
    records = res_get.json()
    assert len(records) >= 1
    assert records[0]["scope"] == "diagnostic"


@pytest.mark.asyncio
async def test_sync_endpoints(
    client: AsyncClient,
    db_session: AsyncSession,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test POST /api/v1/sync offline batch processing."""
    student, _, headers = student_auth
    consent_repo = ConsentRepository(db_session)
    await consent_repo.grant_consent(student_id=student.id, scope="practice", version="2026.1")

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
        prompt="1+1=?",
        options=[{"id": "A", "text": "2", "is_correct": True}],
        explanation="1+1=2.",
    )
    await db_session.commit()

    sync_payload = {
        "events": [
            {
                "client_event_id": str(uuid.uuid4()),
                "event_type": "attempt_submission",
                "payload": {
                    "question_id": str(question.id),
                    "skill_id": str(skill.id),
                    "selected_answer": "A",
                    "idempotency_key": str(uuid.uuid4()),
                    "time_spent_ms": 3000,
                    "client_timestamp": datetime.now(UTC).isoformat(),
                },
                "timestamp": datetime.now(UTC).isoformat(),
            }
        ],
    }

    res = await client.post(
        "/api/v1/sync",
        json=sync_payload,
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["processed"] == 1
    assert data["failed"] == 0
    assert len(data["results"]) == 1
    assert data["results"][0]["status"] == "success"
