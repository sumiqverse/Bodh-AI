"""Tests ensuring zero answer leaks to students across all question endpoints."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import Question, QuestionTranslation
from app.models.auth import User
from app.models.curriculum import Curriculum, Skill, Topic


@pytest.fixture
async def sample_questions_leak(
    db_session: AsyncSession,
) -> tuple[Skill, Question, Question]:
    """Seed questions with verified answers and varying statuses."""
    uid = uuid.uuid4().hex[:8]
    curr = Curriculum(
        code=f"CURR-LEAK-{uid}", board="CBSE", grade=8, subject="mathematics", version="1.0"
    )
    db_session.add(curr)
    await db_session.flush()

    topic = Topic(
        curriculum_id=curr.id, code=f"TOPIC-LEAK-{uid}", name="Leak Topic", sequence_order=1
    )
    db_session.add(topic)
    await db_session.flush()

    skill = Skill(
        topic_id=topic.id,
        code=f"SKILL-LEAK-{uid}",
        name="Leak Prevention Skill",
        description="Verify zero answer leak",
        difficulty=0.5,
        blooms_level="apply",
    )
    db_session.add(skill)
    await db_session.flush()

    # 1. Draft Question
    q_draft = Question(
        code=f"Q-DRAFT-{uid}",
        skill_id=skill.id,
        difficulty=2,
        question_type="mcq",
        status="draft",
        needs_teacher_review=True,
        version=1,
    )
    db_session.add(q_draft)
    await db_session.flush()

    t_draft = QuestionTranslation(
        question_id=q_draft.id,
        language="en",
        prompt="Draft question prompt",
        options=[
            {"id": "A", "text": "Draft Option A", "is_correct": False},
            {"id": "B", "text": "Draft Option B", "is_correct": True},
        ],
        verified_answer="B",
        worked_solution="Draft worked solution",
        explanation="Draft explanation",
        hints=["H1", "H2", "H3"],
    )
    db_session.add(t_draft)

    # 2. Published Question
    q_published = Question(
        code=f"Q-PUB-{uid}",
        skill_id=skill.id,
        difficulty=3,
        question_type="mcq",
        status="published",
        needs_teacher_review=False,
        version=1,
    )
    db_session.add(q_published)
    await db_session.flush()

    t_pub = QuestionTranslation(
        question_id=q_published.id,
        language="en",
        prompt="Published question prompt: What is 2 + 2?",
        options=[
            {"id": "A", "text": "3", "is_correct": False},
            {"id": "B", "text": "4", "is_correct": True},
            {"id": "C", "text": "5", "is_correct": False},
        ],
        verified_answer="B",
        worked_solution="2 + 2 = 4 by basic arithmetic.",
        explanation="Four is the sum of two and two.",
        hints=["Add two and two.", "Count 2 units forward.", "The result is 4."],
    )
    db_session.add(t_pub)
    await db_session.commit()

    return skill, q_draft, q_published


@pytest.mark.asyncio
async def test_student_list_questions_never_leaks_answers(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
    sample_questions_leak: tuple[Skill, Question, Question],
) -> None:
    """Student listing questions must ONLY receive published items with no leaks."""
    _student, _token, headers = student_auth
    skill, _q_draft, _q_pub = sample_questions_leak

    resp = await client.get(f"/api/v1/questions?skill_id={skill.id}", headers=headers)
    assert resp.status_code == 200

    items = resp.json()
    assert len(items) == 1, "Students must NOT see draft questions in list endpoint"
    item = items[0]
    assert item["code"] == _q_pub.code

    # Absolute answer leak assertions
    assert "verified_answer" not in item, (
        "CRITICAL: verified_answer leaked in student list response!"
    )
    assert "worked_solution" not in item, (
        "CRITICAL: worked_solution leaked in student list response!"
    )

    # Ensure option distractors do not reveal is_correct
    for opt in item.get("options") or []:
        assert "is_correct" not in opt, "CRITICAL: is_correct leaked in option response!"


@pytest.mark.asyncio
async def test_student_get_single_question_leak_protection(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
    sample_questions_leak: tuple[Skill, Question, Question],
) -> None:
    """Single question detail for students must conceal answer and block unpublished items."""
    _student, _token, headers = student_auth
    _skill, q_draft, q_published = sample_questions_leak

    # 1. Draft question returns 404 to student
    resp_draft = await client.get(f"/api/v1/questions/{q_draft.id}", headers=headers)
    assert resp_draft.status_code == 404

    # 2. Published question returns sanitised data
    resp_pub = await client.get(f"/api/v1/questions/{q_published.id}", headers=headers)
    assert resp_pub.status_code == 200

    data = resp_pub.json()
    assert "verified_answer" not in data, "CRITICAL: verified_answer leaked to student!"
    assert "worked_solution" not in data, "CRITICAL: worked_solution leaked to student!"

    for opt in data.get("options") or []:
        assert "is_correct" not in opt, "CRITICAL: is_correct leaked to student!"


@pytest.mark.asyncio
async def test_educator_can_inspect_full_solution_and_answers(
    client: AsyncClient,
    teacher_auth: tuple[User, str, dict[str, str]],
    sample_questions_leak: tuple[Skill, Question, Question],
) -> None:
    """Teachers and Admins can view verified answers and worked solutions via management routes."""
    _teacher, _token, headers = teacher_auth
    _skill, _q_draft, q_published = sample_questions_leak

    resp = await client.get(f"/api/v1/questions/{q_published.id}/detail", headers=headers)
    assert resp.status_code == 200

    data = resp.json()
    assert data["verified_answer"] == "B"
    assert "2 + 2 = 4" in data["worked_solution"]
    assert data["status"] == "published"
