"""Data Principal Rights endpoints (DPDP Act 2023): Data Portability & Erasure."""

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.errors import AuthorizationError, NotFoundError
from app.models.assessment import Attempt, Mastery
from app.models.auth import User
from app.models.organization import Enrollment
from app.repositories.audit_repo import AuditRepository
from app.repositories.consent_repo import ConsentRepository
from app.repositories.user_repo import UserRepository
from app.schemas.data_rights import DataDeleteResponse, StudentDataExportResponse

router = APIRouter(prefix="/data-rights", tags=["Data Rights"])


def _assert_owner_or_admin(target_student_id: uuid.UUID, current_user: User) -> None:
    """Ensure only the student themselves or an authorized administrator can access data rights."""
    if current_user.role.name != "admin" and current_user.id != target_student_id:
        raise AuthorizationError(
            "Access denied: You may only exercise DPDP data rights for your own account."
        )


@router.get(
    "/export/{student_id}",
    response_model=StudentDataExportResponse,
    summary="Export all student data in machine-readable JSON format",
)
async def export_student_data(
    student_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> StudentDataExportResponse:
    """Export complete student profile, guardian details, consents, and learning history."""
    _assert_owner_or_admin(student_id, current_user)

    user_repo = UserRepository(session)
    consent_repo = ConsentRepository(session)
    audit_repo = AuditRepository(session)
    client_ip = request.client.host if request.client else None

    target_student = await user_repo.get_by_id_with_role(student_id)
    if target_student is None:
        raise NotFoundError("Student", student_id)

    # 1. Fetch Guardian & Consents
    guardian = await consent_repo.get_guardian(student_id)
    consents = await consent_repo.get_all_consents_for_student(student_id)

    # 2. Fetch Enrollments
    enr_stmt = select(Enrollment).where(Enrollment.student_id == student_id)
    enr_res = await session.execute(enr_stmt)
    enrollments = enr_res.scalars().all()

    # 3. Fetch Attempts
    att_stmt = select(Attempt).where(Attempt.student_id == student_id).order_by(Attempt.created_at)
    att_res = await session.execute(att_stmt)
    attempts = att_res.scalars().all()

    # 4. Fetch Mastery
    mst_stmt = select(Mastery).where(Mastery.student_id == student_id)
    mst_res = await session.execute(mst_stmt)
    mastery_records = mst_res.scalars().all()

    # 5. Log audit trail for DPDP compliance
    await audit_repo.log_action(
        action="student_data_export",
        resource_type="student",
        resource_id=str(student_id),
        user_id=current_user.id,
        ip_address=client_ip,
    )

    return StudentDataExportResponse(
        student_id=student_id,
        exported_at=datetime.now(UTC),
        profile={
            "id": str(target_student.id),
            "username": target_student.username,
            "full_name": target_student.full_name,
            "role": target_student.role.name if target_student.role else "student",
            "preferred_language": target_student.preferred_language,
            "created_at": target_student.created_at.isoformat(),
        },
        guardian={
            "name": guardian.name,
            "phone": guardian.phone,
            "relation_type": guardian.relation_type,
        }
        if guardian
        else None,
        consents=[
            {
                "id": str(c.id),
                "scope": c.scope,
                "version": c.version,
                "is_granted": c.is_granted,
                "timestamp": c.timestamp.isoformat(),
                "revoked_at": c.revoked_at.isoformat() if c.revoked_at else None,
            }
            for c in consents
        ],
        enrollments=[
            {
                "class_id": str(e.class_id),
                "roll_number": e.roll_number,
                "status": e.status,
                "created_at": e.created_at.isoformat(),
            }
            for e in enrollments
        ],
        attempts=[
            {
                "id": str(a.id),
                "question_id": str(a.question_id),
                "skill_id": str(a.skill_id),
                "is_correct": a.is_correct,
                "time_spent_ms": a.time_spent_ms,
                "created_at": a.created_at.isoformat(),
            }
            for a in attempts
        ],
        mastery=[
            {
                "skill_id": str(m.skill_id),
                "p_mastery": m.p_mastery,
                "confidence": m.confidence,
                "attempts_count": m.attempts_count,
                "correct_count": m.correct_count,
            }
            for m in mastery_records
        ],
    )


@router.post(
    "/delete/{student_id}",
    response_model=DataDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete / anonymize student data on request (DPDP Right to Erasure)",
)
async def delete_student_data(
    student_id: uuid.UUID,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> DataDeleteResponse:
    """Anonymize and soft-delete student profile, revoking consent under DPDP Act 2023."""
    _assert_owner_or_admin(student_id, current_user)

    user_repo = UserRepository(session)
    consent_repo = ConsentRepository(session)
    audit_repo = AuditRepository(session)
    client_ip = request.client.host if request.client else None

    target_student = await user_repo.get_by_id_with_role(student_id)
    if target_student is None:
        raise NotFoundError("Student", student_id)

    # 1. Anonymize user record
    await user_repo.anonymize_student(target_student)

    # 2. Revoke all granted consents
    await consent_repo.withdraw_consent(student_id)

    # 3. Record immutable audit entry
    await audit_repo.log_action(
        action="student_data_delete",
        resource_type="student",
        resource_id=str(student_id),
        changes={"anonymized": True, "consents_revoked": True},
        user_id=current_user.id,
        ip_address=client_ip,
    )

    return DataDeleteResponse(
        student_id=student_id,
        status="anonymized",
        message="Student profile and personal identifiers successfully anonymized.",
        anonymized_at=datetime.now(UTC),
    )
