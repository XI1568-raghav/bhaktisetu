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
