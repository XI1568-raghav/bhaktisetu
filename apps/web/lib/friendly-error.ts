/**
 * P1 #208 (2026-08-03): portals/admin were rendering raw API error text to
 * users — "HTTP 401", "API 401", "Demo tokens not accepted in production.",
 * bare "Unauthorized". Map any API/HTTP error to friendly, actionable copy and
 * never leak status codes or auth internals to the UI.
 */

/**
 * RES-07 (2026-08-12): the booking wizard composed its failure message from
 * `res.status` alone and never parsed the JSON body, so an HTTP 409
 * {"error":"The selected time slot is no longer available.",
 *  "code":"SLOT_UNAVAILABLE"} was shown as
 * "Could not create your booking (409). Please try again" — advice that can
 * never succeed on the same slot. The API already localizes that sentence into
 * five languages (apps/api/src/lib/error-i18n.ts); throwing it away and
 * substituting a status code is strictly worse than what the server said.
 *
 * These two helpers are the seam: `serverErrorMessage` prefers the server's own
 * sentence, `apiErrorCode` exposes the machine code so a caller can RECOVER
 * (send the devotee back to the slot picker) rather than tell them to retry.
 */

/**
 * Developer names for HTTP statuses. A server that answers
 * {"error":"Internal Server Error"} has told us nothing a devotee can act on,
 * so the caller's own copy wins over it.
 */
const DEVELOPER_ERROR_NAMES =
  /^(internal server error|bad gateway|service unavailable|gateway timeout|not found|forbidden|unauthorized|bad request|conflict|error)$/i;

function usableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (DEVELOPER_ERROR_NAMES.test(trimmed)) return null;
  return trimmed;
}

/**
 * The server's own explanation if it sent one worth reading, else `fallback`.
 * Never invents text — a body with nothing usable returns the caller's copy.
 */
export function serverErrorMessage(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null) return fallback;
  const b = body as { error?: unknown; message?: unknown };
  return usableString(b.error) ?? usableString(b.message) ?? fallback;
}

/** The machine-readable `code` an API error body carries, if any. */
export function apiErrorCode(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const code = (body as { code?: unknown }).code;
  return typeof code === 'string' && code.trim() ? code.trim() : null;
}

/**
 * True if the message looks like an AUTHENTICATION failure — 401, "we do not
 * know who you are". The only error class for which signing in again is the
 * remedy.
 *
 * AUTH-06 (2026-08-28): 403 and "forbidden" used to be in here, and that was
 * wrong in a way that only became load-bearing when AUTH-06 wired `reauth` up
 * to <ReauthPrompt> — which renders INSTEAD of Retry. See `isForbiddenError`.
 */
export function isAuthError(message: string): boolean {
  return /401|unauthorized|unauthenticated|demo tokens|invalid.*token|session expired/i.test(
    message,
  );
}

/**
 * True if the message looks like an AUTHORIZATION refusal — 403, "we know
 * exactly who you are and you still cannot have this".
 *
 * AUTH-06 (2026-08-28) — why this had to be split out of `isAuthError`.
 *
 * A 403 never means an expired session in this API. Every one of the ~40
 * `reply.code(403)` sites is an authorization outcome, and the middleware says
 * so in its own words (apps/api/src/middlewares/auth.ts:80): "403 (not 401)
 * signals 'we know who you are, you just can't be here' so the frontend can
 * show a 'account suspended' screen instead of bouncing back to login". The two
 * populations are a SUSPENDED account (rejectIfBlocked, :88 — body "Account
 * suspended: <reason>") and role/ownership guards. Every session failure is a
 * 401.
 *
 * While `reauth` was a flag nobody read, folding 403 in here only mis-worded a
 * sentence. Once AUTH-06 made <ReauthPrompt> REPLACE the Retry button, it
 * became a trap: a suspended devotee was told her session had expired, given a
 * "Sign in again" button, signed in successfully — the block is enforced per
 * request, not at the door — was sent by `reauthLoginHref(pathname)` straight
 * back to the page that refused her, and got the same sentence again. A loop
 * whose only exit is the one control that cannot work is exactly the pathology
 * AUTH-06 exists to remove.
 *
 * Deliberately DISJOINT from `isAuthError` rather than merely ordered ahead of
 * it, so no future caller can get the wrong answer by testing them in the wrong
 * order. "Unauthorized" (401's name) is not matched here: the `not authorised`
 * pattern requires the word break, so 403's "Not authorized for this
 * consultation." matches and 401's "Unauthorized" does not.
 */
