import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '../test-utils';
import { useSkillMap } from '../../hooks/useSkillMap';
import * as apiClientModule from '../../lib/api-client';

describe('useSkillMap hook', () => {
  const mockGetCurriculumTopics = vi.fn();
  const mockListMastery = vi.fn();
  const mockGetNextItem = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(apiClientModule, 'getAuthToken').mockReturnValue('mock-token');
    vi.spyOn(apiClientModule, 'getCurrentUser').mockReturnValue({
      id: 'user-01',
      role: 'student',
      full_name: 'Test Student',
      is_minor: false,
      preferred_language: 'en',
      created_at: '',
    });
    vi.spyOn(apiClientModule, 'getWebApiClient').mockReturnValue({
      getCurriculumTopics: mockGetCurriculumTopics,
      listMastery: mockListMastery,
      getNextItem: mockGetNextItem,
    } as unknown as ReturnType<typeof apiClientModule.getWebApiClient>);
  });

  it('categorizes skills into three mastery states and provides a single Next action', async () => {
    mockGetCurriculumTopics.mockResolvedValueOnce([
      {
        id: 'topic-01',
        code: 'NCERT-MATH-C8-CH01',
        name: 'Rational Numbers',
        skills: [
          {
            id: 'skill-01',
            code: 'SK-01',
            name: 'Properties of Rational Numbers',
            difficulty: 1,
            topic_id: 'topic-01',
          },
          {
            id: 'skill-02',
            code: 'SK-02',
            name: 'Representation on Number Line',
            difficulty: 2,
            topic_id: 'topic-01',
          },
          {
            id: 'skill-03',
            code: 'SK-03',
            name: 'Rational Numbers between Two Rationals',
            difficulty: 3,
            topic_id: 'topic-01',
          },
        ],
      },
    ]);

    mockListMastery.mockResolvedValueOnce([
      {
        skill_id: 'skill-01',
        p_mastery: 0.9,
        confidence: 0.95,
        attempts_count: 5,
        correct_count: 5,
        state: 'mastered',
      },
      {
        skill_id: 'skill-02',
        p_mastery: 0.5,
        confidence: 0.6,
        attempts_count: 2,
        correct_count: 1,
        state: 'partial',
      },
    ]);

    mockGetNextItem.mockResolvedValueOnce({
      question_id: 'q-rec-01',
      code: 'Q-REC-01',
      skill_id: 'skill-02',
      skill_code: 'SK-02',
      difficulty: 2,
      question_type: 'mcq',
      prompt: 'Next problem prompt',
      hints: [],
      predicted_success: 0.65,
      score: 1.5,
      score_breakdown: {},
      hint_ladder: 1,
      is_test_gate: false,
      is_skip_ahead: false,
      rationale: 'Reviewing partial skill to attain mastery',
    });

    const { result } = renderHookWithProviders(() => useSkillMap('NCERT-MATH-C8'));

    await waitFor(() => {
      expect(result.current.skills).toHaveLength(3);
    });

    // Check 3 mastery states
    const skill1 = result.current.skills.find((s) => s.id === 'skill-01');
    const skill2 = result.current.skills.find((s) => s.id === 'skill-02');
    const skill3 = result.current.skills.find((s) => s.id === 'skill-03');

    expect(skill1?.state).toBe('mastered');
    expect(skill2?.state).toBe('partial');
    expect(skill3?.state).toBe('not_learned');

    expect(result.current.summary.masteredCount).toBe(1);
    expect(result.current.summary.partialCount).toBe(1);
    expect(result.current.summary.notLearnedCount).toBe(1);

    // Single clear Next action
    expect(result.current.nextAction).toBeDefined();
    expect(result.current.nextAction?.skillId).toBe('skill-02');
    expect(result.current.nextAction?.rationale).toBe('Reviewing partial skill to attain mastery');
  });
});
