import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '../test-utils';
import { useSolve } from '../../hooks/useSolve';
import * as apiClientModule from '../../lib/api-client';

describe('useSolve hook', () => {
  const mockSubmitAttempt = vi.fn();
  const mockListQuestions = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(apiClientModule, 'getWebApiClient').mockReturnValue({
      submitAttempt: mockSubmitAttempt,
      listQuestions: mockListQuestions,
    } as unknown as ReturnType<typeof apiClientModule.getWebApiClient>);
  });

  it('manages progressive 3-level hint ladder', async () => {
    const { result } = renderHookWithProviders(() => useSolve());

    await waitFor(() => {
      expect(result.current.question).toBeDefined();
    });

    expect(result.current.hintLevel).toBe(0);
    expect(result.current.activeHints).toHaveLength(0);

    // Request Hint 1
    act(() => {
      result.current.requestHint();
    });
    expect(result.current.hintLevel).toBe(1);
    expect(result.current.activeHints).toHaveLength(1);

    // Request Hint 2
    act(() => {
      result.current.requestHint();
    });
    expect(result.current.hintLevel).toBe(2);
    expect(result.current.activeHints).toHaveLength(2);

    // Request Hint 3
    act(() => {
      result.current.requestHint();
    });
    expect(result.current.hintLevel).toBe(3);
    expect(result.current.activeHints).toHaveLength(3);

    // Attempting to exceed max hints stays capped at 3
    act(() => {
      result.current.requestHint();
    });
    expect(result.current.hintLevel).toBe(3);
  });

  it('submits solution with idempotency key and returns calm explanation', async () => {
    mockSubmitAttempt.mockResolvedValueOnce({
      attempt_id: 'att-123',
      is_correct: true,
      p_mastery_after: 0.72,
      explanation: 'Subtracting 2x from both sides gives 3x = 15, so x = 5.',
      rationale: 'Concept mastered.',
      is_duplicate: false,
    });

    const { result } = renderHookWithProviders(() => useSolve());

    await waitFor(() => {
      expect(result.current.question).toBeDefined();
    });

    let res;
    await act(async () => {
      res = await result.current.submitAnswer('B');
    });

    expect(mockSubmitAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        question_id: result.current.question?.id,
        selected_answer: 'B',
        idempotency_key: expect.any(String),
      }),
      undefined,
      undefined,
    );

    expect(result.current.hasSubmitted).toBe(true);
    expect(result.current.submissionResult?.is_correct).toBe(true);
    expect(result.current.submissionResult?.explanation).toContain('Subtracting 2x');
    expect(res).toBeDefined();
  });
});
