/**
 * API base URL for the Fastify backend.
 *
 * Kept in its own module (separate from `lib/supabase.ts`) so that consumers
 * who only need the URL don't drag `@supabase/supabase-js` into the client bundle.
 *
 * Auto-appends `/api/v1` if the env var doesn't include it, so callers can
 * write `${API_BASE_URL}/ai/chat` without thinking about the prefix.
 */
function resolve(): string {
 const candidate = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
 return candidate.endsWith('/api/v1')
 ? candidate
 : `${candidate.replace(/\/$/, '')}/api/v1`;
}

export const API_BASE_URL = resolve();

/**
 * How long an auth call may stall before we give up on it.
 *
 * Generous on purpose — a slow Indian mobile connection on a cold Render dyno
 * can legitimately take 10s+. This is a backstop against a hung socket, not a
 * performance budget.
 */
export const AUTH_FETCH_TIMEOUT_MS = 20_000;

/**
 * `fetch` with a hard timeout.
 *
 * WHY THIS EXISTS. Every auth call in this app used a bare `fetch`, and `fetch`
 * has no timeout: if the connection stalls — flaky mobile, captive portal, a
 * half-open socket, a proxy that accepts and never replies — the promise never
 * settles. Nothing after the `await` ever runs, so the caller's
 * `setIsSubmitting(false)` is never reached and no error is ever set. The user
 * is left watching a spinner turn forever with no message and no way to retry.
 *
 * That was reported from production on 2026-08-11 against BOTH email/password
 * sign-in (auth-context.signInWithCredentials) and the Google callback
 * (/auth/callback → POST /auth/google/sync), which is exactly the pair of call
 * sites this covers: same defect, two doors.
 *
 * An AbortController converts "hangs forever, says nothing" into "fails in 20s
 * with something the user can act on" — the only honest outcome of a request
 * that is never coming back.
 */
export async function fetchWithTimeout(
 input: RequestInfo | URL,
 init: RequestInit = {},
 timeoutMs: number = AUTH_FETCH_TIMEOUT_MS,
): Promise<Response> {
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), timeoutMs);
 try {
  return await fetch(input, { ...init, signal: controller.signal });
 } finally {
  clearTimeout(timer);
 }
}

/**
 * True when a thrown value is a stalled/failed network call rather than a
 * rejection the server actually sent. Callers use this to avoid telling a user
 * "invalid email or password" when the truth is "we never reached the server".
 */
export function isNetworkFailure(err: unknown): boolean {
 if (err instanceof DOMException && err.name === 'AbortError') return true;
 return err instanceof TypeError; // fetch rejects with TypeError on network error
}

/** The one message every stalled/unreachable auth call should show. */
export const NETWORK_ERROR_MESSAGE =
 'Could not reach Darshya — check your connection and try again.';

/**
 * Timeout budget for ordinary DATA loads (dashboards, portals, profile).
 *
 * RES-01 (2026-08-12): `fetchWithTimeout` was added for the auth pair only, so
 * the other ~230 awaited fetches in this app still had no timeout at all. Held
 * open with a route interception that accepts and never answers, /priest,
 * /profile, /messages, /dashboard and /payouts all sat on their loading
 * spinner at T+10s AND at T+30s — no error, no retry, nothing. `fetch` never
 * rejects on a stalled socket, so the `finally { setLoading(false) }` those
 * pages already have could never run.
 *
 * Shorter than the auth budget on purpose: a sign-in is a deliberate act the
 * user is watching and will wait out, a dashboard load is not.
 */
export const DATA_FETCH_TIMEOUT_MS = 15_000;

/**
 * The one honest sentence to render when a data load fails.
 *
 * RES-02 (2026-08-12): 7 of 10 authenticated pages answered an HTTP 500 by
 * rendering fabricated zeros with NO error — /payouts said "Available to
 * withdraw ₹0", /temple-portal "₹0 Revenue This Month", /dashboard "No
 * Bookings Yet — begin your spiritual journey" to a devotee with confirmed
 * pujas. During a backend incident that tells every provider on the platform
 * that their business earned nothing. A zero the server never sent is a
 * fabricated number; it must always carry the banner saying so.
 *
 * Pass a `Response` (or anything carrying a numeric `status`) for an HTTP
 * failure, or the thrown value for a network/timeout failure.
 */
export function loadErrorMessage(cause: unknown): string {
 const status =
  typeof cause === 'object' && cause !== null && 'status' in cause
   ? Number((cause as { status: unknown }).status)
   : Number.NaN;
 if (Number.isFinite(status)) {
  if (status === 401 || status === 403) {
   return 'Your session has expired — sign in again to see your live figures.';
  }
  return `Couldn't load live data (HTTP ${status}). The figures below are placeholders, not your real numbers — retry.`;
 }
 if (isNetworkFailure(cause)) {
  return `${NETWORK_ERROR_MESSAGE} The figures below are placeholders, not your real numbers.`;
 }
 return "Couldn't load live data. The figures below are placeholders, not your real numbers — retry.";
}
