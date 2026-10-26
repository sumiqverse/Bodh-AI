import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '../test-utils';
import { useTest } from '../../hooks/useTest';
import * as apiClientModule from '../../lib/api-client';

describe('useTest hook', () => {
  const mockSubmitAttempt = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(apiClientModule, 'getWebApiClient').mockReturnValue({
      submitAttempt: mockSubmitAttempt,
    } as unknown as ReturnType<typeof apiClientModule.getWebApiClient>);
  });

  it('progresses through 3 hint-free questions and verifies mastery', async () => {
    mockSubmitAttempt
      .mockResolvedValueOnce({
        attempt_id: 'test-att-01',
        is_correct: true,
        p_mastery_after: 0.8,
        explanation: '4y = 32 so y = 8',
      })
      .mockResolvedValueOnce({
        attempt_id: 'test-att-02',
        is_correct: true,
        p_mastery_after: 0.86,
        explanation: '3(x-2)=15 implies x=7',
      })
      .mockResolvedValueOnce({
        attempt_id: 'test-att-03',
        is_correct: true,
        p_mastery_after: 0.92,
        explanation: '4x = 16 so x = 4',
      });

    const { result } = renderHookWithProviders(() => useTest());

    expect(result.current.totalQuestions).toBe(3);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isCompleted).toBe(false);

    // Question 1
    await act(async () => {
      await result.current.submitAnswer('C');
    });
    expect(result.current.currentIndex).toBe(1);

    // Question 2
    await act(async () => {
      await result.current.submitAnswer('B');
    });
    expect(result.current.currentIndex).toBe(2);

    // Question 3
    await act(async () => {
      await result.current.submitAnswer('A');
    });

    await waitFor(() => {
      expect(result.current.isCompleted).toBe(true);
    });

    expect(result.current.result?.correctAnswers).toBe(3);
    expect(result.current.result?.isMastered).toBe(true);
    expect(result.current.result?.scorePercentage).toBe(100);
  });
});
