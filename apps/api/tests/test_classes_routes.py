"""Tests for Class management routes (/api/v1/classes)."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import User
from app.models.curriculum import Curriculum, Skill, Topic


async def seed_class_skill(session: AsyncSession, code: str) -> None:
    curriculum = Curriculum(
        code="NCERT-MATH-C8", board="NCERT", grade=8, subject="mathematics", version="1"
    )
    session.add(curriculum)
    await session.flush()
    topic = Topic(curriculum_id=curriculum.id, code=f"topic-{code}", name="Topic", sequence_order=1)
    session.add(topic)
    await session.flush()
    session.add(
        Skill(topic_id=topic.id, code=code, name="Skill", description="Practice", difficulty=0.5)
    )
    await session.flush()


@pytest.mark.asyncio
async def test_teacher_class_lifecycle(
    client: AsyncClient,
    teacher_auth: tuple[User, str, dict[str, str]],
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test teacher creating class, listing classes, inspecting details, and rotating join code."""
    _t_user, _t_token, t_headers = teacher_auth
    _s_user, _s_token, s_headers = student_auth

    # Student cannot create class (403)
    resp_student = await client.post(
        "/api/v1/classes",
        json={"name": "Class 8B", "grade": 8, "section": "B", "academic_year": "2024-2025"},
        headers=s_headers,
    )
    assert resp_student.status_code == 403

    # Teacher creates class
    resp_create = await client.post(
        "/api/v1/classes",
        json={"name": "Class 8B", "grade": 8, "section": "B", "academic_year": "2024-2025"},
        headers=t_headers,
    )
    assert resp_create.status_code == 201
    class_data = resp_create.json()
    assert class_data["name"] == "Class 8B"
    assert "join_code" in class_data
    class_id = class_data["id"]

    # Teacher lists classes
    resp_list = await client.get("/api/v1/classes", headers=t_headers)
    assert resp_list.status_code == 200
    classes = resp_list.json()
    assert any(c["id"] == class_id for c in classes)

    # Teacher inspects class details
    resp_detail = await client.get(f"/api/v1/classes/{class_id}", headers=t_headers)
    assert resp_detail.status_code == 200
    detail = resp_detail.json()
    assert detail["id"] == class_id
    assert "students" in detail

    # 404 for non-existent class
    random_id = uuid.uuid4()
    resp_404 = await client.get(f"/api/v1/classes/{random_id}", headers=t_headers)
    assert resp_404.status_code == 404

    # Rotate join code
    old_code = class_data["join_code"]
    resp_rotate = await client.post(f"/api/v1/classes/{class_id}/rotate-code", headers=t_headers)
    assert resp_rotate.status_code == 200
    new_code = resp_rotate.json()["join_code"]
    assert new_code != old_code


