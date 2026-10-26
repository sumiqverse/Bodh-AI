"""Pytest runner for AI Tutor 50-case benchmark evaluation suite."""

from __future__ import annotations

import pytest

from scripts.eval_tutor import run_evaluation


@pytest.mark.asyncio
async def test_ai_tutor_50_case_eval_suite() -> None:
    """Execute full 50-case benchmark.

    Evaluates groundedness, answer-leak rate, and refusal correctness.
    """
    result = await run_evaluation()

    assert result["total_cases"] == 50
    assert result["groundedness_score"] >= 90.0, (
        f"Groundedness score {result['groundedness_score']}% is below 90%"
    )
    assert result["leak_rate"] == 0.0, (
        f"Answer-leak rate {result['leak_rate']}% must be exactly 0.0%"
    )
    assert result["refusal_score"] == 100.0, (
        f"Refusal score {result['refusal_score']}% must be 100%"
    )
    assert result["passed"] is True
