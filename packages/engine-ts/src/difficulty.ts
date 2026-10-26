/**
 * Pedagogical difficulty rules, flow-state targeting, and hint ladder progression.
 * Pure TypeScript implementation matching apps/api/app/engine/difficulty.py.
 */

import { clampProbability } from './bkt';
import {
  type BKTParams,
  DEFAULT_BKT_PARAMS,
  DEFAULT_DIFFICULTY_RULES,
  type DifficultyRules,
  HintLevel,
  type SkillState,
} from './types';

export class DifficultyController {
  private readonly rules: DifficultyRules;

  constructor(rules: DifficultyRules = DEFAULT_DIFFICULTY_RULES) {
    this.rules = rules;
  }

  /**
   * Calculates predicted probability of answering an item correctly.
   *
   * Calibrates base BKT prediction by item difficulty (1-5):
   * - Level 1-2: easier item (reduced slip, higher guess)
   * - Level 3: baseline
   * - Level 4-5: harder item (elevated slip, lower guess)
   */
  public calculatePredictedSuccess(
    pMastery: number,
    difficulty = 3,
    bktParams: BKTParams = DEFAULT_BKT_PARAMS,
  ): number {
    const diffOffset = (difficulty - 3) * 0.04;
    const effectiveSlip = Math.max(0.02, Math.min(0.4, bktParams.pSlip + diffOffset));
    const effectiveGuess = Math.max(0.05, Math.min(0.35, bktParams.pGuess - diffOffset));

    const p = clampProbability(pMastery);
    const predicted = p * (1.0 - effectiveSlip) + (1.0 - p) * effectiveGuess;
    return clampProbability(predicted);
  }

  /**
   * Scores how well an item matches the 70%-80% optimal learning zone.
   * Target: 0.75 center of flow state. Returns a score in [0.0, 1.0].
   */
  public calculateDifficultyFit(predictedSuccess: number): number {
    const center = 0.75;
    const dist = Math.abs(predictedSuccess - center);

    // Optimal inside [0.70, 0.80]
    if (
      this.rules.targetSuccessMin <= predictedSuccess &&
      predictedSuccess <= this.rules.targetSuccessMax
    ) {
      return 1.0 - dist * 2.0;
    }

    // Outside optimal window, decays gracefully
    return Math.max(0.0, 1.0 - dist * 3.5);
  }

  /**
   * Determines progressive cognitive scaffolding level based on student struggles.
   * - 0 mistakes: NONE
   * - 1 mistake: HINT (progressive hint)
   * - 2 mistakes: WORKED_EXAMPLE (worked demonstration)
   * - >= 3 mistakes or severe gap: PREREQUISITE_REVIEW (foundational skill review)
   */
  public getHintLadderLevel(consecutiveMistakes: number, pMastery: number): HintLevel {
    if (consecutiveMistakes >= 3 || (consecutiveMistakes >= 2 && pMastery < 0.25)) {
      return HintLevel.PREREQUISITE_REVIEW;
    }
    if (consecutiveMistakes === 2) {
      return HintLevel.WORKED_EXAMPLE;
    }
    if (consecutiveMistakes === 1) {
      return HintLevel.HINT;
    }
    return HintLevel.NONE;
  }

  /**
   * True if student demonstrates rapid mastery warranting skip-ahead.
   */
  public canSkipAhead(skillState: SkillState): boolean {
    return (
      skillState.pMastery >= this.rules.skipAheadThreshold &&
      skillState.consecutiveCorrect >= this.rules.skipAheadConsecutive
    );
  }

  /**
   * True if student has successfully answered 3 fresh hint-free test questions.
   */
  public isTestGateSatisfied(skillState: SkillState): boolean {
    return skillState.hintFreeCorrectCount >= this.rules.testGateCount;
  }
}
