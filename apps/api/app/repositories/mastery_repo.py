"""Mastery repository managing student competency states."""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import Mastery
from app.repositories.base import BaseRepository


class MasteryRepository(BaseRepository[Mastery]):
    """Repository operations for Bayesian mastery tracking."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Mastery, session)

    async def get_by_student_and_skill(
        self,
        student_id: uuid.UUID,
        skill_id: uuid.UUID,
    ) -> Mastery | None:
        """Fetch mastery record for a specific student and skill pair."""
        statement = select(Mastery).where(
            Mastery.student_id == student_id,
            Mastery.skill_id == skill_id,
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def upsert_mastery(
        self,
        student_id: uuid.UUID,
        skill_id: uuid.UUID,
        p_mastery: float,
        confidence: float,
        is_correct: bool,
        attempted_at: datetime | None = None,
    ) -> Mastery:
        """Update existing mastery score or create initial state."""
        mastery = await self.get_by_student_and_skill(student_id, skill_id)
        timestamp = attempted_at or datetime.now(UTC)

        if mastery is None:
            mastery = Mastery(
                student_id=student_id,
                skill_id=skill_id,
                p_mastery=p_mastery,
                confidence=confidence,
                attempts_count=1,
                correct_count=1 if is_correct else 0,
                last_attempted_at=timestamp,
            )
            self.session.add(mastery)
        else:
            mastery.p_mastery = p_mastery
            mastery.confidence = confidence
            mastery.attempts_count += 1
            if is_correct:
                mastery.correct_count += 1
            mastery.last_attempted_at = timestamp

        await self.session.flush()
        return mastery

    async def list_student_mastery(self, student_id: uuid.UUID) -> Sequence[Mastery]:
        """Fetch all mastery states for a given student."""
        statement = select(Mastery).where(Mastery.student_id == student_id)
        result = await self.session.execute(statement)
        return result.scalars().all()
