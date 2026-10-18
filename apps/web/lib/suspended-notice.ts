/**
 * Suspended-account notice.
 *
 * The API answers 403 with `{ error: 'Forbidden', message: 'Account suspended: <reason>' }`
 * or `'This account has been suspended.'` (middlewares/auth.ts, routes/auth.ts)
 * for a blocked user, on /auth/refresh and on every authenticated call. The web
 * used to sign such a user out silently; it now says why on /auth/login.
 */

export const SUSPENDED_EVENT = 'darshya:account-suspended';
export const SUSPENDED_MESSAGE = 'This account has been suspended.';
export const SUSPENDED_FLAG = 'suspended';

export function isSuspendedBody(status: number, body: unknown): boolean {
  if (status !== 403 || typeof body !== 'object' || body === null) return false;
  const b = body as { message?: unknown; error?: unknown };
  return [b.message, b.error].some((v) => typeof v === 'string' && /suspended/i.test(v));
}

/** The operator's reason from "Account suspended: <reason>", if one was given. */
export function suspensionReason(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const m = (body as { message?: unknown }).message;
  if (typeof m !== 'string') return null;
  const hit = /account suspended:\s*(.+)$/i.exec(m.trim());
  return hit ? hit[1]!.trim().slice(0, 300) : null;
}

export function suspendedLoginHref(reason: string | null): string {
  const q = new URLSearchParams({ [SUSPENDED_FLAG]: '1' });
  if (reason) q.set('reason', reason);
  return `/auth/login?${q.toString()}`;
}

/** Text the login page shows for `?suspended=1[&reason=...]`; null when the flag is absent. */
export function suspendedLoginMessage(search: string): string | null {
  const q = new URLSearchParams(search);
  if (q.get(SUSPENDED_FLAG) !== '1') return null;
  const reason = q.get('reason')?.trim().slice(0, 300);
  return `${SUSPENDED_MESSAGE}${reason ? ` Reason: ${reason}.` : ''} Contact support@darshya.online if you think this is a mistake.`;
}

/** Called from fetch wrappers: tell the auth layer, which signs out and redirects. */
export function announceSuspended(reason: string | null): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SUSPENDED_EVENT, { detail: { reason } }));
}

let suspendedRedirectPending = false;

/**
 * Navigate to the suspended notice AND remember that we are doing so. Signing the user out flips
 * AuthGuard to "unauthenticated", whose own `location.href = /auth/login?redirect=` would otherwise
 * replace this navigation and drop the notice.
 */
export function redirectToSuspendedLogin(reason: string | null): void {
  if (typeof window === 'undefined') return;
  suspendedRedirectPending = true;
  window.location.assign(suspendedLoginHref(reason));
}

export function isSuspendedRedirectPending(): boolean {
  return suspendedRedirectPending;
}

const GUARD_FLAG = '__darshyaSuspendedFetchGuard';

/**
 * Most pages call the API with a bare `fetch` (not `fetchWithTimeout`), so a blocked account's 403
 * "suspended" answer was swallowed as an ordinary error and the user stayed on a half-working page.
 * Wrap `window.fetch` once so EVERY response from the API is checked. Only calls aimed at `apiBase`
 * are inspected, and `/auth/` is skipped because the sign-in forms show that answer themselves.
 * The caller's Response is returned untouched (the body is read from a clone).
 */
export function installSuspendedFetchGuard(apiBase: string): void {
  if (typeof window === 'undefined' || !apiBase) return;
  const w = window as unknown as Record<string, unknown>;
  if (w[GUARD_FLAG]) return;
  w[GUARD_FLAG] = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await original(input, init);
    if (res.status === 403) {
      try {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.startsWith(apiBase) && !url.includes('/auth/')) {
          const body = await res.clone().json();
          if (isSuspendedBody(403, body)) announceSuspended(suspensionReason(body));
        }
      } catch {
        /* not JSON or unreadable: nothing to announce */
      }
    }
    return res;
  };
}
