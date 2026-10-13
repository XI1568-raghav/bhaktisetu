// Same copy as API_NETWORK_MESSAGE in ./api, kept local because ./api resolves
// the API base URL (and throws without one) when imported.
const API_NETWORK_MESSAGE = 'Could not reach Darshya. Check your connection and try again.';

/**
 * The sentence an auth failure shows. The server's own sentence wins (it is
 * localised and specific: wrong password, 429 "try again later", 503 "Sign-in is
 * temporarily unavailable"). Transport failures and bare status fallbacks carry
 * engineering text ("Network request failed", "Request timed out after
 * 30000ms", "Request failed with status 502"), which is replaced.
 */
export function authFailureMessage(err: unknown, fallback: string): string {
  const e = err as { statusCode?: unknown; message?: unknown } | null;
  const status = typeof e?.statusCode === 'number' ? e.statusCode : undefined;
  const message = typeof e?.message === 'string' ? e.message.trim() : '';
  if (status === 0 || status === 408) return API_NETWORK_MESSAGE;
  if (err instanceof Error && status === undefined) {
    return /network|fetch|timed? ?out|abort/i.test(message) || message === '' ? API_NETWORK_MESSAGE : message;
  }
  if (message === '' || /^Request failed with status \d+$/.test(message)) {
    if (status === 429) return 'Too many attempts. Please wait a minute and try again.';
    if (status !== undefined && status >= 500) {
      return 'Darshya is having trouble right now. Please try again in a moment.';
    }
    return fallback;
  }
  return message;
}
