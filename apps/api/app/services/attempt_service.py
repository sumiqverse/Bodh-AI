"""Attempt evaluation and submission service."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AuthorizationError, ConsentRequiredError, NotFoundError
from app.repositories.attempt_repo import AttemptRepository
from app.repositories.consent_repo import ConsentRepository
from app.repositories.mastery_repo import MasteryRepository
from app.repositories.question_repo import QuestionRepository
from app.schemas.assessment import AttemptResponse, AttemptSubmitRequest
from app.services.achievement_service import award_progress
from app.services.assignment_progress import update_assignment_progress
from app.services.attempt_validation import validate_attempt_context
from app.services.mastery_service import MasteryService


class AttemptService:
    """Service handling idempotent question evaluation and mastery progression."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.attempt_repo = AttemptRepository(session)
        self.question_repo = QuestionRepository(session)
        self.mastery_repo = MasteryRepository(session)
        self.mastery_service = MasteryService(session)
        self.consent_repo = ConsentRepository(session)

    async def submit_attempt(
        self,
        student_id: uuid.UUID,
        request: AttemptSubmitRequest,
    ) -> AttemptResponse:
        """Process an attempt with idempotency guard and Bayesian posterior update."""
        # 1. Enforce Guardian Consent under DPDP Act 2023 with version check
        settings = get_settings()
        has_consent = await self.consent_repo.has_consent(
            student_id, required_version=settings.current_consent_version
        )
        if not has_consent:
            raise ConsentRequiredError(
                f"Guardian consent (version '{settings.current_consent_version}') "
                f"is required for student '{student_id}' before recording attempts "
                "under DPDP Act 2023."
            )

        # 2. Idempotency Check
        existing_attempt = await self.attempt_repo.get_by_idempotency_key(request.idempotency_key)
        if existing_attempt is not None:
            if (
                existing_attempt.student_id != student_id
                or existing_attempt.question_id != request.question_id
                or existing_attempt.skill_id != request.skill_id
                or existing_attempt.class_id != request.class_id
            ):
                raise AuthorizationError("This idempotency key belongs to another attempt.")
            mastery = await self.mastery_repo.get_by_student_and_skill(
                student_id, request.skill_id, request.class_id
            )
            p_val = mastery.p_mastery if mastery is not None else 0.50
            return AttemptResponse(
                attempt_id=existing_attempt.id,
                is_correct=existing_attempt.is_correct,
                p_mastery_after=p_val,
                explanation="Idempotent replay of previously evaluated attempt.",
                is_duplicate=True,
            )

        # 2. Retrieve Question & Determine Correctness
        question = await self.question_repo.get_with_translations(request.question_id)
        if question is None:
            raise NotFoundError("Question", request.question_id)
        await validate_attempt_context(
            self.session, student_id, request.class_id, question, request.skill_id
        )

        is_correct = False
        explanation = "Detailed explanation available in review mode."

        if question.translations:
            # Check options in the default translation
            trans = question.translations[0]
            explanation = trans.explanation
            for opt in trans.options or []:
                if str(
                    opt.get("id")
                ).strip().upper() == request.selected_answer.strip().upper() and bool(
                    opt.get("is_correct")
                ):
                    is_correct = True
                    break

        # 3. Persist Attempt Record
        attempt = await self.attempt_repo.record_attempt(
            student_id=student_id,
            question_id=request.question_id,
            skill_id=request.skill_id,
            idempotency_key=request.idempotency_key,
            selected_answer=request.selected_answer,
            is_correct=is_correct,
            time_spent_ms=request.time_spent_ms,
            client_timestamp=request.client_timestamp,
            class_id=request.class_id,
        )

        # 4. Update Bayesian Mastery
        mastery = await self.mastery_service.update_mastery(
            student_id=student_id,
            skill_id=request.skill_id,
            is_correct=is_correct,
            attempted_at=request.client_timestamp,
            class_id=request.class_id,
        )

        if request.class_id is not None:
            await award_progress(self.session, student_id, request.class_id, request.skill_id)
            await update_assignment_progress(self.session, student_id, request.class_id)

        return AttemptResponse(
            attempt_id=attempt.id,
            is_correct=is_correct,
            p_mastery_after=mastery.p_mastery,
            explanation=explanation,
            is_duplicate=False,
        )
