"""Tests for teacher dashboard aggregates, gap clusters, warnings, and decisions."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import Role, User
from app.models.curriculum import Topic
from app.models.organization import Enrollment, School
from app.repositories.attempt_repo import AttemptRepository
from app.repositories.base import BaseRepository
from app.repositories.class_repo import ClassRepository
from app.repositories.curriculum_repo import CurriculumRepository
from app.repositories.mastery_repo import MasteryRepository
from app.repositories.question_repo import QuestionRepository
from app.repositories.skill_repo import SkillRepository
from app.repositories.teacher_repo import TeacherRepository
from tests.conftest import MockRedis
from tests.factories import (
    CurriculumFactory,
    EnrollmentFactory,
    QuestionFactory,
    RoleFactory,
    SchoolFactory,
    SkillFactory,
    TopicFactory,
    UserFactory,
)


@pytest.mark.asyncio
async def test_teacher_dashboard_comprehensive(
    client: AsyncClient,
    db_session: AsyncSession,
    mock_redis: MockRedis,
    teacher_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Test full teacher dashboard workflow: heatmap, clusters, warnings, profile, and CSV."""
    mock_redis.data.clear()
    teacher, _token, headers = teacher_auth

    # 1. Setup School, Class, Curriculum, Topic, Skills
    school_repo = BaseRepository[School](School, db_session)
    school = await school_repo.create(SchoolFactory.build())
    await db_session.flush()

    class_repo = ClassRepository(db_session)
    school_class = await class_repo.create_class(
        teacher_id=teacher.id,
        school_id=school.id,
        name="Grade 11 Mathematics",
        grade=11,
        section="A",
        academic_year="2024-2025",
    )

    curr_repo = CurriculumRepository(db_session)
    topic_repo = BaseRepository[Topic](Topic, db_session)
    skill_repo = SkillRepository(db_session)
    question_repo = QuestionRepository(db_session)

    curriculum = await curr_repo.create(CurriculumFactory.build(code="NCERT_TEACHER_11", grade=11))
    topic = await topic_repo.create(
        TopicFactory.build(curriculum_id=curriculum.id, name="Number Systems")
    )
    skill_a = await skill_repo.create(
        SkillFactory.build(topic_id=topic.id, code="SKILL_INT_OPS", name="Integer Operations")
    )
    await skill_repo.create(
        SkillFactory.build(topic_id=topic.id, code="SKILL_FRAC_OPS", name="Fraction Operations")
    )

    q1 = await question_repo.create(QuestionFactory.build(skill_id=skill_a.id))
    await question_repo.add_translation(
        question_id=q1.id,
        language="en",
        prompt="Calculate -5 + 8",
        options=[
            {"id": "A", "text": "3", "is_correct": True},
            {"id": "B", "text": "-13", "is_correct": False},
        ],
        explanation="Opposite signs subtract",
        hints=["Consider number line"],
    )

    # 2. Setup 3 Students with Enrollments
    stmt = select(Role).where(Role.name == "student")
    res = await db_session.execute(stmt)
    st_role = res.scalar_one_or_none()
    if st_role is None:
        role_repo = BaseRepository[Role](Role, db_session)
        st_role = await role_repo.create(RoleFactory.build(name="student"))

    user_repo = BaseRepository[User](User, db_session)
    enrollment_repo = BaseRepository[Enrollment](Enrollment, db_session)

    s1 = await user_repo.create(
        UserFactory.build(full_name="Aarav Sharma", username="aarav1", role_id=st_role.id)
    )
    s2 = await user_repo.create(
        UserFactory.build(full_name="Diya Patel", username="diya2", role_id=st_role.id)
    )
    s3 = await user_repo.create(
        UserFactory.build(full_name="Rohan Gupta", username="rohan3", role_id=st_role.id)
    )

    await enrollment_repo.create(
        EnrollmentFactory.build(
            class_id=school_class.id, student_id=s1.id, status="active", roll_number="01"
        )
    )
    await enrollment_repo.create(
        EnrollmentFactory.build(
            class_id=school_class.id, student_id=s2.id, status="active", roll_number="02"
        )
    )
    await enrollment_repo.create(
        EnrollmentFactory.build(
            class_id=school_class.id, student_id=s3.id, status="active", roll_number="03"
        )
    )

    # 3. Seed Attempts and Mastery
    mastery_repo = MasteryRepository(db_session)
    attempt_repo = AttemptRepository(db_session)

    # Student 1: Mastered skill_a (p=0.85)
    await mastery_repo.upsert_mastery(
        student_id=s1.id,
        skill_id=skill_a.id,
        p_mastery=0.85,
        confidence=0.9,
        is_correct=True,
    )
    await attempt_repo.record_attempt(
        student_id=s1.id,
        question_id=q1.id,
        skill_id=skill_a.id,
        idempotency_key=f"att-{uuid.uuid4()}",
        selected_answer="A",
        is_correct=True,
        time_spent_ms=4500,
        client_timestamp=datetime.now(UTC),
    )

    # Student 2: Stalled on skill_a (4 attempts with 3 incorrect)
    await mastery_repo.upsert_mastery(
        student_id=s2.id,
        skill_id=skill_a.id,
        p_mastery=0.45,
        confidence=0.5,
        is_correct=False,
    )
    for i in range(4):
        await attempt_repo.record_attempt(
            student_id=s2.id,
            question_id=q1.id,
            skill_id=skill_a.id,
            idempotency_key=f"att-{uuid.uuid4()}",
            selected_answer="B" if i < 3 else "A",
            is_correct=(i >= 3),
            time_spent_ms=6000,
            client_timestamp=datetime.now(UTC),
        )

    # Student 3: Inactive (no attempts seeded)
    await db_session.flush()

    # 4. Test GET Heatmap
    resp_heat = await client.get(f"/api/v1/classes/{school_class.id}/heatmap", headers=headers)
    assert resp_heat.status_code == 200
    heat_data = resp_heat.json()
    assert heat_data["total_students"] == 3
    assert heat_data["total_skills"] == 2
    assert len(heat_data["matrix"]) == 6  # 3 students x 2 skills

    # Verify ETag caching header & 304 response
    etag = resp_heat.headers.get("etag")
    assert etag is not None
    assert "Cache-Control" in resp_heat.headers

    resp_304 = await client.get(
        f"/api/v1/classes/{school_class.id}/heatmap",
        headers={**headers, "if-none-match": etag},
    )
    assert resp_304.status_code == 304

    # 5. Test GET Gap Clusters
    resp_clusters = await client.get(
        f"/api/v1/classes/{school_class.id}/gap-clusters?min_students=2",
        headers=headers,
    )
    assert resp_clusters.status_code == 200
    clusters_data = resp_clusters.json()
    assert clusters_data["total_clusters"] >= 1
    top_cluster = clusters_data["clusters"][0]
    assert "suggested_revision_plan" in top_cluster
    assert top_cluster["student_count"] >= 2

    # 6. Test GET Early Warnings
    resp_warnings = await client.get(
        f"/api/v1/classes/{school_class.id}/early-warnings?days=14",
        headers=headers,
    )
    assert resp_warnings.status_code == 200
    warnings_data = resp_warnings.json()
    warning_types = [w["warning_type"] for w in warnings_data["warnings"]]
    assert "inactive" in warning_types  # student 3
    assert "stalled" in warning_types  # student 2

    # 7. Test GET Student Profile
    resp_profile = await client.get(
        f"/api/v1/classes/{school_class.id}/students/{s2.id}/profile",
        headers=headers,
    )
    assert resp_profile.status_code == 200
    profile_data = resp_profile.json()
    assert profile_data["student_id"] == str(s2.id)
    assert len(profile_data["error_patterns"]) >= 1
    assert "hint_usage" in profile_data
    assert "trend" in profile_data

    # 8. Test Suggestions and Recording Teacher Decision
    resp_sug = await client.get(
        f"/api/v1/classes/{school_class.id}/suggestions",
        headers=headers,
    )
    assert resp_sug.status_code == 200
    suggestions = resp_sug.json()["suggestions"]
    assert len(suggestions) > 0
    sug_id = suggestions[0]["suggestion_id"]

    resp_dec = await client.post(
        f"/api/v1/classes/{school_class.id}/suggestions/{sug_id}/decision",
        json={
            "action": "accept",
            "evidence": {"pre_score": 0.45},
            "rationale": "High diagnostic error rate detected",
            "teacher_notes": "Assigning 3-step scaffold ladder in Monday morning lab",
        },
        headers=headers,
    )
    assert resp_dec.status_code == 201
    dec_data = resp_dec.json()
    assert dec_data["action"] == "accept"
    assert dec_data["suggestion_id"] == sug_id

    # 9. Test Creating and Listing Assignments
    resp_create_assign = await client.post(
        f"/api/v1/classes/{school_class.id}/assignments",
        json={
            "title": "Integers Remediation",
            "description": "Scaffolded practice for students needing revision",
            "skill_ids": [str(skill_a.id)],
            "student_ids": [str(s2.id), str(s3.id)],
        },
        headers=headers,
    )
    assert resp_create_assign.status_code == 201
    assign_data = resp_create_assign.json()
    assert assign_data["title"] == "Integers Remediation"
    assert assign_data["total_assigned"] == 2

    resp_list_assign = await client.get(
        f"/api/v1/classes/{school_class.id}/assignments",
        headers=headers,
    )
    assert resp_list_assign.status_code == 200
    assignments_list = resp_list_assign.json()
    assert len(assignments_list) >= 1

    # 10. Test Class Progress Summary
    resp_prog = await client.get(
        f"/api/v1/classes/{school_class.id}/progress-summary",
        headers=headers,
    )
    assert resp_prog.status_code == 200
    prog_data = resp_prog.json()
    assert prog_data["total_students"] == 3
    assert "overall_mastery_pct" in prog_data
    assert "timeline" in prog_data

    # 11. Test Privacy-Aware CSV Export
    resp_csv = await client.get(
        f"/api/v1/classes/{school_class.id}/export/csv",
        headers=headers,
    )
    assert resp_csv.status_code == 200
    assert "text/csv" in resp_csv.headers["content-type"]
    csv_text = resp_csv.text
    # Verify DPDP privacy compliance: no sensitive PII, contains pseudonym or roll number
    assert "Roll Number" in csv_text
    assert "Skill Code" in csv_text
    assert "SKILL_INT_OPS" in csv_text
    assert "Grade 11 Mathematics" in csv_text

    # 12. Direct TeacherRepository edge case coverage
    teacher_repo = TeacherRepository(db_session)
    empty_class_attempts = await teacher_repo.get_class_attempts_since([], datetime.now(UTC))
    assert empty_class_attempts == []
    empty_mastery = await teacher_repo.get_mastery_matrix([], [])
    assert empty_mastery == []
    cached_aggs = await teacher_repo.get_cached_skill_aggregates(school_class.id)
    assert isinstance(cached_aggs, list)
    await teacher_repo.refresh_class_aggregates(school_class.id, [])
    refreshed_aggs = await teacher_repo.get_cached_skill_aggregates(school_class.id)
    assert refreshed_aggs == []
