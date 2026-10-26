/**
 * Bayesian Knowledge Tracing (BKT) mathematical engine.
 * Pure TypeScript implementation matching apps/api/app/engine/bkt.py.
 */

import {
  type BKTParams,
  DEFAULT_BKT_PARAMS,
  DEFAULT_MASTERY_THRESHOLDS,
  type MasteryThresholds,
  type Observation,
} from './types';

/**
 * Clamps probability strictly to the closed interval [0.0, 1.0].
 */
export function clampProbability(value: number): number {
  if (Number.isNaN(value)) {
    return 0.5;
  }
  return Math.max(0.0, Math.min(1.0, value));
}

/**
 * Computes observation posterior P(L | observation).
 *
 * Formulas:
 *   Correct: P(L | 1) = P(L)(1 - S) / [ P(L)(1 - S) + (1 - P(L))G ]
 *   Wrong:   P(L | 0) = P(L)S / [ P(L)S + (1 - P(L))(1 - G) ]
 *
 * If an incorrect response is answered in < 3s (rapid guess), the negative
 * update is down-weighted to prevent spurious penalty.
 */
export function computePosterior(
  pMastery: number,
  isCorrect: boolean,
  params: BKTParams,
  isRapidGuess = false,
  rapidGuessWeight = 0.35,
): number {
  const p = clampProbability(pMastery);
  const s = params.pSlip;
  const g = params.pGuess;

  let numerator: number;
  let denominator: number;

  if (isCorrect) {
    numerator = p * (1.0 - s);
    denominator = numerator + (1.0 - p) * g;
  } else {
    numerator = p * s;
    denominator = numerator + (1.0 - p) * (1.0 - g);
  }

  const rawPosterior = denominator <= 0.0 ? p : numerator / denominator;

  let posterior: number;
  if (!isCorrect && isRapidGuess) {
    posterior = (1.0 - rapidGuessWeight) * p + rapidGuessWeight * rawPosterior;
  } else {
    posterior = rawPosterior;
  }

  return clampProbability(posterior);
}

/**
 * Applies learning opportunity transit update: P(L_next) = P(L_post) + (1 - P(L_post)) * T.
 */
export function applyTransition(pPosterior: number, params: BKTParams): number {
  const pPost = clampProbability(pPosterior);
  const pNext = pPost + (1.0 - pPost) * params.pTransit;
  return clampProbability(pNext);
}

/**
 * Executes complete BKT update cycle: Prior -> Observation Posterior -> Transition Next.
 */
export function updateBKT(
  pMastery: number,
  observation: Observation,
  params: BKTParams = DEFAULT_BKT_PARAMS,
  thresholds: MasteryThresholds = DEFAULT_MASTERY_THRESHOLDS,
): { readonly posterior: number; readonly pNext: number } {
  const isRapid = !observation.isCorrect && observation.timeSpentS < thresholds.rapidGuessTimeS;

  const posterior = computePosterior(
    pMastery,
    observation.isCorrect,
    params,
    isRapid,
    thresholds.rapidGuessWeight,
  );

  const pNext = applyTransition(posterior, params);
  return { posterior, pNext };
}

/**
 * Calculates predicted probability of answering correctly.
 * Formula: P(C) = P(L)(1 - S) + (1 - P(L))G
 */
export function predictSuccess(pMastery: number, params: BKTParams = DEFAULT_BKT_PARAMS): number {
  const p = clampProbability(pMastery);
  const prob = p * (1.0 - params.pSlip) + (1.0 - p) * params.pGuess;
  return clampProbability(prob);
}

/**
 * Computes Shannon entropy in bits for binary outcome with probability p.
 */
export function binaryEntropy(p: number): number {
  const pClamped = Math.max(1e-9, Math.min(1.0 - 1e-9, p));
  return -(pClamped * Math.log2(pClamped)) - (1.0 - pClamped) * Math.log2(1.0 - pClamped);
}

/**
 * Calculates Expected Information Gain (EIG) on student mastery state.
 * EIG(P) = H(P) - [ P(C) * H(P(L|C)') + (1 - P(C)) * H(P(L|W)') ]
 */
export function expectedInformationGain(
  pMastery: number,
  params: BKTParams = DEFAULT_BKT_PARAMS,
): number {
  const p = clampProbability(pMastery);
  const hPrior = binaryEntropy(p);

  const pCorrect = predictSuccess(p, params);
  const pWrong = 1.0 - pCorrect;

  const postC = computePosterior(p, true, params);
  const nextC = applyTransition(postC, params);

  const postW = computePosterior(p, false, params);
  const nextW = applyTransition(postW, params);

  const expectedPosteriorEntropy = pCorrect * binaryEntropy(nextC) + pWrong * binaryEntropy(nextW);

  const eig = hPrior - expectedPosteriorEntropy;
  return Math.max(0.0, eig);
}
