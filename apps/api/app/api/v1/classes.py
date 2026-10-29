import contextlib
import hashlib
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, require_role
from app.core.errors import AuthorizationError, NotFoundError
from app.core.security import generate_join_code
from app.models.assessment import Question, QuestionTranslation
from app.models.auth import User
from app.models.curriculum import Curriculum, Skill, Topic
from app.models.organization import School, SchoolClass
from app.repositories.audit_repo import AuditRepository
from app.repositories.class_repo import ClassRepository
from app.schemas.classes import (
    ClassCreateRequest,
    ClassDetailResponse,
    ClassResponse,
    EnrollmentActionResponse,
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
from app.services.teacher_service import TeacherDashboardService

router = APIRouter(prefix="/classes", tags=["Classes"])


def _format_class_response(school_class: SchoolClass) -> ClassResponse:
    """Map SchoolClass entity to ClassResponse."""
    return ClassResponse(
        id=school_class.id,
        name=school_class.name,
        grade=school_class.grade,
        section=school_class.section,
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
        academic_year=school_class.academic_year,
        join_code=school_class.join_code,
        school_id=school_class.school_id,
        teacher_id=school_class.teacher_id,
        students=students,
        total_students=len(students),
        created_at=school_class.created_at,
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
    if "sci" in n:
        return "science"
    if "soc" in n or "sst" in n or "hist" in n or "geo" in n:
        return "social_science"
    if "eng" in n:
        return "english"
    if "hin" in n:
        return "hindi"
    return "mathematics"


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

    selected_subject = subject or _detect_subject_from_class_name(school_class.name)

    # 1. Fetch Curriculum for grade and subject
    curr_stmt = select(Curriculum).where(
        Curriculum.grade == school_class.grade,
        Curriculum.subject.ilike(f"%{selected_subject}%"),
    )
    curr_res = await session.execute(curr_stmt)
    curriculum = curr_res.scalar_one_or_none()

    if curriculum is None:
        curr_stmt = select(Curriculum).where(Curriculum.grade == school_class.grade).limit(1)
        curr_res = await session.execute(curr_stmt)
        curriculum = curr_res.scalar_one_or_none()

    if curriculum is None:
        return ClassroomContentResponse(
            class_id=school_class.id,
            class_name=school_class.name,
            grade=school_class.grade,
            subject=selected_subject,
            curriculum_code=f"NCERT-{selected_subject.upper()}-C{school_class.grade}",
            topics=[],
            custom_questions_count=0,
        )

    # 2. Fetch Topics for curriculum
    top_stmt = (
        select(Topic)
        .where(Topic.curriculum_id == curriculum.id)
        .order_by(Topic.sequence_order)
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
            .where(Question.skill_id.in_(all_skill_ids))
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
                trans = next((tr for tr in q.translations if tr.language == "en"), None)
                if not trans and q.translations:
                    trans = q.translations[0]

                prompt_text = trans.prompt if trans else f"Assessment item for {s.name}"
                options_data = trans.options if trans and trans.options else []
                explanation_text = trans.explanation if trans else ""
                hints_data = trans.hints if trans and trans.hints else []
                is_custom = bool(q.code and "CUSTOM" in q.code)
                if is_custom:
                    total_custom += 1

                skill_questions.append(
                    ClassroomQuestionItem(
                        id=q.id,
                        code=q.code or str(q.id),
                        prompt=prompt_text,
                        options=options_data,
                        explanation=explanation_text,
                        hints=hints_data,
                        difficulty=q.difficulty,
                        is_custom=is_custom,
                    )
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
    sk_stmt = select(Skill).where(Skill.code == payload.skill_code)
    sk_res = await session.execute(sk_stmt)
    skill = sk_res.scalar_one_or_none()
    if skill is None:
        raise NotFoundError("Skill", payload.skill_code)

    # 2. Create Question
    q_code = f"Q-CUSTOM-{uuid.uuid4().hex[:8].upper()}"
    q_id = uuid.uuid4()
    question = Question(
        id=q_id,
        code=q_code,
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

    await session.commit()

    return CustomQuestionResponse(
        id=question.id,
        code=question.code,
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

    all_skills_stmt = select(Skill)
    all_skills = {s.code: s for s in (await session.execute(all_skills_stmt)).scalars().all()}

    fallback_skill = next(iter(all_skills.values())) if all_skills else None
    if not fallback_skill:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No curriculum skills configured in the system.",
        )

    created_count = 0
    for q_item in questions_list:
        target_code = q_item.get("skill_code", "")
        skill = all_skills.get(target_code, fallback_skill)

        q_id = uuid.uuid4()
        q_code = f"Q-CUSTOM-{uuid.uuid4().hex[:8].upper()}"
        difficulty = int(q_item.get("difficulty", 3))

        question = Question(
            id=q_id,
            code=q_code,
            skill_id=skill.id,
            difficulty=difficulty,
            question_type="mcq",
            status="published",
            needs_teacher_review=False,
            version=1,
            reviewer_id=current_user.id,
        )
        session.add(question)
        await session.flush()

        options = q_item.get(
            "options",
            [
                {"id": "A", "text": "Option A", "is_correct": True},
                {"id": "B", "text": "Option B", "is_correct": False},
            ],
        )
        hints = q_item.get(
            "hints",
            [
                "Review the key definitions.",
                "Verify intermediate calculations carefully.",
                "Choose the option adhering to NCERT standards.",
            ],
        )
        explanation = q_item.get("explanation", "Standard NCERT curriculum competency explanation.")

        trans = QuestionTranslation(
            id=uuid.uuid4(),
            question_id=q_id,
            language="en",
            prompt=q_item.get("prompt", "Assessment question"),
            options=options,
            explanation=explanation,
            hints=hints,
        )
        session.add(trans)
        created_count += 1

    await session.commit()
    return {
        "status": "success",
        "class_id": str(class_id),
        "imported_count": created_count,
        "message": (
            f"Successfully uploaded {created_count} custom questions to class {school_class.name}"
        ),
    }
