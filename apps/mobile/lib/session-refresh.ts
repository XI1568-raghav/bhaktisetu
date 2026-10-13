import type { AuthSession } from '@poojly/api-client';

/**
 * What a /auth/refresh attempt means for the stored session.
 *
 * Only a verdict from the server ends a session: 400 (no usable token), 401
 * (expired / replayed / revoked) and 403. A 503 (the API answers it when the
 * auth provider is down), a 5xx, a timeout or a dead socket is NOT a verdict,
 * so the user stays signed in and the next call retries. Signing out on those
 * turned every outage into a mass logout.
 */
export type RefreshOutcome =
  | { kind: 'refreshed'; session: AuthSession }
  | { kind: 'rejected' }
  | { kind: 'unavailable' };

type Post = (
  path: string,
  body: unknown,
  options: { noAuth: true },
) => Promise<{ success?: boolean; session?: AuthSession }>;

export function isSessionVerdict(err: unknown): boolean {
  const status = (err as { statusCode?: unknown } | null)?.statusCode;
  return status === 400 || status === 401 || status === 403;
}

export async function refreshSession(
  refreshToken: string | undefined,
  post: Post,
): Promise<RefreshOutcome> {
  if (!refreshToken) return { kind: 'rejected' };
  try {
    const res = await post('/api/v1/auth/refresh', { refreshToken }, { noAuth: true });
    if (res?.success && res.session?.accessToken) {
      return { kind: 'refreshed', session: res.session };
    }
    return { kind: 'unavailable' };
  } catch (err) {
    return isSessionVerdict(err) ? { kind: 'rejected' } : { kind: 'unavailable' };
  }
}

let inFlight: Promise<RefreshOutcome> | null = null;

/**
 * One refresh at a time. The API rotates the refresh token and treats a second
 * use of the old one as replay, revoking every session of that user, so two
 * concurrent 401s must share one call.
 */
export function refreshSessionOnce(
  refreshToken: string | undefined,
  post: Post,
): Promise<RefreshOutcome> {
  if (inFlight) return inFlight;
  inFlight = refreshSession(refreshToken, post).finally(() => {
    inFlight = null;
  });
  return inFlight;
}
