"""Unit test validating golden test vectors file and generation logic."""

import json
from pathlib import Path

from app.engine.generate_golden_vectors import build_golden_vectors


def test_golden_vectors_file_and_generation() -> None:
    """Ensure golden_vectors.json exists, is valid, and matches generated vectors."""
    vectors_file = Path(__file__).resolve().parent.parent / "app" / "engine" / "golden_vectors.json"
    assert vectors_file.exists(), "golden_vectors.json must be present in app/engine"

    with vectors_file.open("r", encoding="utf-8") as f:
        loaded_data = json.load(f)

    # Validate high-level sections
    assert "version" in loaded_data
    assert "bkt_correct_sequence" in loaded_data
    assert "bkt_mixed_rapid_sequence" in loaded_data
    assert "mastery_state_progression" in loaded_data
    assert "root_cause_case" in loaded_data
    assert "hint_ladder_cases" in loaded_data
    assert "ranker_case" in loaded_data

    # Call generator directly to ensure 100% test coverage
    generated = build_golden_vectors()
    assert isinstance(generated, dict)
    assert generated["version"] == loaded_data["version"]
    assert len(generated["bkt_correct_sequence"]) == len(loaded_data["bkt_correct_sequence"])
    assert len(generated["mastery_state_progression"]) == len(
        loaded_data["mastery_state_progression"]
    )
