"""Expectation-Maximization (Baum-Welch) parameter fitting for Bayesian Knowledge Tracing.

Provides pure-Python/NumPy EM algorithm for fitting (L0, T, G, S) parameters
from student binary response sequences, with pyBKT compatibility.
"""

from __future__ import annotations

import argparse
import json
import math
from collections.abc import Sequence

from app.engine.models import BKTParams


def forward_backward_bkt(
    obs: Sequence[int],
    l0: float,
    t: float,
    g: float,
    s: float,
) -> tuple[list[list[float]], list[list[float]], float]:
    """Forward-Backward algorithm for 2-state BKT Hidden Markov Model.

    States:
        0: Not learned (L = 0)
        1: Learned (L = 1)
    Observations:
        0: Wrong
        1: Correct
    """
    n = len(obs)
    if n == 0:
        return [], [], 1.0

    # Emission probabilities: B[state][obs]
    # State 0 (Not learned): P(0|L=0) = 1 - G, P(1|L=0) = G
    # State 1 (Learned):     P(0|L=1) = S,     P(1|L=1) = 1 - S
    b = [
        [1.0 - g, g],
        [s, 1.0 - s],
    ]

    # Transition probabilities: A[from_state][to_state]
    # State 0 -> 0: 1 - T, State 0 -> 1: T
    # State 1 -> 0: 0.0,   State 1 -> 1: 1.0 (absorbing mastery)
    a = [
        [1.0 - t, t],
        [0.0, 1.0],
    ]

    # Initial probabilities: pi[0] = 1 - L0, pi[1] = L0
    pi = [1.0 - l0, l0]

    # Forward pass: alpha[t][state]
    alpha = [[0.0, 0.0] for _ in range(n)]
    c = [0.0] * n  # scaling factors

    # t = 0
    alpha[0][0] = pi[0] * b[0][obs[0]]
    alpha[0][1] = pi[1] * b[1][obs[0]]
    c[0] = alpha[0][0] + alpha[0][1]
    if c[0] > 0:
        alpha[0][0] /= c[0]
        alpha[0][1] /= c[0]
    else:
        alpha[0][0] = 0.5
        alpha[0][1] = 0.5
        c[0] = 1.0

    for step in range(1, n):
        o = obs[step]
        alpha[step][0] = (alpha[step - 1][0] * a[0][0] + alpha[step - 1][1] * a[1][0]) * b[0][o]
        alpha[step][1] = (alpha[step - 1][0] * a[0][1] + alpha[step - 1][1] * a[1][1]) * b[1][o]
        c[step] = alpha[step][0] + alpha[step][1]
        if c[step] > 0:
            alpha[step][0] /= c[step]
            alpha[step][1] /= c[step]
        else:
            alpha[step][0] = 0.5
            alpha[step][1] = 0.5
            c[step] = 1.0

    # Log likelihood
    log_likelihood = sum(math.log(max(factor, 1e-12)) for factor in c)

    # Backward pass: beta[t][state] (scaled by same factors)
    beta = [[0.0, 0.0] for _ in range(n)]
    beta[n - 1][0] = 1.0
    beta[n - 1][1] = 1.0

    for step in range(n - 2, -1, -1):
        o = obs[step + 1]
        scaling = c[step + 1] if c[step + 1] > 0 else 1.0
        beta[step][0] = (
            a[0][0] * b[0][o] * beta[step + 1][0] + a[0][1] * b[1][o] * beta[step + 1][1]
        ) / scaling
        beta[step][1] = (
            a[1][0] * b[0][o] * beta[step + 1][0] + a[1][1] * b[1][o] * beta[step + 1][1]
        ) / scaling

    # Posterior state marginals: gamma[t][state]
    gamma = [[0.0, 0.0] for _ in range(n)]
    for step in range(n):
        denom = alpha[step][0] * beta[step][0] + alpha[step][1] * beta[step][1]
        if denom > 0:
            gamma[step][0] = (alpha[step][0] * beta[step][0]) / denom
            gamma[step][1] = (alpha[step][1] * beta[step][1]) / denom
        else:
            gamma[step][0] = 0.5
            gamma[step][1] = 0.5

    return gamma, alpha, log_likelihood


