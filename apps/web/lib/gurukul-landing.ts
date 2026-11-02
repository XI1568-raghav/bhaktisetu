/**
 * A gurukul manager has no portal role of their own: they sign in as a plain devotee (QA
 * 2026-10-31: the portal "feels like a devotee portal"). Sign-in must stay fast for everyone, so
 * login only leaves a short-lived marker; the dashboard already asks the API which gurukuls the
 * account owns, and when it finds one right after a sign-in it sends the owner to /gurukul-portal.
 * A lookup on the login path itself took 0.75-1.4 s on prod, which every devotee would have paid.
 */
export const GURUKUL_PORTAL_PATH = '/gurukul-portal';

const KEY = 'darshya_gurukul_landing_check';
const MAX_AGE_MS = 60_000;

/** Called by the login page after a sign-in that has no explicit destination. */
export function markFreshSignIn(now = Date.now()): void {
  try {
    sessionStorage.setItem(KEY, String(now));
  } catch {
    // storage blocked: the dashboard link to the portal still exists
  }
}

/** True once, and only within a minute of the sign-in that set the marker. */
export function takeFreshSignIn(now = Date.now()): boolean {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    const at = Number(raw);
    return Number.isFinite(at) && at > 0 && now - at >= 0 && now - at <= MAX_AGE_MS;
  } catch {
    return false;
  }
}
