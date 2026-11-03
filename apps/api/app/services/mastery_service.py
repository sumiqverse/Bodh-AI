"""Bayesian Knowledge Tracing (BKT) mastery update service."""

import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assessment import Mastery
from app.repositories.mastery_repo import MasteryRepository


class MasteryService:
    """Service calculating Bayesian posterior competency transitions."""

    DEFAULT_P_TRANSIT = 0.15  # P(T)
    DEFAULT_P_SLIP = 0.10  # P(S)
    DEFAULT_P_GUESS = 0.20  # P(G)

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = MasteryRepository(session)

    def calculate_next_mastery(
        self,
        current_p: float,
        is_correct: bool,
        p_transit: float = DEFAULT_P_TRANSIT,
        p_slip: float = DEFAULT_P_SLIP,
        p_guess: float = DEFAULT_P_GUESS,
    ) -> float:
        """Apply Bayesian Knowledge Tracing formula to update mastery probability."""
        if is_correct:
            numerator = current_p * (1.0 - p_slip)
            denominator = numerator + ((1.0 - current_p) * p_guess)
        else:
            numerator = current_p * p_slip
            denominator = numerator + ((1.0 - current_p) * (1.0 - p_guess))

        p_obs = current_p if denominator <= 0.0 else numerator / denominator

        # Post-practice transition update: P(L_t) = P(L_obs) + (1 - P(L_obs)) * P(T)
        p_next = p_obs + ((1.0 - p_obs) * p_transit)
        return min(max(p_next, 0.01), 0.99)

    async def update_mastery(
        self,
        student_id: uuid.UUID,
        skill_id: uuid.UUID,
        is_correct: bool,
        attempted_at: datetime | None = None,
        class_id: uuid.UUID | None = None,
    ) -> Mastery:
        """Compute Bayesian update and persist new mastery state."""
        existing = await self.repo.get_by_student_and_skill(student_id, skill_id, class_id)
        current_p = existing.p_mastery if existing is not None else 0.10
        attempts_count = (existing.attempts_count if existing else 0) + 1

        next_p = self.calculate_next_mastery(current_p, is_correct)
        # Confidence increases asymptotically with repeated evidence
        confidence = min(1.0, 0.4 + (0.1 * min(attempts_count, 6)))

        return await self.repo.upsert_mastery(
            student_id=student_id,
            skill_id=skill_id,
            p_mastery=round(next_p, 4),
            confidence=round(confidence, 4),
            is_correct=is_correct,
            attempted_at=attempted_at,
            class_id=class_id,
        )
