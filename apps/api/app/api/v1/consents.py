"""Parental and student consent management routes compliant with DPDP Act 2023."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.errors import AuthorizationError
from app.models.auth import User
from app.repositories.audit_repo import AuditRepository
from app.repositories.consent_repo import ConsentRepository
from app.schemas.consent import (
    ConsentDetailResponse,
    ConsentWithdrawRequest,
    GuardianConsentCreateRequest,
)

router = APIRouter(prefix="/consents", tags=["Consent"])


def _assert_student_access(target_student_id: uuid.UUID, current_user: User) -> None:
    """Ensure a student only accesses their own consent records."""
    if current_user.role.name == "student" and current_user.id != target_student_id:
        raise AuthorizationError("Students may only view or manage their own consent records.")


@router.post(
    "",
    response_model=list[ConsentDetailResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Record verified guardian consent under DPDP Act 2023",
)
async def record_guardian_consent(
    payload: GuardianConsentCreateRequest,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[ConsentDetailResponse]:
    """Capture verifiable parental consent with version, timestamps, and guardian contact."""
    target_id = payload.student_id or current_user.id
    _assert_student_access(target_id, current_user)

    consent_repo = ConsentRepository(session)
    audit_repo = AuditRepository(session)
    client_ip = request.client.host if request.client else None

    # 1. Record or update Guardian details
    guardian = await consent_repo.get_or_create_guardian(
        student_id=target_id,
        name=payload.guardian_name,
        phone=payload.guardian_phone,
        relation_type=payload.guardian_relationship,
    )

    # 2. Grant consent for each declared scope
    results: list[ConsentDetailResponse] = []
    for scope_name in payload.scopes:
        consent = await consent_repo.grant_consent(
            student_id=target_id,
            scope=scope_name,
            version=payload.version,
            guardian_id=guardian.id,
            ip_address=client_ip,
        )
        results.append(
            ConsentDetailResponse(
                id=consent.id,
                student_id=consent.student_id,
                scope=consent.scope,
                version=consent.version,
                is_granted=consent.is_granted,
                timestamp=consent.timestamp,
                revoked_at=consent.revoked_at,
                guardian_name=guardian.name,
                guardian_phone=guardian.phone,
                guardian_relationship=guardian.relation_type,
            )
        )

    await audit_repo.log_action(
        action="consent_granted",
        resource_type="consent",
        resource_id=str(target_id),
        changes={"scopes": payload.scopes, "version": payload.version},
        user_id=current_user.id,
        ip_address=client_ip,
    )

    return results


@router.post(
    "/withdraw",
    response_model=dict[str, str],
    summary="Withdraw previously granted parental or student consent",
)
async def withdraw_consent(
    payload: ConsentWithdrawRequest,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Withdraw processing permissions for a specific scope or all scopes under DPDP Act."""
    target_id = payload.student_id or current_user.id
    _assert_student_access(target_id, current_user)

    consent_repo = ConsentRepository(session)
    audit_repo = AuditRepository(session)
    client_ip = request.client.host if request.client else None

    revoked_count = await consent_repo.withdraw_consent(
        student_id=target_id,
        scope=payload.scope,
    )

    await audit_repo.log_action(
        action="consent_withdrawn",
        resource_type="consent",
        resource_id=str(target_id),
        changes={"scope": payload.scope, "revoked_count": revoked_count},
        user_id=current_user.id,
        ip_address=client_ip,
    )

    return {
        "message": f"Successfully withdrawn {revoked_count} consent record(s).",
        "student_id": str(target_id),
    }


@router.get(
    "/student/{student_id}",
    response_model=list[ConsentDetailResponse],
    summary="Get all consent records for a student",
)
async def get_student_consents(
    student_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[ConsentDetailResponse]:
    """Retrieve active and historical consent records for a student."""
    _assert_student_access(student_id, current_user)

    consent_repo = ConsentRepository(session)
    consents = await consent_repo.get_all_consents_for_student(student_id)
    guardian = await consent_repo.get_guardian(student_id)

    return [
        ConsentDetailResponse(
            id=c.id,
            student_id=c.student_id,
            scope=c.scope,
            version=c.version,
            is_granted=c.is_granted,
            timestamp=c.timestamp,
            revoked_at=c.revoked_at,
            guardian_name=guardian.name if guardian else None,
            guardian_phone=guardian.phone if guardian else None,
            guardian_relationship=guardian.relation_type if guardian else None,
        )
        for c in consents
    ]
