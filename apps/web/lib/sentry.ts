declare global {
  interface Window {
    Sentry?: {
      init: (opts: Record<string, unknown>) => void;
      captureException: (err: unknown, ctx?: Record<string, unknown>) => void;
    };
  }
}

let initialized = false;

export function initSentryBrowser(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://browser.sentry-cdn.com/8.55.0/bundle.min.js';
  s.crossOrigin = 'anonymous';
  s.onload = () => {
    window.Sentry?.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_ENV ?? 'production',
      tracesSampleRate: 0.05,
      sendDefaultPii: false,
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    });
    initialized = true;
  };
  document.head.appendChild(s);
}

export function captureBrowserException(error: unknown, context?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  window.Sentry?.captureException(error, context ? { extra: context } : undefined);
}
