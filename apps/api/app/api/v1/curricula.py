"""Curricula and topics API v1 routes."""

from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_role
from app.core.errors import NotFoundError
from app.models.auth import User
from app.repositories.curriculum_repo import CurriculumRepository
from app.schemas.curriculum import CurriculumResponse, TopicResponse

router = APIRouter(prefix="/curricula", tags=["Curriculum"])


@router.get("", response_model=list[CurriculumResponse], summary="List Curricula")
async def list_curricula(
    session: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("student", "teacher", "admin"))],
    grade: Annotated[
        int | None, Query(ge=6, le=10, description="Grade filter (Classes 6-10)")
    ] = None,
    board: Annotated[
        str | None, Query(description="Board filter (CBSE, NCERT, STATE_BOARD)")
    ] = None,
) -> Sequence[CurriculumResponse]:
    """Retrieve educational curricula filtered by grade or board."""
    repo = CurriculumRepository(session)
    curricula = await repo.list_by_grade_and_board(grade=grade, board=board)
    return [
        CurriculumResponse(
            id=c.id,
            code=c.code,
            board=c.board,
            grade=c.grade,
            subject=c.subject,
            version=c.version,
            topics=[
                TopicResponse(
                    id=t.id,
                    code=t.code,
                    name=t.name,
                    description=t.description,
                    sequence_order=t.sequence_order,
                )
                for t in c.topics
            ],
        )
        for c in curricula
    ]


@router.get("/{code}", response_model=CurriculumResponse, summary="Get Curriculum by Code")
async def get_curriculum(
    code: str,
    session: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("student", "teacher", "admin"))],
) -> CurriculumResponse:
    """Retrieve curriculum by its unique code identifier."""
    repo = CurriculumRepository(session)
    curriculum = await repo.get_by_code(code)
    if curriculum is None:
        raise NotFoundError("Curriculum", code)

    return CurriculumResponse(
        id=curriculum.id,
        code=curriculum.code,
        board=curriculum.board,
        grade=curriculum.grade,
        subject=curriculum.subject,
        version=curriculum.version,
        topics=[
            TopicResponse(
                id=t.id,
                code=t.code,
                name=t.name,
                description=t.description,
                sequence_order=t.sequence_order,
            )
            for t in curriculum.topics
        ],
    )


@router.get("/{code}/topics", response_model=list[TopicResponse], summary="List Curriculum Topics")
async def get_curriculum_topics(
    code: str,
    session: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(require_role("student", "teacher", "admin"))],
) -> Sequence[TopicResponse]:
    """Retrieve ordered topics for a specific curriculum framework."""
    repo = CurriculumRepository(session)
    curriculum = await repo.get_by_code(code)
    if curriculum is None:
        raise NotFoundError("Curriculum", code)

    topics = await repo.get_topics(curriculum.id)
    return [
        TopicResponse(
            id=t.id,
            code=t.code,
            name=t.name,
            description=t.description,
            sequence_order=t.sequence_order,
        )
        for t in topics
    ]
