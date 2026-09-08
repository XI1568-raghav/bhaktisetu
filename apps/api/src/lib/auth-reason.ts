/**
 * AUTH-07 (F454, 2026-09-08) — WHY a 401 happened, as a value a client can
 * branch on.
 *
 * THE FINDING. apps/web/lib/api-config.ts answered every 401 with "Your session
 * has expired — sign in again to see your live figures." because
 * `loadErrorIsReauth` was `loadErrorStatus(cause) === 401` — the numeric status
 * and nothing else. This API answers 401 in at least three cases where that
 * sentence is false: no token was ever sent (middlewares/auth.ts:110),
 * registration is incomplete (middlewares/auth.ts:341), and a database outage
 * (middlewares/auth.ts:228, routes/auth.ts:1136). During an outage that
 * sentence sends the user to re-authenticate against the thing that is down;
 * they try, they fail, and they conclude their account is broken.
 *
 * WHY A HEADER AND NOT ONLY A BODY FIELD. The obvious shape is a `code` in the
 * body, and this module ships that too — `authReason`, for the clients that
 * read bodies (apps/mobile). But it could not be the ONLY carrier: all ten web
 * call sites pass a bare `Response` to a SYNCHRONOUS classifier
 * (app/dashboard/page.tsx:116, app/payouts/page.tsx:103, and eight more) and
 * never read the body of a failed load. Reading a body is async; reading a
 * header is not. `X-Auth-Reason` is therefore the carrier that actually reaches
 * the code with the bug, without touching ten pages. The two are stamped from
 * one value so they cannot drift.
 *
 * WHY NOT REUSE THE `code` FIELD FROM lib/error-i18n.ts. Because `code` is
 * load-bearing in the localization pipeline: plugins/error-localization.ts rule
 * 2 treats a recognised `code` as licence to REPLACE `message` with the
 * catalogue sentence for it. Adding auth reasons there would silently overwrite
 * bespoke wording like "Demo account pandit@demo.com is not seeded in this
 * database." with a generic translation. A separate field, in a deliberately
 * different case convention (lower_snake, not SCREAMING_SNAKE), keeps the two
 * vocabularies from being confused for one another.
 *
 * WHAT THIS IS NOT. It is not an authorization signal. 403 is untouched:
 * middlewares/auth.ts:80 — "403 (not 401) signals 'we know who you are, you
 * just can't be here'" — and the web consults this reason for 401 ONLY, so no
 * value here can promote a 403 into a "sign in again". That split is the thing
 * an earlier pass of AUTH-06 broke and it stays pinned on both sides.
 */

/**
 * The response header. Chosen over the body as the primary carrier because a
 * `Response`'s headers are readable synchronously and its body is not — see the
 * module docblock.
 *
 * NOT visible cross-origin on its own: `Access-Control-Expose-Headers` was
 * absent from every api.darshya.online response probed on 2026-09-08, so
 * plugins/error-localization.ts adds this header name to it whenever the reason
 * is stamped. Without that the browser drops it and the web falls back to
 * today's behaviour.
 */
export const AUTH_REASON_HEADER = 'X-Auth-Reason';

/** The mirrored body field, for clients that parse JSON rather than headers. */
export const AUTH_REASON_BODY_FIELD = 'authReason';

/**
 * The reasons, and the remedy each one actually has.
 *
 * - `no_credentials`        — no token reached us. Nothing expired; the user is
 *                             signed out on this device. Signing in fixes it.
 * - `session_expired`       — a token we could verify, past its `exp`. The one
 *                             case the old copy was right about.
 * - `session_revoked`       — an email session with `revoked_at` set. Signing in
 *                             fixes it, but "expired" is a lie about why.
 * - `invalid_credential`    — a token we refused and cannot say more about: a
 *                             forgery, a demo token in production, an unseeded
 *                             demo account, a token minted for another project.
 *                             Signing in fixes it; asserting an expiry would be
 *                             claiming knowledge we do not have.
 * - `registration_incomplete` — the credential verified and there is no `User`
 *                             row behind it. Signing in again SUCCEEDS and lands
 *                             on the same 401: it is a loop, not a remedy.
 * - `verify_unavailable`    — we could not check. A database or Supabase outage.
 *                             Nothing about the user's account is known to be
 *                             wrong and re-authenticating cannot help.
 *
 * Lower_snake on purpose: these are NOT `ErrorCode`s from lib/error-i18n.ts and
 * must never be mistaken for one.
 */
export const AUTH_FAILURE_REASONS = [
  'no_credentials',
  'session_expired',
  'session_revoked',
  'invalid_credential',
  'registration_incomplete',
  'verify_unavailable',
] as const;

export type AuthFailureReason = (typeof AUTH_FAILURE_REASONS)[number];

const REASON_SET: ReadonlySet<string> = new Set<string>(AUTH_FAILURE_REASONS);

export function isAuthFailureReason(value: unknown): value is AuthFailureReason {
  return typeof value === 'string' && REASON_SET.has(value);
}
