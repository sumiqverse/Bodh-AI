"""Unit tests for Baum-Welch EM parameter fitting for BKT."""

import pytest

from app.engine.em_fitting import fit_bkt_em, forward_backward_bkt


def test_forward_backward_likelihood_and_posterior() -> None:
    """Forward-Backward produces valid posterior marginals and log likelihood."""
    obs = [0, 1, 1, 1]
    gamma, _alpha, ll = forward_backward_bkt(obs, l0=0.30, t=0.10, g=0.20, s=0.10)

    assert len(gamma) == 4
    for step_marginal in gamma:
        assert len(step_marginal) == 2
        assert pytest.approx(sum(step_marginal), rel=1e-4) == 1.0
        assert 0.0 <= step_marginal[0] <= 1.0
        assert 0.0 <= step_marginal[1] <= 1.0

    assert ll < 0.0  # Log likelihood of probabilities in (0, 1)


def test_fit_bkt_em_parameter_bounds() -> None:
    """EM algorithm produces parameters within pedagogical constraints and G + S < 1.0."""
    student_sequences = [
        [0, 1, 1, 1],
        [0, 0, 1, 1],
        [1, 1, 1, 1],
        [0, 0, 0, 1],
        [0, 1, 1, 1],
        [1, 0, 1, 1],
    ]

    fitted = fit_bkt_em(student_sequences, max_iter=20)

    assert 0.01 <= fitted.p_init <= 0.85
    assert 0.01 <= fitted.p_transit <= 0.40
    assert 0.01 <= fitted.p_guess <= 0.40
    assert 0.01 <= fitted.p_slip <= 0.35
    assert fitted.p_guess + fitted.p_slip < 1.0  # Strict identifiability
