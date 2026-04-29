import * as Sentry from '@sentry/browser';

let initialized = false;

export function initSentryBrowser(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_ENV ?? 'production',
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  });
  initialized = true;
}

export function captureBrowserException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
