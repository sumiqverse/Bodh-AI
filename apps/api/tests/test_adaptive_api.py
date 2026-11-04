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
    await question_repo.add_translation(
        question_id=q1.id,
        language="hi",
        prompt="(-3) + 5 का मान क्या होगा?",
        options=[
            {"id": "A", "text": "2", "is_correct": True},
            {"id": "B", "text": "-2", "is_correct": False},
        ],
        verified_answer="2",
        explanation="-3 में 5 जोड़ने पर 2 प्राप्त होता है।",
        hints=["संख्या रेखा पर 5 इकाई दाईं ओर चलें।"],
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
    await question_repo.add_translation(
        question_id=q2.id,
        language="hi",
        prompt="(2/3) * (5/7) का मान ज्ञात कीजिए।",
        options=[
            {"id": "A", "text": "10/21", "is_correct": True},
            {"id": "B", "text": "7/10", "is_correct": False},
        ],
        verified_answer="10/21",
        explanation="अंश और हर को आपस में गुणा करें।",
        hints=["ऊपर की संख्याओं को गुणा करें, फिर नीचे की संख्याओं को।"],
    )

    for _ in range(18):
        extra = await question_repo.create(QuestionFactory.build(skill_id=skill1.id))
        await question_repo.add_translation(
            question_id=extra.id,
            language="en",
            prompt="Choose A",
            options=[{"id": "A", "text": "A", "is_correct": True}],
            verified_answer="A",
        )
        await question_repo.add_translation(
            question_id=extra.id,
            language="hi",
            prompt="मान चुनें",
            options=[{"id": "A", "text": "A", "is_correct": True}],
            verified_answer="A",
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
    res = await client.get(
        "/v1/next-item", params={"curriculum_code": data["curriculum"].code}, headers=headers
    )
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
    res_api = await client.get(
        "/api/v1/next-item", params={"curriculum_code": data["curriculum"].code}, headers=headers
    )
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
    other_student_auth: tuple[User, str, dict[str, str]],
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

    assert all("is_correct" not in option for option in start_body["next_item"]["options"])
    first_qid = start_body["next_item"]["question_id"]
    resume = await client.get(
        "/v1/diagnostics/current",
        params={"curriculum_code": data["curriculum"].code},
        headers=headers,
    )
    assert resume.status_code == 200
    assert resume.json()["session_id"] == session_id
    assert resume.json()["next_item"]["question_id"] == first_qid
    _, _, other_headers = other_student_auth
    other_response = await client.post(
        "/v1/diagnostics",
        json={
            "session_id": session_id,
            "question_id": first_qid,
            "selected_answer": "A",
            "time_spent_ms": 8000,
        },
        headers=other_headers,
    )
    assert other_response.status_code == 403

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
    resumed = await client.get(
        "/v1/diagnostics/current",
        params={"curriculum_code": data["curriculum"].code},
        headers=headers,
    )
    assert resumed.status_code == 200
    assert resumed.json()["questions_answered"] == 1
    duplicate = await client.post(
        "/v1/diagnostics",
        json={
            "session_id": session_id,
            "question_id": first_qid,
            "selected_answer": "A",
            "time_spent_ms": 8000,
        },
        headers=headers,
    )
    assert duplicate.status_code == 200
    assert duplicate.json() == progress_body
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


@pytest.mark.asyncio
async def test_adaptive_next_item_and_diagnostic_in_hindi(
    client: AsyncClient,
    setup_adaptive_data: dict[str, Any],
) -> None:
    """Verify adaptive endpoints return Hindi translations when requested via language
    param or Accept-Language header.
    """
    headers = dict(setup_adaptive_data["headers"])
    headers["Accept-Language"] = "hi"
    curr_code = setup_adaptive_data["curriculum"].code

    # Test next-item in Hindi
    res = await client.get(
        f"/api/v1/next-item?curriculum_code={curr_code}&language=hi",
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert "लक्षित" in data["rationale"] or "मान क्या होगा" in data["prompt"]

    # Test diagnostic start in Hindi
    diag_res = await client.post(
        "/api/v1/diagnostics",
        headers=headers,
        json={"curriculum_code": curr_code, "language": "hi"},
    )
    assert diag_res.status_code == 200
    diag_data = diag_res.json()
    assert diag_data["next_item"] is not None
    assert "मान" in diag_data["next_item"]["prompt"]


@pytest.mark.asyncio
async def test_diagnostic_completes_after_twenty_answers(
    client: AsyncClient, setup_adaptive_data: dict[str, Any]
) -> None:
    data = setup_adaptive_data
    response = await client.post(
        "/v1/diagnostics",
        json={"curriculum_code": data["curriculum"].code},
        headers=data["headers"],
    )
    assert response.status_code == 200
    body = response.json()
    seen: set[str] = set()
    for count in range(1, 21):
        question_id = body["next_item"]["question_id"]
        assert question_id not in seen
        seen.add(question_id)
        response = await client.post(
            "/v1/diagnostics",
            json={
                "session_id": body["session_id"],
                "question_id": question_id,
                "selected_answer": "A",
                "time_spent_ms": 8000,
            },
            headers=data["headers"],
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["questions_answered"] == count
        assert body["is_completed"] is (count == 20)
    assert body["summary"]["total_questions"] == 20


@pytest.mark.asyncio
async def test_class_diagnostic_choice_is_per_enrollment(
    client: AsyncClient,
    db_session: AsyncSession,
    teacher_auth: tuple[User, str, dict[str, str]],
    setup_adaptive_data: dict[str, Any],
) -> None:
    from app.models.organization import Enrollment

    data = setup_adaptive_data
    data["curriculum"].code = "NCERT-MATH-C8"
    await db_session.flush()
    _, _, teacher_headers = teacher_auth
    created = await client.post(
        "/api/v1/classes",
        json={"name": "Math", "grade": 8, "section": "B", "subject": "Mathematics"},
        headers=teacher_headers,
    )
    class_id = created.json()["id"]
    enrollment = Enrollment(
        class_id=uuid.UUID(class_id), student_id=data["student"].id, status="pending"
    )
    db_session.add(enrollment)
    await db_session.flush()
    skip_url = f"/api/v1/classes/{class_id}/diagnostic/skip"
    assert (await client.post(skip_url, headers=data["headers"])).status_code == 403
    enrollment.status = "active"
    await db_session.flush()
    other_class = await client.post(
        "/api/v1/classes",
        json={"name": "Other Math", "grade": 8, "section": "C", "subject": "Mathematics"},
        headers=teacher_headers,
    )
    db_session.add(
        Enrollment(
            class_id=uuid.UUID(other_class.json()["id"]),
            student_id=data["student"].id,
            status="pending",
        )
    )
    await db_session.flush()
    assert (await client.post(skip_url, headers=data["headers"])).json()[
        "diagnostic_status"
    ] == "skipped"
    start = await client.post(
        "/v1/diagnostics",
        json={"curriculum_code": "NCERT-MATH-C8", "class_id": class_id},
        headers=data["headers"],
    )
    assert start.status_code == 200, start.text
    assert enrollment.diagnostic_status == "in_progress"
    resume = await client.get(
        "/v1/diagnostics/current",
        params={"curriculum_code": "NCERT-MATH-C8", "class_id": class_id},
        headers=data["headers"],
    )
    assert resume.status_code == 200
    assert resume.json()["session_id"] == start.json()["session_id"]
    enrollment.status = "removed"
    await db_session.flush()
    assert (
        await client.get(
            "/v1/diagnostics/current",
            params={"curriculum_code": "NCERT-MATH-C8", "class_id": class_id},
            headers=data["headers"],
        )
    ).status_code == 403


@pytest.mark.asyncio
async def test_class_attempts_require_matching_active_classroom(
    client: AsyncClient,
    db_session: AsyncSession,
    teacher_auth: tuple[User, str, dict[str, str]],
    setup_adaptive_data: dict[str, Any],
) -> None:
    from app.models.organization import Enrollment

    data = setup_adaptive_data
    data["curriculum"].code = "NCERT-MATH-C8"
    await db_session.flush()
    _, _, teacher_headers = teacher_auth
    created = await client.post(
        "/api/v1/classes",
        json={"name": "Math", "grade": 8, "section": "B", "subject": "Mathematics"},
        headers=teacher_headers,
    )
    class_id = created.json()["id"]
    enrollment = Enrollment(
        class_id=uuid.UUID(class_id), student_id=data["student"].id, status="pending"
    )
    db_session.add(enrollment)
    await db_session.flush()
    payload = {
        "class_id": class_id,
        "question_id": str(data["q1"].id),
        "skill_id": str(data["skill1"].id),
        "selected_answer": "A",
        "idempotency_key": str(uuid.uuid4()),
        "time_spent_ms": 2000,
        "client_timestamp": datetime.now(UTC).isoformat(),
    }
    assert (
        await client.post("/api/v1/attempts", json=payload, headers=data["headers"])
    ).status_code == 403
    enrollment.status = "active"
    await db_session.flush()
    wrong_skill = {**payload, "skill_id": str(data["skill2"].id)}
    assert (
        await client.post("/api/v1/attempts", json=wrong_skill, headers=data["headers"])
    ).status_code == 409
    result = await client.post("/api/v1/attempts", json=payload, headers=data["headers"])
    assert result.status_code == 200, result.text
    leaderboard = await client.get(
        f"/api/v1/classes/{class_id}/leaderboard", headers=data["headers"]
    )
    assert leaderboard.json()["current_user_row"]["xp"] == 15
    repeat = await client.post("/api/v1/attempts", json=payload, headers=data["headers"])
    assert repeat.json()["is_duplicate"] is True
    leaderboard = await client.get(
        f"/api/v1/classes/{class_id}/leaderboard", headers=data["headers"]
    )
    assert leaderboard.json()["current_user_row"]["xp"] == 15


@pytest.mark.asyncio
async def test_achievements_require_classroom_evidence_and_are_idempotent(
    client: AsyncClient,
    db_session: AsyncSession,
    teacher_auth: tuple[User, str, dict[str, str]],
    other_student_auth: tuple[User, str, dict[str, str]],
    setup_adaptive_data: dict[str, Any],
) -> None:
    from app.models.assessment import Attempt, Mastery
    from app.models.organization import Enrollment
    from app.services.achievement_service import award_progress

    data = setup_adaptive_data
    _, _, teacher_headers = teacher_auth
    created = await client.post(
        "/api/v1/classes",
        json={"name": "Math", "grade": 8, "section": "B", "subject": "Mathematics"},
        headers=teacher_headers,
    )
    class_id = uuid.UUID(created.json()["id"])
    student_id = data["student"].id
    db_session.add(Enrollment(class_id=class_id, student_id=student_id, status="active"))
    for skill in (data["skill1"], data["skill2"]):
        db_session.add(
            Mastery(
                student_id=student_id,
                class_id=class_id,
                skill_id=skill.id,
                p_mastery=0.99,
                confidence=0.9,
                attempts_count=3,
                correct_count=3,
            )
        )
    await db_session.flush()
    for index in range(3):
        db_session.add(
            Attempt(
                student_id=student_id,
                class_id=class_id,
                question_id=data["q1"].id,
                skill_id=data["skill1"].id,
                idempotency_key=f"badge-test-{index}",
                selected_answer="A",
                is_correct=True,
                time_spent_ms=1000,
                client_timestamp=datetime.now(UTC),
            )
        )
    await award_progress(db_session, student_id, class_id, data["skill1"].id)
    await award_progress(db_session, student_id, class_id, data["skill1"].id)
    url = f"/api/v1/classes/{class_id}/my-achievements"
    awards = (await client.get(url, headers=data["headers"])).json()
    assert [award["kind"] for award in awards] == ["badge"]
    for index in range(3):
        db_session.add(
            Attempt(
                student_id=student_id,
                class_id=class_id,
                question_id=data["q2"].id,
                skill_id=data["skill2"].id,
                idempotency_key=f"badge-test-other-{index}",
                selected_answer="A",
                is_correct=True,
                time_spent_ms=1000,
                client_timestamp=datetime.now(UTC),
            )
        )
    await award_progress(db_session, student_id, class_id, data["skill2"].id)
    awards = (await client.get(url, headers=data["headers"])).json()
    assert sorted(award["kind"] for award in awards) == ["badge", "badge", "certificate"]
    certificate = next(award for award in awards if award["kind"] == "certificate")
    certificate_url = f"{url}/{certificate['id']}"
    response = await client.get(certificate_url, headers=data["headers"])
    assert response.status_code == 200
    assert response.json()["student_name"] == data["student"].full_name
    other, _, other_headers = other_student_auth
    db_session.add(Enrollment(class_id=class_id, student_id=other.id, status="active"))
    await db_session.flush()
    assert (await client.get(certificate_url, headers=other_headers)).status_code == 404


@pytest.mark.asyncio
async def test_assignment_progress_tracks_classroom_work(
    client: AsyncClient,
    db_session: AsyncSession,
    teacher_auth: tuple[User, str, dict[str, str]],
    setup_adaptive_data: dict[str, Any],
) -> None:
    from app.models.assessment import Attempt, Mastery
    from app.models.organization import Enrollment
    from app.services.assignment_progress import update_assignment_progress

    data = setup_adaptive_data
    data["curriculum"].code = "NCERT-MATH-C8"
    await db_session.flush()
    _, _, teacher_headers = teacher_auth
    created = await client.post(
        "/api/v1/classes",
        json={"name": "Math", "grade": 8, "section": "A"},
        headers=teacher_headers,
    )
    class_id = uuid.UUID(created.json()["id"])
    student_id = data["student"].id
    db_session.add(Enrollment(class_id=class_id, student_id=student_id, status="active"))
    await db_session.flush()
    assignment = await client.post(
        f"/api/v1/classes/{class_id}/assignments",
        json={"title": "Practice", "skill_ids": [data["skill1"].code]},
        headers=teacher_headers,
    )
    assert assignment.status_code == 201
    db_session.add(
        Mastery(
            student_id=student_id,
            class_id=class_id,
            skill_id=data["skill1"].id,
            p_mastery=0.99,
            confidence=0.9,
            attempts_count=3,
            correct_count=3,
        )
    )
    for index in range(3):
        db_session.add(
            Attempt(
                student_id=student_id,
                class_id=class_id,
                question_id=data["q1"].id,
                skill_id=data["skill1"].id,
                idempotency_key=f"assignment-test-{index}",
                selected_answer="A",
                is_correct=True,
                time_spent_ms=1000,
                client_timestamp=datetime.now(UTC),
                created_at=datetime.now(UTC),
            )
        )
        await update_assignment_progress(db_session, student_id, class_id)
        rows = (
            await client.get(f"/api/v1/classes/{class_id}/my-assignments", headers=data["headers"])
        ).json()
        assert rows[0]["status"] == ("completed" if index == 2 else "in_progress")
    teacher = (
        await client.get(f"/api/v1/classes/{class_id}/assignments", headers=teacher_headers)
    ).json()
    assert teacher[0]["completed_count"] == 1


@pytest.mark.asyncio
async def test_teacher_questions_are_isolated_per_classroom(
    client: AsyncClient,
    db_session: AsyncSession,
    teacher_auth: tuple[User, str, dict[str, str]],
    other_teacher_auth: tuple[User, str, dict[str, str]],
    setup_adaptive_data: dict[str, Any],
) -> None:
    from app.models.organization import Enrollment

    data = setup_adaptive_data
    data["curriculum"].code = "NCERT-MATH-C8"
    await db_session.flush()
    _, _, teacher_headers = teacher_auth
    _, _, other_teacher_headers = other_teacher_auth
    class_a = (
        await client.post(
            "/api/v1/classes",
            json={"name": "Math A", "grade": 8, "section": "A", "subject": "Mathematics"},
            headers=teacher_headers,
        )
    ).json()["id"]
    class_b = (
        await client.post(
            "/api/v1/classes",
            json={"name": "Math B", "grade": 8, "section": "A", "subject": "Mathematics"},
            headers=other_teacher_headers,
        )
    ).json()["id"]
    db_session.add(
        Enrollment(student_id=data["student"].id, class_id=uuid.UUID(class_a), status="active")
    )
    await db_session.flush()
    payload = {
        "skill_code": data["skill1"].code,
        "prompt_en": "Which option is correct?",
        "difficulty": 2,
        "options": [
            {"id": "A", "text": "Correct", "is_correct": True},
            {"id": "B", "text": "Wrong", "is_correct": False},
        ],
        "explanation": "A is correct.",
        "hints": ["Think carefully."],
    }
    created = await client.post(
        f"/api/v1/classes/{class_a}/questions", json=payload, headers=teacher_headers
    )
    assert created.status_code == 201, created.text
    qid = created.json()["id"]
    own_edit = await client.put(
        f"/api/v1/questions/{qid}",
        json={"prompt": "Updated classroom question"},
        headers=teacher_headers,
    )
    assert own_edit.status_code == 200
    shared_edit = await client.put(
        f"/api/v1/questions/{data['q1'].id}",
        json={"prompt": "Changed shared question"},
        headers=teacher_headers,
    )
    assert shared_edit.status_code == 403
    query = {"skill_id": str(data["skill1"].id), "limit": 50}
    without_class = (
        await client.get("/api/v1/questions", params=query, headers=data["headers"])
    ).json()
    assert qid not in [q["id"] for q in without_class]
    with_class = (
        await client.get(
            "/api/v1/questions", params={**query, "class_id": class_a}, headers=data["headers"]
        )
    ).json()
    assert qid in [q["id"] for q in with_class]
    recommendation = await client.get(
        "/api/v1/next-item",
        params={
            "curriculum_code": "NCERT-MATH-C8",
            "class_id": class_a,
            "skill_id": str(data["skill1"].id),
        },
        headers=data["headers"],
    )
    assert recommendation.status_code == 200
    assert recommendation.json()["skill_id"] == str(data["skill1"].id)
    assert (
        await client.get(
            "/api/v1/questions", params={**query, "class_id": class_b}, headers=data["headers"]
        )
    ).status_code == 404
    assert (
        await client.get(f"/api/v1/questions/{qid}/detail", headers=other_teacher_headers)
    ).status_code == 404
    assert (
        await client.put(
            f"/api/v1/questions/{qid}",
            json={"prompt": "Changed prompt"},
            headers=other_teacher_headers,
        )
    ).status_code == 404
    assert (
        await client.get(f"/api/v1/classes/{class_b}/content", headers=other_teacher_headers)
    ).json()["custom_questions_count"] == 0


@pytest.mark.asyncio
async def test_mastery_is_separate_for_each_classroom(
    client: AsyncClient,
    db_session: AsyncSession,
    teacher_auth: tuple[User, str, dict[str, str]],
    setup_adaptive_data: dict[str, Any],
) -> None:
    from app.models.organization import Enrollment

    data = setup_adaptive_data
    data["curriculum"].code = "NCERT-MATH-C8"
    await db_session.flush()
    _, _, teacher_headers = teacher_auth
    class_ids = []
    for section in ("A", "B"):
        result = await client.post(
            "/api/v1/classes",
            json={"name": "Math", "grade": 8, "section": section, "subject": "Mathematics"},
            headers=teacher_headers,
        )
        class_ids.append(result.json()["id"])
        db_session.add(
            Enrollment(
                class_id=uuid.UUID(class_ids[-1]), student_id=data["student"].id, status="active"
            )
        )
    await db_session.flush()
    for class_id, answer in zip(class_ids, ["A", "B"], strict=True):
        result = await client.post(
            "/api/v1/attempts",
            json={
                "class_id": class_id,
                "question_id": str(data["q1"].id),
                "skill_id": str(data["skill1"].id),
                "selected_answer": answer,
                "idempotency_key": str(uuid.uuid4()),
                "time_spent_ms": 8000,
                "client_timestamp": datetime.now(UTC).isoformat(),
            },
            headers=data["headers"],
        )
        assert result.status_code == 200, result.text
    values = []
    for class_id in class_ids:
        response = await client.get(
            "/api/v1/mastery",
            params={"student_id": str(data["student"].id), "class_id": class_id},
            headers=data["headers"],
        )
        assert response.status_code == 200
        assert len(response.json()) == 1
        values.append(response.json()[0]["p_mastery"])
        heatmap = await client.get(f"/api/v1/classes/{class_id}/heatmap", headers=teacher_headers)
        cell = next(
            item for item in heatmap.json()["matrix"] if item["skill_id"] == str(data["skill1"].id)
        )
        assert cell["p_mastery"] == pytest.approx(values[-1], abs=0.001)
    assert values[0] > values[1]


@pytest.mark.asyncio
async def test_adaptive_lessons_are_owned_and_selected_by_class_mastery(
    client: AsyncClient,
    db_session: AsyncSession,
    teacher_auth: tuple[User, str, dict[str, str]],
    other_teacher_auth: tuple[User, str, dict[str, str]],
    setup_adaptive_data: dict[str, Any],
) -> None:
    from app.models.assessment import Mastery, QuestionTranslation
    from app.models.organization import Enrollment

    data = setup_adaptive_data
    data["curriculum"].code = "NCERT-MATH-C8"
    await db_session.flush()
    _, _, teacher_headers = teacher_auth
    _, _, other_headers = other_teacher_auth
    created = await client.post(
        "/api/v1/classes",
        json={"name": "Math", "grade": 8, "section": "A", "subject": "Mathematics"},
        headers=teacher_headers,
    )
    class_id = uuid.UUID(created.json()["id"])
    db_session.add(Enrollment(class_id=class_id, student_id=data["student"].id, status="active"))
    await db_session.flush()
    draft_question = QuestionFactory.build(
        skill_id=data["skill1"].id,
        code=f"DRAFT-{uuid.uuid4().hex[:8]}",
        status="draft",
    )
    db_session.add(draft_question)
    await db_session.flush()
    db_session.add(
        QuestionTranslation(
            question_id=draft_question.id,
            language="en",
            prompt="DRAFT_ONLY_PROMPT",
            options=[{"id": "A", "text": "draft", "is_correct": True}],
            verified_answer="A",
            worked_solution="",
            explanation="draft explanation",
            hints=[],
        )
    )
    await db_session.flush()
    url = f"/api/v1/classes/{class_id}/lessons"
    content_response = await client.get(
        f"/api/v1/classes/{class_id}/content", headers=teacher_headers
    )
    assert content_response.status_code == 200
    first_skill = content_response.json()["topics"][0]["skills"][0]
    assert first_skill["default_lesson"]["body"]
    assert first_skill["default_lesson"]["title"]
    assert first_skill["default_lesson_hi"]["body"]
    assert "सीखने का लक्ष्य" in first_skill["default_lesson_hi"]["body"]

    student_url = f"{url}/{data['skill1'].id}"
    default_lesson = await client.get(student_url, headers=data["headers"])
    assert default_lesson.status_code == 200
    assert default_lesson.json()["is_default"] is True
    assert default_lesson.json()["title"] == data["skill1"].name
    assert "DRAFT_ONLY_PROMPT" not in default_lesson.json()["body"]

    hindi_default = await client.get(
        student_url, params={"language": "hi"}, headers=data["headers"]
    )
    assert hindi_default.status_code == 200
    assert hindi_default.json()["is_default"] is True
    assert "सीखने का लक्ष्य" in hindi_default.json()["body"]
    assert "सही उत्तर" in hindi_default.json()["body"]
    assert "DRAFT_ONLY_PROMPT" not in hindi_default.json()["body"]

    base = {"skill_id": str(data["skill1"].id), "language": "en"}
    for level in (1, 4):
        payload = {
            **base,
            "difficulty": level,
            "title": f"Level {level}",
            "body": f"Lesson {level}",
        }
        assert (await client.put(url, json=payload, headers=teacher_headers)).status_code == 200
    assert (
        await client.put(
            url,
            json={**base, "difficulty": 1, "title": "Changed", "body": "Denied"},
            headers=other_headers,
        )
    ).status_code == 403
    student_lesson = await client.get(student_url, headers=data["headers"])
    assert student_lesson.json()["difficulty"] == 1
    mastery = Mastery(
        student_id=data["student"].id,
        class_id=class_id,
        skill_id=data["skill1"].id,
        p_mastery=0.9,
        confidence=0.9,
        attempts_count=4,
        correct_count=4,
    )
    db_session.add(mastery)
    await db_session.flush()
    assert (await client.get(student_url, headers=data["headers"])).json()["difficulty"] == 4
    await client.put(
        url,
        json={**base, "difficulty": 4, "title": "Revised", "body": "Updated content"},
        headers=teacher_headers,
    )
    assert (await client.get(student_url, headers=data["headers"])).json()[
        "body"
    ] == "Updated content"

    high_only = {
        "skill_id": str(data["skill2"].id),
        "language": "en",
        "difficulty": 4,
        "title": "Advanced",
        "body": "Advanced content",
    }
    assert (await client.put(url, json=high_only, headers=teacher_headers)).status_code == 200
    fallback = await client.get(f"{url}/{data['skill2'].id}", headers=data["headers"])
    assert fallback.status_code == 200
    assert fallback.json()["is_default"] is True
    assert fallback.json()["difficulty"] == 1


@pytest.mark.asyncio
async def test_diagnostic_does_not_use_other_curricula_or_incomplete_banks(
    client: AsyncClient,
    db_session: AsyncSession,
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    student, _, headers = student_auth
    await ConsentRepository(db_session).grant_consent(
        student_id=student.id, scope="diagnostic", version="2026.1"
    )
    curriculum = CurriculumFactory.build(code=f"SMALL-{uuid.uuid4().hex[:8]}")
    db_session.add(curriculum)
    await db_session.flush()
    response = await client.post(
        "/v1/diagnostics", json={"curriculum_code": curriculum.code}, headers=headers
    )
    assert response.status_code == 409
    assert "20 published questions" in response.json()["detail"]
    response = await client.post(
        "/v1/diagnostics", json={"curriculum_code": "UNKNOWN-CURRICULUM"}, headers=headers
    )
    assert response.status_code == 404
