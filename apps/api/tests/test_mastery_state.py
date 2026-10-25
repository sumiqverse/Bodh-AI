"""Unit tests for mastery states, 3-observation threshold rule, test gates, and skip-ahead."""

from app.engine.mastery import MasteryStateMachine
from app.engine.models import (
    DifficultyRules,
    HintLevel,
    MasteryState,
    MasteryThresholds,
    Observation,
    SkillState,
)


def test_three_observation_hysteresis_rule() -> None:
    """State MUST remain in initial state until at least 3 observations are recorded."""
    thresholds = MasteryThresholds(not_learned_max=0.40, mastered_min=0.95, min_observations=3)
    machine = MasteryStateMachine(thresholds=thresholds)

    state = SkillState(
        skill_id="MATH-01",
        p_mastery=0.30,
        state=MasteryState.NOT_LEARNED,
        observations_count=0,
    )

    # Observation 1: correct answer pushes p > 0.40 (into partial range)
    obs1 = Observation(skill_id="MATH-01", is_correct=True, time_spent_s=10.0)
    state = machine.process_observation(state, obs1)
    assert state.observations_count == 1
    assert state.p_mastery > 0.40
    # State MUST NOT change yet because observations < 3
    assert state.state == MasteryState.NOT_LEARNED
    assert "minimum diagnostic observations" in state.rationale

    # Observation 2: correct answer pushes p even higher
    obs2 = Observation(skill_id="MATH-01", is_correct=True, time_spent_s=12.0)
    state = machine.process_observation(state, obs2)
    assert state.observations_count == 2
    # State still NOT_LEARNED
    assert state.state == MasteryState.NOT_LEARNED

    # Observation 3: 3rd observation recorded! State transition now permitted
    obs3 = Observation(skill_id="MATH-01", is_correct=True, time_spent_s=15.0)
    state = machine.process_observation(state, obs3)
    assert state.observations_count == 3
    # Transition occurs
    assert state.state in (MasteryState.PARTIAL, MasteryState.MASTERED)
    assert "Mastery achieved" in state.rationale


def test_test_gate_requires_three_hint_free_correct() -> None:
    """Mastered state requires 3 hint-free correct answers even if P >= 0.95."""
    thresholds = MasteryThresholds(not_learned_max=0.40, mastered_min=0.95, min_observations=3)
    rules = DifficultyRules(test_gate_count=3)
    machine = MasteryStateMachine(thresholds=thresholds, difficulty_rules=rules)

    # State with high probability but answers were aided with hints
    state = SkillState(
        skill_id="MATH-02",
        p_mastery=0.96,
        state=MasteryState.PARTIAL,
        observations_count=4,
        hint_free_correct_count=1,  # Only 1 hint-free correct so far
    )

    # Correct answer with hint
    obs_hint = Observation(
        skill_id="MATH-02",
        is_correct=True,
        time_spent_s=15.0,
        hint_level=HintLevel.HINT,
    )
    state = machine.process_observation(state, obs_hint)
    assert state.p_mastery >= 0.95
    # Gate prevents transition to MASTERED
    assert state.state == MasteryState.PARTIAL
    assert "Test Gate verification" in state.rationale

    # Now deliver 2 consecutive hint-free correct answers
    obs_clean1 = Observation(
        skill_id="MATH-02",
        is_correct=True,
        time_spent_s=15.0,
        hint_level=HintLevel.NONE,
    )
    state = machine.process_observation(state, obs_clean1)
    assert state.hint_free_correct_count == 2
    assert state.state == MasteryState.PARTIAL

    obs_clean2 = Observation(
        skill_id="MATH-02",
        is_correct=True,
        time_spent_s=18.0,
        hint_level=HintLevel.NONE,
    )
    state = machine.process_observation(state, obs_clean2)
    assert state.hint_free_correct_count == 3
    # Test gate cleared! Transition to MASTERED permitted
    assert state.state == MasteryState.MASTERED
    assert "Mastery achieved" in state.rationale


def test_skip_ahead_trigger() -> None:
    """Verify skip-ahead flag when P >= 0.95 and consecutive correct >= 2."""
    thresholds = MasteryThresholds(not_learned_max=0.40, mastered_min=0.95, min_observations=3)
    rules = DifficultyRules(skip_ahead_threshold=0.95, skip_ahead_consecutive=2)
    machine = MasteryStateMachine(thresholds=thresholds, difficulty_rules=rules)

    state = SkillState(
        skill_id="MATH-03",
        p_mastery=0.92,
        state=MasteryState.PARTIAL,
        observations_count=3,
        consecutive_correct=1,
    )

    # Next correct pushes P >= 0.95 with consecutive_correct = 2
    obs = Observation(skill_id="MATH-03", is_correct=True, time_spent_s=20.0)
    state = machine.process_observation(state, obs)

    assert state.p_mastery >= 0.95
    assert state.consecutive_correct == 2
    assert "Skip-ahead triggered" in state.rationale


def test_rapid_guess_observation_flag() -> None:
    """Wrong answers under 3.0s flag is_rapid_guess and count toward rapid guesses."""
    obs_fast_wrong = Observation(skill_id="MATH-04", is_correct=False, time_spent_s=2.4)
    assert obs_fast_wrong.is_rapid_guess is True

    obs_fast_correct = Observation(skill_id="MATH-04", is_correct=True, time_spent_s=2.4)
    assert obs_fast_correct.is_rapid_guess is False

    obs_slow_wrong = Observation(skill_id="MATH-04", is_correct=False, time_spent_s=5.0)
    assert obs_slow_wrong.is_rapid_guess is False
