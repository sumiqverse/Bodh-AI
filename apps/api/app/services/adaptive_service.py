"""Adaptive engine service orchestrating BKT updates, CAT diagnostics, and item recommendations."""

from __future__ import annotations

import math
import uuid
from typing import Any, ClassVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import ConsentRequiredError, NotFoundError
from app.engine.diagnostic import (
    CATDiagnosticEngine,
    DiagnosticQuestionItem,
)
from app.engine.difficulty import DifficultyController
from app.engine.mastery import MasteryStateMachine
from app.engine.models import (
    BKTParams,
    DiagnosticConfig,
    DiagnosticSessionState,
    DifficultyRules,
    HintLevel,
    MasteryThresholds,
    Observation,
    RankerWeights,
    SkillState,
)
from app.engine.ranker import CandidateItem, RecommendationRanker
from app.models.assessment import Attempt, Question
from app.models.curriculum import Prerequisite
from app.repositories.attempt_repo import AttemptRepository
from app.repositories.consent_repo import ConsentRepository
from app.repositories.mastery_repo import MasteryRepository
from app.repositories.question_repo import QuestionRepository
from app.repositories.skill_repo import SkillRepository
from app.schemas.assessment import (
    AttemptResponse,
    AttemptSubmitRequest,
    DiagnosticItemResponse,
    DiagnosticProgressRequest,
    DiagnosticResponse,
    DiagnosticStartRequest,
    MasteryResponse,
    NextItemResponse,
)


