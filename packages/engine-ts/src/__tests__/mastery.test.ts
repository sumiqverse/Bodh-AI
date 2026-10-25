import { describe, expect, it } from 'vitest';
import { calculateMasteryUpdate, type StudentSkillState } from '../mastery';

describe('Adaptive Mastery Engine', () => {
  const baseState: StudentSkillState = {
    skillId: 'math-grade-6-fractions',
    grade: 6,
    subject: 'mathematics',
    masteryScore: 0.5,
    attemptsCount: 3,
  };

  it('increases score upon correct answer', () => {
    const result = calculateMasteryUpdate(baseState, {
      skillId: 'math-grade-6-fractions',
      isCorrect: true,
      responseTimeSeconds: 15,
    });

    expect(result.updatedScore).toBeGreaterThan(0.5);
    expect(result.delta).toBe(0.075);
    expect(result.isMastered).toBe(false);
  });

  it('decreases score upon incorrect answer', () => {
    const result = calculateMasteryUpdate(baseState, {
      skillId: 'math-grade-6-fractions',
      isCorrect: false,
      responseTimeSeconds: 20,
    });

    expect(result.updatedScore).toBeLessThan(0.5);
    expect(result.delta).toBe(-0.05);
  });

  it('throws an error if skillId does not match', () => {
    expect(() =>
      calculateMasteryUpdate(baseState, {
        skillId: 'different-skill',
        isCorrect: true,
        responseTimeSeconds: 10,
      }),
    ).toThrowError(/Skill ID mismatch/);
  });
});
