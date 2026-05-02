import * as Sentry from '@sentry/react-native';

let initialized = false;

export function initSentryMobile(): void {
  if (initialized) return;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_ENV ?? 'production',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
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
