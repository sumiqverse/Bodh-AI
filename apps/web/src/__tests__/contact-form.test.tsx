import { describe, expect, it } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactForm } from '../components/contact-form';
import { renderWithIntl } from './test-utils';

describe('ContactForm Component', () => {
  it('renders all required form controls', () => {
    renderWithIntl(<ContactForm />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/i am a\.\.\./i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('displays validation error when submitting empty fields', async () => {
    renderWithIntl(<ContactForm />);

    const submitBtn = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/please enter your full name/i)).toBeInTheDocument();
    });
  });

  it('submits successfully when fields are valid', async () => {
    renderWithIntl(<ContactForm />);

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Anita Desai' },
    });
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'anita@school.edu.in' },
    });
    fireEvent.change(screen.getByLabelText(/i am a\.\.\./i), {
      target: { value: 'teacher' },
    });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: 'Inquiry regarding mathematics diagnostic pilot for Class 8.' },
    });

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/message sent/i)).toBeInTheDocument();
    });
  });
});
