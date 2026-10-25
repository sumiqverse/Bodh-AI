export type GradeLevel = 6 | 7 | 8 | 9 | 10;

export type Subject = 'mathematics' | 'science' | 'english' | 'social_science';

export interface StudentSkillState {
  readonly skillId: string;
  readonly grade: GradeLevel;
  readonly subject: Subject;
  readonly masteryScore: number; // 0.0 to 1.0
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
 * Calculates updated mastery score using a bounded Bayesian learning update.
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

  // Bound score between 0.0 and 1.0
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
