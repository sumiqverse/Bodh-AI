import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '@bodhai/api-client';
import { isGuardianConsentError } from '@/lib/api-errors';

describe('isGuardianConsentError', () => {
  it('detects the guardian consent 403 response', () => {
    const error = new ApiRequestError(
      "API Error [403]: Guardian consent (version '2026.1') is required for student '123' before recording attempts under DPDP Act 2023.",
      403,
    );

    expect(isGuardianConsentError(error)).toBe(true);
  });

  it('does not treat an unrelated 403 as a consent error', () => {
    expect(isGuardianConsentError(new ApiRequestError('API Error [403]: Access denied', 403))).toBe(
      false,
    );
  });

  it('does not treat a server error as a consent error', () => {
    expect(
      isGuardianConsentError(new ApiRequestError('API Error [500]: Guardian consent failed', 500)),
    ).toBe(false);
  });
});
