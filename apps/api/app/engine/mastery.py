"""Mastery state machine, hysteresis rules, test gate verification, and transition rationales."""

from __future__ import annotations

from app.engine.bkt import update_bkt
from app.engine.models import (
    BKTParams,
    DifficultyRules,
    HintLevel,
    MasteryState,
    MasteryThresholds,
    Observation,
    SkillState,
)


class MasteryStateMachine:
    """Manages Bayesian competency updates and pedagogically sound state transitions."""

    def __init__(
        self,
        thresholds: MasteryThresholds | None = None,
        difficulty_rules: DifficultyRules | None = None,
        bkt_params: BKTParams | None = None,
    ) -> None:
        self.thresholds = thresholds or MasteryThresholds()
        self.rules = difficulty_rules or DifficultyRules()
        self.bkt_params = bkt_params or BKTParams()

    def process_observation(
        self,
        current_state: SkillState,
        observation: Observation,
        params: BKTParams | None = None,
    ) -> SkillState:
        """Update skill mastery given a student response observation.

        Applies:
        - BKT posterior update and transition learning rate.
        - Rapid-guess down-weighting.
        - 3-observation minimum requirement before any state transition.
        - Test-gate requirement: 3 hint-free correct answers required for mastered state.
        - Skip-ahead evaluation: P(L) > 0.95 with >= 2 consecutive correct answers.
        """
        bkt_params = params or self.bkt_params

        # 1. Update BKT Probability
        _posterior, next_p = update_bkt(
            p_mastery=current_state.p_mastery,
            observation=observation,
            params=bkt_params,
            thresholds=self.thresholds,
        )

        # 2. Update observation counts and metrics
        new_obs_count = current_state.observations_count + 1
        new_correct_count = current_state.correct_count + (1 if observation.is_correct else 0)
        new_consecutive_correct = (
            current_state.consecutive_correct + 1 if observation.is_correct else 0
        )
        is_hint_free = observation.is_correct and observation.hint_level == HintLevel.NONE
        new_hint_free_correct = (
            current_state.hint_free_correct_count + 1
            if is_hint_free
            else current_state.hint_free_correct_count
        )
        new_rapid_guesses = current_state.rapid_guesses_count + (
            1 if observation.is_rapid_guess else 0
        )

        # 3. Determine Candidate State based on probability
        candidate_state = self.thresholds.classify_probability(next_p)

        # 4. Apply State Transition Rules & Invariants
        rationale_parts: list[str] = []

        if observation.is_correct:
            rationale_parts.append(
                f"Correct response updated belief from {current_state.p_mastery:.2f} "
                f"to {next_p:.2f}."
            )
        elif observation.is_rapid_guess:
            rationale_parts.append(
                f"Incorrect answer in {observation.time_spent_s:.1f}s (<3.0s) flagged "
                f"as rapid guessing; penalty down-weighted (P={next_p:.2f})."
            )
        else:
            rationale_parts.append(
                f"Incorrect response updated belief from {current_state.p_mastery:.2f} "
                f"to {next_p:.2f}."
            )

        # Rule A: Minimum 3 observations required for any state transition
        if new_obs_count < self.thresholds.min_observations:
            effective_state = current_state.state
            rationale_parts.append(
                f"State remains '{effective_state.value}' "
                f"({new_obs_count}/3 minimum diagnostic observations)."
            )
        else:
            # Rule B: Test Gate for Mastered State
            # Requires at least test_gate_count (3) hint-free correct answers
            if candidate_state == MasteryState.MASTERED:
                if new_hint_free_correct >= self.rules.test_gate_count:
                    effective_state = MasteryState.MASTERED
                    rationale_parts.append(
                        f"Mastery achieved: P >= {self.thresholds.mastered_min} with "
                        f"{new_hint_free_correct}/{self.rules.test_gate_count} "
                        "verified hint-free correct items."
                    )
                else:
                    effective_state = MasteryState.PARTIAL
                    rationale_parts.append(
                        f"High probability (P={next_p:.2f}) placed in 'partial' pending "
                        f"Test Gate verification "
                        f"({new_hint_free_correct}/{self.rules.test_gate_count} hint-free items)."
                    )
            else:
                effective_state = candidate_state
                rationale_parts.append(f"Transitioned state to '{effective_state.value}'.")

        # Rule C: Skip-Ahead Condition
        if (
            next_p >= self.rules.skip_ahead_threshold
            and new_consecutive_correct >= self.rules.skip_ahead_consecutive
        ):
            rationale_parts.append(
                f"Skip-ahead triggered: P={next_p:.2f} with {new_consecutive_correct} "
                "consecutive correct answers."
            )

        full_rationale = " ".join(rationale_parts)

        new_skill_state = SkillState(
            skill_id=current_state.skill_id,
            p_mastery=round(next_p, 4),
            state=effective_state,
            observations_count=new_obs_count,
            correct_count=new_correct_count,
            consecutive_correct=new_consecutive_correct,
            hint_free_correct_count=new_hint_free_correct,
            last_attempt_at=observation.timestamp,
            rapid_guesses_count=new_rapid_guesses,
            rationale=full_rationale,
        )

        return new_skill_state
