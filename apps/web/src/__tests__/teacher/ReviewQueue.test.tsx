import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReviewQueuePage from '@/app/[locale]/admin/review-queue/page';

const api = vi.hoisted(() => ({
  listReviewQuestions: vi.fn(),
  saveReviewQuestion: vi.fn(),
  publishReviewedQuestion: vi.fn(),
}));
vi.mock('@/lib/api-client', () => ({
  getWebApiClient: () => api,
  getAuthToken: () => 'test-token',
}));
vi.mock('@/components/admin/AdminNav', () => ({ AdminNav: () => null }));

const question = {
  id: 'question-1',
  code: 'Q-1',
  skill_id: 'skill-1',
  difficulty: 2,
  status: 'draft',
  needs_teacher_review: true,
  prompt: 'Original question',
  options: [
    { id: 'A', text: 'Original option' },
    { id: 'B', text: 'Other option' },
  ],
  verified_answer: 'A',
  worked_solution: 'Original solution',
  explanation: null,
  hints: [],
};

describe('question review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listReviewQuestions.mockResolvedValue([question]);
    api.saveReviewQuestion.mockResolvedValue(question);
    api.publishReviewedQuestion.mockResolvedValue(question);
  });

  it('saves corrections before publishing', async () => {
    render(<ReviewQueuePage />);
    fireEvent.click(await screen.findByRole('button', { name: /Q-1/ }));
    fireEvent.change(screen.getByLabelText('Question'), {
      target: { value: 'Corrected question' },
    });
    fireEvent.change(screen.getByLabelText('Option A'), { target: { value: 'Corrected option' } });
    fireEvent.change(screen.getByLabelText('Correct answer'), { target: { value: 'B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve and publish' }));
    await screen.findByText('Question saved and published.');
    expect(api.saveReviewQuestion).toHaveBeenCalledWith(
      'question-1',
      expect.objectContaining({
        prompt: 'Corrected question',
        verified_answer: 'B',
        options: [
          { id: 'A', text: 'Corrected option', is_correct: false },
          { id: 'B', text: 'Other option', is_correct: true },
        ],
      }),
      'test-token',
    );
    expect(api.saveReviewQuestion.mock.invocationCallOrder[0]!).toBeLessThan(
      api.publishReviewedQuestion.mock.invocationCallOrder[0]!,
    );
  });

  it('does not publish if saving fails', async () => {
    api.saveReviewQuestion.mockRejectedValue(new Error('Save failed'));
    render(<ReviewQueuePage />);
    fireEvent.click(await screen.findByRole('button', { name: /Q-1/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve and publish' }));
    await screen.findByText('Save failed');
    expect(api.publishReviewedQuestion).not.toHaveBeenCalled();
  });

  it('can load and edit published questions', async () => {
    api.listReviewQuestions.mockResolvedValue([
      { ...question, status: 'published', needs_teacher_review: false },
    ]);
    render(<ReviewQueuePage />);
    fireEvent.change(await screen.findByLabelText('Show'), { target: { value: 'all' } });
    fireEvent.click(await screen.findByRole('button', { name: /Q-1/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Changes saved to the published question.');
    expect(api.listReviewQuestions).toHaveBeenCalledWith(0, 'test-token', false);
    expect(api.publishReviewedQuestion).not.toHaveBeenCalled();
  });

  it('uses the correct option flag when a legacy answer field is empty', async () => {
    api.listReviewQuestions.mockResolvedValue([
      {
        ...question,
        verified_answer: '',
        options: [
          { id: 'A', text: 'First', is_correct: false },
          { id: 'B', text: 'Second', is_correct: true },
        ],
      },
    ]);
    render(<ReviewQueuePage />);
    fireEvent.click(await screen.findByRole('button', { name: /Q-1/ }));
    expect((screen.getByLabelText('Correct answer') as HTMLSelectElement).value).toBe('B');
  });
});
