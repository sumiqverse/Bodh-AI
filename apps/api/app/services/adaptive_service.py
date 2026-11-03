"""Adaptive engine service orchestrating BKT updates, CAT diagnostics, and item recommendations."""

from __future__ import annotations

import logging
import math
import uuid
from dataclasses import asdict
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any

from fastapi.encoders import jsonable_encoder
from pydantic import TypeAdapter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.curriculum import resolve_curriculum_code
from app.core.errors import AuthorizationError, ConflictError, ConsentRequiredError, NotFoundError
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
from app.models.assessment import Attempt, DiagnosticSession, Mastery, Question
from app.models.curriculum import Curriculum, Prerequisite, Skill, Topic
from app.models.organization import Enrollment
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
from app.services.achievement_service import award_progress
from app.services.assignment_progress import update_assignment_progress
from app.services.attempt_validation import validate_attempt_context

logger = logging.getLogger(__name__)


class AdaptiveService:
    """Orchestrates Bayesian Knowledge Tracing, CAT diagnostics, and item recommendation."""

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
        language: str = "en",
    ) -> AttemptResponse:
        """Process question attempt with strict idempotency and Bayesian update."""
        # 1. Enforce DPDP guardian consent with active version check
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

        # 2. Idempotency Check via idempotency_key
        existing = await self.attempt_repo.get_by_idempotency_key(request.idempotency_key)
        if existing is not None:
            if (
                existing.student_id != student_id
                or existing.question_id != request.question_id
                or existing.skill_id != request.skill_id
                or existing.class_id != request.class_id
            ):
                raise AuthorizationError("This idempotency key belongs to another attempt.")
            mastery = await self.mastery_repo.get_by_student_and_skill(
                student_id, request.skill_id, request.class_id
            )
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
        await validate_attempt_context(
            self.session, student_id, request.class_id, question, request.skill_id
        )

        is_correct = False
        explanation = (
            "विस्तृत समाधान समीक्षा मोड में उपलब्ध है।"
            if language == "hi"
            else "Detailed explanation available in review mode."
        )

        if question.translations:
            trans = next((t for t in question.translations if t.language == language), None)
            if trans is None:
                trans = next(
                    (t for t in question.translations if t.language == "en"),
                    question.translations[0],
                )
            explanation = (
                trans.explanation
                or trans.worked_solution
                or ("मूल्यांकन पूर्ण।" if language == "hi" else "Evaluation complete.")
            )
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
            student_id, request.skill_id, request.class_id
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
            class_id=request.class_id,
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
            class_id=request.class_id,
        )

        if request.class_id is not None:
            await award_progress(self.session, student_id, request.class_id, request.skill_id)
            await update_assignment_progress(self.session, student_id, request.class_id)

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
        language: str = "en",
        class_id: uuid.UUID | None = None,
        skill_id: uuid.UUID | None = None,
    ) -> NextItemResponse:
        """Select next optimal practice item using RecommendationRanker."""
        # Check student enrollment approval status and resolve target curriculum
        target_curriculum_code = curriculum_code
        enr_stmt = (
            select(Enrollment)
            .options(selectinload(Enrollment.school_class))
            .where(Enrollment.student_id == student_id)
            .order_by(Enrollment.created_at.desc())
        )
        enr_res = await self.session.execute(enr_stmt)
        all_enrs = enr_res.scalars().all()
        if all_enrs and class_id is None:
            matching_enr = None
            for e in all_enrs:
                if e.school_class:
                    c_code = resolve_curriculum_code(
                        e.school_class.grade, e.school_class.subject or e.school_class.name
                    )
                    if curriculum_code and c_code == curriculum_code:
                        matching_enr = e
                        break
            if matching_enr:
                if matching_enr.status == "pending":
                    sc = matching_enr.school_class
                    class_name = sc.name if sc else "this class"
                    raise AuthorizationError(
                        f"Your enrollment in '{class_name}' is pending educator approval. "
                        "Classroom content and practice unlock once approved by your teacher."
                    )
                target_curriculum_code = resolve_curriculum_code(
                    matching_enr.school_class.grade,
                    matching_enr.school_class.subject or matching_enr.school_class.name,
                )
            else:
                active_enrs = [e for e in all_enrs if e.status == "active"]
                if active_enrs:
                    if not curriculum_code or curriculum_code == "NCERT-MATH-C8":
                        first_active = active_enrs[0]
                        if first_active.school_class:
                            target_curriculum_code = resolve_curriculum_code(
                                first_active.school_class.grade,
                                first_active.school_class.subject or first_active.school_class.name,
                            )
                else:
                    first_pending = all_enrs[0]
                    sc = first_pending.school_class
                    class_name = sc.name if sc else "your class"
                    raise AuthorizationError(
                        f"Your enrollment in '{class_name}' is pending educator approval. "
                        "Classroom content and practice unlock once approved by your teacher."
                    )

        # 1. Fetch student's attempt history to avoid repetition
        attempt_stmt = (
            select(Attempt.question_id, Attempt.skill_id)
            .where(Attempt.student_id == student_id, Attempt.class_id == class_id)
            .order_by(Attempt.created_at)
        )
        attempt_res = await self.session.execute(attempt_stmt)
        attempts_rows = attempt_res.all()
        attempted_qids = {str(r[0]) for r in attempts_rows}
        recent_history = [str(r[1]) for r in attempts_rows[-10:]]

        # 2. Fetch student's current mastery states
        masteries = await self.mastery_repo.list_student_mastery(student_id, class_id)
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

        if class_id is not None:
            class_result = await self.session.execute(
                select(Enrollment)
                .options(selectinload(Enrollment.school_class))
                .where(
                    Enrollment.class_id == class_id,
                    Enrollment.student_id == student_id,
                    Enrollment.status == "active",
                )
            )
            selected = class_result.scalar_one_or_none()
            if selected is None or selected.school_class is None:
                raise AuthorizationError("An active classroom enrollment is required.")
            target_curriculum_code = resolve_curriculum_code(
                selected.school_class.grade,
                selected.school_class.subject or selected.school_class.name,
            )

        # 3. Load active questions from DB scoped to target curriculum
        curric_stmt = select(Curriculum).where(Curriculum.code == target_curriculum_code)
        curric = (await self.session.execute(curric_stmt)).scalar_one_or_none()

        questions: list[Question] = []
        skills_by_id: dict[str, Skill] = {}

        if curric:
            t_stmt = select(Topic.id).where(
                Topic.curriculum_id == curric.id,
                Topic.is_deleted == False,  # noqa: E712
            )
            t_res = await self.session.execute(t_stmt)
            topic_ids = [t[0] for t in t_res.all()]

            if topic_ids:
                s_stmt = select(Skill).where(
                    Skill.topic_id.in_(topic_ids),
                    Skill.is_deleted == False,  # noqa: E712
                )
                s_res = await self.session.execute(s_stmt)
                curric_skills = s_res.scalars().all()
                skills_by_id = {str(s.id): s for s in curric_skills}
                skill_ids = [s.id for s in curric_skills]

                if skill_ids:
                    q_stmt = (
                        select(Question)
                        .where(
                            Question.is_active == True,  # noqa: E712
                            Question.status == "published",
                            (Question.class_id.is_(None) | (Question.class_id == class_id))
                            if class_id
                            else Question.class_id.is_(None),
                            Question.is_deleted == False,  # noqa: E712
                            Question.skill_id.in_(skill_ids),
                        )
                        .options(selectinload(Question.translations))
                    )
                    q_res = await self.session.execute(q_stmt)
                    questions = list(q_res.scalars().all())

        if skill_id is not None:
            questions = [question for question in questions if question.skill_id == skill_id]
        if not questions:
            raise NotFoundError("Questions", "No active questions found in curriculum bank.")

        candidates: list[CandidateItem] = []
        q_by_id: dict[str, Question] = {}
        for q in questions:
            qid_str = str(q.id)
            q_by_id[qid_str] = q
            sid_str = str(q.skill_id)
            skill_obj = skills_by_id.get(sid_str)
            skill_code = skill_obj.code if skill_obj else (q.code or sid_str)
            candidates.append(
                CandidateItem(
                    question_id=qid_str,
                    code=q.code or qid_str,
                    skill_id=sid_str,
                    skill_code=skill_code,
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
        trans = next((t for t in selected_q.translations if t.language == language), None)
        if trans is None and selected_q.translations:
            trans = next(
                (t for t in selected_q.translations if t.language == "en"),
                selected_q.translations[0],
            )

        no_statement = (
            "समस्या कथन उपलब्ध नहीं है।" if language == "hi" else "Problem statement unavailable."
        )
        prompt = trans.prompt if trans else no_statement
        options = trans.options if trans else []
        hints = trans.hints if trans else []

        rationale = decision.rationale
        if language == "hi":
            pred_pct = round(decision.predicted_success * 100)
            rationale = (
                f"लक्षित प्रवाह क्षेत्र में {pred_pct}% अनुमानित सफलता दर के साथ अभ्यास "
                f"({decision.skill_code}) चुना गया।"
            )

        return NextItemResponse(
            question_id=selected_q.id,
            code=selected_q.code or str(selected_q.id),
            skill_id=selected_q.skill_id,
            skill_code=decision.skill_code,
            difficulty=selected_q.difficulty,
            question_type=selected_q.question_type,
            prompt=prompt,
            options=[{k: v for k, v in option.items() if k != "is_correct"} for option in options]
            if options
            else options,
            hints=hints,
            predicted_success=decision.predicted_success,
            score=decision.score,
            score_breakdown=decision.score_breakdown,
            hint_ladder=decision.hint_ladder.value,
            is_test_gate=decision.is_test_gate,
            is_skip_ahead=decision.is_skip_ahead,
            rationale=rationale,
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
        language: str = "en",
    ) -> DiagnosticResponse:
        """Start a CAT diagnostic assessment session for a student scoped to their class subject."""
        # 1. Resolve student's target curriculum from classroom enrollment
        target_curriculum_code = request.curriculum_code
        enr_stmt = (
            select(Enrollment)
            .options(selectinload(Enrollment.school_class))
            .where(
                Enrollment.student_id == student_id,
            )
            .order_by(Enrollment.created_at.desc())
        )
        enr_res = await self.session.execute(enr_stmt)
        all_enrs = enr_res.scalars().all()

        if all_enrs and request.class_id is None:
            matching_enr = None
            for e in all_enrs:
                if e.school_class:
                    c_code = resolve_curriculum_code(
                        e.school_class.grade, e.school_class.subject or e.school_class.name
                    )
                    if request.curriculum_code and c_code == request.curriculum_code:
                        matching_enr = e
                        break

            if matching_enr:
                if matching_enr.status == "pending":
                    sc = matching_enr.school_class
                    class_name = sc.name if sc else "this class"
                    raise AuthorizationError(
                        f"Your enrollment in '{class_name}' is pending educator approval. "
                        "Classroom content and diagnostic tests unlock once approved."
                    )
                target_curriculum_code = resolve_curriculum_code(
                    matching_enr.school_class.grade,
                    matching_enr.school_class.subject or matching_enr.school_class.name,
                )
            else:
                active_enrs = [e for e in all_enrs if e.status == "active"]
                if active_enrs:
                    if not request.curriculum_code or request.curriculum_code == "NCERT-MATH-C8":
                        first_active = active_enrs[0]
                        if first_active.school_class:
                            target_curriculum_code = resolve_curriculum_code(
                                first_active.school_class.grade,
                                first_active.school_class.subject or first_active.school_class.name,
                            )
                else:
                    first_pending = all_enrs[0]
                    sc = first_pending.school_class
                    class_name = sc.name if sc else "your class"
                    raise AuthorizationError(
                        f"Your enrollment in '{class_name}' is pending educator approval. "
                        "Classroom content and diagnostic tests unlock once approved."
                    )

        enrollment = None
        if request.class_id is not None:
            result = await self.session.execute(
                select(Enrollment)
                .options(selectinload(Enrollment.school_class))
                .where(
                    Enrollment.class_id == request.class_id,
                    Enrollment.student_id == student_id,
                    Enrollment.status == "active",
                )
            )
            enrollment = result.scalar_one_or_none()
            if enrollment is None or enrollment.school_class is None:
                raise AuthorizationError("An active classroom enrollment is required.")
            target_curriculum_code = resolve_curriculum_code(
                enrollment.school_class.grade,
                enrollment.school_class.subject or enrollment.school_class.name,
            )

        # 2. Scope skills, topics, and questions to target curriculum
        curric_stmt = select(Curriculum).where(Curriculum.code == target_curriculum_code)
        curric = (await self.session.execute(curric_stmt)).scalar_one_or_none()

        if curric:
            t_stmt = select(Topic).where(
                Topic.curriculum_id == curric.id,
                Topic.is_deleted == False,  # noqa: E712
            )
            t_res = await self.session.execute(t_stmt)
            curric_topics = t_res.scalars().all()
            topic_ids = [t.id for t in curric_topics]
            topics_by_id = {str(t.id): t for t in curric_topics}

            s_stmt = select(Skill).where(
                Skill.topic_id.in_(topic_ids),
                Skill.is_deleted == False,  # noqa: E712
            )
            s_res = await self.session.execute(s_stmt)
            curric_skills = s_res.scalars().all()
            skill_ids = [s.id for s in curric_skills]
            skills_by_id = {str(s.id): s for s in curric_skills}

            q_stmt = (
                select(Question)
                .where(
                    Question.is_active == True,  # noqa: E712
                    Question.status == "published",
                    (Question.class_id.is_(None) | (Question.class_id == request.class_id))
                    if request.class_id
                    else Question.class_id.is_(None),
                    Question.is_deleted == False,  # noqa: E712
                    Question.skill_id.in_(skill_ids),
                )
                .options(selectinload(Question.translations))
            )
            q_res = await self.session.execute(q_stmt)
            questions = q_res.scalars().all()

            p_stmt = select(Prerequisite).where(
                Prerequisite.parent_skill_id.in_(skill_ids),
                Prerequisite.child_skill_id.in_(skill_ids),
            )
            p_res = await self.session.execute(p_stmt)
            prereqs = p_res.scalars().all()
        else:
            raise NotFoundError("Curriculum", target_curriculum_code)

        edges = [(str(p.parent_skill_id), str(p.child_skill_id)) for p in prereqs]

        questions = [
            q
            for q in questions
            if any(t.prompt and (t.options or t.verified_answer) for t in q.translations)
        ]
        if len(questions) < 20:
            raise ConflictError(
                "This curriculum needs at least 20 published questions "
                "before the diagnostic can start."
            )

        diagnostic_items: list[DiagnosticQuestionItem] = []
        raw_items_dict: dict[str, dict[str, Any]] = {}
        for q in questions:
            qid_str = str(q.id)
            trans = next((t for t in q.translations if t.language == language), None)
            if trans is None and q.translations:
                trans = next((t for t in q.translations if t.language == "en"), q.translations[0])
            sk_obj = skills_by_id.get(str(q.skill_id))
            skill_code = sk_obj.name if sk_obj else (q.code or str(q.skill_id))
            top_obj = topics_by_id.get(str(sk_obj.topic_id)) if sk_obj and sk_obj.topic_id else None
            topic_id = str(top_obj.id) if top_obj else None
            topic_name = top_obj.name if top_obj else None

            diagnostic_items.append(
                DiagnosticQuestionItem(
                    question_id=qid_str,
                    code=q.code or qid_str,
                    skill_id=str(q.skill_id),
                    skill_code=skill_code,
                    difficulty=q.difficulty,
                    question_type=q.question_type,
                    topic_id=topic_id,
                    topic_name=topic_name,
                )
            )
            raw_items_dict[qid_str] = {
                "prompt": trans.prompt if trans else "",
                "options": trans.options if trans else [],
                "verified_answer": trans.verified_answer if trans else "",
                "topic_name": topic_name,
                "translations": {t.language: t for t in q.translations},
            }

        min_q = 20
        max_q = 20
        engine = CATDiagnosticEngine(
            edges=edges,
            questions=diagnostic_items,
            config=DiagnosticConfig(
                min_questions=min_q,
                max_questions=max_q,
                targeted_followup_after=15,
            ),
            bkt_params=self.bkt_params,
            thresholds=self.thresholds,
        )

        session_state = engine.start_session(
            student_id=str(student_id),
            curriculum_code=target_curriculum_code,
            initial_skills=list(skills_by_id.keys()),
        )

        # Pick first item
        decision = engine.pick_next_item(session_state)

        next_item_resp = None
        if decision.item:
            raw = raw_items_dict.get(decision.item.question_id, {})
            trans_map = raw.get("translations", {})
            trans = (
                trans_map.get(language)
                or trans_map.get("en")
                or (next(iter(trans_map.values())) if trans_map else None)
            )
            prompt = trans.prompt if trans else raw.get("prompt", "")
            options = trans.options if trans else raw.get("options", [])
            next_item_resp = DiagnosticItemResponse(
                question_id=decision.item.question_id,
                code=decision.item.code,
                skill_id=decision.item.skill_id,
                skill_code=decision.item.skill_code,
                difficulty=decision.item.difficulty,
                prompt=prompt,
                options=[
                    {k: v for k, v in option.items() if k != "is_correct"} for option in options
                ]
                if options
                else options,
                question_type=decision.item.question_type or "mcq",
                topic_name=getattr(decision.item, "topic_name", None) or raw.get("topic_name"),
            )

        snapshot = {
            "state": jsonable_encoder(asdict(session_state)),
            "edges": edges,
            "questions": [asdict(item) for item in diagnostic_items],
            "config": asdict(engine.config),
            "items": {
                key: {
                    **{k: v for k, v in raw.items() if k != "translations"},
                    "translations": {
                        lang: {"prompt": trans.prompt, "options": trans.options}
                        for lang, trans in raw["translations"].items()
                    },
                }
                for key, raw in raw_items_dict.items()
            },
            "skills": {
                key: {"name": skill.name, "code": skill.code} for key, skill in skills_by_id.items()
            },
            "current_question_id": decision.item.question_id if decision.item else None,
            "class_id": str(request.class_id) if request.class_id else None,
        }
        if enrollment is not None:
            enrollment.diagnostic_status = "in_progress"
        initial_response = DiagnosticResponse(
            session_id=session_state.session_id,
            is_completed=decision.is_completed,
            questions_answered=session_state.questions_answered,
            next_item=next_item_resp,
            rationale=decision.rationale,
            stop_reason=decision.stop_reason,
        )
        snapshot["last_response"] = initial_response.model_dump(mode="json")
        self.session.add(
            DiagnosticSession(
                id=uuid.UUID(session_state.session_id), student_id=student_id, snapshot=snapshot
            )
        )
        await self.session.flush()
        return initial_response

    async def get_current_diagnostic(
        self, student_id: uuid.UUID, curriculum_code: str, class_id: uuid.UUID | None = None
    ) -> DiagnosticResponse:
        """Resume the latest unfinished diagnostic for this student and curriculum."""
        if class_id is not None:
            enrollment = await self.session.execute(
                select(Enrollment.id).where(
                    Enrollment.class_id == class_id,
                    Enrollment.student_id == student_id,
                    Enrollment.status == "active",
                )
            )
            if enrollment.scalar_one_or_none() is None:
                raise AuthorizationError("An active classroom enrollment is required.")
        result = await self.session.execute(
            select(DiagnosticSession)
            .where(DiagnosticSession.student_id == student_id)
            .order_by(DiagnosticSession.created_at.desc())
        )
        for record in result.scalars().all():
            state = record.snapshot.get("state", {})
            response = record.snapshot.get("last_response")
            if (
                state.get("curriculum_code") == curriculum_code
                and record.snapshot.get("class_id") == (str(class_id) if class_id else None)
                and not state.get("is_completed")
                and response
            ):
                return DiagnosticResponse.model_validate(response)
        raise NotFoundError("DiagnosticSession", curriculum_code)

    async def progress_diagnostic(
        self,
        student_id: uuid.UUID,
        request: DiagnosticProgressRequest,
        language: str = "en",
    ) -> DiagnosticResponse:
        """Submit answer and advance CAT diagnostic session."""
        try:
            session_id = uuid.UUID(request.session_id)
        except ValueError:
            raise NotFoundError("DiagnosticSession", request.session_id) from None
        result = await self.session.execute(
            select(DiagnosticSession).where(DiagnosticSession.id == session_id).with_for_update()
        )
        stored = result.scalar_one_or_none()
        if stored is None:
            raise NotFoundError("DiagnosticSession", request.session_id)
        if stored.student_id != student_id:
            raise AuthorizationError("This diagnostic session belongs to another student.")
        snapshot = stored.snapshot
        class_id = snapshot.get("class_id")
        enrollment: Enrollment | None = None
        if class_id:
            enrollment_result = await self.session.execute(
                select(Enrollment).where(
                    Enrollment.class_id == uuid.UUID(class_id),
                    Enrollment.student_id == student_id,
                    Enrollment.status == "active",
                )
            )
            enrollment = enrollment_result.scalar_one_or_none()
            if enrollment is None:
                raise AuthorizationError("An active classroom enrollment is required.")
        if snapshot.get("last_question_id") == request.question_id and snapshot.get(
            "last_response"
        ):
            return DiagnosticResponse.model_validate(snapshot["last_response"])
        if snapshot.get("current_question_id") != request.question_id:
            raise ConflictError("The submitted question is not the current diagnostic question.")
        session_state = TypeAdapter(DiagnosticSessionState).validate_python(snapshot["state"])
        engine = CATDiagnosticEngine(
            edges=[tuple(edge) for edge in snapshot["edges"]],
            questions=[DiagnosticQuestionItem(**item) for item in snapshot["questions"]],
            config=DiagnosticConfig(**snapshot["config"]),
            bkt_params=self.bkt_params,
            thresholds=self.thresholds,
        )
        raw_items_dict = {
            key: {
                **raw,
                "translations": {
                    lang: SimpleNamespace(**trans) for lang, trans in raw["translations"].items()
                },
            }
            for key, raw in snapshot["items"].items()
        }
        skills_by_id = {key: SimpleNamespace(**skill) for key, skill in snapshot["skills"].items()}

        # Reject questions outside this diagnostic bank.
        if request.question_id not in raw_items_dict:
            raise NotFoundError("DiagnosticQuestion", request.question_id)

        # Evaluate correctness
        raw = raw_items_dict[request.question_id]
        is_correct = False
        correct_answer_id: str | None = None
        options = raw.get("options")
        if options:
            for opt in options:
                if bool(opt.get("is_correct")):
                    correct_answer_id = str(opt.get("id"))
                if str(
                    opt.get("id")
                ).strip().upper() == request.selected_answer.strip().upper() and bool(
                    opt.get("is_correct")
                ):
                    is_correct = True
        elif raw.get("verified_answer"):
            correct_answer_id = str(raw.get("verified_answer"))
            is_correct = (
                raw["verified_answer"].strip().lower() == request.selected_answer.strip().lower()
            )

        time_spent_s = max(0.1, request.time_spent_ms / 1000.0)
        hint_level = (
            HintLevel(request.hint_level) if request.hint_level in (0, 1, 2, 3) else HintLevel.NONE
        )

        # Record response if not already recorded for this question
        # (prevents duplicate counting on client retries)
        if (
            request.question_id not in session_state.attempted_question_ids
            and not session_state.is_completed
        ):
            engine.record_response(
                session=session_state,
                question_id=request.question_id,
                is_correct=is_correct,
                time_spent_s=time_spent_s,
                hint_level=hint_level,
            )

        # Persist the actual answer immediately, in the same transaction as the session state.
        question = engine.question_by_id[request.question_id]
        self.session.add(
            Attempt(
                student_id=student_id,
                class_id=uuid.UUID(class_id) if class_id else None,
                question_id=uuid.UUID(request.question_id),
                skill_id=uuid.UUID(question.skill_id),
                idempotency_key=f"dg_{session_id.hex}_{uuid.UUID(request.question_id).hex[:20]}",
                selected_answer=request.selected_answer,
                is_correct=is_correct,
                time_spent_ms=request.time_spent_ms,
                client_timestamp=datetime.now(UTC),
            )
        )

        # Check next item or termination
        decision = engine.pick_next_item(session_state)

        next_item_resp = None
        summary_dict = None

        if decision.is_completed:
            summary = engine.generate_summary(session_state)

            def get_skill_name_or_code(sid: str) -> str:
                s = skills_by_id.get(str(sid))
                if s:
                    return str(s.name or s.code)
                return sid

            skill_states_list = [
                {
                    "skill_id": sid,
                    "code": skills_by_id[sid].code if sid in skills_by_id else sid,
                    "name": skills_by_id[sid].name if sid in skills_by_id else sid,
                    "p_mastery": round(st.p_mastery, 4),
                    "state": st.state.value if hasattr(st.state, "value") else str(st.state),
                    "attempts_count": st.observations_count,
                }
                for sid, st in session_state.skill_states.items()
            ]

            summary_dict = {
                "total_questions": summary.total_questions,
                "stop_reason": summary.stop_reason,
                "mastered_skills": [get_skill_name_or_code(sid) for sid in summary.mastered_skills],
                "partial_skills": [get_skill_name_or_code(sid) for sid in summary.partial_skills],
                "not_learned_skills": [
                    get_skill_name_or_code(sid) for sid in summary.not_learned_skills
                ],
                "root_cause_gaps": [get_skill_name_or_code(sid) for sid in summary.root_cause_gaps],
                "recommended_starting_skills": [
                    get_skill_name_or_code(sid) for sid in summary.recommended_starting_skills
                ],
                "mean_uncertainty": summary.mean_uncertainty,
                "skill_states": skill_states_list,
            }

            now_utc = datetime.now(UTC)

            try:
                # 1. Batch fetch all existing masteries for this student in ONE query
                existing_m_stmt = select(Mastery).where(
                    Mastery.student_id == student_id,
                    Mastery.class_id == (uuid.UUID(class_id) if class_id else None),
                )
                existing_m_res = await self.session.execute(existing_m_stmt)
                existing_masteries = {m.skill_id: m for m in existing_m_res.scalars().all()}

                # Persist each calibrated skill's Bayesian mastery in memory
                for skill_id_str, skill_state in session_state.skill_states.items():
                    if skill_state.observations_count == 0:
                        continue
                    try:
                        sk_uuid = uuid.UUID(skill_id_str)
                        if (
                            skill_id_str not in skills_by_id
                            and str(sk_uuid) not in skills_by_id
                            and sk_uuid not in skills_by_id
                        ):
                            continue
                        obs_count = max(1, skill_state.observations_count)
                        confidence = min(
                            0.99, max(0.40, 1.0 - (0.60 * math.exp(-0.25 * obs_count)))
                        )
                        is_corr = skill_state.p_mastery >= self.thresholds.mastered_min
                        corr_cnt = (
                            skill_state.correct_count
                            if hasattr(skill_state, "correct_count")
                            else (1 if is_corr else 0)
                        )

                        mastery_obj = existing_masteries.get(sk_uuid)
                        if mastery_obj is None:
                            new_m = Mastery(
                                student_id=student_id,
                                class_id=uuid.UUID(class_id) if class_id else None,
                                skill_id=sk_uuid,
                                p_mastery=round(skill_state.p_mastery, 4),
                                confidence=round(confidence, 4),
                                attempts_count=obs_count,
                                correct_count=corr_cnt,
                                last_attempted_at=now_utc,
                            )
                            self.session.add(new_m)
                            existing_masteries[sk_uuid] = new_m
                        else:
                            mastery_obj.p_mastery = round(skill_state.p_mastery, 4)
                            mastery_obj.confidence = round(confidence, 4)
                            mastery_obj.attempts_count += obs_count
                            mastery_obj.correct_count += corr_cnt
                            mastery_obj.last_attempted_at = now_utc
                    except Exception as sk_err:
                        logger.warning("Failed preparing mastery for %s: %s", skill_id_str, sk_err)

                # Keep mastery, attempts, and session state in one transaction.
                await self.session.flush()
            except Exception as commit_err:
                logger.error("Error committing diagnostic results: %s", commit_err)
                await self.session.rollback()
                raise
        elif decision.item:
            raw_next = raw_items_dict.get(decision.item.question_id, {})
            trans_map = raw_next.get("translations", {})
            trans = (
                trans_map.get(language)
                or trans_map.get("en")
                or (next(iter(trans_map.values())) if trans_map else None)
            )
            prompt = trans.prompt if trans else raw_next.get("prompt", "")
            options = trans.options if trans else raw_next.get("options", [])
            next_item_resp = DiagnosticItemResponse(
                question_id=decision.item.question_id,
                code=decision.item.code,
                skill_id=decision.item.skill_id,
                skill_code=decision.item.skill_code,
                difficulty=decision.item.difficulty,
                prompt=prompt,
                options=[
                    {k: v for k, v in option.items() if k != "is_correct"} for option in options
                ]
                if options
                else options,
                question_type=decision.item.question_type or "mcq",
                topic_name=getattr(decision.item, "topic_name", None) or raw_next.get("topic_name"),
            )

        is_weakness_review = bool(
            decision.item and ("backward walk" in decision.rationale.lower() or not is_correct)
        )

        response = DiagnosticResponse(
            session_id=session_state.session_id,
            is_completed=decision.is_completed,
            questions_answered=session_state.questions_answered,
            next_item=next_item_resp,
            rationale=decision.rationale,
            stop_reason=decision.stop_reason,
            summary=summary_dict,
            last_is_correct=is_correct,
            correct_answer_id=correct_answer_id,
            explanation=raw.get("explanation"),
            is_weakness_review=is_weakness_review,
        )
        if enrollment is not None:
            await update_assignment_progress(self.session, student_id, enrollment.class_id)
        if decision.is_completed and enrollment is not None:
            enrollment.diagnostic_status = "completed"
            for skill_id, skill_state in session_state.skill_states.items():
                if skill_state.observations_count:
                    await award_progress(
                        self.session, student_id, enrollment.class_id, uuid.UUID(skill_id)
                    )
        stored.snapshot = {
            **snapshot,
            "state": jsonable_encoder(asdict(session_state)),
            "current_question_id": decision.item.question_id if decision.item else None,
            "last_question_id": request.question_id,
            "last_response": response.model_dump(mode="json"),
        }
        await self.session.flush()
        return response
