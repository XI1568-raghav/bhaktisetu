// Next.js instrumentation hook — runs once at server startup.
// We use it to initialise Sentry on the server (and edge) runtimes.
//
// Required by @sentry/nextjs v10 — without this file, only the client
// SDK is wired up, and server-side errors never reach Sentry.

export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV ?? 'production',
      tracesSampleRate: 0.05,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV ?? 'production',
      tracesSampleRate: 0.05,
    });
  }
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routerKind: 'Pages Router' | 'App Router'; routePath: string; routeType: 'render' | 'route' | 'action' | 'middleware' },
) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  // captureRequestError catches unrecoverable App Router errors (server
  // actions, route handlers, RSC). Cast args because Next's published
  // types lag behind the function signature in some versions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Sentry as unknown as { captureRequestError: (e: unknown, r: unknown, c: unknown) => void }).captureRequestError(err, request, context);
}
