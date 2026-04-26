// Sentry browser-side init.
//
// Next.js 15 + @sentry/nextjs v10 reads `instrumentation-client.ts`
// automatically on every page load. The older `sentry.client.config.ts`
// is no longer auto-loaded — we keep this single source of truth here.
//
// Activates only when NEXT_PUBLIC_SENTRY_DSN is set; otherwise no-op so
// dev / preview environments don't pollute monitoring.

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.05,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}
