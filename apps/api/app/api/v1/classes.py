import contextlib
import hashlib
import uuid
from datetime import UTC, date, datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db, require_role
from app.core.curriculum import resolve_curriculum_code
from app.core.errors import AuthorizationError, NotFoundError
from app.core.security import generate_join_code
from app.models.achievement import Achievement
from app.models.assessment import Attempt, Mastery, Question, QuestionTranslation
from app.models.auth import User
from app.models.curriculum import Curriculum, Skill, Topic
from app.models.lesson import ClassroomLesson
from app.models.organization import School, SchoolClass
from app.models.teacher import Assignment, AssignmentStudent
from app.repositories.audit_repo import AuditRepository
from app.repositories.class_repo import ClassRepository
from app.schemas.classes import (
    ClassCreateRequest,
    ClassDetailResponse,
    ClassLeaderboardResponse,
    ClassResponse,
    ClassroomLessonUpsert,
    EnrollmentActionResponse,
    LeaderboardStudentItem,
    RotateCodeResponse,
    StudentRosterItem,
)
from app.schemas.curriculum import (
    ClassroomContentResponse,
    ClassroomQuestionItem,
    ClassroomSkillItem,
    ClassroomTopicItem,
    CustomQuestionCreateRequest,
    CustomQuestionResponse,
)
from app.schemas.teacher import (
    AssignmentCreateRequest,
    AssignmentResponse,
    ClassEarlyWarningsResponse,
    ClassGapClustersResponse,
    ClassHeatmapResponse,
    ClassProgressSummaryResponse,
    ClassSuggestionsResponse,
    StudentProfileResponse,
    TeacherDecisionCreateRequest,
    TeacherDecisionResponse,
)
from app.services.lesson_builder import build_default_lesson
from app.services.teacher_service import TeacherDashboardService

router = APIRouter(prefix="/classes", tags=["Classes"])


def _format_class_response(school_class: SchoolClass) -> ClassResponse:
    """Map SchoolClass entity to ClassResponse."""
    return ClassResponse(
        id=school_class.id,
        name=school_class.name,
        grade=school_class.grade,
        section=school_class.section,
        subject=school_class.subject,
        academic_year=school_class.academic_year,
        join_code=school_class.join_code,
        school_id=school_class.school_id,
        teacher_id=school_class.teacher_id,
        created_at=school_class.created_at,
    )


async def _assert_class_ownership(
    school_class: SchoolClass,
    user: User,
) -> None:
    """Ensure current user is the classroom teacher (admins view stats only)."""
    if school_class.teacher_id != user.id:
        raise AuthorizationError(
            f"User '{user.id}' is not authorized to manage class '{school_class.id}'."
        )


