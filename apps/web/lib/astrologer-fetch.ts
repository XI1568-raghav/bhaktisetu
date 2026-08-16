/**
 * DF-12 (prod sweep 2026-08-12) — the astrology surfaces' fetch, with a deadline.
 *
 * The finding: "An invalid astrologer id spins on 'Loading…' forever with no
 * error and no 404" (/astrology/view?id=<anything-invalid>). Its own fix text
 * asks for two things — "a real not-found state (render a 404 with a link back
 * to /astrology) AND a fetch timeout so it can never hang". The not-found state
 * shipped; the timeout did not.
 *
 * `fetch` does not reject on a stalled socket. It rejects on DNS failure and on
 * connection refused, but a server that accepts the connection and then says
 * nothing — a cold Render dyno, a captive portal, a half-open socket, a phone
 * moving between cells — leaves the promise pending forever. Nothing after the
 * `await` runs, so the `setStatus('missing')` in the catch and the
 * `finally { setLoading(false) }` these pages already have are unreachable code
 * in exactly the case they exist for. The user sees the spinner and nothing
 * else, with no retry and no explanation. This is the same root cause as the
 * 2026-08-11 production auth report and RES-01.
 *
 * WHY THIS MODULE INSTEAD OF `fetchWithTimeout` FROM lib/api-config:
 * several existing suites mock `lib/api-config` down to `{ API_BASE_URL }`
 * alone (e.g. __tests__/astrology-profile-no-fixtures.test.tsx:38). Under such a
 * mock an imported `DATA_FETCH_TIMEOUT_MS` is `undefined`, and
 * `setTimeout(fn, undefined)` fires on the next tick — a timeout that aborts
 * every request instantly is worse than no timeout at all, and it would fail
 * silently in the direction of "everything is broken". This module therefore
 * carries its own budget and its own AbortController and imports nothing.
 */

/**
 * Same budget as `DATA_FETCH_TIMEOUT_MS` in lib/api-config (15s), and the same
 * one app/astrology/astrologers/live/LiveAstrologersClient.tsx already uses.
 * Deliberately duplicated rather than imported — see the module note above.
 */
export const ASTROLOGY_FETCH_TIMEOUT_MS = 15_000;

/**
 * `fetch` that is guaranteed to settle. On timeout it rejects with an
 * `AbortError`, which every caller already routes into its own error state.
 */
export async function astrologyFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = ASTROLOGY_FETCH_TIMEOUT_MS,
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
 * Did this rejection come from the network rather than from the server? An
 * aborted request and a `TypeError` (how `fetch` reports a transport failure)
 * both mean "we never got an answer", which is a different sentence to the user
 * than "the server said no".
 */
export function isAstrologyNetworkFailure(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  return err instanceof TypeError;
}
