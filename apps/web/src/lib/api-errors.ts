import { ApiRequestError } from '@bodhai/api-client';

export function isGuardianConsentError(error: Error | null | undefined): boolean {
  return (
    error instanceof ApiRequestError &&
    error.status === 403 &&
    /guardian consent/i.test(error.message)
  );
}
