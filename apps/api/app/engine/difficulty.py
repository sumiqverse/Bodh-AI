"""Pedagogical difficulty rules, flow-state targeting, and hint ladder progression."""

from __future__ import annotations

from app.engine.bkt import clamp_probability
from app.engine.models import BKTParams, DifficultyRules, HintLevel, SkillState


class DifficultyController:
    """Controls item difficulty calibration and cognitive support scaffolding."""

    def __init__(self, rules: DifficultyRules | None = None) -> None:
        self.rules = rules or DifficultyRules()

    def calculate_predicted_success(
        self,
        p_mastery: float,
        difficulty: int = 3,
        bkt_params: BKTParams | None = None,
    ) -> float:
        """Calculate predicted probability of answering an item correctly.

        Calibrates base BKT prediction by item difficulty (1-5):
        - Level 1-2: easier item (reduced slip, higher guess)
        - Level 3: baseline
        - Level 4-5: harder item (elevated slip, lower guess)
        """
        base = bkt_params or BKTParams()
        diff_offset = (difficulty - 3) * 0.04
        effective_slip = max(0.02, min(0.40, base.p_slip + diff_offset))
        effective_guess = max(0.05, min(0.35, base.p_guess - diff_offset))

        p = clamp_probability(p_mastery)
        predicted = (p * (1.0 - effective_slip)) + ((1.0 - p) * effective_guess)
        return clamp_probability(predicted)

    def calculate_difficulty_fit(
        self,
        predicted_success: float,
    ) -> float:
        """Score how well an item matches the 70%-80% optimal learning zone.

        Target: 0.75 center of flow state.
        Returns a score in [0.0, 1.0].
        """
        center = 0.75
        dist = abs(predicted_success - center)
        # Optimal inside [0.70, 0.80]
        if self.rules.target_success_min <= predicted_success <= self.rules.target_success_max:
            return 1.0 - (dist * 2.0)
        # Outside optimal window, decays gracefully
        return max(0.0, 1.0 - (dist * 3.5))

    def get_hint_ladder_level(
        self,
        consecutive_mistakes: int,
        p_mastery: float,
    ) -> HintLevel:
        """Determine progressive cognitive scaffolding level based on student struggles.

        - 0 mistakes: NONE
        - 1 mistake: HINT (progressive hint)
        - 2 mistakes: WORKED_EXAMPLE (worked demonstration)
        - >= 3 mistakes or severe gap: PREREQUISITE_REVIEW (walk back to foundational skill)
        """
        if consecutive_mistakes >= 3 or (consecutive_mistakes >= 2 and p_mastery < 0.25):
            return HintLevel.PREREQUISITE_REVIEW
        if consecutive_mistakes == 2:
            return HintLevel.WORKED_EXAMPLE
        if consecutive_mistakes == 1:
            return HintLevel.HINT
        return HintLevel.NONE

    def can_skip_ahead(
        self,
        skill_state: SkillState,
    ) -> bool:
        """True if the student demonstrates rapid mastery warranting skip-ahead."""
        return (
            skill_state.p_mastery >= self.rules.skip_ahead_threshold
            and skill_state.consecutive_correct >= self.rules.skip_ahead_consecutive
        )

    def is_test_gate_satisfied(
        self,
        skill_state: SkillState,
    ) -> bool:
        """True if student has successfully answered 3 fresh hint-free test questions."""
        return skill_state.hint_free_correct_count >= self.rules.test_gate_count
