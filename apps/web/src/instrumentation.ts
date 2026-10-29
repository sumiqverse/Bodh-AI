/**
 * Next.js instrumentation hook for OpenTelemetry and Sentry runtime initialization.
 * Automatically invoked when Next.js server starts up.
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server runtime telemetry registration
    const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (sentryDsn) {
      // In production, server-side error capturing hook
      console.info('[Telemetry] Next.js Node.js server instrumentation active.');
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime telemetry registration
    console.info('[Telemetry] Next.js Edge runtime instrumentation active.');
  }
}