class AdaptiveService:
    """Orchestrates Bayesian Knowledge Tracing, CAT diagnostics, and item recommendation."""

    # In-memory storage for active CAT diagnostic sessions
    _diagnostic_sessions: ClassVar[
        dict[str, tuple[CATDiagnosticEngine, DiagnosticSessionState, dict[str, Any]]]
    ] = {}

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.attempt_repo = AttemptRepository(session)
        self.mastery_repo = MasteryRepository(session)
        self.question_repo = QuestionRepository(session)
        self.skill_repo = SkillRepository(session)
        self.consent_repo = ConsentRepository(session)

        # Engine components
        self.bkt_params = BKTParams()
        self.thresholds = MasteryThresholds()
        self.rules = DifficultyRules()
        self.weights = RankerWeights()
        self.diff_ctrl = DifficultyController(self.rules)
        self.mastery_machine = MasteryStateMachine(self.thresholds, self.rules, self.bkt_params)
        self.ranker = RecommendationRanker(self.weights, self.diff_ctrl, self.thresholds)

    async def submit_attempt(
        self,
        student_id: uuid.UUID,
        request: AttemptSubmitRequest,
    ) -> AttemptResponse:
        """Process question attempt with strict idempotency and Bayesian update."""
        # 1. Enforce DPDP guardian consent
        has_consent = await self.consent_repo.has_consent(student_id)
        if not has_consent:
            raise ConsentRequiredError(
                f"Valid parental or guardian consent is required for student '{student_id}' "
                "before recording assessment attempts under DPDP Act 2023."
            )

        # 2. Idempotency Check via idempotency_key
        existing = await self.attempt_repo.get_by_idempotency_key(request.idempotency_key)
        if existing is not None:
            mastery = await self.mastery_repo.get_by_student_and_skill(student_id, request.skill_id)
            p_val = mastery.p_mastery if mastery is not None else self.bkt_params.p_init
            return AttemptResponse(
                attempt_id=existing.id,
                is_correct=existing.is_correct,
                p_mastery_after=p_val,
                explanation="Idempotent replay of previously evaluated attempt.",
                rationale="Idempotent duplicate attempt: cached result returned.",
                is_duplicate=True,
            )

        # 3. Retrieve Question and Evaluate Correctness
        question = await self.question_repo.get_with_translations(request.question_id)
        if question is None:
            raise NotFoundError("Question", request.question_id)

        is_correct = False
        explanation = "Detailed explanation available in review mode."

        if question.translations:
            trans = question.translations[0]
            explanation = trans.explanation or trans.worked_solution or "Evaluation complete."
            if trans.options:
                for opt in trans.options:
                    if str(
                        opt.get("id")
                    ).strip().upper() == request.selected_answer.strip().upper() and bool(
                        opt.get("is_correct")
                    ):
                        is_correct = True
                        break
            elif trans.verified_answer:
                is_correct = (
                    trans.verified_answer.strip().lower() == request.selected_answer.strip().lower()
                )

        time_spent_s = max(0.1, request.time_spent_ms / 1000.0)

        # 4. Bayesian Knowledge Tracing Update
        current_mastery = await self.mastery_repo.get_by_student_and_skill(
            student_id, request.skill_id
        )
        current_p = current_mastery.p_mastery if current_mastery else self.bkt_params.p_init
        obs_count = current_mastery.attempts_count if current_mastery else 0
        corr_count = current_mastery.correct_count if current_mastery else 0

        current_skill_state = SkillState(
            skill_id=str(request.skill_id),
            p_mastery=current_p,
            state=self.thresholds.classify_probability(current_p),
            observations_count=obs_count,
            correct_count=corr_count,
        )

        obs = Observation(
            skill_id=str(request.skill_id),
            is_correct=is_correct,
            time_spent_s=time_spent_s,
            question_id=str(request.question_id),
        )

        updated_state = self.mastery_machine.process_observation(current_skill_state, obs)

        # 5. Persist Attempt Record
        attempt = await self.attempt_repo.record_attempt(
            student_id=student_id,
            question_id=request.question_id,
            skill_id=request.skill_id,
            idempotency_key=request.idempotency_key,
            selected_answer=request.selected_answer,
            is_correct=is_correct,
            time_spent_ms=request.time_spent_ms,
            client_timestamp=request.client_timestamp,
        )

        # 6. Persist Updated Mastery
        # Confidence increases asymptotically: 1 - 0.7 * exp(-0.3 * obs_count)
        confidence = min(
            0.99, max(0.40, 1.0 - (0.60 * math.exp(-0.25 * updated_state.observations_count)))
        )
        await self.mastery_repo.upsert_mastery(
            student_id=student_id,
            skill_id=request.skill_id,
            p_mastery=round(updated_state.p_mastery, 4),
            confidence=round(confidence, 4),
            is_correct=is_correct,
            attempted_at=request.client_timestamp,
        )

        return AttemptResponse(
            attempt_id=attempt.id,
            is_correct=is_correct,
            p_mastery_after=updated_state.p_mastery,
            explanation=explanation,
            rationale=updated_state.rationale,
            is_duplicate=False,
        )

    async def get_next_item(
        self,
        student_id: uuid.UUID,
        curriculum_code: str = "NCERT-MATH-C8",
    ) -> NextItemResponse:
        """Select next optimal practice item using RecommendationRanker."""
        _ = curriculum_code
        # 1. Fetch student's attempt history to avoid repetition
        attempt_stmt = select(Attempt.question_id, Attempt.skill_id).where(
            Attempt.student_id == student_id
        )
        attempt_res = await self.session.execute(attempt_stmt)
        attempts_rows = attempt_res.all()
        attempted_qids = {str(r[0]) for r in attempts_rows}
        recent_history = [str(r[1]) for r in attempts_rows[-10:]]

        # 2. Fetch student's current mastery states
        masteries = await self.mastery_repo.list_student_mastery(student_id)
        skill_states: dict[str, SkillState] = {}
        for m in masteries:
            sid = str(m.skill_id)
            skill_states[sid] = SkillState(
                skill_id=sid,
                p_mastery=m.p_mastery,
                state=self.thresholds.classify_probability(m.p_mastery),
                observations_count=m.attempts_count,
                correct_count=m.correct_count,
                last_attempt_at=m.last_attempted_at,
            )

        # 3. Load active questions from DB
        q_stmt = (
            select(Question)
            .where(
                Question.is_active == True,  # noqa: E712
                Question.is_deleted == False,  # noqa: E712
            )
            .options(selectinload(Question.translations))
        )
        q_res = await self.session.execute(q_stmt)
        questions = q_res.scalars().all()

        if not questions:
            raise NotFoundError("Questions", "No active questions found in curriculum bank.")

        candidates: list[CandidateItem] = []
        q_by_id: dict[str, Question] = {}
        for q in questions:
            qid_str = str(q.id)
            q_by_id[qid_str] = q
            candidates.append(
                CandidateItem(
                    question_id=qid_str,
                    code=q.code or qid_str,
                    skill_id=str(q.skill_id),
                    skill_code=q.code or str(q.skill_id),
                    difficulty=q.difficulty,
                    question_type=q.question_type,
                )
            )

        # 4. Rank candidates using multi-objective score
        decision = self.ranker.select_next_item(
            candidates=candidates,
            skill_states=skill_states,
            attempted_question_ids=attempted_qids,
            recent_history=recent_history,
        )

        if decision is None:
            # If all attempted, reset attempted filter
            ranked = self.ranker.rank_items(
                candidates=candidates,
                skill_states=skill_states,
                attempted_question_ids=set(),
            )
            if not ranked:
                raise NotFoundError("Question", "Unable to select next practice item.")
            decision = ranked[0]

        selected_q = q_by_id[decision.question_id]
        trans = selected_q.translations[0] if selected_q.translations else None

        prompt = trans.prompt if trans else "Problem statement unavailable."
        options = trans.options if trans else []
        hints = trans.hints if trans else []

        return NextItemResponse(
            question_id=selected_q.id,
            code=selected_q.code or str(selected_q.id),
            skill_id=selected_q.skill_id,
            skill_code=decision.skill_code,
            difficulty=selected_q.difficulty,
            question_type=selected_q.question_type,
            prompt=prompt,
            options=options,
            hints=hints,
            predicted_success=decision.predicted_success,
            score=decision.score,
            score_breakdown=decision.score_breakdown,
            hint_ladder=decision.hint_ladder.value,
            is_test_gate=decision.is_test_gate,
            is_skip_ahead=decision.is_skip_ahead,
            rationale=decision.rationale,
        )

    async def get_student_mastery(self, student_id: uuid.UUID) -> list[MasteryResponse]:
        """Fetch all mastery records for student classified with pedagogical states."""
        masteries = await self.mastery_repo.list_student_mastery(student_id)
        responses: list[MasteryResponse] = []

        for m in masteries:
            state = self.thresholds.classify_probability(m.p_mastery)
            rationale = (
                f"Mastery probability P={m.p_mastery:.2f} based on {m.attempts_count} observations "
                f"({m.correct_count} correct). State: '{state.value}'."
            )
            responses.append(
                MasteryResponse(
                    skill_id=m.skill_id,
                    p_mastery=m.p_mastery,
                    confidence=m.confidence,
                    attempts_count=m.attempts_count,
                    correct_count=m.correct_count,
                    last_attempted_at=m.last_attempted_at,
                    state=state.value,
                    rationale=rationale,
                )
            )

        return responses

    async def start_diagnostic(
        self,
        student_id: uuid.UUID,
        request: DiagnosticStartRequest,
    ) -> DiagnosticResponse:
        """Start a CAT diagnostic assessment session for a student."""
        # 1. Load curriculum skills and questions
        q_stmt = (
            select(Question)
            .where(Question.is_active == True, Question.is_deleted == False)  # noqa: E712
            .options(selectinload(Question.translations))
        )
        q_res = await self.session.execute(q_stmt)
        questions = q_res.scalars().all()

        p_stmt = select(Prerequisite)
        p_res = await self.session.execute(p_stmt)
        prereqs = p_res.scalars().all()

        edges = [(str(p.parent_skill_id), str(p.child_skill_id)) for p in prereqs]

        diagnostic_items: list[DiagnosticQuestionItem] = []
        raw_items_dict: dict[str, dict[str, Any]] = {}
        for q in questions:
            qid_str = str(q.id)
            trans = q.translations[0] if q.translations else None
            diagnostic_items.append(
                DiagnosticQuestionItem(
                    question_id=qid_str,
                    code=q.code or qid_str,
                    skill_id=str(q.skill_id),
                    skill_code=q.code or str(q.skill_id),
                    difficulty=q.difficulty,
                    question_type=q.question_type,
                )
            )
            raw_items_dict[qid_str] = {
                "prompt": trans.prompt if trans else "",
                "options": trans.options if trans else [],
                "verified_answer": trans.verified_answer if trans else "",
            }

        engine = CATDiagnosticEngine(
            edges=edges,
            questions=diagnostic_items,
            config=DiagnosticConfig(),
            bkt_params=self.bkt_params,
            thresholds=self.thresholds,
        )

        session_state = engine.start_session(
            student_id=str(student_id),
            curriculum_code=request.curriculum_code,
        )

        # Store session in memory cache
        self._diagnostic_sessions[session_state.session_id] = (
            engine,
            session_state,
            raw_items_dict,
        )

        # Pick first item
        decision = engine.pick_next_item(session_state)

        next_item_resp = None
        if decision.item:
            raw = raw_items_dict.get(decision.item.question_id, {})
            next_item_resp = DiagnosticItemResponse(
                question_id=decision.item.question_id,
                code=decision.item.code,
                skill_id=decision.item.skill_id,
                skill_code=decision.item.skill_code,
                difficulty=decision.item.difficulty,
                prompt=raw.get("prompt", ""),
                options=raw.get("options", []),
            )

        return DiagnosticResponse(
            session_id=session_state.session_id,
            is_completed=decision.is_completed,
            questions_answered=session_state.questions_answered,
            next_item=next_item_resp,
            rationale=decision.rationale,
            stop_reason=decision.stop_reason,
        )

    async def progress_diagnostic(
        self,
        student_id: uuid.UUID,
        request: DiagnosticProgressRequest,
    ) -> DiagnosticResponse:
        """Submit answer and advance CAT diagnostic session."""
        _ = student_id
        session_entry = self._diagnostic_sessions.get(request.session_id)
        if session_entry is None:
            raise NotFoundError("DiagnosticSession", request.session_id)

        engine, session_state, raw_items_dict = session_entry

        # Evaluate correctness
        raw = raw_items_dict.get(request.question_id, {})
        is_correct = False
        options = raw.get("options")
        if options:
            for opt in options:
                if str(
                    opt.get("id")
                ).strip().upper() == request.selected_answer.strip().upper() and bool(
                    opt.get("is_correct")
                ):
                    is_correct = True
                    break
        elif raw.get("verified_answer"):
            is_correct = (
                raw["verified_answer"].strip().lower() == request.selected_answer.strip().lower()
            )

        time_spent_s = max(0.1, request.time_spent_ms / 1000.0)
        hint_level = (
            HintLevel(request.hint_level) if request.hint_level in (0, 1, 2, 3) else HintLevel.NONE
        )

        # Record response
        engine.record_response(
            session=session_state,
            question_id=request.question_id,
            is_correct=is_correct,
            time_spent_s=time_spent_s,
            hint_level=hint_level,
        )

        # Check next item or termination
        decision = engine.pick_next_item(session_state)

        next_item_resp = None
        summary_dict = None

        if decision.is_completed:
            summary = engine.generate_summary(session_state)
            summary_dict = {
                "total_questions": summary.total_questions,
                "stop_reason": summary.stop_reason,
                "mastered_skills": summary.mastered_skills,
                "partial_skills": summary.partial_skills,
                "not_learned_skills": summary.not_learned_skills,
                "root_cause_gaps": summary.root_cause_gaps,
                "recommended_starting_skills": summary.recommended_starting_skills,
                "mean_uncertainty": summary.mean_uncertainty,
            }
        elif decision.item:
            raw_next = raw_items_dict.get(decision.item.question_id, {})
            next_item_resp = DiagnosticItemResponse(
                question_id=decision.item.question_id,
                code=decision.item.code,
                skill_id=decision.item.skill_id,
                skill_code=decision.item.skill_code,
                difficulty=decision.item.difficulty,
                prompt=raw_next.get("prompt", ""),
                options=raw_next.get("options", []),
            )

        return DiagnosticResponse(
            session_id=session_state.session_id,
            is_completed=decision.is_completed,
            questions_answered=session_state.questions_answered,
            next_item=next_item_resp,
            rationale=decision.rationale,
            stop_reason=decision.stop_reason,
            summary=summary_dict,
        )
