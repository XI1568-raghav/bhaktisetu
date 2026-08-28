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
 * ⚠ IT DOES NOT COVER MAGIC-LINK USERS. POST /auth/refresh is a SUPABASE
 * exchange, and a magic-link sign-in has no Supabase session behind it —
 * apps/api/src/routes/magic-link.ts mints an `email_sessions` row via
 * createEmailSession, answers `refreshToken: ''`, and deliberately issues NO
 * `darshya_refresh` cookie (an empty one could only ever fail). So for every
 * provider onboarded through the partnerships pipeline this call has no
 * credential to send and can only 400. That is what
 * reviveEmailSessionFromCookie below exists for; see reviveSessionFromCookie.
 *
 * Never throws — an unreachable API on a cold Render dyno must degrade to
 * "signed out", not to an unhandled rejection during mount.
 */
async function reviveSupabaseSessionFromCookie(): Promise<ReviveResult> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: '{}',
    });
    if (!res.ok) return { session: null, apiAnswered: true };
    const data = await res.json();
    return looksLikeSession(data?.session)
      ? { session: data.session as RevivedSession, apiAnswered: true }
      : { session: null, apiAnswered: true };
  } catch {
    return { session: null, apiAnswered: false };
  }
}

/**
 * SEC-02 STEP 2 — the revive path for magic-link / email sessions.
 *
 * These are the users with no password at all: there is no password column on
 * User, so a partnerships-provisioned pandit or temple manager holds exactly one
 * credential, the link that was emailed to them. Their session is an
 * `email_sessions` row, not a Supabase one, so the /auth/refresh exchange above
 * has nothing to trade and answers 400 for them every time.
 *
 * `POST /auth/session/revive` is the counterpart: it validates the 7-day
 * httpOnly `darshya_session` cookie against `email_sessions` (rejecting revoked,
 * expired and blocked) and reports the session back. It mints nothing and does
 * not extend the cookie — a sliding 7-day session would be a policy change, not
 * a revive.
 *
 * Empty JSON body, deliberately: the cookie is the credential and there is no
 * token to send. `body: '{}'` rather than no body at all because Fastify
 * rejects a POST that declares `Content-Type: application/json` with an empty
 * payload (FST_ERR_CTP_EMPTY_JSON_BODY, a 400) before the handler runs.
 */
export async function reviveEmailSessionFromCookie(): Promise<RevivedSession | null> {
  return (await reviveEmailSessionResult()).session;
}

async function reviveEmailSessionResult(): Promise<ReviveResult> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/auth/session/revive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: '{}',
    });
    if (!res.ok) return { session: null, apiAnswered: true };
    const data = await res.json();
    return looksLikeSession(data?.session)
      ? { session: data.session as RevivedSession, apiAnswered: true }
      : { session: null, apiAnswered: true };
  } catch {
    return { session: null, apiAnswered: false };
  }
}

/**
 * Bring a token-free browser back, whichever door it originally signed in
 * through.
 *
 * ORDER MATTERS AND IS NOT ARBITRARY. Supabase first, because that is the
 * overwhelming majority (email+password, phone OTP, Google) and a hit there
 * costs exactly one round-trip — the email-session call must never fire for
 * them, or every cold page load grows a second cross-origin request. The
 * fallback runs only after /auth/refresh has already refused, which for a
 * magic-link browser it always will: it holds no `darshya_refresh` cookie at
 * all, so that request carries no refresh credential and 400s without touching
 * Supabase.
 *
 * Both refusing means signed out, which is the correct answer for a browser
 * whose cookies have expired — AuthProvider then clears the stale profile
 * marker so middleware.ts stops waving a dead session into the portal shell.
 *
 * Never throws, for the same reason the helpers above do not.
 */
export async function reviveSessionFromCookie(): Promise<RevivedSession | null> {
  return (await reviveSessionFromCookieResult()).session;
}

/**
 * SEC-02 STEP 4 — the same revive, plus the one bit the caller cannot infer.
 *
 * `null` has always meant two different things here: "the API told us these
 * cookies are dead" and "we never heard back". AuthProvider treated both as
 * signed out and CLEARED the `poojly_user` marker — which was survivable while
 * only a token-free browser took that branch. Step 4 deletes the localStorage
 * token, so from now on EVERY signed-in browser takes it on every cold load,
 * and Render's free tier routinely leaves a waking dyno past the 20s fetch
 * budget. Clearing the marker on a transport failure would sign the entire user
 * base out for the sole reason that the server was cold.
 *
 * `apiAnswered` is true only when an HTTP response actually came back — from
 * EITHER door, since a 400 from /auth/refresh is the normal, expected answer
 * for a magic-link browser and settles nothing on its own. A verdict of
 * "signed out" therefore requires both doors to have refused.
 */
export interface ReviveResult {
  session: RevivedSession | null;
  /** An HTTP response came back. False means transport failure — unknown. */
  apiAnswered: boolean;
}

export async function reviveSessionFromCookieResult(): Promise<ReviveResult> {
  const supabase = await reviveSupabaseSessionFromCookie();
  if (supabase.session) return supabase;
  const email = await reviveEmailSessionResult();
  if (email.session) return email;
  return { session: null, apiAnswered: supabase.apiAnswered && email.apiAnswered };
}
