"""Unit tests for TeacherDashboardService: heatmaps, gap clusters, and assignments."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import Attempt, Mastery
from app.models.auth import Role, User
from app.models.curriculum import Curriculum, Skill, Topic
from app.models.organization import Enrollment, SchoolClass
from app.schemas.teacher import (
    AssignmentCreateRequest,
    TeacherDecisionCreateRequest,
)
from app.services.teacher_service import TeacherDashboardService


@pytest.fixture
async def teacher_fixture(db_session: AsyncSession) -> tuple[User, User, SchoolClass, Skill]:
    """Create a teacher, student, class, and skill for testing."""
    # 1. Roles (get or create to avoid UNIQUE constraint violations across session tests)
    teacher_role_res = await db_session.execute(select(Role).where(Role.name == "teacher"))
    teacher_role = teacher_role_res.scalar_one_or_none()
    if teacher_role is None:
        teacher_role = Role(name="teacher", description="Teacher role")
        db_session.add(teacher_role)

    student_role_res = await db_session.execute(select(Role).where(Role.name == "student"))
    student_role = student_role_res.scalar_one_or_none()
    if student_role is None:
        student_role = Role(name="student", description="Student role")
        db_session.add(student_role)
    await db_session.flush()

    # 2. Teacher & Student
    teacher = User(
        id=uuid.uuid4(),
        role_id=teacher_role.id,
        username=f"t_{uuid.uuid4().hex[:6]}",
        full_name="Master Shifu",
        hashed_password="hash",
    )
    student = User(
        id=uuid.uuid4(),
        role_id=student_role.id,
        username=f"s_{uuid.uuid4().hex[:6]}",
        full_name="Po Panda",
        hashed_password="hash",
    )
    db_session.add_all([teacher, student])
    await db_session.flush()

    from tests.factories import SchoolClassFactory, SchoolFactory

    # 3. School & Class
    school = SchoolFactory.build()
    db_session.add(school)
    await db_session.flush()

    school_class = SchoolClassFactory.build(
        school_id=school.id,
        teacher_id=teacher.id,
        name="Grade 8 Kung Fu Math",
        grade=8,
        section="A",
    )
    db_session.add(school_class)
    await db_session.flush()

    # 4. Enrollment
    enrollment = Enrollment(
        class_id=school_class.id,
        student_id=student.id,
        roll_number=1,
    )
    db_session.add(enrollment)

    # 5. Curriculum, Topic, Skill
    curriculum = Curriculum(
        id=uuid.uuid4(),
        code=f"NCERT_G8_{uuid.uuid4().hex[:6]}",
        board="NCERT",
        grade=8,
        subject="Mathematics",
        version="v1",
    )
    db_session.add(curriculum)
    await db_session.flush()

    topic = Topic(
        id=uuid.uuid4(),
        curriculum_id=curriculum.id,
        code="TOPIC_ALGEBRA",
        name="Linear Equations",
        sequence_order=1,
    )
    db_session.add(topic)
    await db_session.flush()

    from tests.factories import SkillFactory

    skill = SkillFactory.build(
        topic_id=topic.id,
        code=f"SKILL_{uuid.uuid4().hex[:6]}",
        name="Solve single variable equations",
        difficulty=0.5,
    )
    db_session.add(skill)
    await db_session.flush()

    return teacher, student, school_class, skill


@pytest.mark.asyncio
async def test_teacher_dashboard_heatmap_and_aggregates(
    db_session: AsyncSession,
    teacher_fixture: tuple[User, User, SchoolClass, Skill],
) -> None:
    """Verify class heatmap generation, mastery status categorization, and aggregate persistence."""
    _teacher, student, school_class, skill = teacher_fixture
    service = TeacherDashboardService(db_session)

    # 1. Empty heatmap (not attempted)
    heatmap_empty = await service.get_class_heatmap(school_class)
    assert heatmap_empty.class_id == school_class.id
    assert any(s.student_id == student.id for s in heatmap_empty.students)
    assert any(sk.skill_id == skill.id for sk in heatmap_empty.skills)
    cell = next(
        (c for c in heatmap_empty.matrix if c.student_id == student.id and c.skill_id == skill.id),
        None,
    )
    assert cell is not None
    assert cell.state == "not_learned"

    # 2. Add partial mastery state (p = 0.65)
    mastery = Mastery(
        student_id=student.id,
        skill_id=skill.id,
        p_mastery=0.65,
        confidence=0.85,
        attempts_count=3,
        last_attempted_at=datetime.now(UTC),
    )
    db_session.add(mastery)
    await db_session.flush()

    heatmap_partial = await service.get_class_heatmap(school_class)
    cell_partial = next(
        (
            c
            for c in heatmap_partial.matrix
            if c.student_id == student.id and c.skill_id == skill.id
        ),
        None,
    )
    assert cell_partial is not None
    assert cell_partial.state == "partial"

    # 3. Update to mastered (p = 0.92)
    mastery.p_mastery = 0.92
    await db_session.flush()

    heatmap_mastered = await service.get_class_heatmap(school_class)
    cell_mastered = next(
        (
            c
            for c in heatmap_mastered.matrix
            if c.student_id == student.id and c.skill_id == skill.id
        ),
        None,
    )
    assert cell_mastered is not None
    assert cell_mastered.state == "mastered"


@pytest.mark.asyncio
async def test_teacher_dashboard_gap_clusters_and_early_warnings(
    db_session: AsyncSession,
    teacher_fixture: tuple[User, User, SchoolClass, Skill],
) -> None:
    """Verify conceptual gap clustering and early warning identification."""
    _teacher, student, school_class, skill = teacher_fixture
    service = TeacherDashboardService(db_session)

    # Student has low mastery (p = 0.30)
    mastery = Mastery(
        student_id=student.id,
        skill_id=skill.id,
        p_mastery=0.30,
        confidence=0.70,
        attempts_count=2,
    )
    db_session.add(mastery)
    await db_session.flush()

    # 1. Gap clusters: min_students=1 should produce cluster
    clusters_res = await service.get_group_gap_clusters(school_class, min_students=1, min_ratio=0.0)
    assert clusters_res.total_clusters >= 1
    cluster = next((c for c in clusters_res.clusters if c.skill_id == skill.id), None)
    assert cluster is not None
    assert student.id in cluster.student_ids
    assert "suggested_actions" in cluster.suggested_revision_plan

    # 2. Early warnings: student has zero recent attempts -> inactive warning
    warnings_res = await service.get_early_warnings(school_class, days_threshold=7)
    assert len(warnings_res.warnings) == 1
    assert warnings_res.warnings[0].warning_type == "inactive"
    assert warnings_res.warnings[0].student_id == student.id

    # 3. Add 4 failed attempts -> stalled warning
    for i in range(4):
        att = Attempt(
            student_id=student.id,
            question_id=uuid.uuid4(),
            skill_id=skill.id,
            selected_answer="B",
            is_correct=False,
            idempotency_key=f"att_fail_{i}_{uuid.uuid4().hex[:6]}",
            time_spent_ms=3000,
            client_timestamp=datetime.now(UTC),
            created_at=datetime.now(UTC) - timedelta(days=1),
        )
        db_session.add(att)
    await db_session.flush()

    warnings_stalled = await service.get_early_warnings(school_class, days_threshold=7)
    assert any(w.warning_type == "stalled" for w in warnings_stalled.warnings)


@pytest.mark.asyncio
async def test_teacher_dashboard_student_profile_and_decisions(
    db_session: AsyncSession,
    teacher_fixture: tuple[User, User, SchoolClass, Skill],
) -> None:
    """Verify deep student profile assembly, pedagogical suggestions, and decision recording."""
    teacher, student, school_class, _skill = teacher_fixture
    service = TeacherDashboardService(db_session)

    # 1. Profile retrieval
    profile = await service.get_student_profile(school_class, student.id)
    assert profile.student_id == student.id
    assert len(profile.skills) >= 1
    assert profile.summary["total_attempts"] == 0

    # 2. Pedagogical suggestions
    sug_res = await service.get_class_suggestions(school_class)
    assert len(sug_res.suggestions) >= 1
    suggestion = sug_res.suggestions[0]
    assert "Targeted Intervention" in suggestion.title

    # 3. Record teacher decision on suggestion
    decision_req = TeacherDecisionCreateRequest(
        action="accept",
        teacher_notes="Approved 3-step practice revision for Class 8A",
        evidence={"observed": "Stalled on sign inversion"},
        rationale="Needs foundational reinforcement before algebra unit test",
    )
    decision = await service.record_teacher_decision(
        school_class=school_class,
        teacher=teacher,
        suggestion_id=suggestion.suggestion_id,
        payload=decision_req,
    )
    assert decision.action == "accept"
    assert decision.suggestion_id == suggestion.suggestion_id

    # Verify suggestion status updated to accept
    sug_updated = await service.get_class_suggestions(school_class)
    assert any(
        s.suggestion_id == suggestion.suggestion_id and s.status == "accept"
        for s in sug_updated.suggestions
    )


@pytest.mark.asyncio
async def test_teacher_dashboard_assignments_progress_and_csv_export(
    db_session: AsyncSession,
    teacher_fixture: tuple[User, User, SchoolClass, Skill],
) -> None:
    """Verify creating assignments, querying assignment list, progress summary, and CSV export."""
    teacher, student, school_class, skill = teacher_fixture
    service = TeacherDashboardService(db_session)

    # 1. Create assignment
    due = datetime.now(UTC) + timedelta(days=5)
    assign_req = AssignmentCreateRequest(
        title="Algebra Foundations Practice",
        skill_ids=[str(skill.id)],
        student_ids=[student.id],
        description="Complete 5 linear equation exercises",
        due_date=due,
    )
    assignment = await service.create_assignment(
        school_class=school_class,
        teacher=teacher,
        payload=assign_req,
    )
    assert assignment.title == "Algebra Foundations Practice"
    assert student.id in [s.student_id for s in assignment.students]

    # 2. List class assignments
    assignments_list = await service.list_assignments(school_class)
    assert len(assignments_list) >= 1
    assert assignments_list[0].id == assignment.id

    # 3. Class progress summary
    summary = await service.get_progress_summary(school_class)
    assert summary.class_id == school_class.id
    assert summary.total_students == 1
    assert len(summary.timeline) == 3

    # 4. Privacy-aware CSV export
    csv_content = await service.export_privacy_aware_csv(school_class)
    assert "Student Identifier" in csv_content
    assert school_class.name in csv_content
    assert skill.code in csv_content
