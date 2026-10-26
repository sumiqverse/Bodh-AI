import { describe, expect, it } from 'vitest';
import {
  clampProbability,
  computePosterior,
  DEFAULT_BKT_PARAMS,
  DEFAULT_DIFFICULTY_RULES,
  DifficultyController,
  HintLevel,
  MasteryStateMachine,
  predictSuccess,
  RecommendationRanker,
  type CandidateItem,
  type SkillState,
} from '../index';

describe('BKT Unit Functions', () => {
  it('clamps invalid values to valid probability bounds', () => {
    expect(clampProbability(-0.5)).toBe(0.0);
    expect(clampProbability(1.5)).toBe(1.0);
    expect(clampProbability(Number.NaN)).toBe(0.5);
    expect(clampProbability(0.72)).toBe(0.72);
  });

  it('predicts success monotonically with higher mastery', () => {
    const lowPred = predictSuccess(0.2, DEFAULT_BKT_PARAMS);
    const highPred = predictSuccess(0.8, DEFAULT_BKT_PARAMS);
    expect(highPred).toBeGreaterThan(lowPred);
  });

  it('down-weights rapid guessing penalty on incorrect responses', () => {
    const regularPost = computePosterior(0.5, false, DEFAULT_BKT_PARAMS, false);
    const rapidPost = computePosterior(0.5, false, DEFAULT_BKT_PARAMS, true, 0.35);
    expect(rapidPost).toBeGreaterThan(regularPost);
  });
});

describe('DifficultyController', () => {
  const diffCtrl = new DifficultyController(DEFAULT_DIFFICULTY_RULES);

  it('adjusts predicted success for easy vs hard questions', () => {
    const easyPred = diffCtrl.calculatePredictedSuccess(0.5, 1);
    const baselinePred = diffCtrl.calculatePredictedSuccess(0.5, 3);
    const hardPred = diffCtrl.calculatePredictedSuccess(0.5, 5);

    expect(easyPred).toBeGreaterThan(baselinePred);
    expect(baselinePred).toBeGreaterThan(hardPred);
  });

  it('returns high difficulty fit near flow state target (0.75)', () => {
    const optimalFit = diffCtrl.calculateDifficultyFit(0.75);
    const farFit = diffCtrl.calculateDifficultyFit(0.2);

    expect(optimalFit).toBe(1.0);
    expect(farFit).toBeLessThan(0.2);
  });

  it('escalates hint ladder levels as mistakes accumulate', () => {
    expect(diffCtrl.getHintLadderLevel(0, 0.5)).toBe(HintLevel.NONE);
    expect(diffCtrl.getHintLadderLevel(1, 0.5)).toBe(HintLevel.HINT);
    expect(diffCtrl.getHintLadderLevel(2, 0.5)).toBe(HintLevel.WORKED_EXAMPLE);
    expect(diffCtrl.getHintLadderLevel(3, 0.5)).toBe(HintLevel.PREREQUISITE_REVIEW);
    // Severe gap escalation
    expect(diffCtrl.getHintLadderLevel(2, 0.2)).toBe(HintLevel.PREREQUISITE_REVIEW);
  });
});

describe('RecommendationRanker', () => {
  const ranker = new RecommendationRanker();

  it('ranks items excluding already attempted questions and prioritizing gaps', () => {
    const candidates: CandidateItem[] = [
      {
        questionId: 'Q-01',
        skillId: 'SKILL-01',
        skillCode: 'MATH-INT-01',
        difficulty: 3,
        curriculumOrder: 1,
      },
      {
        questionId: 'Q-02',
        skillId: 'SKILL-02',
        skillCode: 'MATH-INT-02',
        difficulty: 3,
        curriculumOrder: 2,
      },
    ];

    const skillStates: Record<string, SkillState> = {
      'SKILL-01': {
        skillId: 'SKILL-01',
        pMastery: 0.25,
        state: 'not_learned',
        observationsCount: 2,
        correctCount: 0,
        consecutiveCorrect: 0,
        hintFreeCorrectCount: 0,
      },
      'SKILL-02': {
        skillId: 'SKILL-02',
        pMastery: 0.95,
        state: 'mastered',
        observationsCount: 5,
        correctCount: 5,
        consecutiveCorrect: 5,
        hintFreeCorrectCount: 3,
      },
    };

    const attempted = new Set<string>(['Q-01']);
    const decisions = ranker.rankItems(candidates, skillStates, attempted);

    expect(decisions).toHaveLength(1);
    expect(decisions[0]?.questionId).toBe('Q-02');
  });
});

describe('MasteryStateMachine skip-ahead and test-gate', () => {
  const machine = new MasteryStateMachine();

  it('requires 3 observations before transitioning out of initial state', () => {
    const initial: SkillState = {
      skillId: 'SKILL-A',
      pMastery: 0.3,
      state: 'not_learned',
      observationsCount: 0,
      correctCount: 0,
      consecutiveCorrect: 0,
      hintFreeCorrectCount: 0,
    };

    const step1 = machine.processObservation(initial, {
      skillId: 'SKILL-A',
      isCorrect: true,
      timeSpentS: 10,
    });
    expect(step1.state).toBe('not_learned');
    expect(step1.observationsCount).toBe(1);

    const step2 = machine.processObservation(step1, {
      skillId: 'SKILL-A',
      isCorrect: true,
      timeSpentS: 12,
    });
    expect(step2.state).toBe('not_learned');
    expect(step2.observationsCount).toBe(2);
  });
});
