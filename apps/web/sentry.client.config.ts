// Sentry client-side init.
// Loaded automatically by @sentry/nextjs when NEXT_PUBLIC_SENTRY_DSN is set.
// If unset, this is a no-op — the app runs fine without monitoring.

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Tight sample rate — we're on the 5K errors/mo free tier.
    tracesSampleRate: 0.05,
    // Replay only on errors, sparingly
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
  });
}
