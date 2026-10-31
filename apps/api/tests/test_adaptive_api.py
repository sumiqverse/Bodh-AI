"""Integration tests for Adaptive Engine API: /v1 and /api/v1."""

import uuid
from datetime import UTC, datetime
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import User
from app.models.curriculum import Curriculum, Topic
from app.repositories.base import BaseRepository
from app.repositories.consent_repo import ConsentRepository
from app.repositories.question_repo import QuestionRepository
from app.repositories.skill_repo import SkillRepository
from tests.factories import (
    CurriculumFactory,
    QuestionFactory,
    SkillFactory,
    TopicFactory,
)


@pytest.fixture
async def setup_adaptive_data(
    db_session: AsyncSession,
    student_auth: tuple[User, str, dict[str, str]],
) -> dict[str, Any]:
    """Seed test data for adaptive engine endpoints."""
    student, _, headers = student_auth

    # Grant parental consent for student
    consent_repo = ConsentRepository(db_session)
    await consent_repo.grant_consent(student_id=student.id, scope="practice", version="2026.1")

    curr_repo = BaseRepository[Curriculum](Curriculum, db_session)
    topic_repo = BaseRepository[Topic](Topic, db_session)
    skill_repo = SkillRepository(db_session)
    question_repo = QuestionRepository(db_session)

    unique_suffix = uuid.uuid4().hex[:8]
    unique_code = f"NCERT-MATH-C8-{unique_suffix}"
    curriculum = await curr_repo.create(CurriculumFactory.build(code=unique_code))
    topic = await topic_repo.create(
        TopicFactory.build(curriculum_id=curriculum.id, code=f"TOPIC-{unique_suffix}")
    )
    skill1 = await skill_repo.create(
        SkillFactory.build(topic_id=topic.id, code=f"SKILL-01-{unique_suffix}")
    )
    skill2 = await skill_repo.create(
        SkillFactory.build(topic_id=topic.id, code=f"SKILL-02-{unique_suffix}")
    )

    # Skill 1 is prerequisite for Skill 2
    await skill_repo.add_prerequisite(parent_skill_id=skill1.id, child_skill_id=skill2.id)

    q1 = await question_repo.create(QuestionFactory.build(skill_id=skill1.id, difficulty=2))
    await question_repo.add_translation(
        question_id=q1.id,
        language="en",
        prompt="What is (-3) + 5?",
        options=[
            {"id": "A", "text": "2", "is_correct": True},
            {"id": "B", "text": "-2", "is_correct": False},
        ],
        verified_answer="2",
        explanation="Add 5 to -3 gives 2.",
        hints=["Think of number line moving right 5 units."],
    )

    q2 = await question_repo.create(QuestionFactory.build(skill_id=skill2.id, difficulty=4))
    await question_repo.add_translation(
        question_id=q2.id,
        language="en",
        prompt="Evaluate (2/3) * (5/7)",
        options=[
            {"id": "A", "text": "10/21", "is_correct": True},
            {"id": "B", "text": "7/10", "is_correct": False},
        ],
        verified_answer="10/21",
        explanation="Multiply numerators and denominators.",
        hints=["Multiply tops, then multiply bottoms."],
    )

    await db_session.commit()

    return {
        "student": student,
        "headers": headers,
        "curriculum": curriculum,
        "skill1": skill1,
        "skill2": skill2,
        "q1": q1,
        "q2": q2,
    }


@pytest.mark.asyncio
async def test_adaptive_attempts_idempotency_and_rationale(
    client: AsyncClient,
    setup_adaptive_data: dict[str, Any],
) -> None:
    """Test POST /v1/attempts and /api/v1/attempts: idempotent submission."""
    data = setup_adaptive_data
    headers = data["headers"]
    q1 = data["q1"]
    skill1 = data["skill1"]

    idemp_key = f"idemp_test_{uuid.uuid4()}"
    payload = {
        "question_id": str(q1.id),
        "skill_id": str(skill1.id),
        "selected_answer": "A",
        "idempotency_key": idemp_key,
        "time_spent_ms": 12000,
        "client_timestamp": datetime.now(UTC).isoformat(),
    }

    # 1. First submission via /v1/attempts
    res1 = await client.post("/v1/attempts", json=payload, headers=headers)
    assert res1.status_code == 200, res1.text
    body1 = res1.json()
    assert body1["is_correct"] is True
    assert body1["is_duplicate"] is False
    assert body1["p_mastery_after"] > 0.30
    assert len(body1["rationale"]) > 0
    assert "belief" in body1["rationale"] or "observations" in body1["rationale"]

    # 2. Duplicate submission with same Idempotency-Key
    res2 = await client.post("/v1/attempts", json=payload, headers=headers)
    assert res2.status_code == 200
    body2 = res2.json()
    assert body2["is_duplicate"] is True
    assert body2["attempt_id"] == body1["attempt_id"]
    assert body2["p_mastery_after"] == body1["p_mastery_after"]
    assert "Idempotent" in body2["explanation"] or "Idempotency" in body2["rationale"]

    # 3. Verify /api/v1/attempts also works
    res3 = await client.post("/api/v1/attempts", json=payload, headers=headers)
    assert res3.status_code == 200
    assert res3.json()["is_duplicate"] is True