export function isForbiddenError(message: string): boolean {
  return /\b403\b|forbidden|account suspended|\bnot authori[sz]ed\b|role required|insufficient_scope|\bnotorgmember\b|\bnot owner\b/i.test(
    message,
  );
}

/**
 * What to say when the server refused on authorization grounds. Names support
 * because that is the ONLY exit from a suspension — and because "please try
 * again" is advice that can never succeed against one. Says nothing about which
 * of the two 403 populations this is: `friendlyApiError` sees a bare message,
 * and guessing "your account is suspended" at a devotee who merely followed a
 * stale link would be worse than the generic truth.
 */
export const FORBIDDEN_ERROR_MESSAGE =
  'You do not have access to this. Contact support@darshya.online if you think that is wrong.';

/** True if the message looks like a rate-limit (429). */
export function isRateLimitError(message: string): boolean {
  return /429|too many|rate limit|try again in/i.test(message);
}

/**
 * Convert a raw API/HTTP error into user-facing copy. Accepts the thrown
 * Error (or its message) and returns a friendly string + whether the user
 * should be prompted to re-authenticate.
 */
export function friendlyApiError(err: unknown): { message: string; reauth: boolean } {
  const raw = err instanceof Error ? err.message : String(err ?? '');

  // AUTH-06: authorization BEFORE authentication. The two predicates are
  // disjoint so the order cannot change the answer, but a 403 reaching the
  // 401 branch is the specific mistake this ordering documents against.
  if (isForbiddenError(raw)) {
    return { message: FORBIDDEN_ERROR_MESSAGE, reauth: false };
  }
  if (isAuthError(raw)) {
    return {
      message: 'Your session has expired. Please sign in again to continue.',
      reauth: true,
    };
  }
  if (isRateLimitError(raw)) {
    return {
      message: 'Too many attempts. Please wait a few minutes and try again.',
      reauth: false,
    };
  }
  if (/5\d\d|server error|internal error|bad gateway|service unavailable/i.test(raw)) {
    return {
      message: 'Something went wrong on our side. Please try again in a moment.',
      reauth: false,
    };
  }
  // RES-09 (2026-08-28): this list was Chromium-shaped. Every browser words a
  // failed fetch differently and only Chrome's and Firefox's were here —
  // Chrome "Failed to fetch", Firefox "NetworkError when attempting to fetch
  // resource." (caught by `network`), Safari/iOS "Load failed" and "The
  // Internet connection appears to be offline.", neither of which matched. On
  // an iPhone those fell through to the generic bucket, so a devotee on a
  // dropped connection was told "We could not load this right now" — no
  // mention of the connection, which is the one thing they could have fixed.
  if (
    /network|failed to fetch|fetch failed|load failed|connection appears to be offline|econn|timeout|timed out/i.test(
      raw,
    )
  ) {
    return {
      message: 'Could not reach the server. Please check your connection and try again.',
      reauth: false,
    };
  }
  // 404 / not-found and anything else → a neutral, non-technical message.
  return {
    message: GENERIC_ERROR_MESSAGE,
    reauth: false,
  };
}

/**
 * The bucket `friendlyApiError` lands in when it recognises nothing. Exported
 * because `userFacingMessage` needs to tell "I classified this" apart from
 * "I gave up" — see below.
 */
export const GENERIC_ERROR_MESSAGE = 'We could not load this right now. Please try again.';

