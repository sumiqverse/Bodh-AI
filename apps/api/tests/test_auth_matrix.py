"""Comprehensive RBAC Authorization Matrix Test.

Asserts expected HTTP status codes across all endpoints for:
1. Anonymous (unauthenticated)
2. Student (self)
3. Other-Student (unauthorized peer)
4. Teacher (owner / teacher role)
5. Other-Teacher (non-owner teacher)
6. Admin (school/platform admin)
"""

import uuid
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import User
from app.models.curriculum import Topic
from app.models.organization import Enrollment, School
from app.repositories.base import BaseRepository
from app.repositories.class_repo import ClassRepository
from app.repositories.consent_repo import ConsentRepository
from app.repositories.curriculum_repo import CurriculumRepository
from app.repositories.question_repo import QuestionRepository
from app.repositories.skill_repo import SkillRepository
from tests.conftest import MockRedis
from tests.factories import (
    CurriculumFactory,
    EnrollmentFactory,
    QuestionFactory,
    SchoolFactory,
    SkillFactory,
    TopicFactory,
)


@pytest.mark.asyncio
async def test_authorization_matrix(
    client: AsyncClient,
    db_session: AsyncSession,
    mock_redis: MockRedis,
    student_auth: tuple[User, str, dict[str, str]],
    other_student_auth: tuple[User, str, dict[str, str]],
    teacher_auth: tuple[User, str, dict[str, str]],
    other_teacher_auth: tuple[User, str, dict[str, str]],
    admin_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Matrix test calling all BodhAI endpoints across 6 security contexts."""
    # Reset rate limiting counter between batches
    mock_redis.data.clear()
    student, _student_token, student_h = student_auth
    _other_student, _other_student_token, other_student_h = other_student_auth
    teacher, _teacher_token, teacher_h = teacher_auth
    _other_teacher, _other_teacher_token, other_teacher_h = other_teacher_auth
    _admin, _admin_token, admin_h = admin_auth
    anon_h: dict[str, str] = {}

    # Grant consent for student 1 so attempts/sync work
    consent_repo = ConsentRepository(db_session)
    await consent_repo.grant_consent(student_id=student.id, scope="all", version="2026.1")

    # Seed School & Class owned by teacher
    school_repo = BaseRepository[School](School, db_session)
    school = await school_repo.create(SchoolFactory.build())
    await db_session.flush()

    class_repo = ClassRepository(db_session)
    classroom = await class_repo.create_class(
        teacher_id=teacher.id,
        school_id=school.id,
        name="Matrix Grade 9 Math",
        grade=9,
        section="A",
        academic_year="2024-2025",
    )

    # Enroll student in classroom
    enrollment_repo = BaseRepository[Enrollment](Enrollment, db_session)
    await enrollment_repo.create(
        EnrollmentFactory.build(
            class_id=classroom.id,
            student_id=student.id,
            status="pending",
        )
    )

    # Seed Curriculum, Topic, Skill, Question
    curr_repo = CurriculumRepository(db_session)
    topic_repo = BaseRepository[Topic](Topic, db_session)
    skill_repo = SkillRepository(db_session)
    question_repo = QuestionRepository(db_session)

    curriculum = await curr_repo.create(CurriculumFactory.build(code="NCERT_MATRIX_9", grade=9))
    topic = await topic_repo.create(TopicFactory.build(curriculum_id=curriculum.id))
    skill = await skill_repo.create(SkillFactory.build(topic_id=topic.id))
    question = await question_repo.create(QuestionFactory.build(skill_id=skill.id))
    await question_repo.add_translation(
        question_id=question.id,
        language="en",
        prompt="Matrix question 1+1=?",
        options=[{"id": "A", "text": "2", "is_correct": True}],
        explanation="1+1=2.",
    )
    await db_session.commit()

    # =========================================================================
    # 1. AUTH / ME: Authenticated users only
    # =========================================================================
    assert (await client.get("/api/v1/auth/me", headers=anon_h)).status_code == 401
    assert (await client.get("/api/v1/auth/me", headers=student_h)).status_code == 200
    assert (await client.get("/api/v1/auth/me", headers=other_student_h)).status_code == 200
    assert (await client.get("/api/v1/auth/me", headers=teacher_h)).status_code == 200
    assert (await client.get("/api/v1/auth/me", headers=other_teacher_h)).status_code == 200
    assert (await client.get("/api/v1/auth/me", headers=admin_h)).status_code == 200

    # =========================================================================
    # 2. CLASSES: Teacher creates and manages own classes
    # =========================================================================
    new_class_payload = {
        "school_id": str(school.id),
        "name": "New Class 10",
        "grade": 10,
        "section": "B",
        "academic_year": "2024-2025",
    }
    # POST /classes
    assert (
        await client.post("/api/v1/classes", json=new_class_payload, headers=anon_h)
    ).status_code == 401
    assert (
        await client.post("/api/v1/classes", json=new_class_payload, headers=student_h)
    ).status_code == 403
    assert (
        await client.post("/api/v1/classes", json=new_class_payload, headers=admin_h)
    ).status_code == 403
    create_teacher_res = await client.post(
        "/api/v1/classes", json=new_class_payload, headers=teacher_h
    )
    assert create_teacher_res.status_code == 201

    # GET /classes (list)
    assert (await client.get("/api/v1/classes", headers=anon_h)).status_code == 401
    assert (await client.get("/api/v1/classes", headers=student_h)).status_code == 403
    assert (await client.get("/api/v1/classes", headers=admin_h)).status_code == 403
    assert (await client.get("/api/v1/classes", headers=teacher_h)).status_code == 200
    assert (await client.get("/api/v1/classes", headers=other_teacher_h)).status_code == 200

    # GET /classes/{id} (ownership check: owner teacher only)
    assert (await client.get(f"/api/v1/classes/{classroom.id}", headers=anon_h)).status_code == 401
    assert (
        await client.get(f"/api/v1/classes/{classroom.id}", headers=student_h)
    ).status_code == 403
    assert (
        await client.get(f"/api/v1/classes/{classroom.id}", headers=other_teacher_h)
    ).status_code == 403
    assert (await client.get(f"/api/v1/classes/{classroom.id}", headers=admin_h)).status_code == 403
    assert (
        await client.get(f"/api/v1/classes/{classroom.id}", headers=teacher_h)
    ).status_code == 200

    # POST /classes/{id}/rotate-code (ownership check)
    assert (
        await client.post(f"/api/v1/classes/{classroom.id}/rotate-code", headers=anon_h)
    ).status_code == 401
    assert (
        await client.post(f"/api/v1/classes/{classroom.id}/rotate-code", headers=student_h)
    ).status_code == 403
    assert (
        await client.post(f"/api/v1/classes/{classroom.id}/rotate-code", headers=other_teacher_h)
    ).status_code == 403
    assert (
        await client.post(f"/api/v1/classes/{classroom.id}/rotate-code", headers=admin_h)
    ).status_code == 403
    assert (
        await client.post(f"/api/v1/classes/{classroom.id}/rotate-code", headers=teacher_h)
    ).status_code == 200

    # POST /classes/{id}/approve/{student_id} (ownership check)
    assert (
        await client.post(f"/api/v1/classes/{classroom.id}/approve/{student.id}", headers=anon_h)
    ).status_code == 401
    assert (
        await client.post(f"/api/v1/classes/{classroom.id}/approve/{student.id}", headers=student_h)
    ).status_code == 403
    assert (
        await client.post(
            f"/api/v1/classes/{classroom.id}/approve/{student.id}", headers=other_teacher_h
        )
    ).status_code == 403
    assert (
        await client.post(f"/api/v1/classes/{classroom.id}/approve/{student.id}", headers=admin_h)
    ).status_code == 403
    assert (
        await client.post(f"/api/v1/classes/{classroom.id}/approve/{student.id}", headers=teacher_h)
    ).status_code == 200

    # DELETE /classes/{id}/students/{student_id} (ownership check)
    assert (
        await client.delete(f"/api/v1/classes/{classroom.id}/students/{student.id}", headers=anon_h)
    ).status_code == 401
    assert (
        await client.delete(
            f"/api/v1/classes/{classroom.id}/students/{student.id}", headers=student_h
        )
    ).status_code == 403
    assert (
        await client.delete(
            f"/api/v1/classes/{classroom.id}/students/{student.id}", headers=other_teacher_h
        )
    ).status_code == 403
    assert (
        await client.delete(
            f"/api/v1/classes/{classroom.id}/students/{student.id}", headers=admin_h
        )
    ).status_code == 403
    assert (
        await client.delete(
            f"/api/v1/classes/{classroom.id}/students/{student.id}", headers=teacher_h
        )
    ).status_code == 200

    # =========================================================================
    # 3. ADMIN: Admin stats endpoint (school-level only, zero student PII)
    # =========================================================================
    assert (await client.get("/api/v1/admin/stats", headers=anon_h)).status_code == 401
    assert (await client.get("/api/v1/admin/stats", headers=student_h)).status_code == 403
    assert (await client.get("/api/v1/admin/stats", headers=teacher_h)).status_code == 403
    assert (await client.get("/api/v1/admin/stats", headers=other_teacher_h)).status_code == 403
    admin_stats_res = await client.get("/api/v1/admin/stats", headers=admin_h)
    assert admin_stats_res.status_code == 200
    stats_data = admin_stats_res.json()
    assert "total_students" in stats_data
    # Assert zero student PII is exposed
    assert "students" not in stats_data
    assert "student_emails" not in stats_data

    # Admin audit-logs review
    assert (await client.get("/api/v1/admin/audit-logs", headers=anon_h)).status_code == 401
    assert (await client.get("/api/v1/admin/audit-logs", headers=student_h)).status_code == 403
    assert (await client.get("/api/v1/admin/audit-logs", headers=teacher_h)).status_code == 403
    admin_logs_res = await client.get("/api/v1/admin/audit-logs?limit=10&offset=0", headers=admin_h)
    assert admin_logs_res.status_code == 200
    assert "items" in admin_logs_res.json()
    assert "total" in admin_logs_res.json()

    # Filtered audit logs
    filtered_logs_res = await client.get(
        f"/api/v1/admin/audit-logs?action=login&resource_type=user&user_id={student.id}&limit=5&offset=0",
        headers=admin_h,
    )
    assert filtered_logs_res.status_code == 200

    # =========================================================================
    # 4. CONSENTS: Guardian consent creation, withdrawal, inspection
    # =========================================================================
    mock_redis.data.clear()
    consent_payload = {
        "student_id": str(student.id),
        "guardian_name": "Sita Devi",
        "guardian_phone": "+919876500000",
        "guardian_relationship": "Mother",
        "scopes": ["diagnostic", "practice"],
        "version": "2026.1",
    }
    # Anonymous -> 401
    assert (
        await client.post("/api/v1/consents", json=consent_payload, headers=anon_h)
    ).status_code == 401
    # Other student -> 403 (cannot record consent for someone else)
    assert (
        await client.post("/api/v1/consents", json=consent_payload, headers=other_student_h)
    ).status_code == 403
    # Student self -> 201
    assert (
        await client.post("/api/v1/consents", json=consent_payload, headers=student_h)
    ).status_code == 201

    # GET /consents/student/{id}
    assert (
        await client.get(f"/api/v1/consents/student/{student.id}", headers=anon_h)
    ).status_code == 401
    assert (
        await client.get(f"/api/v1/consents/student/{student.id}", headers=other_student_h)
    ).status_code == 403
    assert (
        await client.get(f"/api/v1/consents/student/{student.id}", headers=student_h)
    ).status_code == 200
    assert (
        await client.get(f"/api/v1/consents/student/{student.id}", headers=teacher_h)
    ).status_code == 200
    assert (
        await client.get(f"/api/v1/consents/student/{student.id}", headers=admin_h)
    ).status_code == 200

    # POST /consents/withdraw
    withdraw_payload = {"scope": "diagnostic", "student_id": str(student.id)}
    assert (
        await client.post(
            "/api/v1/consents/withdraw", json=withdraw_payload, headers=other_student_h
        )
    ).status_code == 403
    withdraw_res = await client.post(
        "/api/v1/consents/withdraw", json=withdraw_payload, headers=student_h
    )
    assert withdraw_res.status_code == 200
    assert "Successfully withdrawn" in withdraw_res.json()["message"]

    # Re-grant consent for subsequent attempt tests
    await client.post("/api/v1/consents", json=consent_payload, headers=student_h)

    # =========================================================================
    # 5. DATA RIGHTS: Export and Delete under DPDP
    # =========================================================================
    # GET /data-rights/export/{student_id}
    assert (
        await client.get(f"/api/v1/data-rights/export/{student.id}", headers=anon_h)
    ).status_code == 401
    assert (
        await client.get(f"/api/v1/data-rights/export/{student.id}", headers=other_student_h)
    ).status_code == 403
    assert (
        await client.get(f"/api/v1/data-rights/export/{student.id}", headers=other_teacher_h)
    ).status_code == 403
    assert (
        await client.get(f"/api/v1/data-rights/export/{student.id}", headers=student_h)
    ).status_code == 200
    assert (
        await client.get(f"/api/v1/data-rights/export/{student.id}", headers=admin_h)
    ).status_code == 200

    # =========================================================================
    # 6. CURRICULA, SKILLS, QUESTIONS: Read by students, teachers, admins
    # =========================================================================
    mock_redis.data.clear()
    # Anonymous -> 401
    assert (await client.get("/api/v1/curricula", headers=anon_h)).status_code == 401
    assert (
        await client.get(f"/api/v1/curricula/{curriculum.code}", headers=anon_h)
    ).status_code == 401
    assert (await client.get(f"/api/v1/skills/{skill.id}", headers=anon_h)).status_code == 401
    assert (
        await client.get(f"/api/v1/questions?skill_id={skill.id}", headers=anon_h)
    ).status_code == 401

    # Student -> 200
    assert (await client.get("/api/v1/curricula", headers=student_h)).status_code == 200
    assert (
        await client.get(f"/api/v1/curricula/{curriculum.code}", headers=student_h)
    ).status_code == 200
    assert (await client.get(f"/api/v1/skills/{skill.id}", headers=student_h)).status_code == 200
    assert (
        await client.get(f"/api/v1/questions?skill_id={skill.id}", headers=student_h)
    ).status_code == 200

    # Teacher -> 200
    assert (await client.get("/api/v1/curricula", headers=teacher_h)).status_code == 200
    assert (
        await client.get(f"/api/v1/curricula/{curriculum.code}", headers=teacher_h)
    ).status_code == 200

    # Admin -> 200
    assert (await client.get("/api/v1/curricula", headers=admin_h)).status_code == 200
    assert (
        await client.get(f"/api/v1/curricula/{curriculum.code}", headers=admin_h)
    ).status_code == 200

    # Topics and graph routes
    topics_res = await client.get(f"/api/v1/curricula/{curriculum.code}/topics", headers=student_h)
    assert topics_res.status_code == 200
    graph_res = await client.get(f"/api/v1/curricula/{curriculum.code}/graph", headers=student_h)
    assert graph_res.status_code == 200
    assert (
        await client.get("/api/v1/curricula/NONEXISTENT/topics", headers=student_h)
    ).status_code == 404
    assert (
        await client.get("/api/v1/curricula/NONEXISTENT/graph", headers=student_h)
    ).status_code == 404
    assert (await client.get("/api/v1/curricula/NONEXISTENT", headers=student_h)).status_code == 404

    # Skills sub-routes
    prereqs_res = await client.get(f"/api/v1/skills/{skill.id}/prerequisites", headers=student_h)
    assert prereqs_res.status_code == 200
    topic_skills_res = await client.get(f"/api/v1/skills/by-topic/{topic.id}", headers=student_h)
    assert topic_skills_res.status_code == 200
    assert (
        await client.get(f"/api/v1/skills/{uuid.uuid4()}", headers=student_h)
    ).status_code == 404

    # =========================================================================
    # 7. ATTEMPTS: Students submit attempts
    # =========================================================================
    attempt_payload = {
        "question_id": str(question.id),
        "skill_id": str(skill.id),
        "selected_answer": "A",
        "idempotency_key": f"matrix_attempt_{uuid.uuid4()}",
        "time_spent_ms": 3500,
        "client_timestamp": datetime.now(UTC).isoformat(),
    }
    assert (
        await client.post("/api/v1/attempts", json=attempt_payload, headers=anon_h)
    ).status_code == 401
    assert (
        await client.post("/api/v1/attempts", json=attempt_payload, headers=teacher_h)
    ).status_code == 403
    assert (
        await client.post("/api/v1/attempts", json=attempt_payload, headers=admin_h)
    ).status_code == 403
    assert (
        await client.post("/api/v1/attempts", json=attempt_payload, headers=student_h)
    ).status_code == 200

    # =========================================================================
    # 8. MASTERY: Student reads self, peer blocked, teacher/admin read
    # =========================================================================
    mastery_url = f"/api/v1/mastery?student_id={student.id}"
    assert (await client.get(mastery_url, headers=anon_h)).status_code == 401
    assert (await client.get(mastery_url, headers=other_student_h)).status_code == 403
    assert (await client.get(mastery_url, headers=student_h)).status_code == 200
    assert (await client.get(mastery_url, headers=teacher_h)).status_code == 200
    assert (await client.get(mastery_url, headers=admin_h)).status_code == 200

    # Specific skill mastery
    assert (
        await client.get(
            f"/api/v1/mastery/{skill.id}?student_id={student.id}", headers=other_student_h
        )
    ).status_code == 403
    assert (
        await client.get(f"/api/v1/mastery/{skill.id}?student_id={student.id}", headers=student_h)
    ).status_code == 200
    assert (
        await client.get(
            f"/api/v1/mastery/{uuid.uuid4()}?student_id={student.id}", headers=student_h
        )
    ).status_code == 404

    # =========================================================================
    # 9. DATA RIGHTS DELETE: Student requests self deletion, other-student blocked
    # =========================================================================
    delete_url = f"/api/v1/data-rights/delete/{student.id}"
    assert (await client.post(delete_url, headers=anon_h)).status_code == 401
    assert (await client.post(delete_url, headers=other_student_h)).status_code == 403
    assert (await client.post(delete_url, headers=other_teacher_h)).status_code == 403
    assert (await client.post(delete_url, headers=student_h)).status_code == 200
