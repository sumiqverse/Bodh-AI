"""Question item bank repository."""

import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.assessment import Question, QuestionTranslation
from app.repositories.base import BaseRepository


class QuestionRepository(BaseRepository[Question]):
    """Repository operations for assessment questions and localized translations."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Question, session)

    async def get_with_translations(self, question_id: uuid.UUID) -> Question | None:
        """Fetch question by ID eagerly loading all language translations."""
        statement = (
            select(Question)
            .where(Question.id == question_id, Question.is_deleted == False)  # noqa: E712
            .options(selectinload(Question.translations))
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_by_skill(
        self,
        skill_id: uuid.UUID,
        status: str | None = None,
        needs_teacher_review: bool | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Sequence[Question]:
        """Fetch calibrated assessment questions belonging to a competency skill."""
        statement = (
            select(Question)
            .where(
                Question.skill_id == skill_id,
                Question.is_active == True,  # noqa: E712
                Question.is_deleted == False,  # noqa: E712
            )
            .options(selectinload(Question.translations))
        )
        if status is not None:
            statement = statement.where(Question.status == status)
        if needs_teacher_review is not None:
            statement = statement.where(Question.needs_teacher_review == needs_teacher_review)

        statement = statement.offset(skip).limit(limit)
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def list_questions(
        self,
        skill_id: uuid.UUID | None = None,
        status: str | None = None,
        needs_teacher_review: bool | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Sequence[Question]:
        """List questions across the bank with optional status and review filters."""
        statement = (
            select(Question)
            .where(
                Question.is_active == True,  # noqa: E712
                Question.is_deleted == False,  # noqa: E712
            )
            .options(selectinload(Question.translations))
        )
        if skill_id is not None:
            statement = statement.where(Question.skill_id == skill_id)
        if status is not None:
            statement = statement.where(Question.status == status)
        if needs_teacher_review is not None:
            statement = statement.where(Question.needs_teacher_review == needs_teacher_review)

        statement = statement.order_by(Question.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def add_translation(
        self,
        question_id: uuid.UUID,
        language: str,
        prompt: str,
        options: list[dict[str, Any]] | None = None,
        explanation: str = "",
        hints: list[str] | None = None,
        verified_answer: str = "",
        worked_solution: str = "",
    ) -> QuestionTranslation:
        """Attach a localized translation to an existing question."""
        translation = QuestionTranslation(
            question_id=question_id,
            language=language,
            prompt=prompt,
            options=options,
            explanation=explanation,
            hints=hints or [],
            verified_answer=verified_answer,
            worked_solution=worked_solution,
        )
        self.session.add(translation)
        await self.session.flush()
        return translation
