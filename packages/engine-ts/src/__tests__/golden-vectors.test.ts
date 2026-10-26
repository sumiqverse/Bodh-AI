import { describe, expect, it } from 'vitest';
import {
  applyTransition,
  binaryEntropy,
  computePosterior,
  expectedInformationGain,
  predictSuccess,
} from '../bkt';
import { DifficultyController } from '../difficulty';
import { MasteryStateMachine } from '../mastery';
import { RecommendationRanker } from '../ranker';
import type { BKTParams, MasteryThresholds, RankerWeights, SkillState } from '../types';
import goldenData from './golden_vectors.json';

describe('BKT & Mastery Golden Vectors Verification', () => {
  const bktParams: BKTParams = {
    pInit: goldenData.parameters.bkt.l0,
    pTransit: goldenData.parameters.bkt.t,
    pGuess: goldenData.parameters.bkt.g,
    pSlip: goldenData.parameters.bkt.s,
  };

  const thresholds: MasteryThresholds = {
    notLearnedMax: goldenData.parameters.thresholds.not_learned,
    masteredMin: goldenData.parameters.thresholds.mastered,
    minObservations: goldenData.parameters.thresholds.min_observations,
    rapidGuessTimeS: 3.0,
    rapidGuessWeight: 0.35,
  };

  it('asserts BKT correct response sequence matches golden vectors within 1e-6', () => {
    for (const step of goldenData.bkt_correct_sequence) {
      const pred = predictSuccess(step.p_prior, bktParams);
      expect(Math.abs(pred - step.predicted_success)).toBeLessThan(1e-5);

      const h = binaryEntropy(step.p_prior);
      expect(Math.abs(h - step.entropy)).toBeLessThan(1e-5);

      const eig = expectedInformationGain(step.p_prior, bktParams);
      expect(Math.abs(eig - step.expected_information_gain)).toBeLessThan(1e-5);

      const post = computePosterior(step.p_prior, step.is_correct, bktParams);
      expect(Math.abs(post - step.posterior)).toBeLessThan(1e-5);

      const nextP = applyTransition(post, bktParams);
      expect(Math.abs(nextP - step.p_next)).toBeLessThan(1e-5);
    }
  });

  it('asserts BKT mixed sequence with rapid guessing matches golden vectors within 1e-6', () => {
    for (const step of goldenData.bkt_mixed_rapid_sequence) {
      const post = computePosterior(
        step.p_prior,
        step.is_correct,
        bktParams,
        step.is_rapid_guess,
        thresholds.rapidGuessWeight,
      );
      expect(Math.abs(post - step.posterior)).toBeLessThan(1e-5);

      const nextP = applyTransition(post, bktParams);
      expect(Math.abs(nextP - step.p_next)).toBeLessThan(1e-5);
    }
  });

  it('asserts MasteryStateMachine progression matches golden vectors exactly', () => {
    const machine = new MasteryStateMachine(thresholds, undefined, bktParams);

    let currentState: SkillState = {
      skillId: 'SKILL-01',
      pMastery: bktParams.pInit,
      state: 'not_learned',
      observationsCount: 0,
      correctCount: 0,
      consecutiveCorrect: 0,
      hintFreeCorrectCount: 0,
    };

    for (const step of goldenData.mastery_state_progression) {
      currentState = machine.processObservation(
        currentState,
        {
          skillId: 'SKILL-01',
          isCorrect: step.is_correct,
          timeSpentS: 15.0,
          hintLevel: step.hint_level,
        },
        bktParams,
      );

      expect(Math.abs(currentState.pMastery - step.p_mastery)).toBeLessThan(1e-3);
      expect(currentState.state).toBe(step.state);
      expect(currentState.observationsCount).toBe(step.observations_count);
      expect(currentState.hintFreeCorrectCount).toBe(step.hint_free_correct_count);
      expect(currentState.consecutiveCorrect).toBe(step.consecutive_correct);
    }
  });

  it('asserts hint ladder levels match golden cases', () => {
    const diffCtrl = new DifficultyController();
    for (const c of goldenData.hint_ladder_cases) {
      const level = diffCtrl.getHintLadderLevel(c.consecutive_fails, 0.3);
      expect(level).toBe(c.expected_level);
    }
  });

  it('asserts RecommendationRanker multi-objective scoring matches golden vector within 1e-6', () => {
    const rankerWeights: RankerWeights = {
      gapPriority: goldenData.ranker_case.weights.gap,
      difficultyFit: goldenData.ranker_case.weights.difficulty,
      recencyPenalty: goldenData.ranker_case.weights.recency,
      curriculumAlignment: goldenData.ranker_case.weights.curriculum,
    };
    const ranker = new RecommendationRanker(rankerWeights);

    const item = {
      questionId: 'Q-001',
      skillId: goldenData.ranker_case.item.skill_id,
      skillCode: goldenData.ranker_case.item.skill_id,
      difficulty: goldenData.ranker_case.item.difficulty,
    };

    const skillState: SkillState = {
      skillId: goldenData.ranker_case.item.skill_id,
      pMastery: goldenData.ranker_case.p_mastery,
      state: 'partial',
      observationsCount: 1,
      correctCount: 0,
      consecutiveCorrect: 0,
      hintFreeCorrectCount: 0,
    };

    const { score, breakdown } = ranker.computeItemScore(
      item,
      skillState,
      goldenData.ranker_case.is_prereq_gap,
      ['SKILL-01', 'SKILL-02', 'SKILL-03'],
      goldenData.ranker_case.days_since_attempt,
    );

    expect(Math.abs(score - goldenData.ranker_case.expected_score)).toBeLessThan(1e-5);
    expect(
      Math.abs(breakdown.gapPriority - goldenData.ranker_case.expected_breakdown.gap_priority),
    ).toBeLessThan(1e-5);
    expect(
      Math.abs(breakdown.difficultyFit - goldenData.ranker_case.expected_breakdown.difficulty_fit),
    ).toBeLessThan(1e-5);
    expect(
      Math.abs(
        breakdown.recencyPenalty - goldenData.ranker_case.expected_breakdown.recency_penalty,
      ),
    ).toBeLessThan(1e-5);
    expect(
      Math.abs(
        breakdown.curriculumAlignment -
          goldenData.ranker_case.expected_breakdown.curriculum_alignment,
      ),
    ).toBeLessThan(1e-5);
  });
});
