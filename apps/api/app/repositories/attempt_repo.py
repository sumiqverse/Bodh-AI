"""Attempt repository handling idempotent submissions."""

import uuid
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import Attempt
from app.repositories.base import BaseRepository


class AttemptRepository(BaseRepository[Attempt]):
    """Repository operations for practice attempts with idempotency protection."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Attempt, session)

    async def get_by_idempotency_key(self, idempotency_key: str) -> Attempt | None:
        """Find an existing attempt by unique client idempotency key."""
        statement = select(Attempt).where(Attempt.idempotency_key == idempotency_key)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def record_attempt(
        self,
        student_id: uuid.UUID,
        question_id: uuid.UUID,
        skill_id: uuid.UUID,
        idempotency_key: str,
        selected_answer: str,
        is_correct: bool,
        time_spent_ms: int,
        client_timestamp: datetime,
        class_id: uuid.UUID | None = None,
    ) -> Attempt:
        """Create and persist an attempt."""
        attempt = Attempt(
            student_id=student_id,
            class_id=class_id,
            question_id=question_id,
            skill_id=skill_id,
            idempotency_key=idempotency_key,
            selected_answer=selected_answer,
            is_correct=is_correct,
            time_spent_ms=time_spent_ms,
            client_timestamp=client_timestamp,
        )
        self.session.add(attempt)
        await self.session.flush()
        return attempt

    async def list_by_student_and_skill(
        self,
        student_id: uuid.UUID,
        skill_id: uuid.UUID,
        limit: int = 50,
    ) -> Sequence[Attempt]:
        """Fetch historical attempts for a student on a specific skill, newest first."""
        statement = (
            select(Attempt)
            .where(
                Attempt.student_id == student_id,
                Attempt.skill_id == skill_id,
            )
            .order_by(Attempt.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(statement)
        return result.scalars().all()
