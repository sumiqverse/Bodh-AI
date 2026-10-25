"""Skill knowledge graph repository."""

import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.curriculum import Prerequisite, Skill
from app.repositories.base import BaseRepository


class SkillRepository(BaseRepository[Skill]):
    """Repository operations for atomic skills and prerequisite relations."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Skill, session)

    async def get_by_code(self, code: str) -> Skill | None:
        """Retrieve a skill by its unique competency code."""
        statement = select(Skill).where(Skill.code == code, Skill.is_deleted == False)  # noqa: E712
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_by_topic(self, topic_id: uuid.UUID) -> Sequence[Skill]:
        """Fetch all skills attached to a specific topic."""
        statement = (
            select(Skill)
            .where(Skill.topic_id == topic_id, Skill.is_deleted == False)  # noqa: E712
            .options(selectinload(Skill.prerequisites))
        )
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def get_prerequisites(self, skill_id: uuid.UUID) -> Sequence[Prerequisite]:
        """Fetch incoming prerequisite edges for a skill."""
        statement = (
            select(Prerequisite)
            .where(Prerequisite.child_skill_id == skill_id)
            .options(selectinload(Prerequisite.parent_skill))
        )
        result = await self.session.execute(statement)
        return result.scalars().all()

    async def add_prerequisite(
        self,
        parent_skill_id: uuid.UUID,
        child_skill_id: uuid.UUID,
        relation_type: str = "hard",
    ) -> Prerequisite:
        """Add a directed prerequisite edge."""
        edge = Prerequisite(
            parent_skill_id=parent_skill_id,
            child_skill_id=child_skill_id,
            relation_type=relation_type,
        )
        self.session.add(edge)
        await self.session.flush()
        return edge
