"""Curriculum and topic repository."""

import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.curriculum import normalize_curriculum_code
from app.models.curriculum import Curriculum, Topic
from app.repositories.base import BaseRepository


class CurriculumRepository(BaseRepository[Curriculum]):
    """Repository operations for Curricula and associated Topics."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Curriculum, session)

    async def get_by_code(self, code: str) -> Curriculum | None:
        """Fetch a curriculum by unique code, supporting canonical and alias abbreviations."""
        canonical_code = normalize_curriculum_code(code)
        codes_to_try = [code] if canonical_code == code else [code, canonical_code]
        statement = (
            select(Curriculum)
            .where(Curriculum.code.in_(codes_to_try), Curriculum.is_deleted == False)  # noqa: E712
            .options(selectinload(Curriculum.topics))
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_by_grade_and_board(
        self,
        grade: int | None = None,
        board: str | None = None,
    ) -> Sequence[Curriculum]:
        """Filter curricula by grade (Classes 6-10) and educational board."""
        statement = select(Curriculum).where(Curriculum.is_deleted == False)  # noqa: E712
        if grade is not None:
            statement = statement.where(Curriculum.grade == grade)
        if board is not None:
            statement = statement.where(Curriculum.board == board.upper())
        statement = statement.options(selectinload(Curriculum.topics))
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def get_topics(self, curriculum_id: uuid.UUID) -> Sequence[Topic]:
        """Fetch all topics for a given curriculum sorted by sequence order."""
        statement = (
            select(Topic)
            .where(Topic.curriculum_id == curriculum_id, Topic.is_deleted == False)  # noqa: E712
            .order_by(Topic.sequence_order.asc())
        )
        result = await self.session.execute(statement)
        return result.scalars().all()
