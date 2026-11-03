"""Tests for Question Management, Educator Listing, Question Editor, and Error Handling."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import Question, QuestionTranslation
from app.models.auth import User
from app.models.curriculum import Curriculum, Skill, Topic


@pytest.fixture
async def sample_mgmt_data(db_session: AsyncSession) -> tuple[Question, Skill]:
    """Seed curriculum, topic, skill, and question for editor and management testing."""
    uid = uuid.uuid4().hex[:8]
    curr = Curriculum(
        code=f"CURR-MGMT-{uid}",
        board="CBSE",
        grade=8,
        subject="mathematics",
        version="1.0",
    )
    db_session.add(curr)
    await db_session.flush()

    topic = Topic(
        curriculum_id=curr.id,
        code=f"TOPIC-MGMT-{uid}",
        name="Management Topic",
        sequence_order=1,
    )
    db_session.add(topic)
    await db_session.flush()

    skill = Skill(
        topic_id=topic.id,
        code=f"SKILL-MGMT-{uid}",
        name="Management Skill",
        description="Testing management and question editing endpoints",
        difficulty=0.4,
        blooms_level="apply",
    )
    db_session.add(skill)
    await db_session.flush()

    question = Question(
        code=f"Q-MGMT-{uid}",
        skill_id=skill.id,
        difficulty=2,
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
        prompt="Initial prompt for question?",
        options=[
            {"id": "A", "text": "Alpha", "is_correct": True},
            {"id": "B", "text": "Beta", "is_correct": False},
        ],
        verified_answer="A",
        worked_solution="Step 1: Alpha is verified.",
        explanation="Alpha explanation.",
        hints=["H1", "H2", "H3"],
    )
    db_session.add(trans)
    await db_session.commit()
    return question, skill


@pytest.mark.asyncio
async def test_list_questions_for_management(
    client: AsyncClient,
    teacher_auth: tuple[User, str, dict[str, str]],
    student_auth: tuple[User, str, dict[str, str]],
    sample_mgmt_data: tuple[Question, Skill],
) -> None:
    """Test educator management list with filtering options and student authorization checks."""
    _t_user, _t_token, t_headers = teacher_auth
    _s_user, _s_token, s_headers = student_auth
    question, skill = sample_mgmt_data

    # Student cannot access /manage endpoint (403)
    resp_student = await client.get("/api/v1/questions/manage", headers=s_headers)
    assert resp_student.status_code == 403

    # Teacher can list questions with no filters
    resp_all = await client.get("/api/v1/questions/manage", headers=t_headers)
    assert resp_all.status_code == 200
    items = resp_all.json()
    assert any(q["id"] == str(question.id) for q in items)

    # Filter by skill_id
    resp_skill = await client.get(
        f"/api/v1/questions/manage?skill_id={skill.id}", headers=t_headers
    )
    assert resp_skill.status_code == 200
    skill_items = resp_skill.json()
    assert all(q["skill_id"] == str(skill.id) for q in skill_items)

    # Filter by status
    resp_draft = await client.get("/api/v1/questions/manage?status=draft", headers=t_headers)
    assert resp_draft.status_code == 200
    draft_items = resp_draft.json()
    assert all(q["status"] == "draft" for q in draft_items)

    # Filter by needs_teacher_review
    resp_review = await client.get(
        "/api/v1/questions/manage?needs_teacher_review=true", headers=t_headers
    )
    assert resp_review.status_code == 200
    review_items = resp_review.json()
    assert all(q["needs_teacher_review"] is True for q in review_items)


@pytest.mark.asyncio
async def test_get_question_detail(
    client: AsyncClient,
    teacher_auth: tuple[User, str, dict[str, str]],
    student_auth: tuple[User, str, dict[str, str]],
    sample_mgmt_data: tuple[Question, Skill],
) -> None:
    """Educators can inspect full question details including solutions; students are forbidden."""
    _t_user, _t_token, t_headers = teacher_auth
    _s_user, _s_token, s_headers = student_auth
    question, _ = sample_mgmt_data

    # Student receives 403
    resp_student = await client.get(f"/api/v1/questions/{question.id}/detail", headers=s_headers)
    assert resp_student.status_code == 403

    # Teacher receives 200 with full details
    resp_teacher = await client.get(f"/api/v1/questions/{question.id}/detail", headers=t_headers)
    assert resp_teacher.status_code == 200
    detail = resp_teacher.json()
    assert detail["id"] == str(question.id)
    assert detail["verified_answer"] == "A"
    assert "worked_solution" in detail
    assert len(detail["hints"]) == 3

    # 404 for non-existent question
    random_id = uuid.uuid4()
    resp_404 = await client.get(f"/api/v1/questions/{random_id}/detail", headers=t_headers)
    assert resp_404.status_code == 404


@pytest.mark.asyncio
async def test_update_question_content(
    client: AsyncClient,
    admin_auth: tuple[User, str, dict[str, str]],
    student_auth: tuple[User, str, dict[str, str]],
    sample_mgmt_data: tuple[Question, Skill],
) -> None:
    """Teacher can update question content, incrementing version and saving snapshot."""
    _t_user, _t_token, t_headers = admin_auth
    _s_user, _s_token, s_headers = student_auth
    question, _ = sample_mgmt_data

    update_payload = {
        "difficulty": 4,
        "language": "en",
        "prompt": "Updated prompt with LaTeX $x^2 + 5 = 9$?",
        "options": [
            {"id": "A", "text": "$x = 2$", "is_correct": True},
            {"id": "B", "text": "$x = 3$", "is_correct": False},
        ],
        "verified_answer": "A",
        "worked_solution": "Subtract 5 from both sides: $x^2 = 4 \\implies x = 2$.",
        "hints": ["Hint 1", "Hint 2", "Hint 3"],
    }

    # Student receives 403
    resp_student = await client.put(
        f"/api/v1/questions/{question.id}",
        json=update_payload,
        headers=s_headers,
    )
    assert resp_student.status_code == 403

    # Teacher updates question
    resp_teacher = await client.put(
        f"/api/v1/questions/{question.id}",
        json=update_payload,
        headers=t_headers,
    )
    assert resp_teacher.status_code == 200
    data = resp_teacher.json()
    assert data["difficulty"] == 4
    assert data["prompt"] == update_payload["prompt"]
    assert data["verified_answer"] == "A"
    assert data["version"] == 2

    # 404 for non-existent question update
    random_id = uuid.uuid4()
    resp_404 = await client.put(
        f"/api/v1/questions/{random_id}",
        json=update_payload,
        headers=t_headers,
    )
    assert resp_404.status_code == 404


@pytest.mark.asyncio
async def test_curriculum_graph_not_found(
    client: AsyncClient,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Non-existent curriculum code returns 404."""
    _user, _token, headers = student_auth
    resp = await client.get("/api/v1/curricula/NON-EXISTENT-CODE/graph", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_bulk_import_schema_validation_error(
    client: AsyncClient,
    admin_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Invalid content pack in POST /api/v1/curricula/import returns 422 with validation errors."""
    _t_user, _t_token, t_headers = admin_auth
    # Missing required 'board', 'grade', etc.
    invalid_payload = {
        "curriculum": {"code": "INVALID"},
        "topics": [],
        "skills": [],
    }
    resp = await client.post(
        "/api/v1/curricula/import",
        json=invalid_payload,
        headers=t_headers,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_student_and_educator_question_views(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_auth: tuple[User, str, dict[str, str]],
    student_auth: tuple[User, str, dict[str, str]],
    sample_mgmt_data: tuple[Question, Skill],
) -> None:
    """Test student listing published questions, single retrieval, fallback, and 404."""
    _t_user, _t_token, t_headers = admin_auth
    _s_user, _s_token, s_headers = student_auth
    question, skill = sample_mgmt_data

    # Initially draft, student gets 0 questions
    res0 = await client.get(f"/api/v1/questions?skill_id={skill.id}", headers=s_headers)
    assert res0.status_code == 200
    assert len(res0.json()) == 0

    # Publish the question
    question.status = "published"
    await db_session.flush()

    # Now student gets 1 published question with no verified answers
    res1 = await client.get(f"/api/v1/questions?skill_id={skill.id}", headers=s_headers)
    assert res1.status_code == 200
    items = res1.json()
    assert len(items) == 1
    assert "verified_answer" not in items[0]
    assert "worked_solution" not in items[0]

    # Student gets single question
    res_single = await client.get(f"/api/v1/questions/{question.id}", headers=s_headers)
    assert res_single.status_code == 200
    assert "verified_answer" not in res_single.json()

    # Fallback to translation when language not found
    res_fallback = await client.get(
        f"/api/v1/questions/{question.id}?language=es", headers=s_headers
    )
    assert res_fallback.status_code == 200

    # 404 for student on non-existent question
    res_404 = await client.get(f"/api/v1/questions/{uuid.uuid4()}", headers=s_headers)
    assert res_404.status_code == 404

    # Add Hindi translation via teacher update
    res_hi = await client.put(
        f"/api/v1/questions/{question.id}",
        json={
            "language": "hi",
            "prompt": "नया हिंदी प्रश्न?",
            "verified_answer": "B",
            "worked_solution": "हल विवरण",
            "hints": ["संकेत 1", "संकेत 2", "संकेत 3"],
        },
        headers=t_headers,
    )
    assert res_hi.status_code == 200
    assert res_hi.json()["prompt"] == "नया हिंदी प्रश्न?"
