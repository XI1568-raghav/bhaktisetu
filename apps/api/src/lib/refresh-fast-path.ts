import { inspectSupabaseJwt, inspectSupabaseAsymmetricJwt } from './supabase-jwt.js';

/**
 * Every full page load of the web app revives its session through POST /auth/refresh,
 * and that call blocks rendering. A real refresh costs a Supabase round trip plus
 * three or four database round trips (replay ledger, rotation writes, suspension
 * check), about 2 s on prod where each database trip is ~0.4 s.
 *
 * When the browser's httpOnly `darshya_session` access cookie is still comfortably
 * valid there is nothing to refresh: hand the same token back. Nothing new is minted,
 * so there is nothing to rotate or record. The caller still does the suspension check.
 * A token with little life left, or one that does not verify, takes the full path.
 */
export const FAST_PATH_MIN_REMAINING_SECONDS = 300;

export interface FastRefreshSession {
  accessToken: string;
  expiresIn: number;
  expiresAt: number;
  userId: string;
}

export async function tryFastRefresh(
  accessCookie: string | undefined,
  nowMs: number = Date.now(),
  isRevoked?: (userId: string, token: string) => Promise<boolean>,
): Promise<FastRefreshSession | null> {
  if (!accessCookie) return null;
  let inspection = inspectSupabaseJwt(accessCookie, process.env.SUPABASE_JWT_SECRET, nowMs);
  if (!inspection.ok) {
    const asymmetric = await inspectSupabaseAsymmetricJwt(accessCookie, nowMs);
    if (asymmetric.ok) inspection = asymmetric;
  }
  if (!inspection.ok) return null;
  const remaining = inspection.token.expSeconds - Math.floor(nowMs / 1000);
  if (remaining < FAST_PATH_MIN_REMAINING_SECONDS) return null;
  if (isRevoked && (await isRevoked(inspection.token.id, accessCookie).catch(() => true))) return null;
  return {
    accessToken: accessCookie,
    expiresIn: remaining,
    expiresAt: inspection.token.expSeconds,
    userId: inspection.token.id,
  };
}
