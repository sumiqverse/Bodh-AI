"""Consent management API v1 routes."""

import uuid
from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.consent_repo import ConsentRepository
from app.schemas.consent import ConsentCreateRequest, ConsentResponse

router = APIRouter(prefix="/consents", tags=["Consent"])

DEFAULT_GUEST_STUDENT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@router.post("", response_model=ConsentResponse, summary="Record Granted Consent")
async def create_consent(
    request_body: ConsentCreateRequest,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_db)],
    x_student_id: Annotated[uuid.UUID | None, Header(description="Student UUID")] = None,
) -> ConsentResponse:
    """Record parental or student consent for DPDP Act compliance."""
    student_id = x_student_id or DEFAULT_GUEST_STUDENT_ID
    repo = ConsentRepository(session)
    client_ip = request.client.host if request.client else None

    consent = await repo.grant_consent(
        student_id=student_id,
        scope=request_body.scope,
        version=request_body.version,
        guardian_id=request_body.guardian_id,
        ip_address=client_ip,
    )

    return ConsentResponse(
        id=consent.id,
        student_id=consent.student_id,
        scope=consent.scope,
        version=consent.version,
        is_granted=consent.is_granted,
        timestamp=consent.timestamp,
        revoked_at=consent.revoked_at,
    )


@router.get("", response_model=list[ConsentResponse], summary="List Active Consents")
async def list_active_consents(
    student_id: Annotated[uuid.UUID, Query(description="Student UUID")],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Sequence[ConsentResponse]:
    """List all currently active granted consents for a student."""
    repo = ConsentRepository(session)
    consents = await repo.get_active_consents(student_id)
    return [
        ConsentResponse(
            id=c.id,
            student_id=c.student_id,
            scope=c.scope,
            version=c.version,
            is_granted=c.is_granted,
            timestamp=c.timestamp,
            revoked_at=c.revoked_at,
        )
        for c in consents
    ]
