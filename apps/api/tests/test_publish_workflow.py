"""Tests for editorial review workflow and role-based permissions.

Covers transitions: draft -> reviewed -> published.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import Question, QuestionTranslation, QuestionVersion
from app.models.auth import User
from app.models.curriculum import Curriculum, Skill, Topic


@pytest.fixture
async def sample_question(db_session: AsyncSession) -> tuple[Question, Skill]:
    """Seed curriculum, topic, skill, and question in draft state."""
    uid = uuid.uuid4().hex[:8]
    curr = Curriculum(
        code=f"CURR-WF-{uid}", board="CBSE", grade=8, subject="mathematics", version="1.0"
    )
    db_session.add(curr)
    await db_session.flush()

    topic = Topic(
        curriculum_id=curr.id, code=f"TOPIC-WF-{uid}", name="Workflow Topic", sequence_order=1
    )
    db_session.add(topic)
    await db_session.flush()

    skill = Skill(
        topic_id=topic.id,
        code=f"SKILL-WF-{uid}",
        name="Workflow Skill",
        description="Testing editorial workflow",
        difficulty=0.5,
        blooms_level="understand",
    )
    db_session.add(skill)
    await db_session.flush()

    question = Question(
        code=f"Q-WF-{uid}",
        skill_id=skill.id,
        difficulty=3,
        question_type="mcq",
        status="draft",
        needs_teacher_review=True,
        version=1,
    )
    db_session.add(question)
    await db_session.flush()

    trans = QuestionTranslation(
        question_id=question.id,
        language="en",
        prompt="Sample workflow item?",
        options=[
            {"id": "A", "text": "Option A", "is_correct": True},
            {"id": "B", "text": "Option B", "is_correct": False},
        ],
        verified_answer="A",
        worked_solution="Step 1: Check A.",
        explanation="A is correct.",
        hints=["Hint 1", "Hint 2", "Hint 3"],
    )
    db_session.add(trans)
    await db_session.commit()
    return question, skill


@pytest.mark.asyncio
async def test_student_cannot_publish_question(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
    sample_question: tuple[Question, Skill],
) -> None:
    """Students attempting to transition question status must be rejected with 403 Forbidden."""
    _student, _token, headers = student_auth
    question, _ = sample_question

    resp = await client.put(
        f"/api/v1/questions/{question.id}/status",
        json={"status": "published"},
        headers=headers,
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_teacher_can_review_and_publish_question(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_auth: tuple[User, str, dict[str, str]],
    sample_question: tuple[Question, Skill],
) -> None:
    """Teacher can transition question draft -> reviewed -> published and reviewer is recorded."""
    teacher, _token, headers = admin_auth
    question, _ = sample_question

    # Step 1: draft -> reviewed
    resp1 = await client.put(
        f"/api/v1/questions/{question.id}/status",
        json={"status": "reviewed", "needs_teacher_review": True},
        headers=headers,
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["status"] == "reviewed"
    assert data1["reviewer_id"] == str(teacher.id)

    # Step 2: reviewed -> published
    resp2 = await client.put(
        f"/api/v1/questions/{question.id}/status",
        json={"status": "published"},
        headers=headers,
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["status"] == "published"
    assert data2["needs_teacher_review"] is False
    assert data2["reviewer_id"] == str(teacher.id)

    # Verify QuestionVersion snapshot in database
    v_stmt = select(QuestionVersion).where(QuestionVersion.question_id == question.id)
    v_res = await db_session.execute(v_stmt)
    versions = v_res.scalars().all()
    assert len(versions) >= 2
    assert any(v.status == "published" for v in versions)
