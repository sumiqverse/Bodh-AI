"""Adaptive Engine API routes: diagnostics, attempts, next-item, and mastery."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_role
from app.models.auth import User
from app.schemas.assessment import (
    AttemptResponse,
    AttemptSubmitRequest,
    DiagnosticProgressRequest,
    DiagnosticResponse,
    DiagnosticStartRequest,
    MasteryResponse,
    NextItemResponse,
)
from app.services.adaptive_service import AdaptiveService

router = APIRouter(tags=["Adaptive Engine"])


@router.post(
    "/diagnostics",
    response_model=DiagnosticResponse,
    summary="CAT Diagnostic Assessment (Start or Progress)",
)
async def handle_diagnostic(
    request: DiagnosticStartRequest | DiagnosticProgressRequest,
    current_user: Annotated[User, Depends(require_role("student"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> DiagnosticResponse:
    """Initialize a CAT diagnostic session or advance an active session with student answer."""
    service = AdaptiveService(session)
    if isinstance(request, DiagnosticProgressRequest) or hasattr(request, "session_id"):
        return await service.progress_diagnostic(
            student_id=current_user.id,
            request=DiagnosticProgressRequest.model_validate(request),
        )
    return await service.start_diagnostic(
        student_id=current_user.id,
        request=DiagnosticStartRequest.model_validate(request),
    )


@router.post(
    "/attempts",
    response_model=AttemptResponse,
    summary="Submit Practice or Diagnostic Attempt (Idempotent)",
)
async def submit_attempt(
    request: AttemptSubmitRequest,
    current_user: Annotated[User, Depends(require_role("student"))],
    session: Annotated[AsyncSession, Depends(get_db)],
    idempotency_key_header: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> AttemptResponse:
    """Evaluate an assessment attempt with strict idempotency and Bayesian Knowledge Tracing."""
    if idempotency_key_header:
        request.idempotency_key = idempotency_key_header

    service = AdaptiveService(session)
    return await service.submit_attempt(student_id=current_user.id, request=request)


@router.get(
    "/next-item",
    response_model=NextItemResponse,
    summary="Get Next Pedagogically Recommended Question",
)
async def get_next_item(
    current_user: Annotated[User, Depends(require_role("student"))],
    session: Annotated[AsyncSession, Depends(get_db)],
    curriculum_code: str = "NCERT-MATH-C8",
) -> NextItemResponse:
    """Select the next optimal question balancing gap remediation, flow-state difficulty,
    and spacing.
    """
    service = AdaptiveService(session)
    return await service.get_next_item(
        student_id=current_user.id,
        curriculum_code=curriculum_code,
    )


@router.get(
    "/mastery",
    response_model=list[MasteryResponse],
    summary="Get Student Mastery States and Pedagogical Rationales",
)
async def get_student_mastery(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
    student_id: uuid.UUID | None = None,
) -> list[MasteryResponse]:
    """Retrieve Bayesian competency levels, mastery states, and rationale explanations."""
    target_id = current_user.id
    if student_id is not None:
        # Teachers and admins can view any student's mastery; students only view their own
        if current_user.role.name == "student" and current_user.id != student_id:
            target_id = current_user.id
        else:
            target_id = student_id

    service = AdaptiveService(session)
    return await service.get_student_mastery(target_id)
