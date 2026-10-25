"""Classroom management endpoints: creation, code rotation, and roster administration."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
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
