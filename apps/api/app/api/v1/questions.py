"""Questions API v1 routes."""

import uuid
from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError
from app.db.session import get_db
from app.repositories.question_repo import QuestionRepository
from app.schemas.assessment import QuestionOptionResponse, QuestionResponse

router = APIRouter(prefix="/questions", tags=["Questions"])


@router.get("", response_model=list[QuestionResponse], summary="List Questions for Skill")
async def list_questions(
    session: Annotated[AsyncSession, Depends(get_db)],
    skill_id: Annotated[uuid.UUID, Query(description="Skill competency UUID")],
    language: Annotated[str, Query(description="Language code ('en', 'hi')")] = "en",
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> Sequence[QuestionResponse]:
    """Retrieve calibrated assessment questions belonging to a competency skill."""
    repo = QuestionRepository(session)
    questions = await repo.list_by_skill(skill_id=skill_id, skip=skip, limit=limit)

    results: list[QuestionResponse] = []
    for q in questions:
        # Find matching language translation or fallback to first
        trans = next((t for t in q.translations if t.language == language), None)
        if trans is None and q.translations:
            trans = q.translations[0]

        if trans is None:
            continue

        options = [
            QuestionOptionResponse(
                id=str(opt.get("id", "")),
                text=str(opt.get("text", "")),
            )
            for opt in trans.options
        ]

        results.append(
            QuestionResponse(
                id=q.id,
                skill_id=q.skill_id,
                difficulty=q.difficulty,
                question_type=q.question_type,
                prompt=trans.prompt,
                options=options,
                hints=trans.hints or [],
            )
        )

    return results


@router.get("/{question_id}", response_model=QuestionResponse, summary="Get Question by ID")
async def get_question(
    question_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(get_db)],
    language: Annotated[str, Query(description="Language code ('en', 'hi')")] = "en",
) -> QuestionResponse:
    """Retrieve a single calibrated question by UUID."""
    repo = QuestionRepository(session)
    question = await repo.get_with_translations(question_id)
    if question is None:
        raise NotFoundError("Question", question_id)

    trans = next((t for t in question.translations if t.language == language), None)
    if trans is None and question.translations:
        trans = question.translations[0]

    if trans is None:
        raise NotFoundError("QuestionTranslation", f"{question_id}:{language}")

    options = [
        QuestionOptionResponse(
            id=str(opt.get("id", "")),
            text=str(opt.get("text", "")),
        )
        for opt in trans.options
    ]

    return QuestionResponse(
        id=question.id,
        skill_id=question.skill_id,
        difficulty=question.difficulty,
        question_type=question.question_type,
        prompt=trans.prompt,
        options=options,
        hints=trans.hints or [],
    )
