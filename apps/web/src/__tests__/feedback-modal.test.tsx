import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeedbackModal } from '../components/feedback-modal';

describe('FeedbackModal Component', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<FeedbackModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog and form elements when isOpen is true', () => {
    render(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Pilot Feedback')).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Comments/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Feedback/i })).toBeInTheDocument();
  });

  it('submits feedback and transitions to success state', async () => {
    render(<FeedbackModal isOpen={true} onClose={vi.fn()} />);

    const textarea = screen.getByLabelText(/Comments/i);
    fireEvent.change(textarea, { target: { value: 'Great math hints!' } });

    const submitBtn = screen.getByRole('button', { name: /Send Feedback/i });
    fireEvent.click(submitBtn);

    const successMsg = await screen.findByText('Thank You for Your Feedback!');
    expect(successMsg).toBeInTheDocument();
  });

  it('invokes onClose when clicking close button', () => {
    const handleClose = vi.fn();
    render(<FeedbackModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByLabelText('Close feedback modal');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
