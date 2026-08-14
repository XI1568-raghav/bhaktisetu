/**
 * P1 #208 (2026-08-03): portals/admin were rendering raw API error text to
 * users — "HTTP 401", "API 401", "Demo tokens not accepted in production.",
 * bare "Unauthorized". Map any API/HTTP error to friendly, actionable copy and
 * never leak status codes or auth internals to the UI.
 */

/**
 * RES-07 (2026-08-12): the booking wizard composed its failure message from
 * `res.status` alone and never parsed the JSON body, so an HTTP 409
 * {"error":"The selected time slot is no longer available.",
 *  "code":"SLOT_UNAVAILABLE"} was shown as
 * "Could not create your booking (409). Please try again" — advice that can
 * never succeed on the same slot. The API already localizes that sentence into
 * five languages (apps/api/src/lib/error-i18n.ts); throwing it away and
 * substituting a status code is strictly worse than what the server said.
 *
 * These two helpers are the seam: `serverErrorMessage` prefers the server's own
 * sentence, `apiErrorCode` exposes the machine code so a caller can RECOVER
 * (send the devotee back to the slot picker) rather than tell them to retry.
 */

/**
 * Developer names for HTTP statuses. A server that answers
 * {"error":"Internal Server Error"} has told us nothing a devotee can act on,
 * so the caller's own copy wins over it.
 */
const DEVELOPER_ERROR_NAMES =
  /^(internal server error|bad gateway|service unavailable|gateway timeout|not found|forbidden|unauthorized|bad request|conflict|error)$/i;

function usableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (DEVELOPER_ERROR_NAMES.test(trimmed)) return null;
  return trimmed;
}

/**
 * The server's own explanation if it sent one worth reading, else `fallback`.
 * Never invents text — a body with nothing usable returns the caller's copy.
 */
export function serverErrorMessage(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null) return fallback;
  const b = body as { error?: unknown; message?: unknown };
  return usableString(b.error) ?? usableString(b.message) ?? fallback;
}

/** The machine-readable `code` an API error body carries, if any. */
export function apiErrorCode(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const code = (body as { code?: unknown }).code;
  return typeof code === 'string' && code.trim() ? code.trim() : null;
}

/** True if the message looks like an auth/session failure (401/403). */
export function isAuthError(message: string): boolean {
  return /401|403|unauthorized|unauthenticated|forbidden|demo tokens|invalid.*token|session expired/i.test(
    message,
  );
}

/** True if the message looks like a rate-limit (429). */
export function isRateLimitError(message: string): boolean {
  return /429|too many|rate limit|try again in/i.test(message);
}

/**
 * Convert a raw API/HTTP error into user-facing copy. Accepts the thrown
 * Error (or its message) and returns a friendly string + whether the user
 * should be prompted to re-authenticate.
 */
export function friendlyApiError(err: unknown): { message: string; reauth: boolean } {
  const raw = err instanceof Error ? err.message : String(err ?? '');

  if (isAuthError(raw)) {
    return {
      message: 'Your session has expired. Please sign in again to continue.',
      reauth: true,
    };
  }
  if (isRateLimitError(raw)) {
    return {
      message: 'Too many attempts. Please wait a few minutes and try again.',
      reauth: false,
    };
  }
  if (/5\d\d|server error|internal error|bad gateway|service unavailable/i.test(raw)) {
    return {
      message: 'Something went wrong on our side. Please try again in a moment.',
      reauth: false,
    };
  }
  if (/network|failed to fetch|fetch failed|econn|timeout|timed out/i.test(raw)) {
    return {
      message: 'Could not reach the server. Please check your connection and try again.',
      reauth: false,
    };
  }
  // 404 / not-found and anything else → a neutral, non-technical message.
  return {
    message: 'We could not load this right now. Please try again.',
    reauth: false,
  };
}