def fit_bkt_em(
    sequences: Sequence[Sequence[int]],
    max_iter: int = 100,
    tol: float = 1e-4,
    initial_params: BKTParams | None = None,
) -> BKTParams:
    """Fit BKT parameters (L0, T, G, S) from binary response sequences using Baum-Welch EM.

    Args:
        sequences: List of binary student response histories (1 = correct, 0 = wrong).
        max_iter: Maximum number of Expectation-Maximization iterations.
        tol: Convergence tolerance for log-likelihood difference.
        initial_params: Optional starting parameter estimates.

    Returns:
        Fitted BKTParams within statistically plausible pedagogical bounds.
    """
    valid_seqs = [s for s in sequences if len(s) > 0]
    if not valid_seqs:
        return initial_params or BKTParams()

    # Initial parameter guesses
    p = initial_params or BKTParams(p_init=0.30, p_transit=0.10, p_guess=0.20, p_slip=0.10)
    l0 = p.p_init
    t = p.p_transit
    g = p.p_guess
    s = p.p_slip

    prev_ll = -float("inf")

    for _iteration in range(max_iter):
        total_ll = 0.0

        # Accumulators for M-step
        sum_gamma_0_at_0 = 0.0
        sum_trans_0_to_1 = 0.0
        sum_gamma_0_denom = 0.0

        # Emission accumulators
        # G = P(obs=1 | state=0) = sum(gamma[t][0] * 1(obs=1)) / sum(gamma[t][0])
        g_num = 0.0
        g_denom = 0.0
        # S = P(obs=0 | state=1) = sum(gamma[t][1] * 1(obs=0)) / sum(gamma[t][1])
        s_num = 0.0
        s_denom = 0.0

        for seq in valid_seqs:
            gamma, alpha, seq_ll = forward_backward_bkt(seq, l0, t, g, s)
            total_ll += seq_ll

            # Initial state accumulator: gamma[0][1] is P(L0 = 1)
            sum_gamma_0_at_0 += gamma[0][1]

            n = len(seq)
            for step in range(n):
                o = seq[step]
                g_0 = gamma[step][0]
                g_1 = gamma[step][1]

                if o == 1:
                    g_num += g_0
                else:
                    s_num += g_1

                g_denom += g_0
                s_denom += g_1

                if step < n - 1:
                    # Transition: P(state_t=0, state_{t+1}=1 | obs)
                    # xi_01 = alpha[t][0] * A[0][1] * B[1][obs[t+1]] * beta[t+1][1]
                    o_next = seq[step + 1]
                    b_1_next = (1.0 - s) if o_next == 1 else s
                    # Normalizing factor
                    denom_t = alpha[step][0] * (
                        (1.0 - t) * ((1.0 - g) if o_next == 0 else g) + t * b_1_next
                    ) + alpha[step][1] * (1.0 * b_1_next)
                    xi_01 = (alpha[step][0] * t * b_1_next) / denom_t if denom_t > 0 else 0.0

                    sum_trans_0_to_1 += xi_01
                    sum_gamma_0_denom += g_0

        # Check convergence
        if abs(total_ll - prev_ll) < tol:
            break
        prev_ll = total_ll

        # M-step updates with Bayesian Dirichlet/Laplace smoothing & pedagogical bounds
        num_students = len(valid_seqs)

        # L0 update
        l0_new = (sum_gamma_0_at_0 + 1.0) / (num_students + 2.0)
        # T update
        t_new = (sum_trans_0_to_1 + 0.1) / (sum_gamma_0_denom + 1.0) if sum_gamma_0_denom > 0 else t
        # G update
        g_new = (g_num + 1.0) / (g_denom + 5.0) if g_denom > 0 else g
        # S update
        s_new = (s_num + 1.0) / (s_denom + 10.0) if s_denom > 0 else s

        # Pedagogical constraints:
        # 1. 0.01 <= L0 <= 0.85
        # 2. 0.01 <= T <= 0.40
        # 3. 0.01 <= G <= 0.40
        # 4. 0.01 <= S <= 0.35
        # 5. G + S < 0.80 (strict identifiability)
        l0 = max(0.01, min(0.85, l0_new))
        t = max(0.01, min(0.40, t_new))
        g = max(0.01, min(0.40, g_new))
        s = max(0.01, min(0.35, s_new))

        if g + s >= 0.80:
            scale = 0.75 / (g + s)
            g *= scale
            s *= scale

    return BKTParams(
        p_init=round(l0, 4),
        p_transit=round(t, 4),
        p_guess=round(g, 4),
        p_slip=round(s, 4),
    )


def load_pybkt_csv_format(
    lines: list[str],
    skill_filter: str | None = None,
) -> list[list[int]]:
    """Parse student binary response sequences from pyBKT-style tabular data.

    Expected CSV columns: student/user_id, skill/skill_name, correct
    """
    import csv

    reader = csv.DictReader(lines)
    sequences_by_student: dict[str, list[int]] = {}

    for row in reader:
        student = row.get("student") or row.get("user_id") or row.get("user") or "default"
        skill = row.get("skill") or row.get("skill_name") or ""
        correct_raw = row.get("correct") or "0"

        if skill_filter and skill != skill_filter:
            continue

        try:
            val = int(float(correct_raw))
            binary_val = 1 if val > 0 else 0
        except ValueError:
            binary_val = 0

        sequences_by_student.setdefault(student, []).append(binary_val)

    return list(sequences_by_student.values())


def main() -> None:
    """CLI runner for BKT EM parameter estimation."""
    parser = argparse.ArgumentParser(
        description="EM Parameter Fitting for Bayesian Knowledge Tracing"
    )
    parser.add_argument(
        "--input",
        type=str,
        help="Path to JSON file containing student binary response sequences: [[1, 0, 1, 1], ...]",
    )
    parser.add_argument("--max-iter", type=int, default=100, help="Maximum EM iterations")
    parser.add_argument("--tol", type=float, default=1e-4, help="Convergence tolerance")
    args = parser.parse_args()

    if args.input:
        with open(args.input, encoding="utf-8") as f:
            data = json.load(f)
    else:
        # Default demonstration synthetic sequences
        data = [
            [0, 1, 1, 1],
            [0, 0, 1, 1],
            [1, 1, 1, 1],
            [0, 0, 0, 1],
            [1, 0, 1, 1],
            [0, 1, 0, 1],
        ]
        print("Using demonstration student response sequences...")

    fitted = fit_bkt_em(data, max_iter=args.max_iter, tol=args.tol)
    print("\nFitted BKT Parameters:")
    print(f"  P(L0) Prior:     {fitted.p_init:.4f}")
    print(f"  P(T) Learn:      {fitted.p_transit:.4f}")
    print(f"  P(G) Guess:      {fitted.p_guess:.4f}")
    print(f"  P(S) Slip:       {fitted.p_slip:.4f}")
    print(f"  Identifiable:    {fitted.p_guess + fitted.p_slip:.4f} (< 1.0)")


if __name__ == "__main__":
    main()
