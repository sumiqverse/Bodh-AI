"""CAT-style diagnostic engine with Expected Information Gain and backward
prerequisite traversal.
"""

from __future__ import annotations

import random
import uuid
from dataclasses import dataclass
from typing import Any

import networkx as nx  # type: ignore[import-untyped]

from app.engine.bkt import (
    binary_entropy,
    expected_information_gain,
)
from app.engine.mastery import MasteryStateMachine
from app.engine.models import (
    BKTParams,
    DiagnosticConfig,
    DiagnosticSessionState,
    HintLevel,
    MasteryState,
    MasteryThresholds,
    Observation,
    SkillState,
)
from app.engine.root_cause import find_deepest_unmastered_networkx


@dataclass
class DiagnosticQuestionItem:
    """Lightweight question metadata for diagnostic selection."""

    question_id: str
    code: str
    skill_id: str
    skill_code: str
    difficulty: int
    question_type: str = "mcq"
    topic_id: str | None = None
    topic_name: str | None = None


@dataclass
class DiagnosticDecision:
    """Selected question for a diagnostic session step with pedagogical rationale."""

    item: DiagnosticQuestionItem | None
    skill_id: str | None
    skill_code: str | None
    is_completed: bool
    stop_reason: str | None
    rationale: str
    expected_information_gain: float = 0.0


@dataclass
class DiagnosticSummary:
    """Final diagnostic report when a session terminates."""

    session_id: str
    total_questions: int
    stop_reason: str
    mastered_skills: list[str]
    partial_skills: list[str]
    not_learned_skills: list[str]
    root_cause_gaps: list[str]
    recommended_starting_skills: list[str]
    mean_uncertainty: float


