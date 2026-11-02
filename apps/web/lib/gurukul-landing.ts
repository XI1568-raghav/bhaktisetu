import { API_BASE_URL, fetchWithTimeout } from './api-config';

/**
 * A gurukul manager has no portal role of their own: they sign in as a plain
 * devotee (QA 2026-10-31: the portal "feels like a devotee portal"). When a
 * devotee account owns at least one gurukul listing, sign-in should land on
 * /gurukul-portal instead of /dashboard.
 *
 * Client-side only, no new role. Every failure (timeout, 401, 5xx, bad body)
 * answers false so the caller falls back to the normal devotee dashboard.
 */
export const GURUKUL_LANDING_TIMEOUT_MS = 2500;

export async function ownsGurukul(accessToken: string | undefined | null): Promise<boolean> {
  if (!accessToken) return false;
  try {
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/gurukuls/mine/list`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      GURUKUL_LANDING_TIMEOUT_MS,
    );
    if (!res.ok) return false;
    const body = await res.json();
    return Array.isArray(body?.gurukuls) && body.gurukuls.length > 0;
  } catch {
    return false;
  }
}

/**
 * Post-login target. Only a devotee with no explicit ?redirect= and an existing
 * account is probed; everyone else keeps the target the caller already chose.
 */
export async function resolveLoginLanding(opts: {
  role: string;
  accessToken: string | undefined | null;
  hasExplicitRedirect: boolean;
  isNewAccount: boolean;
  fallback: string;
}): Promise<string> {
  if (opts.role !== 'devotee' || opts.hasExplicitRedirect || opts.isNewAccount) return opts.fallback;
  return (await ownsGurukul(opts.accessToken)) ? '/gurukul-portal' : opts.fallback;
}
