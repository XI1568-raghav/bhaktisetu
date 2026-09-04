import * as Sentry from '@sentry/react-native';

let initialized = false;

export function initSentryMobile(): void {
  if (initialized) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    // Accept both spellings. eas.json's `testflight` profile sets
    // EXPO_PUBLIC_ENVIRONMENT while this read only ever looked at
    // EXPO_PUBLIC_ENV, so every TestFlight build silently reported its crashes
    // as `production` — mixing release-candidate noise into production data.
    // Reading both is the fix that cannot break either spelling later.
    environment:
      process.env.EXPO_PUBLIC_ENV ??
      process.env.EXPO_PUBLIC_ENVIRONMENT ??
      'production',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    // CI sets EXPO_PUBLIC_SENTRY_RELEASE=darshya@<sha> via .github/workflows/sentry-release.yml
    release: process.env.EXPO_PUBLIC_SENTRY_RELEASE,
  });
  initialized = true;
}

export function captureMobileException(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (!initialized) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
