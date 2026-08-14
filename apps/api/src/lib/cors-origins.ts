/**
 * The CORS allowlist, as a pure function so it can be asserted without booting
 * the server (src/server.ts calls bootstrap() at import time).
 *
 * A11Y-16 (prod sweep 2026-08-12): the development fallback listed only the
 * `localhost` spelling. A page served from http://127.0.0.1:3000 got HTTP 200
 * with no `access-control-allow-origin` header at all, so the browser blocked
 * every client fetch. The booking wizard then rendered its "We couldn't reach
 * the catalog" state — at HTTP 200, with a plausible-looking page — and two
 * accessibility passes were spent auditing that error screen instead of the
 * four-step form. 127.0.0.1 and localhost are the same host; only the string
 * differed.
 *
 * Production is unchanged: CORS_ORIGIN is required and is the only source.
 */

/** Local origins the dev/test harness may be served from. */
export const LOCAL_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
] as const;

export function resolveCorsOrigins(env: {
  NODE_ENV?: string | undefined;
  CORS_ORIGIN?: string | undefined;
}): string[] {
  const explicit = env.CORS_ORIGIN?.split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (explicit && explicit.length > 0) return explicit;

  if (env.NODE_ENV === 'production') {
    // Explicit fail in prod — refuse to start with a wide-open default.
    throw new Error(
      'CORS_ORIGIN env var is required in production. Set it to the comma-separated list of allowed origins.',
    );
  }

  return [...LOCAL_DEV_ORIGINS];
}
