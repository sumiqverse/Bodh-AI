"""Practice and diagnostic attempts API v1 routes."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.assessment import AttemptResponse, AttemptSubmitRequest
from app.services.attempt_service import AttemptService

router = APIRouter(prefix="/attempts", tags=["Attempts"])

DEFAULT_GUEST_STUDENT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@router.post("", response_model=AttemptResponse, summary="Submit Question Attempt")
async def submit_attempt(
    request: AttemptSubmitRequest,
    session: Annotated[AsyncSession, Depends(get_db)],
    x_student_id: Annotated[
        uuid.UUID | None,
        Header(description="Authenticated student UUID or guest profile identifier"),
    ] = None,
) -> AttemptResponse:
    """Submit a question answer for Bayesian evaluation with strict idempotency."""
    student_id = x_student_id or DEFAULT_GUEST_STUDENT_ID
    service = AttemptService(session)
    return await service.submit_attempt(student_id=student_id, request=request)
