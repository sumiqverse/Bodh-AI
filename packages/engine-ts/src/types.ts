/**
 * Domain types and models for the on-device adaptive learning engine.
 * Pure TypeScript with zero external dependencies.
 */

export type MasteryState = 'not_learned' | 'partial' | 'mastered';

export enum HintLevel {
  NONE = 0,
  HINT = 1,
  WORKED_EXAMPLE = 2,
  PREREQUISITE_REVIEW = 3,
}

export interface BKTParams {
  readonly pInit: number; // L0: Prior probability of initial mastery
  readonly pTransit: number; // T: Transition / learning rate
  readonly pGuess: number; // G: Guess probability
  readonly pSlip: number; // S: Slip probability
}

export const DEFAULT_BKT_PARAMS: BKTParams = {
  pInit: 0.3,
  pTransit: 0.1,
  pGuess: 0.2,
  pSlip: 0.1,
};

export interface MasteryThresholds {
  readonly notLearnedMax: number; // default: 0.40
  readonly masteredMin: number; // default: 0.95
  readonly minObservations: number; // default: 3
  readonly rapidGuessTimeS: number; // default: 3.0
  readonly rapidGuessWeight: number; // default: 0.35
}

export const DEFAULT_MASTERY_THRESHOLDS: MasteryThresholds = {
  notLearnedMax: 0.4,
  masteredMin: 0.95,
  minObservations: 3,
  rapidGuessTimeS: 3.0,
  rapidGuessWeight: 0.35,
};

export interface DifficultyRules {
  readonly targetSuccessMin: number; // default: 0.70
  readonly targetSuccessMax: number; // default: 0.80
  readonly skipAheadThreshold: number; // default: 0.95
  readonly skipAheadConsecutive: number; // default: 2
  readonly testGateCount: number; // default: 3
}

export const DEFAULT_DIFFICULTY_RULES: DifficultyRules = {
  targetSuccessMin: 0.7,
  targetSuccessMax: 0.8,
  skipAheadThreshold: 0.95,
  skipAheadConsecutive: 2,
  testGateCount: 3,
};

export interface RankerWeights {
  readonly gapPriority: number; // default: 0.40
  readonly difficultyFit: number; // default: 0.30
  readonly recencyPenalty: number; // default: 0.20
  readonly curriculumAlignment: number; // default: 0.10
}

export const DEFAULT_RANKER_WEIGHTS: RankerWeights = {
  gapPriority: 0.4,
  difficultyFit: 0.3,
  recencyPenalty: 0.2,
  curriculumAlignment: 0.1,
};

export interface Observation {
  readonly skillId: string;
  readonly isCorrect: boolean;
  readonly timeSpentS: number;
  readonly hintLevel?: HintLevel;
  readonly questionId?: string;
  readonly timestamp?: string | Date;
}

export interface SkillState {
  readonly skillId: string;
  readonly pMastery: number;
  readonly state: MasteryState;
  readonly observationsCount: number;
  readonly correctCount: number;
  readonly consecutiveCorrect: number;
  readonly hintFreeCorrectCount: number;
  readonly rapidGuessesCount?: number;
  readonly lastAttemptAt?: string | Date | null;
  readonly rationale?: string;
}

export interface CandidateItem {
  readonly questionId: string;
  readonly skillId: string;
  readonly skillCode: string;
  readonly difficulty: number; // 1-5
  readonly questionType?: string;
  readonly code?: string;
  readonly curriculumOrder?: number;
  readonly promptSnippet?: string;
}

export interface ScoreBreakdown {
  readonly gapPriority: number;
  readonly difficultyFit: number;
  readonly recencyPenalty: number;
  readonly curriculumAlignment: number;
}

export interface NextItemDecision {
  readonly questionId: string;
  readonly skillId: string;
  readonly skillCode: string;
  readonly questionType: string;
  readonly difficulty: number;
  readonly predictedSuccess: number;
  readonly score: number;
  readonly scoreBreakdown: ScoreBreakdown;
  readonly rationale: string;
  readonly hintLadder: HintLevel;
  readonly isTestGate: boolean;
  readonly isSkipAhead: boolean;
}
