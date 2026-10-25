"""Simulation assertion tests verifying multi-persona performance profiles."""

from app.engine.simulate import generate_markdown_report, run_simulation


def test_simulation_persona_profiles() -> None:
    """Verify distinct performance profiles across synthetic student personas."""
    # Run 15 items per persona with fixed deterministic seed
    results = run_simulation(num_questions=15, seed=100)
    assert len(results) == 4

    results_by_slug = {r.persona_slug: r for r in results}

    fast_learner = results_by_slug["fast_learner"]
    prereq_gap = results_by_slug["prerequisite_gap"]
    guesser = results_by_slug["guesser"]

    # 1. Fast Learner should achieve higher accuracy than struggling personas
    assert fast_learner.accuracy_rate >= prereq_gap.accuracy_rate
    assert fast_learner.skip_aheads_triggered >= 0

    # 2. Guesser persona MUST trigger rapid-guess detection on multiple questions
    assert guesser.rapid_guesses_detected >= 3

    # 3. Prerequisite gap persona MUST identify root cause gap
    assert len(prereq_gap.root_cause_gaps_found) > 0

    # 4. Report generator output test
    md = generate_markdown_report(results)
    assert "# BodhAI Adaptive Engine Simulation Report" in md
    assert "Fast Learner" in md
    assert "Guesser / Anxious Student" in md