class CATDiagnosticEngine:
    """Computerized Adaptive Testing diagnostic engine."""

    def __init__(
        self,
        edges: list[tuple[str, str]],
        questions: list[DiagnosticQuestionItem],
        config: DiagnosticConfig | None = None,
        bkt_params: BKTParams | None = None,
        thresholds: MasteryThresholds | None = None,
    ) -> None:
        self.edges = edges
        self.questions = questions
        self.config = config or DiagnosticConfig()
        self.bkt_params = bkt_params or BKTParams()
        self.thresholds = thresholds or MasteryThresholds()
        self.mastery_machine = MasteryStateMachine(self.thresholds, bkt_params=self.bkt_params)

        # Build NetworkX graph (prerequisite -> dependent)
        self.graph = nx.DiGraph()
        for parent, child in edges:
            self.graph.add_edge(parent, child)

        # Index questions by skill
        self.questions_by_skill: dict[str, list[DiagnosticQuestionItem]] = {}
        self.question_by_id: dict[str, DiagnosticQuestionItem] = {}
        for q in questions:
            self.question_by_id[q.question_id] = q
            self.questions_by_skill.setdefault(q.skill_id, []).append(q)

    def start_session(
        self,
        student_id: str,
        initial_skills: list[str] | None = None,
        curriculum_code: str = "NCERT-MATH-08",
    ) -> DiagnosticSessionState:
        """Initialize a new diagnostic session state."""
        session = DiagnosticSessionState(
            session_id=str(uuid.uuid4()),
            student_id=student_id,
            curriculum_code=curriculum_code,
        )

        # Determine target skills to assess with randomized initial order
        target_skills = (
            list(initial_skills) if initial_skills else list(self.questions_by_skill.keys())
        )
        random.shuffle(target_skills)
        for skill_id in target_skills:
            session.skill_states[skill_id] = SkillState(
                skill_id=skill_id,
                p_mastery=self.bkt_params.p_init,
                state=MasteryState.NOT_LEARNED,
                rationale="Initial prior before CAT diagnostic assessment.",
            )

        return session

    def calculate_mean_uncertainty(self, session: DiagnosticSessionState) -> float:
        """Compute the average Shannon entropy (uncertainty) across tested skills."""
        tested_skills = [s for s in session.skill_states.values() if s.observations_count > 0]
        if not tested_skills:
            return 1.0
        entropies = [binary_entropy(s.p_mastery) for s in tested_skills]
        return sum(entropies) / len(entropies)

    def should_stop(self, session: DiagnosticSessionState) -> tuple[bool, str | None]:
        """Check CAT stopping rules: max questions, min questions + low uncertainty,
        or exhausted questions.
        """
        n = session.questions_answered

        if n >= self.config.max_questions:
            return (
                True,
                f"Maximum diagnostic length reached ({self.config.max_questions} questions).",
            )

        if n >= self.config.min_questions:
            uncertainty = self.calculate_mean_uncertainty(session)
            if uncertainty < self.config.uncertainty_threshold:
                return (
                    True,
                    f"Cognitive mastery uncertainty ({uncertainty:.4f}) dropped below threshold "
                    f"({self.config.uncertainty_threshold}) after {n} questions.",
                )

        # Check if there are unattempted questions available
        available = [
            q for q in self.questions if q.question_id not in session.attempted_question_ids
        ]
        if not available:
            return True, "All calibrated diagnostic questions exhausted."

        return False, None

    def pick_next_item(self, session: DiagnosticSessionState) -> DiagnosticDecision:
        """Select next diagnostic item by EIG or backward prerequisite traversal."""
        stop, reason = self.should_stop(session)
        if stop:
            session.is_completed = True
            session.stop_reason = reason
            return DiagnosticDecision(
                item=None,
                skill_id=None,
                skill_code=None,
                is_completed=True,
                stop_reason=reason,
                rationale=f"Diagnostic completed: {reason}",
                expected_information_gain=0.0,
            )

        # The optional final diagnostic segment revisits the least-certain/weakest
        # observed skills with fresh questions, falling back to normal selection if exhausted.
        followup_start = self.config.targeted_followup_after
        if followup_start is not None and session.questions_answered >= followup_start:
            candidates = [
                (state, question)
                for skill_id, state in session.skill_states.items()
                if state.observations_count > 0
                for question in self.questions_by_skill.get(skill_id, [])
                if question.question_id not in session.attempted_question_ids
            ]
            if candidates:
                state, question = min(
                    candidates,
                    key=lambda pair: (
                        pair[0].p_mastery,
                        abs(pair[1].difficulty / 5 - pair[0].p_mastery),
                        pair[1].question_id,
                    ),
                )
                return DiagnosticDecision(
                    item=question,
                    skill_id=question.skill_id,
                    skill_code=question.skill_code,
                    is_completed=False,
                    stop_reason=None,
                    rationale="Follow-up question for an assessed skill with lower mastery.",
                    expected_information_gain=expected_information_gain(
                        state.p_mastery, self.bkt_params
                    ),
                )

        # Check for backward prerequisite walking
        # If student recently failed, walk backward to find root-cause prerequisite
        walked_item = self._find_backward_walk_item(session)
        if walked_item is not None:
            item, eig, rationale = walked_item
            return DiagnosticDecision(
                item=item,
                skill_id=item.skill_id,
                skill_code=item.skill_code,
                is_completed=False,
                stop_reason=None,
                rationale=rationale,
                expected_information_gain=eig,
            )

        # Otherwise, choose candidate skill and question maximizing Expected Information Gain (EIG)
        # while actively balancing curriculum topics to avoid clustering in a single chapter.
        skill_counts: dict[str, int] = {}
        topic_counts: dict[str, int] = {}
        for qid in session.attempted_question_ids:
            q_obj = self.question_by_id.get(qid)
            if q_obj:
                skill_counts[q_obj.skill_id] = skill_counts.get(q_obj.skill_id, 0) + 1
                t_key = q_obj.topic_name or q_obj.topic_id or q_obj.skill_id
                topic_counts[t_key] = topic_counts.get(t_key, 0) + 1

        candidate_pool: list[dict[str, Any]] = []
        max_eig = -1.0

        for skill_id, skill_state in session.skill_states.items():
            avail_qs = [
                q
                for q in self.questions_by_skill.get(skill_id, [])
                if q.question_id not in session.attempted_question_ids
            ]
            if not avail_qs:
                continue

            eig = expected_information_gain(skill_state.p_mastery, self.bkt_params)
            first_q = avail_qs[0]
            t_key = first_q.topic_name or first_q.topic_id or skill_id

            if eig > max_eig:
                max_eig = eig

            candidate_pool.append(
                {
                    "skill_id": skill_id,
                    "skill_state": skill_state,
                    "candidate_qs": avail_qs,
                    "eig": eig,
                    "topic_exposure": topic_counts.get(t_key, 0),
                    "skill_exposure": skill_counts.get(skill_id, 0),
                    "topic_key": t_key,
                }
            )

        best_item: DiagnosticQuestionItem | None = None
        best_eig = 0.0
        best_rationale = ""

        if candidate_pool:
            # 1. Filter skills that have top Expected Information Gain (within 0.08 of max)
            high_eig_pool = [c for c in candidate_pool if c["eig"] >= max(0.0, max_eig - 0.08)]
            if not high_eig_pool:
                high_eig_pool = candidate_pool

            # 2. Topic diversity: prioritize topics that have lowest prior exposure in this session
            min_topic_exp = min(c["topic_exposure"] for c in high_eig_pool)
            diverse_topic_pool = [c for c in high_eig_pool if c["topic_exposure"] == min_topic_exp]

            # 3. Lowest skill exposure within those diverse topics
            min_skill_exp = min(c["skill_exposure"] for c in diverse_topic_pool)
            final_pool = [c for c in diverse_topic_pool if c["skill_exposure"] == min_skill_exp]

            # 4. Randomly sample from best candidates so each diagnostic test is uniquely fresh
            selected_candidate = random.choice(final_pool)
            chosen_skill_state = selected_candidate["skill_state"]
            chosen_qs = selected_candidate["candidate_qs"]
            best_eig = selected_candidate["eig"]

            # 5. Difficulty matching with randomized candidate pool
            target_diff = chosen_skill_state.p_mastery
            chosen_qs.sort(key=lambda q: abs((q.difficulty / 5.0) - target_diff))
            min_diff_gap = abs((chosen_qs[0].difficulty / 5.0) - target_diff)
            best_matched_qs = [
                q
                for q in chosen_qs
                if abs(abs((q.difficulty / 5.0) - target_diff) - min_diff_gap) <= 0.35
            ]
            best_item = random.choice(best_matched_qs)
            topic_label = best_item.topic_name or best_item.skill_code
            best_rationale = (
                f"CAT Diagnostic: Selected item '{best_item.code}' on topic "
                f"'{topic_label}' to maximize Expected Information Gain "
                f"({best_eig:.4f}) and ensure broad topic coverage."
            )

        if best_item is None:
            # Fallback to any unattempted question with random selection
            unattempted = [
                q for q in self.questions if q.question_id not in session.attempted_question_ids
            ]
            if not unattempted:
                session.is_completed = True
                session.stop_reason = "No more questions available."
                return DiagnosticDecision(
                    item=None,
                    skill_id=None,
                    skill_code=None,
                    is_completed=True,
                    stop_reason=session.stop_reason,
                    rationale="Diagnostic completed: No more questions available.",
                )
            best_item = random.choice(unattempted)
            best_rationale = f"Selected remaining diagnostic question '{best_item.code}'."
            best_eig = expected_information_gain(
                session.skill_states.get(
                    best_item.skill_id, SkillState(skill_id=best_item.skill_id)
                ).p_mastery,
                self.bkt_params,
            )

        return DiagnosticDecision(
            item=best_item,
            skill_id=best_item.skill_id,
            skill_code=best_item.skill_code,
            is_completed=False,
            stop_reason=None,
            rationale=best_rationale,
            expected_information_gain=best_eig,
        )

    def _find_backward_walk_item(
        self, session: DiagnosticSessionState
    ) -> tuple[DiagnosticQuestionItem, float, str] | None:
        """Walk backward from a recently failed skill along prerequisite edges."""
        if not session.question_history:
            return None

        # Check last response
        _last_qid, last_skill_id, last_correct = session.question_history[-1]
        if last_correct:
            return None

        # The student failed the last question on last_skill_id
        # Walk backward to find prerequisites of last_skill_id
        prereqs = (
            list(self.graph.predecessors(last_skill_id)) if last_skill_id in self.graph else []
        )
        if not prereqs:
            # No direct prerequisites, check root-cause search
            root_cause = find_deepest_unmastered_networkx(
                target_skill_id=last_skill_id,
                edges=self.edges,
                skill_states=session.skill_states,
                unmastered_threshold=self.thresholds.not_learned_max,
            )
            if root_cause and root_cause.skill_id != last_skill_id:
                prereqs = [root_cause.skill_id]

        for prereq_id in prereqs:
            # Check if prereq has unattempted questions
            p_state = session.skill_states.get(prereq_id)
            # If not yet mastered or unattempted
            if p_state is None or p_state.state != MasteryState.MASTERED:
                candidate_qs = [
                    q
                    for q in self.questions_by_skill.get(prereq_id, [])
                    if q.question_id not in session.attempted_question_ids
                ]
                if candidate_qs:
                    selected_q = random.choice(candidate_qs[: min(3, len(candidate_qs))])
                    p_val = p_state.p_mastery if p_state else self.bkt_params.p_init
                    eig = expected_information_gain(p_val, self.bkt_params)
                    rationale = (
                        f"Diagnostic backward walk: Student struggled on skill '{last_skill_id}'; "
                        f"testing foundational prerequisite '{selected_q.skill_code}' to isolate "
                        "root-cause knowledge gap."
                    )
                    # Record gap
                    if prereq_id not in session.root_cause_gaps:
                        session.root_cause_gaps.append(prereq_id)
                    return selected_q, eig, rationale

        return None

    def record_response(
        self,
        session: DiagnosticSessionState,
        question_id: str,
        is_correct: bool,
        time_spent_s: float,
        hint_level: HintLevel = HintLevel.NONE,
    ) -> SkillState:
        """Update session state with student response and BKT posterior."""
        question = self.question_by_id.get(question_id)
        if question is None:
            # Fallback search
            found = [q for q in self.questions if q.question_id == question_id]
            if not found:
                raise ValueError(f"Question '{question_id}' not found in diagnostic bank.")
            question = found[0]

        skill_id = question.skill_id
        session.attempted_question_ids.add(question_id)
        session.questions_answered += 1
        session.question_history.append((question_id, skill_id, is_correct))

        # Retrieve or initialize skill state
        if skill_id not in session.skill_states:
            session.skill_states[skill_id] = SkillState(
                skill_id=skill_id,
                p_mastery=self.bkt_params.p_init,
                state=MasteryState.NOT_LEARNED,
            )

        current_state = session.skill_states[skill_id]
        obs = Observation(
            skill_id=skill_id,
            is_correct=is_correct,
            time_spent_s=time_spent_s,
            hint_level=hint_level,
            question_id=question_id,
        )

        updated_state = self.mastery_machine.process_observation(current_state, obs)
        session.skill_states[skill_id] = updated_state

        # Check if stopping criteria now met
        stop, reason = self.should_stop(session)
        if stop:
            session.is_completed = True
            session.stop_reason = reason

        return updated_state

    def generate_summary(self, session: DiagnosticSessionState) -> DiagnosticSummary:
        """Build final diagnostic assessment summary with learning path suggestions."""
        mastered: list[str] = []
        partial: list[str] = []
        not_learned: list[str] = []

        for skill_id, state in session.skill_states.items():
            if state.state == MasteryState.MASTERED:
                mastered.append(skill_id)
            elif state.state == MasteryState.PARTIAL:
                partial.append(skill_id)
            else:
                not_learned.append(skill_id)

        # Determine recommended starting skills:
        # Prioritize root cause gaps, then not_learned skills whose prerequisites are mastered
        recommended_starting: list[str] = []
        for gap_id in session.root_cause_gaps:
            if gap_id not in mastered and gap_id not in recommended_starting:
                recommended_starting.append(gap_id)

        for skill_id in not_learned + partial:
            if skill_id in recommended_starting:
                continue
            prereqs = list(self.graph.predecessors(skill_id)) if skill_id in self.graph else []
            # If all prerequisites are mastered or there are no prerequisites
            if all(p in mastered for p in prereqs):
                recommended_starting.append(skill_id)

        mean_uncertainty = self.calculate_mean_uncertainty(session)

        return DiagnosticSummary(
            session_id=session.session_id,
            total_questions=session.questions_answered,
            stop_reason=session.stop_reason or "Completed",
            mastered_skills=mastered,
            partial_skills=partial,
            not_learned_skills=not_learned,
            root_cause_gaps=session.root_cause_gaps,
            recommended_starting_skills=recommended_starting,
            mean_uncertainty=round(mean_uncertainty, 4),
        )
