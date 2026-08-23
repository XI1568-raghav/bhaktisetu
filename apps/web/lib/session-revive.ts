/**
 * SEC-02 — rehydrate a session from the httpOnly cookie instead of localStorage.
 *
 * THE PROBLEM. The access token is persisted in `poojly_session` in
 * localStorage, so any XSS on darshya.online is full account takeover. The
 * destination has been obvious for months: the API has issued an httpOnly
 * `darshya_session` cookie since #200 and accepts it as a credential
 * (apps/api/src/middlewares/auth.ts:54-58). What was missing was not the
 * cookie — it was the ability to COME BACK. AuthProvider rehydrated by reading
 * `poojly_session` out of localStorage; with nothing there it declared the
 * visitor signed out. So deleting the localStorage write signed every user out
 * on their next page load, and the migration could never take its first step.
 *
 * WHAT CHANGED. The blocker recorded in lib/auth-context.tsx and
 * lib/api-config.ts — "POST /auth/refresh still REQUIRES `refreshToken` in the
 * body (its Zod schema)" — is no longer true, and those comments are stale.
 * apps/api/src/routes/auth.ts:54-55 now marks `refreshToken` `.optional()`, and
 * `resolveRefreshToken` (:78-82) falls back to the httpOnly `darshya_refresh`
 * cookie; :530 only 400s when the request carries no refresh credential at all.
 * On success the handler re-issues BOTH cookies (setAuthCookies, :620). So a
 * browser whose only credential is a cookie can mint a fresh session, which is
 * precisely what rehydration needs.
 *
 * WHY THE PROFILE MARKER GATES THIS. `poojly_user` carries profile fields only,
 * never a token (see persistAuthStorage in lib/auth-context.tsx), and it is
 * written on every sign-in door. Its presence is the one honest local signal
 * that this browser HAS a session worth trying to revive. Firing the revive
 * unconditionally would put a blocking cross-origin round-trip in front of
 * every anonymous homepage render and make the page's first paint depend on the
 * API being up — for visitors who by definition have no session. The marker
 * costs nothing and keeps the anonymous path entirely offline.
 *
 * `darshya_refresh` is path-scoped to /api/v1/auth on the API, so it rides only
 * this request and never ordinary API calls.
 */

import { API_BASE_URL, fetchWithTimeout } from './api-config';

/**
 * The token-free profile key. Legacy `poojly_*` naming is load-bearing —
 * app/auth/verify, app/org/*, components/AartiOptIn and middleware.ts all
 * hardcode it — so it is deliberately NOT renamed.
 */
export const PROFILE_STORAGE_KEY = 'poojly_user';

/** The session shape the API answers with. Structural, to avoid importing
 *  lib/auth-context (which imports this module). */
export interface RevivedSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

/**
 * Has this browser ever completed a sign-in?
 *
 * Checks both stores because the two sign-in doors disagree: /auth/verify
 * (magic link) writes only localStorage, while persistAuthStorage writes the
 * cookie the middleware gate reads. Either one means "try the cookie".
 */
export function hasStoredProfile(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored && stored.trim().length > 0) return true;
  } catch {
    // localStorage unavailable (Safari private mode) — fall through to cookie.
  }
  if (typeof document === 'undefined') return false;
  const match = document.cookie.match(
    new RegExp('(^| )' + PROFILE_STORAGE_KEY + '=([^;]+)'),
  );
  return !!(match && match[2]);
}

function looksLikeSession(value: unknown): value is RevivedSession {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { accessToken?: unknown }).accessToken === 'string' &&
    (value as { accessToken: string }).accessToken.length > 0
  );
}

/**
 * Exchange the httpOnly `darshya_refresh` cookie for a live session.
 *
 * Deliberately sends an EMPTY body. A `refreshToken` here would just be the
 * JS-readable copy this whole change exists to remove, and the API prefers the
 * body value when both are present (resolveRefreshToken uses firstNonEmpty), so
 * including it would quietly keep the cookie path untested.
 *
 * `body: '{}'` rather than no body at all: Fastify rejects a POST that declares
 * `Content-Type: application/json` with an empty payload
 * (FST_ERR_CTP_EMPTY_JSON_BODY, a 400) before the handler's
 * `request.body ?? {}` ever runs.
 *
 * ⚠ THIS DOES NOT COVER MAGIC-LINK USERS, AND THAT GATES SEC-02 STEP 4.
 * POST /auth/refresh is a SUPABASE exchange. A magic-link sign-in has no
 * Supabase session behind it — apps/api/src/routes/magic-link.ts mints an
 * `email_sessions` row via createEmailSession and answers `refreshToken: ''`,
 * and that route deliberately issues NO `darshya_refresh` cookie (an empty one
 * could only ever fail). So for every provider onboarded through the
 * partnerships pipeline this call has no credential to send and 400s.
 * Harmless today: AuthProvider only reaches here when localStorage holds no
 * session, and those users still get a `poojly_session` written at
 * app/auth/verify. It stops being harmless the moment that write is deleted —
 * they would revive-fail, have their profile marker cleared, and be signed out
 * on reload. What they hold instead is a 7-day httpOnly `darshya_session` whose
 * maxAge now matches EMAIL_SESSION_TTL_MS, and which
 * apps/api/src/middlewares/auth.ts validates directly. The migration for them is
 * therefore "send the cookie" (fetchWithTimeout already defaults
 * `credentials: 'include'`), NOT "revive a JS token" — or a dedicated
 * email-session refresh endpoint if a JS-side token is genuinely required.
 *
 * Never throws — an unreachable API on a cold Render dyno must degrade to
 * "signed out", not to an unhandled rejection during mount.
 */
export async function reviveSessionFromCookie(): Promise<RevivedSession | null> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: '{}',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return looksLikeSession(data?.session) ? (data.session as RevivedSession) : null;
  } catch {
    return null;
  }
}
