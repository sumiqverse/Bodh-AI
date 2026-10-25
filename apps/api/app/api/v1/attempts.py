"""Practice and diagnostic attempts API v1 routes."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_role
from app.core.errors import AuthorizationError
from app.models.assessment import Attempt
from app.models.auth import User
from app.schemas.assessment import AttemptResponse, AttemptSubmitRequest
from app.services.attempt_service import AttemptService

router = APIRouter(prefix="/attempts", tags=["Attempts"])


def _assert_student_access(target_student_id: uuid.UUID, current_user: User) -> None:
    """Ensure a student only accesses their own attempts."""
    if current_user.role.name == "student" and current_user.id != target_student_id:
        raise AuthorizationError("Students may only view or manage their own attempt history.")


@router.post("", response_model=AttemptResponse, summary="Submit Question Attempt")
async def submit_attempt(
    request: AttemptSubmitRequest,
    current_user: Annotated[User, Depends(require_role("student"))],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> AttemptResponse:
    """Submit a question answer for Bayesian evaluation with strict idempotency."""
    service = AttemptService(session)
    return await service.submit_attempt(student_id=current_user.id, request=request)


@router.get(
    "/student/{student_id}",
    response_model=list[dict[str, object]],
    summary="Get Student Attempts",
)
async def get_student_attempts(
    student_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict[str, object]]:
    """Retrieve attempt history for an individual student."""
    _assert_student_access(student_id, current_user)

    statement = (
        select(Attempt).where(Attempt.student_id == student_id).order_by(Attempt.created_at.desc())
    )
    result = await session.execute(statement)
    attempts = result.scalars().all()

    return [
        {
            "id": str(a.id),
            "student_id": str(a.student_id),
            "question_id": str(a.question_id),
            "skill_id": str(a.skill_id),
            "is_correct": a.is_correct,
            "time_spent_ms": a.time_spent_ms,
            "created_at": a.created_at.isoformat(),
        }
        for a in attempts
    ]