/**
 * RES-09 (2026-08-28) — the seam that was missing, and the reason the pattern
 * kept coming back.
 *
 * `friendlyApiError` maps a RAW error to friendly copy. But most screens do
 * this instead:
 *
 *     if (!res.ok) throw new Error(`Could not load X (${res.status}). ${body}`)
 *     …
 *     catch (err) { setError(err instanceof Error ? err.message : '…') }
 *
 * and the message they render is whatever `err.message` happens to hold —
 * their own composed string on a bad status, but the PLATFORM's on anything
 * else: "Failed to fetch", "Load failed", "NetworkError when attempting to
 * fetch resource", "Unexpected token '<' … is not valid JSON". Dropping
 * `friendlyApiError` in on top of that is not enough either: it cannot tell a
 * sentence the product wrote from one the browser wrote, so it flattens the
 * good one to GENERIC_ERROR_MESSAGE.
 *
 * `UserFacingError` is that missing distinction. A screen throws one when it
 * has already built copy fit for a user; `userFacingMessage` passes those
 * straight through and routes everything else through `friendlyApiError`.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserFacingError';
    // Subclassing a built-in loses the prototype link when the class is
    // downlevelled. Without this the `instanceof` below silently returns false
    // and every deliberate message falls through to the generic bucket.
    Object.setPrototypeOf(this, UserFacingError.prototype);
  }
}

/**
 * The server's own sentence out of an error response BODY AS TEXT, else
 * `fallback`. The text form matters: these screens read `await res.text()`
 * because an error response is not guaranteed to be JSON at all — a gateway or
 * a proxy answers HTML, and `JSON.parse` throwing is exactly the signal that
 * there is nothing quotable in there. Never renders the raw body.
 */
export function serverErrorText(text: string, fallback: string): string {
  if (!text || !text.trim()) return fallback;
  try {
    return serverErrorMessage(JSON.parse(text), fallback);
  } catch {
    return fallback;
  }
}

/**
 * What to show the user for a caught error.
 *
 *  - a `UserFacingError` → its own message, untouched
 *  - anything `friendlyApiError` recognises (auth, rate limit, 5xx, network)
 *    → that classification, which is more specific than a page's own copy
 *  - anything else → the caller's `fallback` if it has one, since a page can
 *    say "Could not load your payouts" where this helper can only say "this"
 */
export function userFacingMessage(err: unknown, fallback?: string): string {
  if (err instanceof UserFacingError && err.message.trim()) return err.message;
  const { message } = friendlyApiError(err);
  if (message === GENERIC_ERROR_MESSAGE && fallback && fallback.trim()) return fallback;
  return message;
}

/**
 * AUTH-06 (2026-08-23) — the link that makes `reauth: true` actionable.
 *
 * `friendlyApiError` has returned a `reauth` flag since #208 and not one of the
 * six call sites reads it. They render "Your session has expired. Please sign in
 * again to continue." next to a Retry button, and Retry re-fires the request
 * that just 401'd. Telling someone to sign in again while handing them a control
 * that cannot is worse than saying nothing: it looks like the way out.
 *
 * Two rules are baked in here rather than left to each caller:
 *
 *  1. ROOT-RELATIVE ONLY. app/auth/login's own `safeRedirect` (P0-1, 2026-07-17)
 *     drops anything that is not root-relative or same-origin, so an off-origin
 *     value would silently land the user on their dashboard instead of where
 *     they were. Not emitting it means the URL never reaches a rendered link at
 *     all, which is the stronger position.
 *  2. NEVER BACK INTO /auth. A signed-out user sent to
 *     `/auth/login?redirect=/auth/login` bounces in a circle.
 *
 * Encoding matters too: `/bookings/view?id=BS-…` must arrive as ONE parameter,
 * so the caller passes a raw `usePathname()` (plus search, if it has it) and
 * this function does the encoding once.
 */
export function reauthLoginHref(pathname: string | null | undefined): string {
  const LOGIN = '/auth/login';
  if (!pathname) return LOGIN;
  const target = pathname.trim();
  // Root-relative, and not protocol-relative ("//evil.com" is off-origin).
  if (!target.startsWith('/') || target.startsWith('//')) return LOGIN;
  // /auth/login, /auth/logout, /auth/verify … all send a signed-out user in a
  // loop or straight back out again.
  if (target === '/auth' || target.startsWith('/auth/')) return LOGIN;
  return `${LOGIN}?redirect=${encodeURIComponent(target)}`;
}