@router.post(
    "",
    response_model=ClassResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new classroom and generate unique student join code",
)
async def create_class(
    payload: ClassCreateRequest,
    request: Request,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ClassResponse:
    """Teacher creates a classroom section with an auto-generated unique join code."""
    class_repo = ClassRepository(session)
    audit_repo = AuditRepository(session)
    client_ip = request.client.host if request.client else None

    # Resolve school ID: if not supplied, associate with default school
    school_id = payload.school_id
    if school_id is None:
        school_res = await session.execute(select(School).limit(1))
        school = school_res.scalar_one_or_none()
        if school is None:
            school = School(
                code="SCH_DEFAULT_01",
                name="BodhAI Demonstration Model School",
                state="Rajasthan",
                district="Jaipur",
                pincode="302001",
            )
            session.add(school)
            await session.flush()
        school_id = school.id

    # Generate unique join code
    join_code = generate_join_code()
    for _ in range(5):
        existing = await class_repo.get_by_join_code(join_code)
        if existing is None:
            break
        join_code = generate_join_code()

    school_class = SchoolClass(
        name=payload.name.strip(),
        grade=payload.grade,
        section=payload.section.strip().upper(),
        subject=payload.subject.strip() if payload.subject else None,
        academic_year=payload.academic_year.strip(),
        school_id=school_id,
        teacher_id=current_user.id,
        join_code=join_code,
    )
    session.add(school_class)
    await session.flush()

    await audit_repo.log_action(
        action="class_created",
        resource_type="class",
        resource_id=str(school_class.id),
        changes={
            "name": school_class.name,
            "grade": school_class.grade,
            "section": school_class.section,
            "join_code": school_class.join_code,
        },
        user_id=current_user.id,
        ip_address=client_ip,
    )

    return _format_class_response(school_class)


@router.get(
    "",
    response_model=list[ClassResponse],
    summary="List classes owned by current teacher",
)
async def list_classes(
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[ClassResponse]:
    """Retrieve all classrooms accessible to the authenticated educator."""
    class_repo = ClassRepository(session)
    classes = await class_repo.get_classes_by_teacher(current_user.id)
    return [_format_class_response(c) for c in classes]


@router.get(
    "/{class_id}",
    response_model=ClassDetailResponse,
    summary="Get classroom details and full student roster",
)
async def get_class_details(
    class_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ClassDetailResponse:
    """Fetch classroom details and enrolled student roster, enforcing ownership check."""
    class_repo = ClassRepository(session)
    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    await _assert_class_ownership(school_class, current_user)

    enrollments = await class_repo.get_enrollments(class_id)
    students: list[StudentRosterItem] = []
    for enr in enrollments:
        if enr.student is not None:
            students.append(
                StudentRosterItem(
                    student_id=enr.student.id,
                    full_name=enr.student.full_name,
                    username=enr.student.username,
                    roll_number=enr.roll_number,
                    status=enr.status,
                    enrolled_at=enr.created_at,
                )
            )

    return ClassDetailResponse(
        id=school_class.id,
        name=school_class.name,
        grade=school_class.grade,
        section=school_class.section,
        subject=school_class.subject,
        academic_year=school_class.academic_year,
        join_code=school_class.join_code,
        school_id=school_class.school_id,
        teacher_id=school_class.teacher_id,
        students=students,
        total_students=len(students),
        created_at=school_class.created_at,
    )


@router.get(
    "/{class_id}/leaderboard",
    response_model=ClassLeaderboardResponse,
    summary="Get real-time classroom leaderboard for enrolled students",
)
async def get_class_leaderboard(
    class_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ClassLeaderboardResponse:
    """Retrieve real-time classroom leaderboard ranking for all enrolled students."""
    class_repo = ClassRepository(session)
    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    enrollments = [
        enrollment
        for enrollment in await class_repo.get_enrollments(class_id)
        if enrollment.status == "active" and enrollment.student is not None
    ]
    if school_class.teacher_id != current_user.id and not any(
        enrollment.student_id == current_user.id for enrollment in enrollments
    ):
        raise AuthorizationError(
            "Only the class teacher and enrolled students can view this leaderboard."
        )

    # XP is derived from persisted answers attributed to this classroom.
    # Streaks remain student-wide and use all persisted activity.
    student_ids = [enrollment.student_id for enrollment in enrollments]
    attempts_by_student: dict[uuid.UUID, list[Attempt]] = {sid: [] for sid in student_ids}
    if student_ids:
        result = await session.execute(select(Attempt).where(Attempt.student_id.in_(student_ids)))
        for attempt in result.scalars().all():
            attempts_by_student[attempt.student_id].append(attempt)

    india_tz = timezone(timedelta(hours=5, minutes=30))
    today = datetime.now(india_tz).date()
    colors = ["bg-surface-yellow", "bg-surface-blue", "bg-surface-peach"]
    entries: list[tuple[Any, int, int, str]] = []
    current_dates: set[date] = set()
    for index, enrollment in enumerate(enrollments):
        attempts = attempts_by_student[enrollment.student_id]
        xp = sum(
            15 if attempt.is_correct else 5 for attempt in attempts if attempt.class_id == class_id
        )
        days = {
            (
                attempt.created_at.replace(tzinfo=UTC)
                if attempt.created_at.tzinfo is None
                else attempt.created_at
            )
            .astimezone(india_tz)
            .date()
            for attempt in attempts
        }
        if enrollment.student_id == current_user.id:
            current_dates = days
        day = today if today in days else today - timedelta(days=1)
        streak = 0
        while day in days:
            streak += 1
            day -= timedelta(days=1)
        entries.append((enrollment, xp, streak, colors[index % len(colors)]))

    entries.sort(key=lambda entry: (-entry[1], str(entry[0].student_id)))
    ranked_items: list[LeaderboardStudentItem] = []
    current_user_row: LeaderboardStudentItem | None = None
    for rank, (enrollment, xp, streak, color) in enumerate(entries, 1):
        student = enrollment.student
        is_current = student.id == current_user.id
        item = LeaderboardStudentItem(
            rank=rank,
            student_id=student.id,
            name=student.full_name or student.username or "Student",
            username=student.username,
            roll_number=enrollment.roll_number,
            xp=xp,
            streak_days=streak,
            avatar_bg="bg-primary-orange" if is_current else color,
            is_current_user=is_current,
        )
        ranked_items.append(item)
        if is_current:
            current_user_row = item

    p1 = next((r for r in ranked_items if r.rank == 1), None)
    p2 = next((r for r in ranked_items if r.rank == 2), None)
    p3 = next((r for r in ranked_items if r.rank == 3), None)

    top_three = [p for p in [p2, p1, p3] if p is not None]
    list_learners = [r for r in ranked_items if 4 <= r.rank <= 6]

    longest_streak = run = 0
    previous_day = None
    for activity_day in sorted(current_dates):
        run = run + 1 if previous_day and activity_day == previous_day + timedelta(days=1) else 1
        longest_streak = max(longest_streak, run)
        previous_day = activity_day

    return ClassLeaderboardResponse(
        class_id=school_class.id,
        class_name=school_class.name,
        total_students=len(ranked_items),
        top_three=top_three,
        list_learners=list_learners,
        all_rankings=ranked_items,
        current_user_row=current_user_row,
        activity_dates=[day.isoformat() for day in sorted(current_dates)],
        max_streak=longest_streak,
    )


@router.post(
    "/{class_id}/rotate-code",
    response_model=RotateCodeResponse,
    summary="Rotate class join code, invalidating previous code",
)
async def rotate_join_code(
    class_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> RotateCodeResponse:
    """Teacher invalidates existing join code and generates a new active code."""
    class_repo = ClassRepository(session)
    audit_repo = AuditRepository(session)
    client_ip = request.client.host if request.client else None

    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    await _assert_class_ownership(school_class, current_user)

    old_code = school_class.join_code
    new_code = generate_join_code()
    for _ in range(5):
        existing = await class_repo.get_by_join_code(new_code)
        if existing is None:
            break
        new_code = generate_join_code()

    await class_repo.rotate_join_code(class_id, new_code)
    await audit_repo.log_action(
        action="class_code_rotated",
        resource_type="class",
        resource_id=str(class_id),
        changes={"old_code": old_code, "new_code": new_code},
        user_id=current_user.id,
        ip_address=client_ip,
    )

    return RotateCodeResponse(
        class_id=class_id,
        join_code=new_code,
        message="Class join code successfully rotated. Previous code is now inactive.",
    )


@router.post(
    "/{class_id}/approve/{student_id}",
    response_model=EnrollmentActionResponse,
    summary="Approve a student's pending class enrollment",
)
async def approve_student(
    class_id: uuid.UUID,
    student_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> EnrollmentActionResponse:
    """Teacher approves a student's membership in the classroom roster."""
    class_repo = ClassRepository(session)
    audit_repo = AuditRepository(session)
    client_ip = request.client.host if request.client else None

    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    await _assert_class_ownership(school_class, current_user)

    enrollment = await class_repo.approve_enrollment(class_id, student_id)
    if enrollment is None:
        raise NotFoundError(f"Enrollment for student '{student_id}' in class", class_id)

    await audit_repo.log_action(
        action="student_approved",
        resource_type="enrollment",
        resource_id=f"{class_id}:{student_id}",
        user_id=current_user.id,
        ip_address=client_ip,
    )

    return EnrollmentActionResponse(
        class_id=class_id,
        student_id=student_id,
        status="active",
        message="Student enrollment successfully approved.",
    )


@router.delete(
    "/{class_id}/students/{student_id}",
    response_model=EnrollmentActionResponse,
    summary="Remove a student from classroom roster",
)
async def remove_student(
    class_id: uuid.UUID,
    student_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> EnrollmentActionResponse:
    """Teacher removes a student from the classroom roster."""
    class_repo = ClassRepository(session)
    audit_repo = AuditRepository(session)
    client_ip = request.client.host if request.client else None

    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    await _assert_class_ownership(school_class, current_user)

    removed = await class_repo.remove_enrollment(class_id, student_id)
    if not removed:
        raise NotFoundError(f"Enrollment for student '{student_id}' in class", class_id)

    await audit_repo.log_action(
        action="student_removed",
        resource_type="enrollment",
        resource_id=f"{class_id}:{student_id}",
        user_id=current_user.id,
        ip_address=client_ip,
    )

    return EnrollmentActionResponse(
        class_id=class_id,
        student_id=student_id,
        status="removed",
        message="Student successfully removed from class roster.",
    )


@router.get("/{class_id}/lessons", summary="List this classroom's teacher-authored lessons")
async def list_class_lessons(
    class_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict[str, Any]]:
    school_class = await ClassRepository(session).get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)
    await _assert_class_ownership(school_class, current_user)
    result = await session.execute(
        select(ClassroomLesson)
        .where(ClassroomLesson.class_id == class_id)
        .order_by(ClassroomLesson.created_at)
    )
    return [
        {
            "id": str(row.id),
            "skill_id": str(row.skill_id),
            "language": row.language,
            "difficulty": row.difficulty,
            "title": row.title,
            "body": row.body,
        }
        for row in result.scalars().all()
    ]


@router.put("/{class_id}/lessons", summary="Create or update a classroom lesson")
async def upsert_class_lesson(
    class_id: uuid.UUID,
    payload: ClassroomLessonUpsert,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any]:
    school_class = await ClassRepository(session).get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)
    await _assert_class_ownership(school_class, current_user)
    curriculum_code = resolve_curriculum_code(
        school_class.grade, school_class.subject or school_class.name
    )
    skill = await session.execute(
        select(Skill.id)
        .join(Topic, Skill.topic_id == Topic.id)
        .join(Curriculum, Topic.curriculum_id == Curriculum.id)
        .where(
            Skill.id == payload.skill_id,
            Curriculum.code == curriculum_code,
            Skill.is_deleted.is_(False),
        )
    )
    if skill.scalar_one_or_none() is None:
        raise NotFoundError("Skill in classroom curriculum", payload.skill_id)
    result = await session.execute(
        select(ClassroomLesson).where(
            ClassroomLesson.class_id == class_id,
            ClassroomLesson.skill_id == payload.skill_id,
            ClassroomLesson.language == payload.language,
            ClassroomLesson.difficulty == payload.difficulty,
        )
    )
    lesson = result.scalar_one_or_none()
    if lesson is None:
        lesson = ClassroomLesson(class_id=class_id, **payload.model_dump())
        session.add(lesson)
    else:
        lesson.title, lesson.body = payload.title, payload.body
    await session.flush()
    return {
        "id": str(lesson.id),
        "skill_id": str(lesson.skill_id),
        "language": lesson.language,
        "difficulty": lesson.difficulty,
        "title": lesson.title,
        "body": lesson.body,
    }


@router.get("/{class_id}/lessons/{skill_id}", summary="Get an adaptive lesson for this student")
async def get_class_lesson(
    class_id: uuid.UUID,
    skill_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_role("student"))],
    session: Annotated[AsyncSession, Depends(get_db)],
    language: str = "en",
) -> dict[str, Any]:
    enrollment = await ClassRepository(session).get_enrollment(class_id, current_user.id)
    if enrollment is None or enrollment.status != "active":
        raise AuthorizationError("An active classroom enrollment is required.")
    result = await session.execute(
        select(ClassroomLesson).where(
            ClassroomLesson.class_id == class_id,
            ClassroomLesson.skill_id == skill_id,
            ClassroomLesson.language == language,
        )
    )
    lessons = result.scalars().all()
    mastery_result = await session.execute(
        select(Mastery).where(
            Mastery.class_id == class_id,
            Mastery.skill_id == skill_id,
            Mastery.student_id == current_user.id,
        )
    )
    mastery = mastery_result.scalar_one_or_none()
    probability = mastery.p_mastery if mastery else 0.0
    target = (
        1
        if probability < 0.4
        else 2
        if probability < 0.6
        else 3
        if probability < 0.8
        else 4
        if probability < 0.95
        else 5
    )
    eligible = [lesson for lesson in lessons if lesson.difficulty <= target]
    if not eligible:
        school_class = await ClassRepository(session).get_by_id(class_id)
        if school_class is None:
            raise NotFoundError("Class", class_id)
        default_lesson = await _load_default_lesson(session, school_class, skill_id, language)
        if default_lesson is None:
            raise NotFoundError("Lesson at student's current level", skill_id)
        return {
            "id": f"default-{skill_id}",
            "skill_id": str(skill_id),
            "language": language,
            "difficulty": target,
            "title": default_lesson["title"],
            "body": default_lesson["body"],
            "is_default": True,
        }
    chosen = max(eligible, key=lambda lesson: lesson.difficulty)
    return {
        "id": str(chosen.id),
        "skill_id": str(chosen.skill_id),
        "language": chosen.language,
        "difficulty": chosen.difficulty,
        "title": chosen.title,
        "body": chosen.body,
    }


@router.get("/{class_id}/my-achievements", summary="List earned badges and certificates")
async def get_my_achievements(
    class_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_role("student"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict[str, Any]]:
    enrollment = await ClassRepository(session).get_enrollment(class_id, current_user.id)
    if enrollment is None or enrollment.status != "active":
        raise AuthorizationError("An active classroom enrollment is required.")
    result = await session.execute(
        select(Achievement)
        .where(Achievement.class_id == class_id, Achievement.student_id == current_user.id)
        .order_by(Achievement.created_at.desc())
    )
    return [
        {"id": str(a.id), "kind": a.kind, "title": a.title, "earned_at": a.created_at.isoformat()}
        for a in result.scalars().all()
    ]


@router.get(
    "/{class_id}/my-achievements/{achievement_id}", summary="View an earned classroom certificate"
)
async def get_my_achievement(
    class_id: uuid.UUID,
    achievement_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_role("student"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any]:
    enrollment = await ClassRepository(session).get_enrollment(class_id, current_user.id)
    if enrollment is None or enrollment.status != "active":
        raise AuthorizationError("An active classroom enrollment is required.")
    result = await session.execute(
        select(Achievement, SchoolClass.name)
        .join(SchoolClass, SchoolClass.id == Achievement.class_id)
        .where(
            Achievement.id == achievement_id,
            Achievement.class_id == class_id,
            Achievement.student_id == current_user.id,
            Achievement.kind == "certificate",
        )
    )
    row = result.one_or_none()
    if row is None:
        raise NotFoundError("Certificate", achievement_id)
    achievement, class_name = row
    return {
        "id": str(achievement.id),
        "title": achievement.title,
        "class_name": class_name,
        "student_name": current_user.full_name or current_user.username or "Student",
        "earned_at": achievement.created_at.isoformat(),
    }


@router.get(
    "/{class_id}/my-assignments",
    summary="List assignments sent to the current student",
)
async def get_my_assignments(
    class_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_role("student"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict[str, Any]]:
    enrollment = await ClassRepository(session).get_enrollment(class_id, current_user.id)
    if enrollment is None or enrollment.status != "active":
        raise AuthorizationError("An active classroom enrollment is required.")
    result = await session.execute(
        select(Assignment, AssignmentStudent)
        .join(AssignmentStudent, AssignmentStudent.assignment_id == Assignment.id)
        .where(
            Assignment.class_id == class_id,
            Assignment.status == "active",
            AssignmentStudent.student_id == current_user.id,
        )
        .order_by(Assignment.created_at.desc())
    )
    return [
        {
            "id": str(assignment.id),
            "title": assignment.title,
            "description": assignment.description,
            "skill_ids": assignment.skill_ids,
            "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
            "status": link.status,
        }
        for assignment, link in result.all()
    ]


@router.post(
    "/{class_id}/diagnostic/skip",
    summary="Skip the initial classroom diagnostic for now",
)
async def skip_class_diagnostic(
    class_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_role("student"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    enrollment = await ClassRepository(session).get_enrollment(class_id, current_user.id)
    if enrollment is None or enrollment.status != "active":
        raise AuthorizationError("An active classroom enrollment is required.")
    if enrollment.diagnostic_status == "pending":
        enrollment.diagnostic_status = "skipped"
        await session.flush()
    return {"diagnostic_status": enrollment.diagnostic_status}


# =============================================================================
# Teacher Dashboard: Heatmaps, Gap Clusters, Early Warnings, Suggestions, & Assignments
# =============================================================================


@router.get(
    "/{class_id}/heatmap",
    response_model=ClassHeatmapResponse,
    summary="Get class overview heatmap (students x skills) with ETag and cache headers",
)
async def get_class_heatmap(
    class_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
    curriculum_code: str | None = Query(
        None, description="Optional curriculum code to filter skills"
    ),
) -> ClassHeatmapResponse | Response:
    """Retrieve virtualized heatmap matrix for 60 students x 150 skills
    with precomputed aggregates."""
    class_repo = ClassRepository(session)
    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    await _assert_class_ownership(school_class, current_user)

    redis_client = getattr(request.app.state, "redis", None)
    curr_suffix = curriculum_code or "all"
    cache_key = f"class:{class_id}:heatmap:{curr_suffix}"

    if redis_client is not None:
        with contextlib.suppress(Exception):
            cached = await redis_client.get(cache_key)
            if cached is not None:
                cached_str = cached.decode("utf-8") if isinstance(cached, bytes) else str(cached)
                etag = f'W/"{hashlib.md5(cached_str.encode()).hexdigest()}"'
                if request.headers.get("if-none-match") == etag:
                    return Response(status_code=status.HTTP_304_NOT_MODIFIED)
                return Response(
                    content=cached_str,
                    media_type="application/json",
                    headers={
                        "Cache-Control": "private, max-age=60",
                        "ETag": etag,
                    },
                )

    service = TeacherDashboardService(session)
    heatmap = await service.get_class_heatmap(school_class, curriculum_code)
    payload_json = heatmap.model_dump_json()
    etag = f'W/"{hashlib.md5(payload_json.encode()).hexdigest()}"'

    if request.headers.get("if-none-match") == etag:
        return Response(status_code=status.HTTP_304_NOT_MODIFIED)

    if redis_client is not None:
        with contextlib.suppress(Exception):
            await redis_client.set(cache_key, payload_json, ex=60)

    return Response(
        content=payload_json,
        media_type="application/json",
        headers={
            "Cache-Control": "private, max-age=60",
            "ETag": etag,
        },
    )


@router.get(
    "/{class_id}/gap-clusters",
    response_model=ClassGapClustersResponse,
    summary="Identify group-gap clusters and suggested revision plans",
)
async def get_class_gap_clusters(
    class_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
    min_students: int = Query(2, ge=1, description="Minimum students sharing gap"),
    min_ratio: float = Query(0.15, ge=0.0, le=1.0, description="Minimum class ratio sharing gap"),
) -> ClassGapClustersResponse:
    """Group students who share common conceptual gaps with actionable revision strategies."""
    class_repo = ClassRepository(session)
    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    await _assert_class_ownership(school_class, current_user)

    service = TeacherDashboardService(session)
    return await service.get_group_gap_clusters(school_class, min_students, min_ratio)


@router.get(
    "/{class_id}/early-warnings",
    response_model=ClassEarlyWarningsResponse,
    summary="Detect students with stalled or dropped mastery over configurable window",
)
async def get_class_early_warnings(
    class_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
    days: int = Query(14, ge=3, le=60, description="Configurable time window in days"),
) -> ClassEarlyWarningsResponse:
    """Identify students at academic risk due to stalled progress or drop in mastery."""
    class_repo = ClassRepository(session)
    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    await _assert_class_ownership(school_class, current_user)

    service = TeacherDashboardService(session)
    return await service.get_early_warnings(school_class, days)


@router.get(
    "/{class_id}/students/{student_id}/profile",
    response_model=StudentProfileResponse,
    summary="Get deep student profile: mastery per skill, error patterns, hints, trend",
)
async def get_student_profile(
    class_id: uuid.UUID,
    student_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> StudentProfileResponse:
    """Fetch individual student profile within classroom roster for teacher inspection."""
    class_repo = ClassRepository(session)
    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    await _assert_class_ownership(school_class, current_user)

    service = TeacherDashboardService(session)
    return await service.get_student_profile(school_class, student_id)


@router.get(
    "/{class_id}/suggestions",
    response_model=ClassSuggestionsResponse,
    summary="Get pedagogical engine suggestions with evidence, rationale, and decision status",
)
async def get_class_suggestions(
    class_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ClassSuggestionsResponse:
    """List system-generated suggestions explicitly labeled as advisory recommendations."""
    class_repo = ClassRepository(session)
    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    await _assert_class_ownership(school_class, current_user)

    service = TeacherDashboardService(session)
    return await service.get_class_suggestions(school_class)


@router.post(
    "/{class_id}/suggestions/{suggestion_id}/decision",
    response_model=TeacherDecisionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record teacher decision on suggestion (accept, edit, ignore, override)",
)
async def record_teacher_decision(
    class_id: uuid.UUID,
    suggestion_id: str,
    payload: TeacherDecisionCreateRequest,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> TeacherDecisionResponse:
    """Store teacher's pedagogical decision and audit trail for an AI/system recommendation."""
    class_repo = ClassRepository(session)
    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    await _assert_class_ownership(school_class, current_user)

    service = TeacherDashboardService(session)
    return await service.record_teacher_decision(
        school_class=school_class,
        teacher=current_user,
        suggestion_id=suggestion_id,
        payload=payload,
    )


@router.post(
    "/{class_id}/assignments",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create and push an assignment (skill set) to a group or entire class",
)
async def create_assignment(
    class_id: uuid.UUID,
    payload: AssignmentCreateRequest,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AssignmentResponse:
    """Teacher allocates a focused skill set to selected students or whole classroom."""
    class_repo = ClassRepository(session)
    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    await _assert_class_ownership(school_class, current_user)

    service = TeacherDashboardService(session)
    return await service.create_assignment(school_class, current_user, payload)


@router.get(
    "/{class_id}/assignments",
    response_model=list[AssignmentResponse],
    summary="List all assignments created for this class",
)
async def list_assignments(
    class_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[AssignmentResponse]:
    """Retrieve active and historical assignments with completion progress."""
    class_repo = ClassRepository(session)
    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    await _assert_class_ownership(school_class, current_user)

    service = TeacherDashboardService(session)
    return await service.list_assignments(school_class)


@router.get(
    "/{class_id}/progress-summary",
    response_model=ClassProgressSummaryResponse,
    summary="Get class-level progress and reassessment growth metrics",
)
async def get_progress_summary(
    class_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ClassProgressSummaryResponse:
    """Retrieve longitudinal class progress, diagnostic baseline, and growth metrics."""
    class_repo = ClassRepository(session)
    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    await _assert_class_ownership(school_class, current_user)

    service = TeacherDashboardService(session)
    return await service.get_progress_summary(school_class)


@router.get(
    "/{class_id}/export/csv",
    summary="Download privacy-compliant CSV report of student competency progress",
)
async def export_class_csv(
    class_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Generate privacy-aware CSV export without PII, grades, or promotion decisions."""
    class_repo = ClassRepository(session)
    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    await _assert_class_ownership(school_class, current_user)

    service = TeacherDashboardService(session)
    csv_content = await service.export_privacy_aware_csv(school_class)

    filename = f"class_{school_class.grade}{school_class.section}_competency_report.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )


def _detect_subject_from_class_name(name: str) -> str:
    """Infer subject from class section name."""
    n = name.lower()
    if "soc" in n or "sst" in n or "hist" in n or "geo" in n:
        return "social_science"
    if "sci" in n:
        return "science"
    if "eng" in n:
        return "english"
    if "hin" in n:
        return "hindi"
    return "mathematics"


def _question_preview(q: Question, skill_name: str, language: str = "en") -> ClassroomQuestionItem:
    """Build a question preview in the requested language, with English fallback."""
    trans = next((tr for tr in q.translations if tr.language == language), None)
    if not trans:
        trans = next((tr for tr in q.translations if tr.language == "en"), None)
    if not trans and q.translations:
        trans = q.translations[0]

    prompt_text = trans.prompt if trans else f"Assessment item for {skill_name}"
    options_data = trans.options if trans and trans.options else []
    explanation_text = trans.explanation if trans else ""
    hints_data = trans.hints if trans and trans.hints else []
    return ClassroomQuestionItem(
        id=q.id,
        code=q.code or str(q.id),
        prompt=prompt_text,
        options=options_data,
        explanation=explanation_text,
        hints=hints_data,
        difficulty=q.difficulty,
        is_custom=bool(q.code and "CUSTOM" in q.code),
    )


async def _load_default_lesson(
    session: AsyncSession,
    school_class: SchoolClass,
    skill_id: uuid.UUID,
    language: str = "en",
) -> dict[str, str] | None:
    """Build the default lesson for a skill that belongs to this class curriculum."""
    curriculum_code = resolve_curriculum_code(
        school_class.grade, school_class.subject or school_class.name
    )
    row = (
        await session.execute(
            select(Skill, Topic)
            .join(Topic, Skill.topic_id == Topic.id)
            .join(Curriculum, Topic.curriculum_id == Curriculum.id)
            .where(
                Skill.id == skill_id,
                Curriculum.code == curriculum_code,
                Skill.is_deleted.is_(False),
            )
        )
    ).one_or_none()
    if row is None:
        return None
    skill, topic = row
    questions = (
        (
            await session.execute(
                select(Question)
                .where(
                    Question.skill_id == skill.id,
                    (Question.class_id.is_(None)) | (Question.class_id == school_class.id),
                    Question.status == "published",
                    Question.is_active.is_(True),
                    Question.is_deleted.is_(False),
                )
                .options(selectinload(Question.translations))
                .order_by(Question.created_at)
            )
        )
        .scalars()
        .all()
    )
    previews = [_question_preview(q, skill.name, language) for q in questions]
    return build_default_lesson(
        topic_name=topic.name,
        topic_description=topic.description,
        skill_name=skill.name,
        skill_description=skill.description,
        blooms_level=skill.blooms_level,
        questions=[preview.model_dump() for preview in previews],
        language=language,
    )


@router.get(
    "/{class_id}/content",
    response_model=ClassroomContentResponse,
    summary="Get curriculum topics, skills, and questions for classroom",
)
async def get_classroom_content(
    class_id: uuid.UUID,
    current_user: Annotated[User, Depends(require_role("teacher", "admin"))],
    session: Annotated[AsyncSession, Depends(get_db)],
    subject: Annotated[str | None, Query(description="Subject filter")] = None,
) -> ClassroomContentResponse:
    """Retrieve all syllabus topics, competency skills, and calibrated/custom questions."""
    class_repo = ClassRepository(session)
    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    if school_class.teacher_id != current_user.id:
        await _assert_class_ownership(school_class, current_user)

    selected_subject = (
        subject or school_class.subject or _detect_subject_from_class_name(school_class.name)
    )
    curriculum_code = resolve_curriculum_code(school_class.grade, selected_subject)
    curr_stmt = select(Curriculum).where(Curriculum.code == curriculum_code)
    curriculum = (await session.execute(curr_stmt)).scalar_one_or_none()

    if curriculum is None:
        return ClassroomContentResponse(
            class_id=school_class.id,
            class_name=school_class.name,
            grade=school_class.grade,
            subject=selected_subject,
            curriculum_code=curriculum_code,
            topics=[],
            custom_questions_count=0,
        )

    # 2. Fetch Topics for curriculum
    top_stmt = (
        select(Topic).where(Topic.curriculum_id == curriculum.id).order_by(Topic.sequence_order)
    )
    top_res = await session.execute(top_stmt)
    topics = list(top_res.scalars().all())

    # 3. Fetch Skills for these topics
    topic_ids = [t.id for t in topics]
    skills_by_topic: dict[uuid.UUID, list[Skill]] = {t.id: [] for t in topics}
    if topic_ids:
        sk_stmt = select(Skill).where(Skill.topic_id.in_(topic_ids)).order_by(Skill.code)
        sk_res = await session.execute(sk_stmt)
        for s in sk_res.scalars().all():
            skills_by_topic[s.topic_id].append(s)

    all_skill_ids = [s.id for sl in skills_by_topic.values() for s in sl]

    # 4. Fetch Questions for these skills with translations
    questions_by_skill: dict[uuid.UUID, list[Question]] = {s_id: [] for s_id in all_skill_ids}
    if all_skill_ids:
        q_stmt = (
            select(Question)
            .where(
                Question.skill_id.in_(all_skill_ids),
                (Question.class_id.is_(None) | (Question.class_id == class_id)),
            )
            .options(selectinload(Question.translations))
            .order_by(Question.created_at)
        )
        q_res = await session.execute(q_stmt)
        for q in q_res.scalars().all():
            questions_by_skill.setdefault(q.skill_id, []).append(q)

    # 5. Build response
    classroom_topics: list[ClassroomTopicItem] = []
    total_custom = 0

    for t in topics:
        topic_skills: list[ClassroomSkillItem] = []
        for s in skills_by_topic.get(t.id, []):
            skill_questions: list[ClassroomQuestionItem] = []
            for q in questions_by_skill.get(s.id, []):
                preview = _question_preview(q, s.name)
                if preview.is_custom:
                    total_custom += 1
                skill_questions.append(preview)

            default_lesson = build_default_lesson(
                topic_name=t.name,
                topic_description=t.description,
                skill_name=s.name,
                skill_description=s.description,
                blooms_level=s.blooms_level,
                questions=[question.model_dump() for question in skill_questions],
            )
            hindi_questions = [
                _question_preview(q, s.name, "hi") for q in questions_by_skill.get(s.id, [])
            ]
            default_lesson_hi = build_default_lesson(
                topic_name=t.name,
                topic_description=t.description,
                skill_name=s.name,
                skill_description=s.description,
                blooms_level=s.blooms_level,
                questions=[question.model_dump() for question in hindi_questions],
                language="hi",
            )

            topic_skills.append(
                ClassroomSkillItem(
                    id=s.id,
                    code=s.code,
                    name=s.name,
                    description=s.description,
                    difficulty=s.difficulty,
                    blooms_level=s.blooms_level,
                    questions=skill_questions,
                    default_lesson=default_lesson,
                    default_lesson_hi=default_lesson_hi,
                )
            )

        classroom_topics.append(
            ClassroomTopicItem(
                id=t.id,
                code=t.code,
                name=t.name,
                description=t.description,
                sequence_order=t.sequence_order,
                skills=topic_skills,
            )
        )

    return ClassroomContentResponse(
        class_id=school_class.id,
        class_name=school_class.name,
        grade=school_class.grade,
        subject=curriculum.subject,
        curriculum_code=curriculum.code,
        topics=classroom_topics,
        custom_questions_count=total_custom,
    )


@router.post(
    "/{class_id}/questions",
    response_model=CustomQuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create custom question for classroom skill",
)
async def create_classroom_question(
    class_id: uuid.UUID,
    payload: CustomQuestionCreateRequest,
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> CustomQuestionResponse:
    """Allow a teacher to create and assign custom questions for any competency skill."""
    class_repo = ClassRepository(session)
    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    await _assert_class_ownership(school_class, current_user)

    # 1. Resolve skill by code
    curriculum_code = resolve_curriculum_code(
        school_class.grade, school_class.subject or school_class.name
    )
    sk_stmt = (
        select(Skill)
        .join(Topic, Skill.topic_id == Topic.id)
        .join(Curriculum, Topic.curriculum_id == Curriculum.id)
        .where(Skill.code == payload.skill_code, Curriculum.code == curriculum_code)
    )
    sk_res = await session.execute(sk_stmt)
    skill = sk_res.scalar_one_or_none()
    if skill is None:
        raise NotFoundError("Skill", payload.skill_code)

    if sum(option.is_correct for option in payload.options) != 1:
        raise HTTPException(status_code=422, detail="Exactly one correct option is required.")
    if len({option.id.strip().upper() for option in payload.options}) != len(payload.options):
        raise HTTPException(status_code=422, detail="Option identifiers must be unique.")

    # 2. Create Question
    q_code = f"Q-CUSTOM-{uuid.uuid4().hex[:8].upper()}"
    q_id = uuid.uuid4()
    question = Question(
        id=q_id,
        code=q_code,
        class_id=class_id,
        skill_id=skill.id,
        difficulty=payload.difficulty,
        question_type="mcq",
        status="published",
        needs_teacher_review=False,
        version=1,
        reviewer_id=current_user.id,
    )
    session.add(question)
    await session.flush()

    # 3. Create English Translation
    options_dict = [opt.model_dump() for opt in payload.options]
    trans_en = QuestionTranslation(
        id=uuid.uuid4(),
        question_id=q_id,
        language="en",
        prompt=payload.prompt_en,
        options=options_dict,
        explanation=payload.explanation,
        hints=payload.hints,
    )
    session.add(trans_en)

    if payload.prompt_hi:
        trans_hi = QuestionTranslation(
            id=uuid.uuid4(),
            question_id=q_id,
            language="hi",
            prompt=payload.prompt_hi,
            options=options_dict,
            explanation=payload.explanation,
            hints=payload.hints,
        )
        session.add(trans_hi)

    await session.flush()

    return CustomQuestionResponse(
        id=question.id,
        code=question.code or q_code,
        skill_code=skill.code,
        prompt=payload.prompt_en,
        options=options_dict,
        explanation=payload.explanation,
        hints=payload.hints,
        difficulty=question.difficulty,
        status=question.status,
    )


@router.post(
    "/{class_id}/content/upload",
    summary="Batch upload custom questions (JSON or CSV format)",
)
async def upload_classroom_content(
    class_id: uuid.UUID,
    payload: dict[str, Any],
    current_user: Annotated[User, Depends(require_role("teacher"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any]:
    """Upload custom questions in bulk attached to classroom competencies."""
    class_repo = ClassRepository(session)
    school_class = await class_repo.get_by_id(class_id)
    if school_class is None:
        raise NotFoundError("Class", class_id)

    await _assert_class_ownership(school_class, current_user)

    questions_list = payload.get("questions", [])
    if not isinstance(questions_list, list) or not questions_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload must contain a non-empty 'questions' array.",
        )

    curriculum_code = resolve_curriculum_code(
        school_class.grade, school_class.subject or school_class.name
    )
    all_skills_stmt = (
        select(Skill)
        .join(Topic, Skill.topic_id == Topic.id)
        .join(Curriculum, Topic.curriculum_id == Curriculum.id)
        .where(Curriculum.code == curriculum_code)
    )
    all_skills = {
        skill.code: skill for skill in (await session.execute(all_skills_stmt)).scalars().all()
    }
    validated: list[CustomQuestionCreateRequest] = []
    for item in questions_list:
        if not isinstance(item, dict):
            raise HTTPException(status_code=422, detail="Each question must be an object.")
        try:
            prepared = CustomQuestionCreateRequest.model_validate(
                {**item, "prompt_en": item.get("prompt_en", item.get("prompt"))}
            )
        except ValidationError as exc:
            raise HTTPException(status_code=422, detail="Invalid question in upload.") from exc
        if prepared.skill_code not in all_skills:
            raise HTTPException(
                status_code=422, detail="Question skill does not belong to this classroom."
            )
        if sum(option.is_correct for option in prepared.options) != 1:
            raise HTTPException(status_code=422, detail="Exactly one correct option is required.")
        if len({option.id.strip().upper() for option in prepared.options}) != len(prepared.options):
            raise HTTPException(status_code=422, detail="Option identifiers must be unique.")
        validated.append(prepared)

    created_count = 0
    for q_item in validated:
        skill = all_skills[q_item.skill_code]
        question = Question(
            id=uuid.uuid4(),
            code=f"Q-CUSTOM-{uuid.uuid4().hex[:8].upper()}",
            class_id=class_id,
            skill_id=skill.id,
            difficulty=q_item.difficulty,
            question_type="mcq",
            status="published",
            needs_teacher_review=False,
            version=1,
            reviewer_id=current_user.id,
        )
        session.add(question)
        await session.flush()
        session.add(
            QuestionTranslation(
                id=uuid.uuid4(),
                question_id=question.id,
                language="en",
                prompt=q_item.prompt_en,
                options=[option.model_dump() for option in q_item.options],
                explanation=q_item.explanation,
                hints=q_item.hints,
            )
        )
        created_count += 1

    await session.flush()
    return {
        "status": "success",
        "class_id": str(class_id),
        "imported_count": created_count,
        "message": (
            f"Successfully uploaded {created_count} custom questions to class {school_class.name}"
        ),
    }
