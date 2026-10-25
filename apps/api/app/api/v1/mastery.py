"""Student competency mastery API v1 routes."""

import uuid
from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.db.session import get_db
from app.repositories.mastery_repo import MasteryRepository
from app.schemas.assessment import MasteryResponse

router = APIRouter(prefix="/mastery", tags=["Mastery"])


@router.get("", response_model=list[MasteryResponse], summary="List Student Mastery States")
async def list_student_mastery(
    student_id: Annotated[uuid.UUID, Query(description="Student UUID")],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> Sequence[MasteryResponse]:
    """Retrieve all competency mastery levels tracked for a student."""
    repo = MasteryRepository(session)
    mastery_list = await repo.list_student_mastery(student_id)
    return [
        MasteryResponse(
            skill_id=m.skill_id,
            p_mastery=m.p_mastery,
            confidence=m.confidence,
            attempts_count=m.attempts_count,
            correct_count=m.correct_count,
            last_attempted_at=m.last_attempted_at,
        )
        for m in mastery_list
    ]


@router.get("/{skill_id}", response_model=MasteryResponse, summary="Get Skill Mastery")
async def get_skill_mastery(
    skill_id: uuid.UUID,
    student_id: Annotated[uuid.UUID, Query(description="Student UUID")],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> MasteryResponse:
    """Retrieve student mastery probability for a specific skill."""
    repo = MasteryRepository(session)
    mastery = await repo.get_by_student_and_skill(student_id, skill_id)
    if mastery is None:
        raise NotFoundError("Mastery", f"{student_id}:{skill_id}")

    return MasteryResponse(
        skill_id=mastery.skill_id,
        p_mastery=mastery.p_mastery,
        confidence=mastery.confidence,
        attempts_count=mastery.attempts_count,
        correct_count=mastery.correct_count,
        last_attempted_at=mastery.last_attempted_at,
    )
