"""Evaluation engine for next-response prediction models.

Computes Receiver Operating Characteristic Area Under the Curve (ROC-AUC),
Expected Calibration Error (ECE), and Brier Score using student-level holdout splits.
"""

import hashlib
from collections.abc import Sequence
from dataclasses import dataclass


@dataclass(frozen=True)
class AttemptPrediction:
    """Single item attempt with actual outcome and model prediction."""

    student_id: str
    item_id: str
    actual_correct: bool
    predicted_probability: float


@dataclass(frozen=True)
class CalibrationBin:
    """Metrics for a single confidence interval bin."""

    bin_index: int
    lower_bound: float
    upper_bound: float
    sample_count: int
    avg_confidence: float
    avg_accuracy: float
    bin_error: float


@dataclass(frozen=True)
class EvaluationResult:
    """Comprehensive evaluation metrics across student test split."""

    auc: float
    ece: float
    brier_score: float
    sample_count: int
    student_count: int
    train_student_count: int
    test_student_count: int
    bins: list[CalibrationBin]


def compute_roc_auc(actuals: Sequence[bool], probabilities: Sequence[float]) -> float:
    """Compute Area Under the ROC Curve via Wilcoxon-Mann-Whitney U statistic in O(N log N).

    Returns 0.5 (chance baseline) if only one class is present in the dataset.
    """
    n = len(actuals)
    if n == 0 or len(probabilities) != n:
        return 0.5

    positives = sum(1 for y in actuals if y)
    negatives = n - positives
    if positives == 0 or negatives == 0:
        return 0.5

    # Pair probabilities with targets and 1-based original index
    paired = sorted(
        [(probabilities[i], 1 if actuals[i] else 0) for i in range(n)],
        key=lambda x: x[0],
    )

    # Compute ranks handling ties with average rank
    ranks: list[float] = [0.0] * n
    i = 0
    while i < n:
        j = i
        while j < n and paired[j][0] == paired[i][0]:
            j += 1
        avg_rank = (i + 1 + j) / 2.0
        for k in range(i, j):
            ranks[k] = avg_rank
        i = j

    # Sum ranks for positive class
    pos_rank_sum = sum(ranks[k] for k in range(n) if paired[k][1] == 1)
    u_stat = pos_rank_sum - (positives * (positives + 1)) / 2.0
    auc = u_stat / (positives * negatives)
    return round(float(auc), 4)


def compute_calibration_and_ece(
    actuals: Sequence[bool],
    probabilities: Sequence[float],
    num_bins: int = 10,
) -> tuple[float, list[CalibrationBin]]:
    """Compute Expected Calibration Error (ECE) and bin breakdown across discrete intervals."""
    n = len(actuals)
    if n == 0:
        return 0.0, []

    bin_width = 1.0 / num_bins
    bins: list[CalibrationBin] = []
    ece = 0.0

    for m in range(num_bins):
        lower = m * bin_width
        upper = (m + 1) * bin_width

        # Collect items falling in this bin [lower, upper) (inclusive for last bin)
        bin_indices = [
            i
            for i, p in enumerate(probabilities)
            if (lower <= p < upper) or (m == num_bins - 1 and lower <= p <= upper)
        ]
        count = len(bin_indices)

        if count > 0:
            avg_conf = sum(probabilities[i] for i in bin_indices) / count
            avg_acc = sum(1.0 for i in bin_indices if actuals[i]) / count
            bin_err = abs(avg_acc - avg_conf)
            ece += (count / n) * bin_err
        else:
            avg_conf = (lower + upper) / 2.0
            avg_acc = 0.0
            bin_err = 0.0

        bins.append(
            CalibrationBin(
                bin_index=m,
                lower_bound=round(lower, 2),
                upper_bound=round(upper, 2),
                sample_count=count,
                avg_confidence=round(avg_conf, 4),
                avg_accuracy=round(avg_acc, 4),
                bin_error=round(bin_err, 4),
            )
        )

    return round(ece, 4), bins


def compute_brier_score(actuals: Sequence[bool], probabilities: Sequence[float]) -> float:
    """Compute Brier Score (Mean Squared Error of probability forecasts)."""
    n = len(actuals)
    if n == 0:
        return 0.0
    squared_errors = [(probabilities[i] - (1.0 if actuals[i] else 0.0)) ** 2 for i in range(n)]
    return round(sum(squared_errors) / n, 4)


def evaluate_student_split(
    attempts: Sequence[AttemptPrediction],
    test_ratio: float = 0.3,
    num_bins: int = 10,
) -> EvaluationResult:
    """Split attempts by student UUID to prevent data leakage and evaluate performance.

    Uses deterministic hash of student ID to assign students to train or test set.
    """
    if not attempts:
        return EvaluationResult(
            auc=0.5,
            ece=0.0,
            brier_score=0.0,
            sample_count=0,
            student_count=0,
            train_student_count=0,
            test_student_count=0,
            bins=[],
        )

    all_students = sorted({a.student_id for a in attempts})
    total_students = len(all_students)

    train_students: set[str] = set()
    test_students: set[str] = set()

    for s_id in all_students:
        # Deterministic pseudo-random partition based on student ID hash
        hash_val = int(hashlib.md5(s_id.encode("utf-8")).hexdigest(), 16) % 100
        if hash_val < int(test_ratio * 100):
            test_students.add(s_id)
        else:
            train_students.add(s_id)

    # Ensure at least 1 student in test set if we have multiple students
    if not test_students and total_students > 1:
        moved = train_students.pop()
        test_students.add(moved)
    elif not test_students:
        test_students = set(all_students)

    # Extract test split attempts
    test_attempts = [a for a in attempts if a.student_id in test_students]
    actuals = [a.actual_correct for a in test_attempts]
    preds = [a.predicted_probability for a in test_attempts]

    auc = compute_roc_auc(actuals, preds)
    ece, bins = compute_calibration_and_ece(actuals, preds, num_bins=num_bins)
    brier = compute_brier_score(actuals, preds)

    return EvaluationResult(
        auc=auc,
        ece=ece,
        brier_score=brier,
        sample_count=len(test_attempts),
        student_count=total_students,
        train_student_count=len(train_students),
        test_student_count=len(test_students),
        bins=bins,
    )
