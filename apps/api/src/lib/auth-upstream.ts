/**
 * True when a Supabase Auth error means "the auth service could not be reached"
 * rather than "the caller's input was wrong". supabase-js reports a network
 * failure as an ordinary `error` (name AuthRetryableFetchError, message
 * "fetch failed", status 0 or 5xx), so a route that treats every `error` as a
 * bad credential tells the user their password is wrong during an outage — and
 * the 401 makes the clients sign out whoever is already signed in.
 */
export function isAuthUpstreamDown(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: string; message?: string; status?: number };
  if (e.name === 'AuthRetryableFetchError' || e.name === 'AuthUnknownError') return true;
  if (typeof e.status === 'number' && (e.status === 0 || e.status >= 500)) return true;
  return /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network|socket hang up/i.test(e.message ?? '');
}

export const AUTH_UNAVAILABLE_BODY = {
  error: 'ServiceUnavailable',
  message: 'Sign-in is temporarily unavailable. Please try again in a moment.',
} as const;
