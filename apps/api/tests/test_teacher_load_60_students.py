"""Performance load test verifying heatmap endpoint p95 < 300 ms for 60 students x 150 skills."""

from __future__ import annotations

import time
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import Role, User
from app.models.curriculum import Topic
from app.models.organization import Enrollment, School
from app.repositories.base import BaseRepository
from app.repositories.class_repo import ClassRepository
from app.repositories.curriculum_repo import CurriculumRepository
from app.repositories.mastery_repo import MasteryRepository
from app.repositories.skill_repo import SkillRepository
from tests.conftest import MockRedis
from tests.factories import (
    CurriculumFactory,
    EnrollmentFactory,
    RoleFactory,
    SchoolFactory,
    SkillFactory,
    TopicFactory,
    UserFactory,
)


@pytest.mark.asyncio
async def test_teacher_heatmap_load_60_students(
    client: AsyncClient,
    db_session: AsyncSession,
    mock_redis: MockRedis,
    teacher_auth: tuple[User, str, dict[str, str]],
) -> None:
    """Validate that heatmap endpoint latency p95 < 300 ms for 60 students x 150 skills."""
    mock_redis.data.clear()
    teacher, _tok, headers = teacher_auth

    # 1. School & Class
    school_repo = BaseRepository[School](School, db_session)
    school = await school_repo.create(SchoolFactory.build())
    await db_session.flush()

    class_repo = ClassRepository(db_session)
    school_class = await class_repo.create_class(
        teacher_id=teacher.id,
        school_id=school.id,
        name="Large Scale Class 10A",
        grade=10,
        section="A",
        academic_year="2024-2025",
    )

    # 2. Setup Curriculum with 150 Skills across Topics
    curr_repo = CurriculumRepository(db_session)
    topic_repo = BaseRepository[Topic](Topic, db_session)

    curriculum = await curr_repo.create(CurriculumFactory.build(code="NCERT-MATH-C10", grade=10))

    topics = []
    for t_idx in range(5):
        t = await topic_repo.create(
            TopicFactory.build(
                curriculum_id=curriculum.id,
                name=f"Unit {t_idx + 1}",
                sequence_order=t_idx,
            )
        )
        topics.append(t)

    skill_repo = SkillRepository(db_session)
    created_skills = []
    for s_idx in range(150):
        topic = topics[s_idx % len(topics)]
        sk = await skill_repo.create(
            SkillFactory.build(
                topic_id=topic.id,
                code=f"LOAD_SKILL_{s_idx:03d}",
                name=f"Skill {s_idx + 1}",
                difficulty=0.5,
            )
        )
        created_skills.append(sk)

    # 3. Setup 60 Students with Enrollments
    stmt = select(Role).where(Role.name == "student")
    res = await db_session.execute(stmt)
    st_role = res.scalar_one_or_none()
    if st_role is None:
        role_repo = BaseRepository[Role](Role, db_session)
        st_role = await role_repo.create(RoleFactory.build(name="student"))

    user_repo = BaseRepository[User](User, db_session)
    enrollment_repo = BaseRepository[Enrollment](Enrollment, db_session)

    students = []
    for st_idx in range(60):
        student = await user_repo.create(
            UserFactory.build(
                role_id=st_role.id,
                full_name=f"Student {st_idx + 1}",
                username=f"student_load_{st_idx}_{uuid.uuid4().hex[:6]}",
            )
        )
        await enrollment_repo.create(
            EnrollmentFactory.build(
                class_id=school_class.id,
                student_id=student.id,
                status="active",
                roll_number=f"{st_idx + 1:02d}",
            )
        )
        students.append(student)

    # 4. Seed sample Mastery records in bulk
    mastery_repo = MasteryRepository(db_session)
    # Seed subset of masteries to simulate real partial/mastered distribution
    for i in range(0, 60, 2):
        st = students[i]
        for j in range(0, 150, 5):
            sk = created_skills[j]
            await mastery_repo.upsert_mastery(
                student_id=st.id,
                skill_id=sk.id,
                p_mastery=0.85 if (i + j) % 2 == 0 else 0.55,
                confidence=0.8,
                is_correct=((i + j) % 2 == 0),
            )

    await db_session.flush()

    # 5. Warmup call to initialize precomputed aggregates
    warmup_resp = await client.get(f"/api/v1/classes/{school_class.id}/heatmap", headers=headers)
    assert warmup_resp.status_code == 200

    # 6. Measure latency across multiple calls
    latencies: list[float] = []
    for _ in range(10):
        start = time.perf_counter()
        resp = await client.get(f"/api/v1/classes/{school_class.id}/heatmap", headers=headers)
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        assert resp.status_code == 200
        latencies.append(elapsed_ms)

    print("\nMeasured Latencies (ms):", [round(x, 1) for x in latencies])

    # Calculate p95 latency
    latencies.sort()
    p95_index = int(0.95 * len(latencies))
    p95_latency = latencies[p95_index]

    # Verify performance threshold: p95 < 300 ms
    assert p95_latency < 300.0, f"Expected p95 < 300 ms, got {p95_latency:.2f} ms"

    # Verify aggregate correctness
    data = resp.json()
    assert data["total_students"] == 60
    assert data["total_skills"] == 150
    assert len(data["matrix"]) == 60 * 150  # 9,000 cells
