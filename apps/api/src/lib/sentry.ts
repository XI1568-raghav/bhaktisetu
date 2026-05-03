import * as Sentry from '@sentry/node';

/**
 * Initialise Sentry if SENTRY_DSN is present. Otherwise this is a no-op —
 * the app runs fine without monitoring during demo / local dev. Set the
 * env var on Render and Sentry starts capturing on next deploy.
 */
let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Tight sample rates — we're on the 5K errors/mo free tier.
    tracesSampleRate: 0.05,
    // Don't send PII unless explicitly opted in
    sendDefaultPii: false,
    // CI sets SENTRY_RELEASE=darshya@<sha> via .github/workflows/sentry-release.yml
    release: process.env.SENTRY_RELEASE,
  });
  initialized = true;
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export { Sentry };
