"""Generate mathematically verified golden test vectors for BKT, mastery states,
root cause, and ranker.

Outputs golden_vectors.json for cross-language validation in @bodhai/engine-ts.
"""

import json
from pathlib import Path
from typing import Any

from app.engine.bkt import (
    binary_entropy,
    expected_information_gain,
    predict_success,
    update_bkt,
)
from app.engine.difficulty import DifficultyController
from app.engine.mastery import MasteryStateMachine
from app.engine.models import (
    BKTParams,
    DifficultyRules,
    HintLevel,
    MasteryState,
    MasteryThresholds,
    Observation,
    RankerWeights,
    SkillState,
)
from app.engine.ranker import CandidateItem, RecommendationRanker
from app.engine.root_cause import find_deepest_unmastered_networkx


def build_golden_vectors() -> dict[str, Any]:
    bkt_params = BKTParams(p_init=0.30, p_transit=0.10, p_guess=0.20, p_slip=0.10)
    thresholds = MasteryThresholds(not_learned_max=0.40, mastered_min=0.95, min_observations=3)
    mastery_machine = MasteryStateMachine(thresholds, bkt_params=bkt_params)

    # 1. BKT Standard Sequence (Correct responses)
    correct_steps = []
    p = bkt_params.p_init
    for i in range(5):
        pred = predict_success(p, bkt_params)
        eig = expected_information_gain(p, bkt_params)
        ent = binary_entropy(p)
        obs = Observation(skill_id="SKILL", is_correct=True, time_spent_s=10.0)
        post, next_p = update_bkt(p, observation=obs, params=bkt_params)
        correct_steps.append(
            {
                "step": i + 1,
                "p_prior": round(p, 6),
                "is_correct": True,
                "predicted_success": round(pred, 6),
                "entropy": round(ent, 6),
                "expected_information_gain": round(eig, 6),
                "posterior": round(post, 6),
                "p_next": round(next_p, 6),
            }
        )
        p = next_p

    # 2. BKT Incorrect Sequence with Rapid Guessing
    mixed_sequence = [
        {"is_correct": False, "time_s": 15.0, "expected_rapid": False},
        {"is_correct": False, "time_s": 2.1, "expected_rapid": True},
        {"is_correct": True, "time_s": 10.0, "expected_rapid": False},
        {"is_correct": False, "time_s": 1.5, "expected_rapid": True},
    ]
    mixed_steps = []
    p = 0.50
    for i, item in enumerate(mixed_sequence):
        is_c = bool(item["is_correct"])
        t_s = float(item["time_s"])
        obs = Observation(skill_id="SKILL", is_correct=is_c, time_spent_s=t_s)
        post, next_p = update_bkt(
            p,
            observation=obs,
            params=bkt_params,
            thresholds=thresholds,
        )
        mixed_steps.append(
            {
                "step": i + 1,
                "p_prior": round(p, 6),
                "is_correct": is_c,
                "time_spent_s": t_s,
                "is_rapid_guess": obs.is_rapid_guess,
                "posterior": round(post, 6),
                "p_next": round(next_p, 6),
            }
        )
        p = next_p

    # 3. Mastery State Machine (Test gate & 3-observation rule)
    state_progression = []
    st = SkillState(skill_id="SKILL-TEST", p_mastery=0.30, state=MasteryState.NOT_LEARNED)
    # Observations: 2 correct, 1 wrong, 4 correct with hint-free
    observations = [
        Observation("SKILL-TEST", is_correct=True, time_spent_s=10.0, hint_level=HintLevel.NONE),
        Observation("SKILL-TEST", is_correct=True, time_spent_s=12.0, hint_level=HintLevel.NONE),
        Observation("SKILL-TEST", is_correct=False, time_spent_s=8.0, hint_level=HintLevel.NONE),
        Observation("SKILL-TEST", is_correct=True, time_spent_s=15.0, hint_level=HintLevel.NONE),
        Observation("SKILL-TEST", is_correct=True, time_spent_s=14.0, hint_level=HintLevel.NONE),
        Observation("SKILL-TEST", is_correct=True, time_spent_s=18.0, hint_level=HintLevel.NONE),
        Observation("SKILL-TEST", is_correct=True, time_spent_s=16.0, hint_level=HintLevel.NONE),
    ]
    for i, obs in enumerate(observations):
        st = mastery_machine.process_observation(st, obs)
        state_progression.append(
            {
                "step": i + 1,
                "is_correct": obs.is_correct,
                "hint_level": obs.hint_level.value,
                "p_mastery": round(st.p_mastery, 6),
                "state": st.state.value,
                "observations_count": st.observations_count,
                "hint_free_correct_count": st.hint_free_correct_count,
                "consecutive_correct": st.consecutive_correct,
            }
        )

    # 4. Root Cause Search Cases
    edges = [
        ("SKILL-01", "SKILL-02"),
        ("SKILL-02", "SKILL-03"),
        ("SKILL-03", "SKILL-04"),
        ("SKILL-05", "SKILL-03"),
    ]
    skill_states_map = {
        "SKILL-01": 0.20,
        "SKILL-02": 0.35,
        "SKILL-03": 0.75,
        "SKILL-04": 0.30,
        "SKILL-05": 0.90,
    }
    rc_result = find_deepest_unmastered_networkx("SKILL-04", edges, skill_states_map)
    root_cause_case = {
        "target_skill": "SKILL-04",
        "edges": edges,
        "skill_mastery": skill_states_map,
        "expected_root_cause": {
            "skill_id": rc_result.skill_id if rc_result else None,
            "depth": rc_result.depth if rc_result else None,
            "p_mastery": round(rc_result.p_mastery, 4) if rc_result else None,
            "path": rc_result.path_from_target if rc_result else None,
        },
    }

    # 5. Difficulty and Hint Ladder
    diff_ctrl = DifficultyController(DifficultyRules())
    ladder_cases = [
        {"consecutive_fails": cf, "expected_level": diff_ctrl.get_hint_ladder_level(cf, 0.3).value}
        for cf in range(5)
    ]

    ranker = RecommendationRanker(
        RankerWeights(
            gap_priority=0.4,
            difficulty_fit=0.3,
            recency_penalty=0.2,
            curriculum_alignment=0.1,
        )
    )
    c_item = CandidateItem(
        question_id="Q-001",
        code="Q-001",
        skill_id="SKILL-02",
        skill_code="SKILL-02",
        difficulty=3,
    )
    score, breakdown = ranker.compute_item_score(
        item=c_item,
        skill_state=SkillState(skill_id="SKILL-02", p_mastery=0.35),
        is_prereq_gap=True,
        curriculum_skills=["SKILL-01", "SKILL-02", "SKILL-03"],
        days_since_attempt=2.0,
    )
    ranker_case = {
        "weights": {"gap": 0.4, "difficulty": 0.3, "recency": 0.2, "curriculum": 0.1},
        "item": {"difficulty": 3, "skill_id": "SKILL-02"},
        "p_mastery": 0.35,
        "is_prereq_gap": True,
        "days_since_attempt": 2.0,
        "expected_score": round(score, 6),
        "expected_breakdown": {k: round(v, 6) for k, v in breakdown.items()},
    }

    return {
        "version": "1.0.0",
        "parameters": {
            "bkt": {
                "l0": bkt_params.p_init,
                "t": bkt_params.p_transit,
                "g": bkt_params.p_guess,
                "s": bkt_params.p_slip,
            },
            "thresholds": {"not_learned": 0.40, "mastered": 0.95, "min_observations": 3},
            "weights": {"gap": 0.4, "difficulty": 0.3, "recency": 0.2, "curriculum": 0.1},
        },
        "bkt_correct_sequence": correct_steps,
        "bkt_mixed_rapid_sequence": mixed_steps,
        "mastery_state_progression": state_progression,
        "root_cause_case": root_cause_case,
        "hint_ladder_cases": ladder_cases,
        "ranker_case": ranker_case,
    }


def main() -> None:
    vectors = build_golden_vectors()
    out_path = Path(__file__).parent / "golden_vectors.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(vectors, f, indent=2)
    print(f"Generated golden vectors at {out_path}")


if __name__ == "__main__":
    main()
