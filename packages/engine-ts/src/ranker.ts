/**
 * Multi-objective recommendation ranker prioritizing gaps, difficulty fit, and spaced practice.
 * Pure TypeScript implementation matching apps/api/app/engine/ranker.py.
 */

import { DifficultyController } from './difficulty';
import {
  type CandidateItem,
  DEFAULT_RANKER_WEIGHTS,
  type NextItemDecision,
  type RankerWeights,
  type ScoreBreakdown,
  type SkillState,
} from './types';

export class RecommendationRanker {
  private readonly weights: RankerWeights;
  private readonly diffCtrl: DifficultyController;

  constructor(
    weights: RankerWeights = DEFAULT_RANKER_WEIGHTS,
    diffCtrl: DifficultyController = new DifficultyController(),
  ) {
    this.weights = weights;
    this.diffCtrl = diffCtrl;
  }

  /**
   * Computes the weighted multi-objective recommendation score and breakdown for an item.
   */
  public computeItemScore(
    item: CandidateItem,
    skillState: SkillState | null,
    isPrereqGap = false,
    curriculumSkills?: readonly string[],
    daysSinceAttempt = 7.0,
    recentHistory?: readonly string[],
    maxCurriculumOrder = 150,
  ): { readonly score: number; readonly breakdown: ScoreBreakdown } {
    const pMastery = skillState?.pMastery ?? 0.3;

    // 1. Gap priority
    let gapPriority: number;
    if (isPrereqGap) {
      gapPriority = 1.0;
    } else if (skillState && skillState.state === 'not_learned') {
      gapPriority = 0.85;
    } else if (skillState && skillState.state === 'partial') {
      gapPriority = 0.7;
    } else {
      gapPriority = 0.25;
    }

    // 2. Difficulty fit
    const predSuccess = this.diffCtrl.calculatePredictedSuccess(pMastery, item.difficulty);
    const difficultyFit = this.diffCtrl.calculateDifficultyFit(predSuccess);

    // 3. Recency penalty
    let recencyPenalty: number;
    if (recentHistory && recentHistory.length > 0) {
      const last1 = recentHistory[recentHistory.length - 1];
      const last3 = recentHistory.slice(-3);
      const last5 = recentHistory.slice(-5);

      if (last1 === item.skillId) {
        recencyPenalty = 0.1;
      } else if (last3.includes(item.skillId)) {
        recencyPenalty = 0.5;
      } else if (last5.includes(item.skillId)) {
        recencyPenalty = 0.8;
      } else {
        recencyPenalty = 1.0;
      }
    } else {
      recencyPenalty = Math.min(1.0, Math.max(0.1, 0.2 + 0.1 * daysSinceAttempt));
    }

    // 4. Curriculum alignment
    let curriculumAlignment: number;
    if (curriculumSkills && curriculumSkills.includes(item.skillId)) {
      const order = curriculumSkills.indexOf(item.skillId);
      curriculumAlignment = Math.max(
        0.0,
        Math.min(1.0, 1.0 - order / Math.max(1, curriculumSkills.length)),
      );
    } else {
      const currNorm = Math.max(1, maxCurriculumOrder);
      const order = item.curriculumOrder ?? 1;
      curriculumAlignment = Math.max(0.0, Math.min(1.0, 1.0 - Math.abs(order - 1) / currNorm));
    }

    const totalScore =
      this.weights.gapPriority * gapPriority +
      this.weights.difficultyFit * difficultyFit +
      this.weights.recencyPenalty * recencyPenalty +
      this.weights.curriculumAlignment * curriculumAlignment;

    return {
      score: totalScore,
      breakdown: {
        gapPriority,
        difficultyFit,
        recencyPenalty,
        curriculumAlignment,
      },
    };
  }

  /**
   * Ranks question candidates to optimize learning velocity and mastery retention.
   */
  public rankItems(
    candidates: readonly CandidateItem[],
    skillStates: Readonly<Record<string, SkillState>>,
    attemptedQuestionIds: ReadonlySet<string>,
    rootCauseGaps: ReadonlySet<string> = new Set(),
    recentSkillHistory: readonly string[] = [],
    maxCurriculumOrder = 150,
  ): NextItemDecision[] {
    const decisions: NextItemDecision[] = [];

    for (const item of candidates) {
      // Filter out already attempted questions
      if (attemptedQuestionIds.has(item.questionId)) {
        continue;
      }

      const state = skillStates[item.skillId] ?? null;
      const pMastery = state?.pMastery ?? 0.3;
      const isPrereqGap = rootCauseGaps.has(item.skillId) || rootCauseGaps.has(item.skillCode);
      const consecutiveMistakes = state ? state.observationsCount - state.correctCount : 0;

      const { score, breakdown } = this.computeItemScore(
        item,
        state,
        isPrereqGap,
        undefined,
        7.0,
        recentSkillHistory,
        maxCurriculumOrder,
      );

      const predSuccess = this.diffCtrl.calculatePredictedSuccess(pMastery, item.difficulty);
      const hintLevel = this.diffCtrl.getHintLadderLevel(consecutiveMistakes, pMastery);
      const isTestGate = Boolean(state && state.pMastery >= 0.95 && state.hintFreeCorrectCount < 3);
      const isSkipAhead = Boolean(state && this.diffCtrl.canSkipAhead(state));

      let gapReason: string;
      if (isPrereqGap) {
        gapReason = 'remediating diagnosed prerequisite root gap';
      } else if (state?.state === 'not_learned') {
        gapReason = 'learning unmastered foundational competency';
      } else if (state?.state === 'partial') {
        gapReason = 'advancing partial competency towards mastery';
      } else {
        gapReason = 'retention review';
      }

      const rationaleText =
        `Selected ${item.skillCode} (${gapReason}) with ` +
        `${(predSuccess * 100).toFixed(0)}% predicted success in target flow zone ` +
        `(composite rank score: ${score.toFixed(3)}).`;

      decisions.push({
        questionId: item.questionId,
        skillId: item.skillId,
        skillCode: item.skillCode,
        questionType: item.questionType ?? 'mcq',
        difficulty: item.difficulty,
        predictedSuccess: Math.round(predSuccess * 10000) / 10000,
        score: Math.round(score * 10000) / 10000,
        scoreBreakdown: {
          gapPriority: Math.round(breakdown.gapPriority * 10000) / 10000,
          difficultyFit: Math.round(breakdown.difficultyFit * 10000) / 10000,
          recencyPenalty: Math.round(breakdown.recencyPenalty * 10000) / 10000,
          curriculumAlignment: Math.round(breakdown.curriculumAlignment * 10000) / 10000,
        },
        rationale: rationaleText,
        hintLadder: hintLevel,
        isTestGate,
        isSkipAhead,
      });
    }

    // Sort descending by total score
    decisions.sort((a, b) => b.score - a.score);
    return decisions;
  }
}
