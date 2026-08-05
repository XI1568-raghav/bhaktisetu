/**
 * P1 #208 (2026-08-03): portals/admin were rendering raw API error text to
 * users — "HTTP 401", "API 401", "Demo tokens not accepted in production.",
 * bare "Unauthorized". Map any API/HTTP error to friendly, actionable copy and
 * never leak status codes or auth internals to the UI.
 */

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
