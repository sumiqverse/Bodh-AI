import contextlib
import hashlib
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_role
from app.core.errors import AuthorizationError, NotFoundError
from app.core.security import generate_join_code
from app.models.auth import User
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
