"""Integration tests for AI Tutor HTTP API endpoints."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import Question, QuestionTranslation
from app.models.auth import User
from app.models.curriculum import Curriculum, Skill, Topic


@pytest.mark.asyncio
async def test_api_tutor_ask_student_authenticated(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
    db_session: AsyncSession,
) -> None:
    """Ensure authenticated student can submit a query and receive Socratic response."""
    _user, _token, headers = student_auth

    # Seed skill and published question
    curriculum = Curriculum(
        id=uuid.uuid4(),
        code="CURR_API_TEST",
        board="NCERT",
        grade=7,
        subject="Mathematics",
        version="v1",
    )
    db_session.add(curriculum)
    await db_session.flush()

    topic = Topic(
        id=uuid.uuid4(),
        curriculum_id=curriculum.id,
        code="TOPIC_API",
        name="Topic API",
        sequence_order=1,
    )
    db_session.add(topic)
    await db_session.flush()

    skill = Skill(
        id=uuid.uuid4(),
        topic_id=topic.id,
        code="MATH_INT_API",
        name="Integer API Skill",
        description="Adding integers with negative signs.",
        difficulty=0.3,
        blooms_level="understand",
    )
    db_session.add(skill)
    await db_session.flush()

    q = Question(
        id=uuid.uuid4(),
        skill_id=skill.id,
        code="Q_INT_API",
        question_type="short_text",
        difficulty=2,
        status="published",
        needs_teacher_review=False,
        version=1,
        default_language="en",
        is_active=True,
    )
    db_session.add(q)
    await db_session.flush()

    tr = QuestionTranslation(
        id=uuid.uuid4(),
        question_id=q.id,
        language="en",
        prompt="Explain (-3) + (-5)",
        verified_answer="-8",
        worked_solution="Add 3 and 5 to get 8, keep negative sign: -8.",
        explanation="When adding two negative numbers, the result is negative.",
        hints=["Add magnitudes", "Keep sign"],
    )
    db_session.add(tr)
    await db_session.commit()

    # Trigger ingestion via endpoint with admin/teacher auth
    payload = {
        "skill_id": str(skill.id),
        "student_query": "Why is (-3) + (-5) equal to -8?",
        "language": "en",
        "depth": "standard",
        "hint_level": 1,
        "is_test_mode": False,
    }

    res = await client.post("/api/v1/tutor/ask", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "can_help" in data
    assert "explanation" in data


@pytest.mark.asyncio
async def test_api_tutor_ask_test_mode_answer_refusal(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Ensure that in test mode, the API refuses to provide answers or hints."""
    _user, _token, headers = student_auth

    payload = {
        "skill_id": str(uuid.uuid4()),
        "student_query": "I am in test mode, what is the answer to question 2?",
        "language": "en",
        "is_test_mode": True,
    }

    res = await client.post("/api/v1/tutor/ask", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["can_help"] is False
    assert data["refusal_reason"] == "test_mode"
    assert "Test Mode" in data["explanation"]


@pytest.mark.asyncio
async def test_api_tutor_ingest_teacher_authorized(
    client: AsyncClient,
    teacher_auth: tuple[User, str, dict[str, str]],
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Ensure teachers can ingest curriculum, but students are forbidden."""
    _t_user, _t_token, t_headers = teacher_auth
    _s_user, _s_token, s_headers = student_auth

    # Student should get 403 Forbidden
    res_student = await client.post(
        "/api/v1/tutor/ingest",
        json={"force_reindex": False},
        headers=s_headers,
    )
    assert res_student.status_code == 403

    # Teacher should succeed
    res_teacher = await client.post(
        "/api/v1/tutor/ingest",
        json={"force_reindex": True},
        headers=t_headers,
    )
    assert res_teacher.status_code == 200
    data = res_teacher.json()
    assert "total_chunks_created" in data


@pytest.mark.asyncio
async def test_api_tutor_budget_status(
    client: AsyncClient,
    teacher_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Ensure teachers can inspect monthly budget consumption and alert states."""
    _user, _token, headers = teacher_auth

    res = await client.get("/api/v1/tutor/budget", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "billing_month" in data
    assert "total_cost_usd" in data
    assert "budget_limit_usd" in data
    assert "alert_triggered" in data
