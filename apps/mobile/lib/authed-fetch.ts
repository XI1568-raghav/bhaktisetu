import { fetchWithBudget, FETCH_BUDGET_MS } from './fetch-budget';
import { getStoredAccessToken, onUnauthorisedMobile } from './auth-context';

/**
 * `fetchWithBudget` for screens that build their own `Authorization: Bearer`
 * header. A bare fetch bypasses the api-client 401 hook, so an expired access
 * token showed the user an error and kept using the dead token. Here a 401 on a
 * request that carried a (non-demo) bearer runs the shared single-flight
 * refresh (onUnauthorisedMobile -> refreshSessionOnce, which also signs out if
 * the server rejects the refresh token), and the request is retried ONCE with
 * the new token. A 401 means the server did not act, so a retry is safe for
 * POST/PATCH too. If the token did not change (refresh unavailable/rejected),
 * the original 401 response is returned unchanged.
 */
export async function authedFetch(
  url: string,
  init: RequestInit = {},
  budgetMs: number = FETCH_BUDGET_MS,
): Promise<Response> {
  const res = await fetchWithBudget(url, init, budgetMs);
  if (res.status !== 401) return res;

  const sent = new Headers(init.headers as HeadersInit | undefined).get('Authorization');
  const match = sent ? /^Bearer\s+(.+)$/i.exec(sent) : null;
  const oldToken = match?.[1];
  if (!oldToken || oldToken.startsWith('demo-')) return res;

  try {
    await onUnauthorisedMobile();
    const fresh = await getStoredAccessToken();
    if (!fresh || fresh === oldToken) return res;
    const headers = new Headers(init.headers as HeadersInit | undefined);
    headers.set('Authorization', `Bearer ${fresh}`);
    return await fetchWithBudget(url, { ...init, headers }, budgetMs);
  } catch {
    return res;
  }
}