@pytest.mark.asyncio
async def test_adaptive_next_item_and_rationale(
    client: AsyncClient,
    setup_adaptive_data: dict[str, Any],
) -> None:
    """Test GET /v1/next-item and GET /api/v1/next-item: returns question with teacher rationale."""
    data = setup_adaptive_data
    headers = data["headers"]

    # 1. Fetch next recommended item via /v1/next-item
    res = await client.get("/v1/next-item", headers=headers)
    assert res.status_code == 200, res.text
    item = res.json()

    assert "question_id" in item
    assert "skill_code" in item
    assert "difficulty" in item
    assert "predicted_success" in item
    assert 0.0 <= item["predicted_success"] <= 1.0
    assert "score" in item
    assert "score_breakdown" in item
    assert "rationale" in item
    assert len(item["rationale"]) > 0

    # 2. Verify /api/v1/next-item route is also available
    res_api = await client.get("/api/v1/next-item", headers=headers)
    assert res_api.status_code == 200
    assert "rationale" in res_api.json()


@pytest.mark.asyncio
async def test_adaptive_mastery_endpoint(
    client: AsyncClient,
    setup_adaptive_data: dict[str, Any],
) -> None:
    """Test GET /v1/mastery and GET /api/v1/mastery: returns mastery state and rationale."""
    data = setup_adaptive_data
    headers = data["headers"]
    q1 = data["q1"]
    skill1 = data["skill1"]

    # Submit an attempt first
    await client.post(
        "/v1/attempts",
        json={
            "question_id": str(q1.id),
            "skill_id": str(skill1.id),
            "selected_answer": "A",
            "idempotency_key": f"m_test_{uuid.uuid4()}",
            "time_spent_ms": 15000,
            "client_timestamp": datetime.now(UTC).isoformat(),
        },
        headers=headers,
    )

    # Fetch mastery
    res = await client.get("/v1/mastery", headers=headers)
    assert res.status_code == 200, res.text
    masteries = res.json()
    assert len(masteries) >= 1

    entry = next(m for m in masteries if m["skill_id"] == str(skill1.id))
    assert entry["p_mastery"] > 0.0
    assert entry["state"] in ("not_learned", "partial", "mastered")
    assert "rationale" in entry
    assert len(entry["rationale"]) > 0


@pytest.mark.asyncio
async def test_cat_diagnostics_session_flow(
    client: AsyncClient,
    setup_adaptive_data: dict[str, Any],
) -> None:
    """Test POST /v1/diagnostics: session initiation, question serving, and answer recording."""
    data = setup_adaptive_data
    headers = data["headers"]

    # 1. Start diagnostic
    start_res = await client.post(
        "/v1/diagnostics",
        json={"curriculum_code": data["curriculum"].code},
        headers=headers,
    )
    assert start_res.status_code == 200, start_res.text
    start_body = start_res.json()

    assert "session_id" in start_body
    session_id = start_body["session_id"]
    assert start_body["is_completed"] is False
    assert start_body["next_item"] is not None
    assert len(start_body["rationale"]) > 0

    first_qid = start_body["next_item"]["question_id"]

    # 2. Advance diagnostic by submitting answer
    progress_res = await client.post(
        "/v1/diagnostics",
        json={
            "session_id": session_id,
            "question_id": first_qid,
            "selected_answer": "A",
            "time_spent_ms": 8000,
            "hint_level": 0,
        },
        headers=headers,
    )
    assert progress_res.status_code == 200, progress_res.text
    progress_body = progress_res.json()
    assert progress_body["questions_answered"] == 1
    assert "rationale" in progress_body


@pytest.mark.asyncio
async def test_adaptive_next_item_curriculum_scoping(
    client: AsyncClient,
    setup_adaptive_data: dict[str, Any],
) -> None:
    """Test that next-item recommendations are strictly scoped to the requested curriculum."""
    data = setup_adaptive_data
    headers = data["headers"]
    curriculum = data["curriculum"]
    valid_skill_ids = [str(data["skill1"].id), str(data["skill2"].id)]

    res = await client.get(
        f"/api/v1/next-item?curriculum_code={curriculum.code}",
        headers=headers,
    )
    assert res.status_code == 200
    item = res.json()
    assert item["skill_id"] in valid_skill_ids
