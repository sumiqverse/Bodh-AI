"""Multi-objective recommendation ranker prioritizing gaps, difficulty fit, and spaced practice."""

from __future__ import annotations

from dataclasses import dataclass

from app.engine.difficulty import DifficultyController
from app.engine.models import (
    HintLevel,
    MasteryState,
    MasteryThresholds,
    NextItemDecision,
    RankerWeights,
    SkillState,
)


@dataclass
class CandidateItem:
    """Question item candidate evaluated by the ranker."""

    question_id: str
    skill_id: str
    skill_code: str
    difficulty: int
    question_type: str = "mcq"
    code: str = ""
    curriculum_order: int = 0
    prompt_snippet: str = ""


class RecommendationRanker:
    """Ranks question candidates to optimize learning velocity and mastery retention."""

    def __init__(
        self,
        weights: RankerWeights | None = None,
        difficulty_controller: DifficultyController | None = None,
        thresholds: MasteryThresholds | None = None,
    ) -> None:
        self.weights = weights or RankerWeights()
        self.diff_ctrl = difficulty_controller or DifficultyController()
        self.thresholds = thresholds or MasteryThresholds()

    def rank_items(
        self,
        candidates: list[CandidateItem],
        skill_states: dict[str, SkillState],
        attempted_question_ids: set[str],
        root_cause_gaps: set[str] | None = None,
        recent_skill_history: list[str] | None = None,
        max_curriculum_order: int = 150,
    ) -> list[NextItemDecision]:
        """Rank unattempted items by the multi-objective scoring formula:

        Score = 0.4 * gap_priority + 0.3 * difficulty_fit
              + 0.2 * recency_penalty + 0.1 * curriculum_alignment
        """
        root_gaps = root_cause_gaps or set()
        recent_history = recent_skill_history or []

        decisions: list[NextItemDecision] = []

        for item in candidates:
            # 1. Filter out already attempted questions (avoid repetition)
            if item.question_id in attempted_question_ids:
                continue

            state = skill_states.get(item.skill_id)
            p_mastery = state.p_mastery if state else 0.30
            consecutive_mistakes = state.observations_count - state.correct_count if state else 0

            # 2. Factor: Gap Priority (0.4)
            if item.skill_id in root_gaps or item.skill_code in root_gaps:
                gap_priority = 1.0  # Highest priority: remediating diagnosed root gap
                gap_reason = "remediating diagnosed prerequisite root gap"
            elif state and state.state == MasteryState.NOT_LEARNED:
                gap_priority = 0.85
                gap_reason = "learning unmastered foundational competency"
            elif state and state.state == MasteryState.PARTIAL:
                gap_priority = 0.70
                gap_reason = "advancing partial competency towards mastery"
            else:
                gap_priority = 0.25  # Maintenance / test gate review
                gap_reason = "retention review"

            # 3. Factor: Difficulty Fit (0.3)
            pred_success = self.diff_ctrl.calculate_predicted_success(
                p_mastery=p_mastery,
                difficulty=item.difficulty,
            )
            difficulty_fit = self.diff_ctrl.calculate_difficulty_fit(pred_success)

            # 4. Factor: Recency Spaced Practice Penalty (0.2)
            # Penalize the same skill if practiced in immediate past steps to encourage interleaving
            recency_penalty = 1.0
            if recent_history:
                if recent_history[-1:] == [item.skill_id]:
                    recency_penalty = 0.10  # Practiced just now
                elif item.skill_id in recent_history[-3:]:
                    recency_penalty = 0.50  # Practiced 2-3 steps ago
                elif item.skill_id in recent_history[-5:]:
                    recency_penalty = 0.80

            # 5. Factor: Curriculum Alignment (0.1)
            # Rewards skills within logical curriculum sequence order
            curr_norm = max(1, max_curriculum_order)
            curriculum_alignment = max(
                0.0, min(1.0, 1.0 - (abs(item.curriculum_order - 1) / curr_norm))
            )

            # Compute Composite Weighted Score
            total_score = (
                (self.weights.gap_priority * gap_priority)
                + (self.weights.difficulty_fit * difficulty_fit)
                + (self.weights.recency_penalty * recency_penalty)
                + (self.weights.curriculum_alignment * curriculum_alignment)
            )

            # Determine Scaffolding & Special Gates
            hint_level = self.diff_ctrl.get_hint_ladder_level(consecutive_mistakes, p_mastery)
            is_test_gate = bool(
                state and state.p_mastery >= 0.95 and state.hint_free_correct_count < 3
            )
            is_skip_ahead = bool(state and self.diff_ctrl.can_skip_ahead(state))

            # Construct Pedagogical Rationale
            rationale_text = (
                f"Selected {item.skill_code} ({gap_reason}) with "
                f"{pred_success * 100:.0f}% predicted success in target flow zone "
                f"(fit={difficulty_fit:.2f}, score={total_score:.2f})."
            )
            if is_test_gate:
                rationale_text += " Serving hint-free assessment item for Test Gate verification."
            elif hint_level == HintLevel.HINT:
                rationale_text += " Providing progressive hint guidance after initial mistake."
            elif hint_level == HintLevel.WORKED_EXAMPLE:
                rationale_text += " Scaffolding with step-by-step worked example after 2 mistakes."

            decisions.append(
                NextItemDecision(
                    question_id=item.question_id,
                    skill_id=item.skill_id,
                    skill_code=item.skill_code,
                    question_type=item.question_type,
                    difficulty=item.difficulty,
                    predicted_success=round(pred_success, 4),
                    score=round(total_score, 4),
                    score_breakdown={
                        "gap_priority": round(gap_priority, 4),
                        "difficulty_fit": round(difficulty_fit, 4),
                        "recency_penalty": round(recency_penalty, 4),
                        "curriculum_alignment": round(curriculum_alignment, 4),
                    },
                    rationale=rationale_text,
                    hint_ladder=hint_level,
                    is_test_gate=is_test_gate,
                    is_skip_ahead=is_skip_ahead,
                )
            )

        # Sort decisions by total score descending
        decisions.sort(key=lambda d: d.score, reverse=True)
        return decisions

    def compute_item_score(
        self,
        item: CandidateItem,
        skill_state: SkillState | None,
        is_prereq_gap: bool = False,
        curriculum_skills: list[str] | None = None,
        days_since_attempt: float = 7.0,
        recent_history: list[str] | None = None,
        max_curriculum_order: int = 150,
    ) -> tuple[float, dict[str, float]]:
        """Compute the weighted multi-objective recommendation score and breakdown for an item."""
        p_mastery = skill_state.p_mastery if skill_state else 0.30

        # Gap priority
        if is_prereq_gap:
            gap_priority = 1.0
        elif skill_state and skill_state.state == MasteryState.NOT_LEARNED:
            gap_priority = 0.85
        elif skill_state and skill_state.state == MasteryState.PARTIAL:
            gap_priority = 0.70
        else:
            gap_priority = 0.25

        # Difficulty fit
        pred_success = self.diff_ctrl.calculate_predicted_success(p_mastery, item.difficulty)
        diff_fit = self.diff_ctrl.calculate_difficulty_fit(pred_success)

        # Recency penalty
        if recent_history:
            if recent_history[-1:] == [item.skill_id]:
                recency_penalty = 0.10
            elif item.skill_id in recent_history[-3:]:
                recency_penalty = 0.50
            elif item.skill_id in recent_history[-5:]:
                recency_penalty = 0.80
            else:
                recency_penalty = 1.0
        else:
            recency_penalty = min(1.0, max(0.1, 0.2 + (0.1 * days_since_attempt)))

        # Curriculum alignment
        if curriculum_skills and item.skill_id in curriculum_skills:
            order = curriculum_skills.index(item.skill_id)
            curriculum_alignment = max(
                0.0, min(1.0, 1.0 - (order / max(1, len(curriculum_skills))))
            )
        else:
            curr_norm = max(1, max_curriculum_order)
            curriculum_alignment = max(
                0.0, min(1.0, 1.0 - (abs(item.curriculum_order - 1) / curr_norm))
            )

        total_score = (
            (self.weights.gap_priority * gap_priority)
            + (self.weights.difficulty_fit * diff_fit)
            + (self.weights.recency_penalty * recency_penalty)
            + (self.weights.curriculum_alignment * curriculum_alignment)
        )

        breakdown = {
            "gap_priority": gap_priority,
            "difficulty_fit": diff_fit,
            "recency_penalty": recency_penalty,
            "curriculum_alignment": curriculum_alignment,
        }
        return total_score, breakdown

    def select_next_item(
        self,
        candidates: list[CandidateItem],
        skill_states: dict[str, SkillState],
        attempted_question_ids: set[str] | None = None,
        curriculum_skills: list[str] | None = None,
        edges: list[tuple[str, str]] | None = None,
        recent_history: list[str] | None = None,
    ) -> NextItemDecision | None:
        """Select top ranked next question candidate avoiding repetition."""
        _ = (curriculum_skills, edges)
        attempted = attempted_question_ids or set()
        ranked = self.rank_items(
            candidates=candidates,
            skill_states=skill_states,
            attempted_question_ids=attempted,
            recent_skill_history=recent_history,
        )
        return ranked[0] if ranked else None
