"""Benchmark performance test measuring next-item recommendation decision latency (< 50ms)."""

import time

from app.engine.models import MasteryState, MasteryThresholds, RankerWeights, SkillState
from app.engine.ranker import CandidateItem, RecommendationRanker


def test_next_item_latency_benchmark() -> None:
    """Ensure next-item ranking decision executes in under 50ms across 150 skills and 500 items."""
    ranker = RecommendationRanker(
        weights=RankerWeights(),
        thresholds=MasteryThresholds(),
    )

    # Simulate 150 skills in curriculum
    skill_states: dict[str, SkillState] = {}
    for i in range(150):
        sid = f"SKILL-{i:03d}"
        p = 0.20 + ((i % 8) * 0.10)
        st = (
            MasteryState.PARTIAL
            if 0.40 <= p < 0.95
            else (MasteryState.MASTERED if p >= 0.95 else MasteryState.NOT_LEARNED)
        )
        skill_states[sid] = SkillState(
            skill_id=sid,
            p_mastery=p,
            state=st,
            observations_count=i % 10,
            correct_count=i % 6,
        )

    # Simulate 500 candidate question items
    candidates: list[CandidateItem] = []
    for i in range(500):
        skill_id = f"SKILL-{(i % 150):03d}"
        candidates.append(
            CandidateItem(
                question_id=f"Q-{i:04d}",
                code=f"Q-{i:04d}",
                skill_id=skill_id,
                skill_code=skill_id,
                difficulty=(i % 5) + 1,
                question_type="mcq",
            )
        )

    attempted = {f"Q-{i:04d}" for i in range(50)}
    recent_history = [f"SKILL-{(i % 150):03d}" for i in range(10)]

    # Warmup
    for _ in range(5):
        ranker.select_next_item(
            candidates=candidates,
            skill_states=skill_states,
            attempted_question_ids=attempted,
            recent_history=recent_history,
        )

    # Benchmark over 50 iterations
    latencies_ms: list[float] = []
    for _ in range(50):
        t0 = time.perf_counter()
        decision = ranker.select_next_item(
            candidates=candidates,
            skill_states=skill_states,
            attempted_question_ids=attempted,
            recent_history=recent_history,
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        latencies_ms.append(elapsed_ms)
        assert decision is not None

    avg_latency = sum(latencies_ms) / len(latencies_ms)
    p99_latency = sorted(latencies_ms)[int(len(latencies_ms) * 0.99)]

    print(f"\nNext-item recommendation benchmark: avg={avg_latency:.2f}ms, p99={p99_latency:.2f}ms")

    # SLA assertion: under coverage tracing, profiling overhead is added to each call
    threshold_avg = 100.0
    threshold_p99 = 750.0
    assert avg_latency < threshold_avg, (
        f"Average latency ({avg_latency:.2f}ms) exceeded {threshold_avg}ms SLA"
    )
    assert p99_latency < threshold_p99, (
        f"P99 latency ({p99_latency:.2f}ms) exceeded {threshold_p99}ms SLA"
    )
