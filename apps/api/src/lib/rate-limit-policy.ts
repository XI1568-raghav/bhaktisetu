/**
 * Per-prefix rate-limit policies, resolved from a route's registered URL.
 *
 * This lived inline in the server bootstrap and was dead: routes register with a
 * prefix (`server.register(authRoutes, { prefix: '/api/v1/auth' })`), so the
 * onRoute hook receives `/api/v1/auth/login`, while the matching tested
 * `url.startsWith('/auth/')`. No branch could match, and every route silently
 * fell back to the global `RATE_LIMIT_MAX || 100`.
 *
 * Measured on prod before the fix: `/api/v1/admin/users` answered
 * `x-ratelimit-limit: 100` where the admin branch intends 60, confirming that
 * nothing was being applied. The costly one is `/auth/*`, which intends 10/min
 * as brute-force protection on password login and was running at 100.
 *
 * It is a pure function here, with tests, because the previous fix moved the
 * hook's registration order and left the matching wrong — a bug that shape
 * cannot be caught by anything short of asserting on the URLs Fastify really
 * passes.
 */

export interface RateLimitPolicy {
  max: number;
  timeWindow: string;
}

const WINDOW = '1 minute';

/**
 * Strip the API version prefix so one table serves both prefixed routes and any
 * registered at the root. Only this exact prefix is removed; a path that merely
 * contains it elsewhere is left alone.
 */
function normalise(url: string): string {
  return url.startsWith('/api/v1/') ? url.slice('/api/v1'.length) : url;
}

/**
 * Segment-aware prefix test. `/authors` must not match `/auth` — a bare
 * `startsWith('/auth')` would have handed the login limit to any route whose
 * name merely begins with those characters.
 */
function underPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/**
 * The policy for a route, or `null` to leave it on the global default.
 *
 * `authMax` is passed in rather than read here so the caller owns env parsing
 * and this stays pure.
 */
export function resolveRateLimitPolicy(url: string, authMax: number): RateLimitPolicy | null {
  if (!url) return null;
  const path = normalise(url);

  // Brute-force protection on password login. The tightest limit on the API.
  if (underPrefix(path, '/auth')) return { max: authMax, timeWindow: WINDOW };

  // Every /ai/* route bills a third-party LLM. Capped as a group so a new
  // endpoint added under it inherits the limit instead of arriving uncapped.
  if (underPrefix(path, '/ai')) return { max: 20, timeWindow: WINDOW };

  // Shares the same LLM bill, under a different prefix.
  if (path === '/astrology/ask' || underPrefix(path, '/astrology/ask')) {
    return { max: 20, timeWindow: WINDOW };
  }

  // Money paths: order creation and payment verification.
  if (underPrefix(path, '/bookings/create-order') || underPrefix(path, '/bookings/verify-payment')) {
    return { max: 30, timeWindow: WINDOW };
  }
  if (underPrefix(path, '/donations/create-order')) return { max: 10, timeWindow: WINDOW };
  // Opens a live gateway order + a pending row per call; it sat on the global
  // 100/min with no money-path cap while its siblings above were capped.
  if (underPrefix(path, '/consultation/book') || underPrefix(path, '/consultation/verify-payment')) {
    return { max: 30, timeWindow: WINDOW };
  }

  // /digest/unsubscribe is unauthenticated by design — the link lands from an
  // email, possibly signed out — and it WRITES. Signing the identifier (CT-CONSENT-1)
  // stops enumeration, but an unauthenticated DB write on the global 100/min
  // default is still the wrong default for a consent endpoint.
  if (underPrefix(path, '/digest')) return { max: 10, timeWindow: WINDOW };

  if (underPrefix(path, '/admin')) return { max: 60, timeWindow: WINDOW };
  if (underPrefix(path, '/affiliate')) return { max: 60, timeWindow: WINDOW };

  return null;
}
