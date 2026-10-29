import { describe, expect, it } from 'vitest';
import { addBreadcrumb, captureException, scrubObject, scrubPII } from '../lib/sentry';

describe('Sentry & Telemetry PII Scrubbing', () => {
  it('scrubs email addresses and phone numbers', () => {
    const raw = 'Error for student user test.student@gmail.com with phone +919876543210';
    const scrubbed = scrubPII(raw);
    expect(scrubbed).not.toContain('test.student@gmail.com');
    expect(scrubbed).not.toContain('9876543210');
    expect(scrubbed).toContain('[EMAIL_REDACTED]');
    expect(scrubbed).toContain('[PHONE_REDACTED]');
  });

  it('scrubs bearer auth tokens', () => {
    const raw = 'Request failed with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123';
    const scrubbed = scrubPII(raw);
    expect(scrubbed).toContain('Bearer [REDACTED]');
    expect(scrubbed).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });

  it('recursively scrubs sensitive keys from objects', () => {
    const metadata = {
      endpoint: '/api/v1/auth/login',
      password: 'SuperSecretPassword123!',
      authToken: 'eyJhbGciOi...',
      nested: {
        studentEmail: 'rahul.kumar@school.in',
        score: 85,
      },
    };

    const cleaned = scrubObject(metadata);
    expect(cleaned.password).toBe('[REDACTED]');
    expect(cleaned.authToken).toBe('[REDACTED]');
    expect(cleaned.nested.studentEmail).toBe('[EMAIL_REDACTED]');
    expect(cleaned.nested.score).toBe(85);
  });

  it('captureException and addBreadcrumb execute safely without throwing', () => {
    expect(() => {
      captureException(new Error('Test telemetry failure with email foo@bar.com'), {
        userId: 'student-123',
      });
      addBreadcrumb({
        category: 'navigation',
        message: 'Student clicked quiz start with email user@school.org',
      });
    }).not.toThrow();
  });
});
