"""Unit tests for Bayesian Knowledge Tracing (BKT) formulas and information gain."""

import pytest

from app.engine.bkt import (
    apply_transition,
    binary_entropy,
    clamp_probability,
    compute_posterior,
    expected_information_gain,
    predict_success,
    update_bkt,
)
from app.engine.models import BKTParams, MasteryThresholds, Observation


def test_bkt_params_defaults() -> None:
    """Verify default BKT parameters match specification."""
    params = BKTParams()
    assert params.p_init == 0.30
    assert params.p_transit == 0.10
    assert params.p_guess == 0.20
    assert params.p_slip == 0.10


def test_bkt_params_validation() -> None:
    """Ensure invalid probabilities and non-identifiable parameters raise ValueError."""
    with pytest.raises(ValueError, match="p_init"):
        BKTParams(p_init=-0.1)

    with pytest.raises(ValueError, match=r"must be < 1\.0"):
        BKTParams(p_guess=0.60, p_slip=0.50)  # G + S = 1.1 >= 1.0


def test_posterior_correct_formula() -> None:
    """Test posterior formula after correct response: P(L)(1-S) / [P(L)(1-S) + (1-P(L))G]."""
    p = 0.30
    params = BKTParams(p_init=0.30, p_transit=0.10, p_guess=0.20, p_slip=0.10)
    # Numerator = 0.30 * 0.90 = 0.27
    # Denominator = 0.27 + (0.70 * 0.20) = 0.27 + 0.14 = 0.41
    # Posterior = 0.27 / 0.41 ≈ 0.658536585
    posterior = compute_posterior(p, is_correct=True, params=params)
    assert pytest.approx(posterior, rel=1e-5) == 0.27 / 0.41
    assert posterior > p


def test_posterior_wrong_formula() -> None:
    """Test posterior formula after wrong response: P(L)S / [P(L)S + (1-P(L))(1-G)]."""
    p = 0.30
    params = BKTParams(p_init=0.30, p_transit=0.10, p_guess=0.20, p_slip=0.10)
    # Numerator = 0.30 * 0.10 = 0.03
    # Denominator = 0.03 + (0.70 * 0.80) = 0.03 + 0.56 = 0.59
    # Posterior = 0.03 / 0.59 ≈ 0.050847457
    posterior = compute_posterior(p, is_correct=False, params=params)
    assert pytest.approx(posterior, rel=1e-5) == 0.03 / 0.59
    assert posterior < p


def test_transition_update_formula() -> None:
    """Test transition update: P(L) += (1 - P(L)) * T."""
    posterior = 0.50
    params = BKTParams(p_transit=0.10)
    # 0.50 + (1 - 0.50) * 0.10 = 0.50 + 0.05 = 0.55
    next_p = apply_transition(posterior, params)
    assert pytest.approx(next_p, rel=1e-5) == 0.55


def test_clamping_to_unit_interval() -> None:
    """Verify clamping keeps all values strictly inside [0.0, 1.0]."""
    assert clamp_probability(-0.5) == 0.0
    assert clamp_probability(1.5) == 1.0
    assert clamp_probability(0.75) == 0.75


def test_rapid_guess_down_weighting() -> None:
    """Verify responses faster than 3s are down-weighted in belief reduction."""
    p = 0.50
    params = BKTParams()
    thresholds = MasteryThresholds(rapid_guess_weight=0.35)

    # Standard wrong response (e.g. 15s)
    normal_obs = Observation(skill_id="S1", is_correct=False, time_spent_s=15.0)
    _, p_normal = update_bkt(p, normal_obs, params, thresholds)

    # Rapid wrong response (e.g. 1.2s < 3.0s)
    rapid_obs = Observation(skill_id="S1", is_correct=False, time_spent_s=1.2)
    assert rapid_obs.is_rapid_guess is True
    _, p_rapid = update_bkt(p, rapid_obs, params, thresholds)

    # Rapid guessing should reduce mastery less severely than thoughtful mistake
    assert p_rapid > p_normal
    assert p_rapid < p


def test_predict_success() -> None:
    """Test predicted probability: P(C) = P(L)(1-S) + (1-P(L))G."""
    p = 0.40
    params = BKTParams(p_guess=0.20, p_slip=0.10)
    # P(C) = 0.40 * 0.90 + 0.60 * 0.20 = 0.36 + 0.12 = 0.48
    pred = predict_success(p, params)
    assert pytest.approx(pred, rel=1e-5) == 0.48


def test_binary_entropy() -> None:
    """Test Shannon entropy: maximum at p=0.5 (1 bit), near zero at p=0 and p=1."""
    h_max = binary_entropy(0.50)
    assert pytest.approx(h_max, rel=1e-4) == 1.0

    h_low = binary_entropy(0.01)
    assert h_low < 0.10

    h_high = binary_entropy(0.99)
    assert h_high < 0.10


def test_expected_information_gain_properties() -> None:
    """Verify EIG is strictly non-negative and highest around intermediate knowledge."""
    params = BKTParams()
    eig_middle = expected_information_gain(0.50, params)
    eig_edge = expected_information_gain(0.98, params)

    assert eig_middle > 0.0
    assert eig_edge >= 0.0
    # Uncertainty reduction is significantly greater when mastery is unknown (0.50)
    assert eig_middle > eig_edge
