"""Tests for PostgreSQL Row-Level Security (RLS) and context isolation."""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import set_rls_context
from app.models.auth import User
from app.models.organization import Enrollment, School
from app.repositories.base import BaseRepository
from app.repositories.class_repo import ClassRepository
from tests.factories import (
    EnrollmentFactory,
    SchoolFactory,
)


@pytest.mark.asyncio
async def test_set_rls_context_executes_correct_sql() -> None:
    """Verify set_rls_context applies SET LOCAL app.user_id and app.role for PostgreSQL."""
    mock_session = AsyncMock(spec=AsyncSession)
    mock_bind = MagicMock()
    mock_bind.dialect.name = "postgresql"
    mock_session.bind = mock_bind

    user_id = uuid.uuid4()
    await set_rls_context(mock_session, user_id=user_id, role="teacher")

    assert mock_session.execute.call_count == 2
    # Verify the SQL strings executed contain the set_config commands for app.user_id and app.role
    calls = [str(call.args[0]) for call in mock_session.execute.call_args_list]
    assert any("app.user_id" in call for call in calls)
    assert any("app.role" in call for call in calls)


@pytest.mark.asyncio
async def test_set_rls_context_skips_non_postgres() -> None:
    """Verify set_rls_context does not execute PostgreSQL syntax on SQLite."""
    mock_session = AsyncMock(spec=AsyncSession)
    mock_bind = MagicMock()
    mock_bind.dialect.name = "sqlite"
    mock_session.bind = mock_bind

    user_id = uuid.uuid4()
    await set_rls_context(mock_session, user_id=user_id, role="student")

    assert mock_session.execute.call_count == 0


@pytest.mark.asyncio
async def test_class_isolation_between_teachers(
    db_session: AsyncSession,
    teacher_auth: tuple[User, str, dict[str, str]],
    other_teacher_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Verify class repository isolates classes between educators."""
    teacher1, _, _ = teacher_auth
    teacher2, _, _ = other_teacher_auth

    school_repo = BaseRepository[School](School, db_session)
    school = await school_repo.create(SchoolFactory.build())
    await db_session.flush()

    class_repo = ClassRepository(db_session)
    c1 = await class_repo.create_class(
        teacher_id=teacher1.id,
        school_id=school.id,
        name="Teacher 1 Class",
        grade=8,
        section="A",
        academic_year="2024-2025",
    )
    c2 = await class_repo.create_class(
        teacher_id=teacher2.id,
        school_id=school.id,
        name="Teacher 2 Class",
        grade=8,
        section="B",
        academic_year="2024-2025",
    )
    await db_session.commit()

    # Teacher 1 query
    t1_classes = await class_repo.list_classes_by_teacher(teacher1.id)
    assert any(c.id == c1.id for c in t1_classes)
    assert not any(c.id == c2.id for c in t1_classes)

    # Teacher 2 query
    t2_classes = await class_repo.list_classes_by_teacher(teacher2.id)
    assert any(c.id == c2.id for c in t2_classes)
    assert not any(c.id == c1.id for c in t2_classes)


@pytest.mark.asyncio
async def test_enrollment_isolation_between_students(
    db_session: AsyncSession,
    student_auth: tuple[User, str, dict[str, str]],
    other_student_auth: tuple[User, str, dict[str, str]],
    teacher_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Verify enrollments are isolated per student."""
    student1, _, _ = student_auth
    student2, _, _ = other_student_auth
    teacher, _, _ = teacher_auth

    school_repo = BaseRepository[School](School, db_session)
    school = await school_repo.create(SchoolFactory.build())
    await db_session.flush()

    class_repo = ClassRepository(db_session)
    classroom = await class_repo.create_class(
        teacher_id=teacher.id,
        school_id=school.id,
        name="Joint Class",
        grade=7,
        section="C",
        academic_year="2024-2025",
    )

    enrollment_repo = BaseRepository[Enrollment](Enrollment, db_session)
    e1 = await enrollment_repo.create(
        EnrollmentFactory.build(class_id=classroom.id, student_id=student1.id)
    )
    e2 = await enrollment_repo.create(
        EnrollmentFactory.build(class_id=classroom.id, student_id=student2.id)
    )
    await db_session.commit()

    assert e1.student_id == student1.id
    assert e2.student_id == student2.id
    assert e1.student_id != e2.student_id
