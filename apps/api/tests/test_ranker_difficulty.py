"""Unit tests for multi-objective recommendation ranker and difficulty controller."""

from app.engine.difficulty import DifficultyController
from app.engine.models import (
    HintLevel,
    MasteryState,
    RankerWeights,
    SkillState,
)
from app.engine.ranker import CandidateItem, RecommendationRanker


def test_difficulty_controller_predicted_success_and_fit() -> None:
    """Item in flow zone (70-80% success) yields high difficulty_fit score."""
    ctrl = DifficultyController()
    p_mastery = 0.75
    # Difficulty 3 baseline
    pred = ctrl.calculate_predicted_success(p_mastery, difficulty=3)
    assert 0.65 <= pred <= 0.85
    fit = ctrl.calculate_difficulty_fit(pred)
    assert fit > 0.80  # Strong fit in optimal learning zone


def test_hint_ladder_progression() -> None:
    """Hint ladder progresses: None -> Hint -> Worked Example -> Prerequisite Review."""
    ctrl = DifficultyController()
    p_mastery = 0.50

    # 0 mistakes -> None
    assert ctrl.get_hint_ladder_level(0, p_mastery) == HintLevel.NONE
    # 1 mistake -> Hint
    assert ctrl.get_hint_ladder_level(1, p_mastery) == HintLevel.HINT
    # 2 mistakes -> Worked Example
    assert ctrl.get_hint_ladder_level(2, p_mastery) == HintLevel.WORKED_EXAMPLE
    # 3+ mistakes -> Prerequisite Review
    assert ctrl.get_hint_ladder_level(3, p_mastery) == HintLevel.PREREQUISITE_REVIEW
    assert ctrl.get_hint_ladder_level(4, p_mastery) == HintLevel.PREREQUISITE_REVIEW


def test_ranker_multi_objective_weights_and_repetition_avoidance() -> None:
    """Verify ranker scores items by formula and strictly excludes attempted questions."""
    weights = RankerWeights(
        gap_priority=0.4,
        difficulty_fit=0.3,
        recency_penalty=0.2,
        curriculum_alignment=0.1,
    )
    ranker = RecommendationRanker(weights=weights)

    candidates = [
        CandidateItem(
            question_id="Q1",
            code="Q1",
            skill_id="SKILL-A",
            skill_code="SKILL-A",
            difficulty=3,
        ),
        CandidateItem(
            question_id="Q2",
            code="Q2",
            skill_id="SKILL-B",
            skill_code="SKILL-B",
            difficulty=3,
        ),
    ]

    states = {
        "SKILL-A": SkillState(skill_id="SKILL-A", p_mastery=0.20, state=MasteryState.NOT_LEARNED),
        "SKILL-B": SkillState(skill_id="SKILL-B", p_mastery=0.98, state=MasteryState.MASTERED),
    }

    # Rank with no prior attempts
    decisions = ranker.rank_items(
        candidates=candidates,
        skill_states=states,
        attempted_question_ids=set(),
    )
    assert len(decisions) == 2
    # SKILL-A is unmastered gap -> must score higher than mastered SKILL-B
    assert decisions[0].question_id == "Q1"
    assert decisions[0].score > decisions[1].score

    # Now mark Q1 as attempted -> Q1 MUST be excluded
    decisions_filtered = ranker.rank_items(
        candidates=candidates,
        skill_states=states,
        attempted_question_ids={"Q1"},
    )
    assert len(decisions_filtered) == 1
    assert decisions_filtered[0].question_id == "Q2"
