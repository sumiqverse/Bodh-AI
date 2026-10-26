/**
 * Mastery state machine, hysteresis rules, test gate verification, and transition rationales.
 * Pure TypeScript implementation matching apps/api/app/engine/mastery.py.
 */

import { updateBKT } from './bkt';
import {
  type BKTParams,
  DEFAULT_BKT_PARAMS,
  DEFAULT_DIFFICULTY_RULES,
  DEFAULT_MASTERY_THRESHOLDS,
  type DifficultyRules,
  HintLevel,
  type MasteryState,
  type MasteryThresholds,
  type Observation,
  type SkillState,
} from './types';

export class MasteryStateMachine {
  private readonly thresholds: MasteryThresholds;
  private readonly rules: DifficultyRules;
  private readonly bktParams: BKTParams;

  constructor(
    thresholds: MasteryThresholds = DEFAULT_MASTERY_THRESHOLDS,
    rules: DifficultyRules = DEFAULT_DIFFICULTY_RULES,
    bktParams: BKTParams = DEFAULT_BKT_PARAMS,
  ) {
    this.thresholds = thresholds;
    this.rules = rules;
    this.bktParams = bktParams;
  }

  /**
   * Classifies a probability into a pedagogical mastery state.
   */
  public classifyProbability(pMastery: number): MasteryState {
    if (pMastery >= this.thresholds.masteredMin) {
      return 'mastered';
    }
    if (pMastery >= this.thresholds.notLearnedMax) {
      return 'partial';
    }
    return 'not_learned';
  }

  /**
   * Updates skill mastery given a student response observation.
   *
   * Applies:
   * - BKT posterior update and transition learning rate.
   * - Rapid-guess down-weighting.
   * - 3-observation minimum requirement before any state transition.
   * - Test-gate requirement: 3 hint-free correct answers required for mastered state.
   * - Skip-ahead evaluation: P(L) > 0.95 with >= 2 consecutive correct answers.
   */
  public processObservation(
    currentState: SkillState,
    observation: Observation,
    params: BKTParams = this.bktParams,
  ): SkillState {
    // 1. Update BKT Probability
    const { pNext } = updateBKT(currentState.pMastery, observation, params, this.thresholds);

    // 2. Update observation counts and metrics
    const newObsCount = currentState.observationsCount + 1;
    const newCorrectCount = currentState.correctCount + (observation.isCorrect ? 1 : 0);
    const newConsecutiveCorrect = observation.isCorrect ? currentState.consecutiveCorrect + 1 : 0;

    const isHintFree =
      observation.isCorrect &&
      (observation.hintLevel === undefined || observation.hintLevel === HintLevel.NONE);
    const newHintFreeCorrect = isHintFree
      ? currentState.hintFreeCorrectCount + 1
      : currentState.hintFreeCorrectCount;

    const isRapid =
      !observation.isCorrect && observation.timeSpentS < this.thresholds.rapidGuessTimeS;
    const newRapidGuesses = (currentState.rapidGuessesCount ?? 0) + (isRapid ? 1 : 0);

    // 3. Determine Candidate State based on probability
    const candidateState = this.classifyProbability(pNext);

    // 4. Apply State Transition Rules & Invariants
    const rationaleParts: string[] = [];

    if (observation.isCorrect) {
      rationaleParts.push(
        `Correct response updated belief from ${currentState.pMastery.toFixed(2)} to ${pNext.toFixed(2)}.`,
      );
    } else if (isRapid) {
      rationaleParts.push(
        `Incorrect answer in ${observation.timeSpentS.toFixed(1)}s (<3.0s) flagged as rapid guessing; penalty down-weighted (P=${pNext.toFixed(2)}).`,
      );
    } else {
      rationaleParts.push(
        `Incorrect response updated belief from ${currentState.pMastery.toFixed(2)} to ${pNext.toFixed(2)}.`,
      );
    }

    let effectiveState: MasteryState;

    // Rule A: Minimum 3 observations required for any state transition
    if (newObsCount < this.thresholds.minObservations) {
      effectiveState = currentState.state;
      rationaleParts.push(
        `State remains '${effectiveState}' (${newObsCount}/3 minimum diagnostic observations).`,
      );
    } else {
      // Rule B: Test Gate for Mastered State
      // Requires at least testGateCount (3) hint-free correct answers
      if (candidateState === 'mastered') {
        if (newHintFreeCorrect >= this.rules.testGateCount) {
          effectiveState = 'mastered';
          rationaleParts.push(
            `Mastery achieved: P >= ${this.thresholds.masteredMin} with ${newHintFreeCorrect}/${this.rules.testGateCount} verified hint-free correct items.`,
          );
        } else {
          effectiveState = 'partial';
          rationaleParts.push(
            `High probability (P=${pNext.toFixed(2)}) placed in 'partial' pending Test Gate verification (${newHintFreeCorrect}/${this.rules.testGateCount} hint-free items).`,
          );
        }
      } else {
        effectiveState = candidateState;
        rationaleParts.push(`Transitioned state to '${effectiveState}'.`);
      }
    }

    // Rule C: Skip-Ahead Condition
    if (
      pNext >= this.rules.skipAheadThreshold &&
      newConsecutiveCorrect >= this.rules.skipAheadConsecutive
    ) {
      rationaleParts.push(
        `Skip-ahead triggered: P=${pNext.toFixed(2)} with ${newConsecutiveCorrect} consecutive correct answers.`,
      );
    }

    const roundedPMastery = Math.round(pNext * 10000) / 10000;

    return {
      skillId: currentState.skillId,
      pMastery: roundedPMastery,
      state: effectiveState,
      observationsCount: newObsCount,
      correctCount: newCorrectCount,
      consecutiveCorrect: newConsecutiveCorrect,
      hintFreeCorrectCount: newHintFreeCorrect,
      rapidGuessesCount: newRapidGuesses,
      lastAttemptAt: observation.timestamp ?? new Date().toISOString(),
      rationale: rationaleParts.join(' '),
    };
  }
}

