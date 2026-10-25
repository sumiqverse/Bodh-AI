"""Bayesian Knowledge Tracing (BKT) mathematical engine."""

from __future__ import annotations

import math

from app.engine.models import BKTParams, MasteryThresholds, Observation


def clamp_probability(value: float) -> float:
    """Clamp probability strictly to the closed interval [0.0, 1.0]."""
    if math.isnan(value):
        return 0.5
    return max(0.0, min(1.0, value))


def compute_posterior(
    p_mastery: float,
    is_correct: bool,
    params: BKTParams,
    is_rapid_guess: bool = False,
    rapid_guess_weight: float = 0.35,
) -> float:
    """Compute observation posterior P(L | observation).

    Formulas:
        Correct: P(L | 1) = P(L)(1 - S) / [ P(L)(1 - S) + (1 - P(L))G ]
        Wrong:   P(L | 0) = P(L)S / [ P(L)S + (1 - P(L))(1 - G) ]

    If an incorrect response is answered in < 3s (rapid guess), the negative
    update is down-weighted to prevent spurious penalty.
    """
    p = clamp_probability(p_mastery)
    s = params.p_slip
    g = params.p_guess

    if is_correct:
        numerator = p * (1.0 - s)
        denominator = numerator + ((1.0 - p) * g)
    else:
        numerator = p * s
        denominator = numerator + ((1.0 - p) * (1.0 - g))

    raw_posterior = p if denominator <= 0.0 else numerator / denominator

    # Handle rapid guess down-weighting for wrong answers
    if not is_correct and is_rapid_guess:
        posterior = ((1.0 - rapid_guess_weight) * p) + (rapid_guess_weight * raw_posterior)
    else:
        posterior = raw_posterior

    return clamp_probability(posterior)


def apply_transition(p_posterior: float, params: BKTParams) -> float:
    """Apply learning opportunity transit update: P(L_next) = P(L_post) + (1 - P(L_post)) * T."""
    p_post = clamp_probability(p_posterior)
    p_next = p_post + ((1.0 - p_post) * params.p_transit)
    return clamp_probability(p_next)


def update_bkt(
    p_mastery: float,
    observation: Observation,
    params: BKTParams | None = None,
    thresholds: MasteryThresholds | None = None,
) -> tuple[float, float]:
    """Execute complete BKT update cycle: Prior -> Observation Posterior -> Transition Next.

    Args:
        p_mastery: Prior competency belief P(L_t).
        observation: Student response evidence.
        params: Skill-specific BKT parameters (defaults to L0=0.30, T=0.10, G=0.20, S=0.10).
        thresholds: Mastery thresholds and rapid guess configs.

    Returns:
        tuple (posterior_after_obs, next_mastery_probability)
    """
    p_params = params or BKTParams()
    p_thresh = thresholds or MasteryThresholds()

    posterior = compute_posterior(
        p_mastery=p_mastery,
        is_correct=observation.is_correct,
        params=p_params,
        is_rapid_guess=observation.is_rapid_guess,
        rapid_guess_weight=p_thresh.rapid_guess_weight,
    )

    next_mastery = apply_transition(posterior, p_params)
    return posterior, next_mastery


def predict_success(p_mastery: float, params: BKTParams | None = None) -> float:
    """Calculate predicted probability of answering correctly.

    Formula: P(C) = P(L)(1 - S) + (1 - P(L))G
    """
    p = clamp_probability(p_mastery)
    bkt = params or BKTParams()
    prob = (p * (1.0 - bkt.p_slip)) + ((1.0 - p) * bkt.p_guess)
    return clamp_probability(prob)


def binary_entropy(p: float) -> float:
    """Compute Shannon entropy in bits for binary outcome with probability p."""
    p_clamped = max(1e-9, min(1.0 - 1e-9, p))
    return -(p_clamped * math.log2(p_clamped)) - ((1.0 - p_clamped) * math.log2(1.0 - p_clamped))


def expected_information_gain(p_mastery: float, params: BKTParams | None = None) -> float:
    """Calculate Expected Information Gain (EIG) on student mastery state.

    EIG measures expected reduction in mastery uncertainty after presenting an item.
    EIG(P) = H(P) - [ P(C) * H(P(L|C)') + (1 - P(C)) * H(P(L|W)') ]
    """
    bkt = params or BKTParams()
    p = clamp_probability(p_mastery)

    h_prior = binary_entropy(p)

    # Success probability
    p_correct = predict_success(p, bkt)
    p_wrong = 1.0 - p_correct

    # Next states after correct and wrong
    post_c = compute_posterior(p, is_correct=True, params=bkt)
    next_c = apply_transition(post_c, bkt)

    post_w = compute_posterior(p, is_correct=False, params=bkt)
    next_w = apply_transition(post_w, bkt)

    expected_posterior_entropy = (p_correct * binary_entropy(next_c)) + (
        p_wrong * binary_entropy(next_w)
    )

    eig = h_prior - expected_posterior_entropy
    return max(0.0, eig)
