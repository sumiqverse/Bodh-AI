import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ClassSuggestionsResponse } from '@bodhai/api-client';
import { SuggestionsDecisionHub } from '@/components/teacher/SuggestionsDecisionHub';
import { renderWithIntl } from '../test-utils';

const suggestions: ClassSuggestionsResponse = {
  class_id: 'class-1',
  suggestions: [
    {
      suggestion_id: 'sugg-1',
      student_id: 'student-1',
      student_name: 'Aarav Patel',
      skill_id: 'skill-1',
      skill_code: 'M-INT-02',
      skill_name: 'Integer Multiplication',
      title: 'Remediation Pathway for Integer Multiplication',
      evidence: { accuracy: 0.5, recurring_sign_error: true },
      rationale: 'Student consistently errs on negative times negative product signs.',
      recommended_action: 'Provide visual number-line animation followed by 3 scaffolded problems.',
      is_ai_suggestion: true,
      disclaimer: 'AI Pedagogical Suggestion — Teacher discretion required.',
      status: 'pending',
    },
  ],
};

describe('SuggestionsDecisionHub', () => {
  it('shows the human-readable Accepted status after accepting a suggestion', async () => {
    const onRecordDecision = vi.fn().mockResolvedValue(undefined);

    renderWithIntl(
      <SuggestionsDecisionHub suggestions={suggestions} onRecordDecision={onRecordDecision} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accept Suggestion' }));

    await waitFor(() => expect(screen.getByText('Accepted')).toBeDefined());
    expect(onRecordDecision).toHaveBeenCalledWith('sugg-1', 'accept');
  });
});