@pytest.mark.asyncio
async def test_teacher_dashboard_analytics_routes(
    client: AsyncClient,
    db_session: AsyncSession,
    teacher_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test teacher dashboard API routes: heatmap, gap-clusters, early-warnings,
    suggestions, assignments, progress, export.
    """
    _t_user, _t_token, t_headers = teacher_auth
    await seed_class_skill(db_session, "SKILL_FRAC_01")

    # 1. Create class
    resp_create = await client.post(
        "/api/v1/classes",
        json={
            "name": "Analytics Class 8C",
            "grade": 8,
            "section": "C",
            "academic_year": "2024-2025",
        },
        headers=t_headers,
    )
    assert resp_create.status_code == 201
    class_id = resp_create.json()["id"]

    # 2. Heatmap
    resp_heatmap = await client.get(f"/api/v1/classes/{class_id}/heatmap", headers=t_headers)
    assert resp_heatmap.status_code == 200
    assert "matrix" in resp_heatmap.json()

    # 3. Gap clusters
    resp_clusters = await client.get(f"/api/v1/classes/{class_id}/gap-clusters", headers=t_headers)
    assert resp_clusters.status_code == 200
    assert "clusters" in resp_clusters.json()

    # 4. Early warnings
    resp_warnings = await client.get(
        f"/api/v1/classes/{class_id}/early-warnings", headers=t_headers
    )
    assert resp_warnings.status_code == 200
    assert "warnings" in resp_warnings.json()

    # 5. Suggestions & Decision
    resp_sug = await client.get(f"/api/v1/classes/{class_id}/suggestions", headers=t_headers)
    assert resp_sug.status_code == 200
    suggestions = resp_sug.json().get("suggestions", [])
    if suggestions:
        sug_id = suggestions[0]["suggestion_id"]
        resp_dec = await client.post(
            f"/api/v1/classes/{class_id}/suggestions/{sug_id}/decision",
            json={"action": "accepted", "teacher_notes": "Reviewed and agreed"},
            headers=t_headers,
        )
        assert resp_dec.status_code == 201

    # 6. Create & List assignments
    resp_create_assign = await client.post(
        f"/api/v1/classes/{class_id}/assignments",
        json={
            "title": "Fraction Revision",
            "skill_ids": ["SKILL_FRAC_01"],
            "description": "Practice set",
        },
        headers=t_headers,
    )
    assert resp_create_assign.status_code == 201

    resp_assign = await client.get(f"/api/v1/classes/{class_id}/assignments", headers=t_headers)
    assert resp_assign.status_code == 200
    assert len(resp_assign.json()) >= 1

    # 7. Progress summary
    resp_prog = await client.get(f"/api/v1/classes/{class_id}/progress-summary", headers=t_headers)
    assert resp_prog.status_code == 200
    assert "overall_mastery_pct" in resp_prog.json()

    # 8. Export CSV
    resp_csv = await client.get(f"/api/v1/classes/{class_id}/export/csv", headers=t_headers)
    assert resp_csv.status_code == 200
    assert resp_csv.headers["content-type"].startswith("text/csv")

    # 9. Real Classroom Leaderboard
    resp_leaderboard = await client.get(
        f"/api/v1/classes/{class_id}/leaderboard", headers=t_headers
    )
    assert resp_leaderboard.status_code == 200
    lb_data = resp_leaderboard.json()
    assert "class_id" in lb_data
    assert "top_three" in lb_data
    assert "list_learners" in lb_data
    assert "all_rankings" in lb_data


@pytest.mark.asyncio
async def test_leaderboard_requires_active_enrollment(
    client: AsyncClient,
    db_session: object,
    teacher_auth: tuple[User, str, dict[str, str]],
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.models.organization import Enrollment

    assert isinstance(db_session, AsyncSession)
    _, _, teacher_headers = teacher_auth
    student, _, student_headers = student_auth
    response = await client.post(
        "/api/v1/classes",
        json={"name": "Leaderboard", "grade": 8, "section": "A", "academic_year": "2024-2025"},
        headers=teacher_headers,
    )
    class_id = response.json()["id"]
    enrollment = Enrollment(class_id=uuid.UUID(class_id), student_id=student.id, status="pending")
    db_session.add(enrollment)
    await db_session.commit()

    url = f"/api/v1/classes/{class_id}/leaderboard"
    assert (await client.get(url, headers=student_headers)).status_code == 403
    teacher_view = (await client.get(url, headers=teacher_headers)).json()
    assert teacher_view["total_students"] == 0
    assert teacher_view["current_user_row"] is None

    enrollment.status = "active"
    await db_session.commit()
    student_view = (await client.get(url, headers=student_headers)).json()
    assert student_view["total_students"] == 1
    assert student_view["current_user_row"]["student_id"] == str(student.id)
    assert student_view["current_user_row"]["xp"] == 0
    assert student_view["current_user_row"]["streak_days"] == 0
    assert student_view["activity_dates"] == []
    assert student_view["max_streak"] == 0

    from datetime import UTC, datetime, timedelta

    from app.models.assessment import Attempt

    now = datetime.now(UTC)
    for index, (days_ago, correct) in enumerate([(0, True), (1, False), (4, True)]):
        created = now - timedelta(days=days_ago)
        db_session.add(
            Attempt(
                student_id=student.id,
                class_id=uuid.UUID(class_id),
                question_id=uuid.uuid4(),
                skill_id=uuid.uuid4(),
                idempotency_key=f"leaderboard-{index}",
                selected_answer="A",
                is_correct=correct,
                time_spent_ms=100,
                client_timestamp=created,
                created_at=created,
            )
        )
    await db_session.commit()
    student_view = (await client.get(url, headers=student_headers)).json()
    assert student_view["current_user_row"]["xp"] == 35
    assert student_view["current_user_row"]["streak_days"] == 2
    assert student_view["max_streak"] == 2
    assert len(student_view["activity_dates"]) == 3
    teacher_view = (await client.get(url, headers=teacher_headers)).json()
    assert teacher_view["activity_dates"] == []


@pytest.mark.asyncio
async def test_teacher_can_create_multiple_subject_classrooms_in_same_section(
    client: AsyncClient,
    teacher_auth: tuple[User, str, dict[str, str]],
) -> None:
    from app.core.curriculum import resolve_curriculum_code

    _, _, headers = teacher_auth
    body = {"name": "Section A", "grade": 8, "section": "A", "academic_year": "2026-2027"}
    science = await client.post(
        "/api/v1/classes", json={**body, "subject": "Science"}, headers=headers
    )
    social = await client.post(
        "/api/v1/classes", json={**body, "subject": "Social Science"}, headers=headers
    )
    assert science.status_code == social.status_code == 201
    assert science.json()["id"] != social.json()["id"]
    assert social.json()["subject"] == "Social Science"
    assert resolve_curriculum_code(8, social.json()["subject"]) == "NCERT-SOCI-C8"
    assert resolve_curriculum_code(8, science.json()["subject"]) == "NCERT-SCIE-C8"


@pytest.mark.asyncio
async def test_student_sees_only_assigned_classroom_work(
    client: AsyncClient,
    db_session: object,
    teacher_auth: tuple[User, str, dict[str, str]],
    student_auth: tuple[User, str, dict[str, str]],
    other_student_auth: tuple[User, str, dict[str, str]],
) -> None:
    from sqlalchemy.ext.asyncio import AsyncSession

    from app.models.organization import Enrollment

    assert isinstance(db_session, AsyncSession)
    await seed_class_skill(db_session, "skill-1")
    _, _, teacher_headers = teacher_auth
    student, _, student_headers = student_auth
    other, _, other_headers = other_student_auth
    created = await client.post(
        "/api/v1/classes",
        json={"name": "Assignments", "grade": 8, "section": "A"},
        headers=teacher_headers,
    )
    class_id = created.json()["id"]
    for user in (student, other):
        db_session.add(
            Enrollment(class_id=uuid.UUID(class_id), student_id=user.id, status="active")
        )
    await db_session.flush()
    invalid = await client.post(
        f"/api/v1/classes/{class_id}/assignments",
        json={"title": "Invalid", "skill_ids": ["missing-skill"], "student_ids": [str(student.id)]},
        headers=teacher_headers,
    )
    assert invalid.status_code == 409
    assignment = await client.post(
        f"/api/v1/classes/{class_id}/assignments",
        json={"title": "Practice", "skill_ids": ["skill-1"], "student_ids": [str(student.id)]},
        headers=teacher_headers,
    )
    assert assignment.status_code == 201
    url = f"/api/v1/classes/{class_id}/my-assignments"
    response = await client.get(url, headers=student_headers)
    assert response.status_code == 200
    assert [item["title"] for item in response.json()] == ["Practice"]
    assert (await client.get(url, headers=other_headers)).json() == []
