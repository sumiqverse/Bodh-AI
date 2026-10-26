import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '../test-utils';
import { useDiagnostic } from '../../hooks/useDiagnostic';
import * as apiClientModule from '../../lib/api-client';

describe('useDiagnostic hook', () => {
  const mockStartDiagnostic = vi.fn();
  const mockProgressDiagnostic = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(apiClientModule, 'getWebApiClient').mockReturnValue({
      startDiagnostic: mockStartDiagnostic,
      progressDiagnostic: mockProgressDiagnostic,
    } as unknown as ReturnType<typeof apiClientModule.getWebApiClient>);
  });

  it('initializes and starts an adaptive diagnostic session', async () => {
    mockStartDiagnostic.mockResolvedValueOnce({
      session_id: 'session-cat-42',
      is_completed: false,
      questions_answered: 0,
      next_item: {
        question_id: 'q-cat-01',
        code: 'NCERT-MATH-C8-CH01-Q01',
        skill_id: 'skill-01',
        skill_code: 'NCERT-MATH-C8-SK01',
        difficulty: 1,
        prompt: 'What is the additive inverse of $\\frac{2}{8}$?',
        options: [
          { id: 'A', text: '$-\\frac{2}{8}$' },
          { id: 'B', text: '$\\frac{8}{2}$' },
        ],
      },
      summary: null,
    });

    const { result } = renderHookWithProviders(() => useDiagnostic({ totalTarget: 15 }));

    await waitFor(() => {
      expect(result.current.sessionId).toBe('session-cat-42');
    });

    expect(result.current.questionNumber).toBe(1);
    expect(result.current.totalQuestions).toBe(15);
    expect(result.current.isCompleted).toBe(false);
    expect(result.current.currentItem?.prompt).toContain('additive inverse');
  });

  it('submits student answer and advances question without exposing scores mid-test', async () => {
    mockStartDiagnostic.mockResolvedValueOnce({
      session_id: 'session-cat-42',
      is_completed: false,
      questions_answered: 0,
      next_item: {
        question_id: 'q-cat-01',
        code: 'NCERT-MATH-C8-CH01-Q01',
        skill_id: 'skill-01',
        skill_code: 'NCERT-MATH-C8-SK01',
        difficulty: 1,
        prompt: 'Question 1',
        options: [{ id: 'A', text: 'Opt A' }],
      },
    });

    mockProgressDiagnostic.mockResolvedValueOnce({
      session_id: 'session-cat-42',
      is_completed: false,
      questions_answered: 1,
      next_item: {
        question_id: 'q-cat-02',
        code: 'NCERT-MATH-C8-CH01-Q02',
        skill_id: 'skill-02',
        skill_code: 'NCERT-MATH-C8-SK02',
        difficulty: 2,
        prompt: 'Question 2',
        options: [{ id: 'B', text: 'Opt B' }],
      },
    });

    const { result } = renderHookWithProviders(() => useDiagnostic({ totalTarget: 15 }));

    await waitFor(() => {
      expect(result.current.sessionId).toBe('session-cat-42');
    });

    await act(async () => {
      await result.current.submitAnswer('A', 5000);
    });

    expect(mockProgressDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: 'session-cat-42',
        question_id: 'q-cat-01',
        selected_answer: 'A',
        time_spent_ms: 5000,
      }),
      undefined,
    );

    expect(result.current.questionNumber).toBe(2);
    expect(result.current.currentItem?.prompt).toBe('Question 2');
    // Ensure no interim score or ranking is exposed
    expect(result.current.summary).toBeNull();
  });
});