export type GradeLevel = 6 | 7 | 8 | 9 | 10;
export type Subject = 'mathematics' | 'science' | 'english' | 'social_science';

export interface StudentSkillState {
  readonly skillId: string;
  readonly grade: GradeLevel;
  readonly subject: Subject;
  readonly masteryScore: number;
  readonly attemptsCount: number;
}

export interface AssessmentResponse {
  readonly skillId: string;
  readonly isCorrect: boolean;
  readonly responseTimeSeconds: number;
}

export interface MasteryUpdateResult {
  readonly previousScore: number;
  readonly updatedScore: number;
  readonly delta: number;
  readonly isMastered: boolean;
}

/**
 * Calculates updated mastery score using a bounded Bayesian learning update (legacy interface).
 */
export function calculateMasteryUpdate(
  current: StudentSkillState,
  response: AssessmentResponse,
): MasteryUpdateResult {
  if (response.skillId !== current.skillId) {
    throw new Error(
      `Skill ID mismatch: state has "${current.skillId}", response has "${response.skillId}"`,
    );
  }

  const learningRate = 0.15;
  const slipPenalty = 0.1;

  let newScore = current.masteryScore;
  if (response.isCorrect) {
    newScore += learningRate * (1 - current.masteryScore);
  } else {
    newScore -= slipPenalty * current.masteryScore;
  }

  const updatedScore = Math.max(0, Math.min(1, Math.round(newScore * 1000) / 1000));
  const delta = Math.round((updatedScore - current.masteryScore) * 1000) / 1000;
  const isMastered = updatedScore >= 0.85;

  return {
    previousScore: current.masteryScore,
    updatedScore,
    delta,
    isMastered,
  };
}
