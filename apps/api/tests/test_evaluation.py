"""Unit tests for the model evaluation engine (ROC-AUC, ECE, Student Splits)."""

from app.engine.evaluation import (
    AttemptPrediction,
    compute_brier_score,
    compute_calibration_and_ece,
    compute_roc_auc,
    evaluate_student_split,
)


def test_compute_roc_auc_perfect() -> None:
    """Verify that perfectly separated predictions yield an AUC of 1.0."""
    actuals = [False, False, True, True]
    probs = [0.1, 0.2, 0.8, 0.9]
    assert compute_roc_auc(actuals, probs) == 1.0


def test_compute_roc_auc_inverted() -> None:
    """Verify that completely inverted predictions yield an AUC of 0.0."""
    actuals = [True, True, False, False]
    probs = [0.1, 0.2, 0.8, 0.9]
    assert compute_roc_auc(actuals, probs) == 0.0


def test_compute_roc_auc_single_class() -> None:
    """Verify that single-class dataset returns chance baseline 0.5."""
    assert compute_roc_auc([True, True], [0.8, 0.9]) == 0.5
    assert compute_roc_auc([], []) == 0.5


def test_compute_calibration_and_ece() -> None:
    """Verify Expected Calibration Error and bin breakdown."""
    actuals = [True, False, True, False]
    probs = [0.9, 0.1, 0.8, 0.2]
    ece, bins = compute_calibration_and_ece(actuals, probs, num_bins=5)

    assert isinstance(ece, float)
    assert 0.0 <= ece <= 1.0
    assert len(bins) == 5
    assert sum(b.sample_count for b in bins) == 4


def test_compute_brier_score() -> None:
    """Verify Brier Score mean squared error."""
    actuals = [True, False]
    probs = [1.0, 0.0]
    assert compute_brier_score(actuals, probs) == 0.0

    worst_probs = [0.0, 1.0]
    assert compute_brier_score(actuals, worst_probs) == 1.0


def test_evaluate_student_split() -> None:
    """Verify student holdout split evaluation."""
    attempts = [
        AttemptPrediction("student-1", "item-1", True, 0.85),
        AttemptPrediction("student-1", "item-2", True, 0.75),
        AttemptPrediction("student-2", "item-1", False, 0.25),
        AttemptPrediction("student-2", "item-2", False, 0.35),
        AttemptPrediction("student-3", "item-1", True, 0.90),
        AttemptPrediction("student-3", "item-2", False, 0.40),
        AttemptPrediction("student-4", "item-1", True, 0.70),
        AttemptPrediction("student-4", "item-2", True, 0.80),
    ]

    res = evaluate_student_split(attempts, test_ratio=0.5, num_bins=5)

    assert res.student_count == 4
    assert res.train_student_count > 0
    assert res.test_student_count > 0
    assert res.sample_count > 0
    assert 0.0 <= res.auc <= 1.0
    assert 0.0 <= res.ece <= 1.0
    assert len(res.bins) == 5


def test_evaluation_edge_cases() -> None:
    """Verify empty attempts and boundary student splits."""
    empty_res = evaluate_student_split([])
    assert empty_res.sample_count == 0
    assert empty_res.auc == 0.5
    assert empty_res.bins == []

    assert compute_brier_score([], []) == 0.0

    single = [AttemptPrediction("only-student", "item-1", True, 0.9)]
    single_res = evaluate_student_split(single, test_ratio=0.0)
    assert single_res.sample_count == 1
    assert single_res.test_student_count == 1

    multi = [
        AttemptPrediction("student-A", "item-1", True, 0.8),
        AttemptPrediction("student-B", "item-1", False, 0.2),
    ]
    multi_res = evaluate_student_split(multi, test_ratio=0.0)
    assert multi_res.test_student_count == 1
    assert multi_res.train_student_count == 1
