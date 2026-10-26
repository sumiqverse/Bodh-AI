"""Extended authorization matrix tests for teacher dashboard endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import User
from app.models.organization import School
from app.repositories.base import BaseRepository
from app.repositories.class_repo import ClassRepository
from tests.conftest import MockRedis
from tests.factories import SchoolFactory


@pytest.mark.asyncio
async def test_teacher_authorization_matrix(
    client: AsyncClient,
    db_session: AsyncSession,
    mock_redis: MockRedis,
    teacher_auth: tuple[User, str, dict[str, str]],
    other_teacher_auth: tuple[User, str, dict[str, str]],
    student_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Verify owner teacher access and isolation: other teacher 403, student 403, anon 401."""
    mock_redis.data.clear()
    teacher, _t_tok, teacher_h = teacher_auth
    _other_t, _ot_tok, other_teacher_h = other_teacher_auth
    _student, _s_tok, student_h = student_auth
    anon_h: dict[str, str] = {}

    school_repo = BaseRepository[School](School, db_session)
    school = await school_repo.create(SchoolFactory.build())
    await db_session.flush()

    class_repo = ClassRepository(db_session)
    classroom = await class_repo.create_class(
        teacher_id=teacher.id,
        school_id=school.id,
        name="Auth Test Class",
        grade=8,
        section="A",
        academic_year="2024-2025",
    )
    class_id = classroom.id

    endpoints = [
        ("GET", f"/api/v1/classes/{class_id}/heatmap"),
        ("GET", f"/api/v1/classes/{class_id}/gap-clusters"),
        ("GET", f"/api/v1/classes/{class_id}/early-warnings"),
        ("GET", f"/api/v1/classes/{class_id}/suggestions"),
        ("GET", f"/api/v1/classes/{class_id}/assignments"),
        ("GET", f"/api/v1/classes/{class_id}/progress-summary"),
        ("GET", f"/api/v1/classes/{class_id}/export/csv"),
    ]

    for method, path in endpoints:
        # Anonymous -> 401
        resp_anon = await client.request(method, path, headers=anon_h)
        assert resp_anon.status_code == 401, (
            f"Expected 401 for anon on {path}, got {resp_anon.status_code}"
        )

        # Student -> 403
        resp_student = await client.request(method, path, headers=student_h)
        assert resp_student.status_code == 403, (
            f"Expected 403 for student on {path}, got {resp_student.status_code}"
        )

        # Other teacher -> 403 (Teacher isolation)
        resp_other_t = await client.request(method, path, headers=other_teacher_h)
        assert resp_other_t.status_code == 403, (
            f"Expected 403 for other teacher on {path}, got {resp_other_t.status_code}"
        )

        # Owner teacher -> 200
        resp_owner = await client.request(method, path, headers=teacher_h)
        assert resp_owner.status_code == 200, (
            f"Expected 200 for owner teacher on {path}, got {resp_owner.status_code}"
        )
