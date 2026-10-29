/**
 * Sentry integration for BodhAI Web client.
 * Provides client-side and server-side error capturing with strict DPDP-compliant PII scrubbing.
 */

import { env } from './env';

export interface Breadcrumb {
  category: string;
  message: string;
  level?: 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}

export interface ScrubbedEventData {
  message?: string;
  url?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

/** Regex patterns for detecting and scrubbing potential PII */
const PII_PATTERNS = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PHONE_IN: /(?:\+91|0)?[6-9]\d{9}/g,
  BEARER_TOKEN: /Bearer\s+[a-zA-Z0-9._-]+/gi,
};

/**
 * Scrubs any sensitive personal data (email, phone number, bearer auth tokens)
 * from strings before sending to telemetry services.
 */
export function scrubPII(input: string): string {
  return input
    .replace(PII_PATTERNS.BEARER_TOKEN, 'Bearer [REDACTED]')
    .replace(PII_PATTERNS.EMAIL, '[EMAIL_REDACTED]')
    .replace(PII_PATTERNS.PHONE_IN, '[PHONE_REDACTED]');
}

/**
 * Recursively scrubs PII from metadata objects and nested dictionaries.
 */
export function scrubObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return scrubPII(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => scrubObject(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object') {
    const scrubbed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('auth') ||
        lowerKey.includes('cookie')
      ) {
        scrubbed[key] = '[REDACTED]';
      } else {
        scrubbed[key] = scrubObject(value);
      }
    }
    return scrubbed as unknown as T;
  }
  return obj;
}

/**
 * Captures an exception with environment tags and sanitized context.
 */
export function captureException(error: Error | unknown, context?: Record<string, unknown>): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const scrubbedMsg = scrubPII(errorMessage);
  const sanitizedContext = context ? scrubObject(context) : undefined;

  if (env.appEnv === 'development' || env.appEnv === 'test') {
    console.warn('[Telemetry Capture]', {
      message: scrubbedMsg,
      context: sanitizedContext,
      env: env.appEnv,
    });
    return;
  }

  // In production, when NEXT_PUBLIC_SENTRY_DSN is configured
  if (
    typeof window !== 'undefined' &&
    (window as unknown as { Sentry?: { captureException: (e: unknown, ctx?: unknown) => void } })
      .Sentry
  ) {
    (
      window as unknown as { Sentry: { captureException: (e: unknown, ctx?: unknown) => void } }
    ).Sentry.captureException(error, {
      extra: sanitizedContext,
      tags: {
        environment: env.appEnv,
      },
    });
  }
}

/**
 * Records a breadcrumb for user navigation or actions (strictly anonymized).
 */
export function addBreadcrumb(breadcrumb: Breadcrumb): void {
  const sanitized = {
    ...breadcrumb,
    message: scrubPII(breadcrumb.message),
    data: breadcrumb.data ? scrubObject(breadcrumb.data) : undefined,
  };

  if (env.appEnv === 'development') {
    // Keep dev console clean but informative
    // console.debug('[Breadcrumb]', sanitized);
    return;
  }

  if (
    typeof window !== 'undefined' &&
    (window as unknown as { Sentry?: { addBreadcrumb: (b: unknown) => void } }).Sentry
  ) {
    (window as unknown as { Sentry: { addBreadcrumb: (b: unknown) => void } }).Sentry.addBreadcrumb(
      sanitized,
    );
  }
}
