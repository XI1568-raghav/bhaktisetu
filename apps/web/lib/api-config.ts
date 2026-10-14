import { announceSuspended, isSuspendedBody, suspensionReason } from './suspended-notice';
/**
 * API base URL for the Fastify backend.
 *
 * Kept in its own module (separate from `lib/supabase.ts`) so that consumers
 * who only need the URL don't drag `@supabase/supabase-js` into the client bundle.
 *
 * Auto-appends `/api/v1` if the env var doesn't include it, so callers can
 * write `${API_BASE_URL}/ai/chat` without thinking about the prefix.
 */
function resolve(): string {
 const candidate = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
 return candidate.endsWith('/api/v1')
 ? candidate
 : `${candidate.replace(/\/$/, '')}/api/v1`;
}

export const API_BASE_URL = resolve();

/**
 * How long an auth call may stall before we give up on it.
 *
 * Generous on purpose — a slow Indian mobile connection on a cold Render dyno
 * can legitimately take 10s+. This is a backstop against a hung socket, not a
 * performance budget.
 */
export const AUTH_FETCH_TIMEOUT_MS = 20_000;

/**
 * `fetch` with a hard timeout.
 *
 * WHY THIS EXISTS. Every auth call in this app used a bare `fetch`, and `fetch`
 * has no timeout: if the connection stalls — flaky mobile, captive portal, a
 * half-open socket, a proxy that accepts and never replies — the promise never
 * settles. Nothing after the `await` ever runs, so the caller's
 * `setIsSubmitting(false)` is never reached and no error is ever set. The user
 * is left watching a spinner turn forever with no message and no way to retry.
 *
 * That was reported from production on 2026-08-11 against BOTH email/password
 * sign-in (auth-context.signInWithCredentials) and the Google callback
 * (/auth/callback → POST /auth/google/sync), which is exactly the pair of call
 * sites this covers: same defect, two doors.
 *
 * An AbortController converts "hangs forever, says nothing" into "fails in 20s
 * with something the user can act on" — the only honest outcome of a request
 * that is never coming back.
 *
 * SEC-02 (2026-08-16): it also carries the auth cookie.
 *
 * The API has accepted the httpOnly `darshya_session` cookie as a credential
 * since #200 (apps/api/src/middlewares/auth.ts falls back to it when there is
 * no Bearer header), and a browser signing in through POST /auth/login now
 * actually stores it. None of that mattered, because the web never SENT the
 * cookie back: darshya.online and api.darshya.online are different origins, and
 * `fetch` defaults to `credentials: 'same-origin'`, which omits cookies on a
 * cross-origin request outright. Four call sites in lib/auth-context.tsx opted
 * in by hand; the ~96 others routed through here did not. So the JS-readable
 * localStorage access token remained the only credential that authenticated
 * anything — which IS SEC-02.
 *
 * Defaulting the mode here is the version of that fix that scales, because this
 * is the one chokepoint every timed fetch in apps/web already passes through,
 * and every one of them is aimed at API_BASE_URL — checked: no call site passes
 * a third-party origin, so nothing starts sending cookies to someone else.
 * `darshya_refresh` is path-scoped to /api/v1/auth on the server, so it still
 * only travels to the refresh endpoint. The server-side precondition holds too:
 * CORS is registered with `credentials: true` against an explicit origin
 * allowlist and never `*` (apps/api/src/lib/cors-origins.ts).
 *
 * No new CSRF surface, which is the obvious objection to sending cookies:
 * darshya.online and api.darshya.online are the same SITE, so `SameSite=lax`
 * (set by cookieSecurityOptions on the API) permits this call while still
 * withholding the cookie from any genuinely cross-site POST, and a scripted
 * cross-site call in credentials mode never leaves the browser because its
 * preflight fails the origin allowlist.
 *
 * Purely additive, deliberately. The `Authorization: Bearer` header each caller
 * builds is untouched and still authenticates; the cookie becomes a WORKING
 * PARALLEL credential rather than a replacement. Retiring the localStorage copy
 * is the next step and cannot be taken from here — see the notes on
 * persistAuthStorage in lib/auth-context.tsx, and lib/session-revive.ts for the
 * cookie-only rehydration that removed the API-side half of the blocker.
 *
 * `init` is spread AFTER the default, so a caller that deliberately asks for
 * `credentials: 'omit'` still gets it.
 *
 * AUTH-01 (2026-08-20): THE HELPER USED TO DISARM ITSELF HALFWAY THROUGH.
 *
 * `await fetch(...)` settles when RESPONSE HEADERS arrive, not when the body
 * has been read. The abort timer was cleared in a `finally` hung off exactly
 * that await, so by the time any caller reached `await res.json()` the deadline
 * was already gone and the second half of every auth round trip was completely
 * untimed. A server that flushes headers and then stalls the body — a cold
 * dyno, a proxy that accepted and never finished, a gateway in front of a
 * suspended service — reproduced the original permanent spinner in full: the
 * line after `await res.json()` never runs, so `setIsSubmitting(false)` is
 * never reached and no error is ever set. The fix survived its own bug.
 *
 * The deadline now spans the WHOLE round trip. `withBodyDeadline` re-arms the
 * remaining budget the first time a body reader is called and aborts the same
 * controller when it lapses, so the rejection is an `AbortError` and
 * `isNetworkFailure` still classifies it as "we never got an answer" rather
 * than as a rejected credential.
 */
const BODY_READERS = ['json', 'text', 'arrayBuffer', 'blob', 'formData'] as const;
type BodyReader = (typeof BODY_READERS)[number];

function isBodyReader(prop: string | symbol): prop is BodyReader {
 return typeof prop === 'string' && (BODY_READERS as readonly string[]).includes(prop);
}

/**
 * Wrap a Response so its body readers inherit what is LEFT of the deadline.
 *
 * A fresh timer per body read rather than holding the original one open: an
 * unread response must not leave a live 20s handle behind in a long-lived tab,
 * and a caller that reads two different readers should not have the first read
 * cancel the second.
 */
function withBodyDeadline(res: Response, controller: AbortController, deadlineAt: number): Response {
 if (typeof res !== 'object' || res === null) return res;
 return new Proxy(res, {
  get(target, prop, receiver) {
   if (isBodyReader(prop)) {
    const reader = Reflect.get(target, prop, target);
    if (typeof reader !== 'function') return reader;
    return (...args: unknown[]) => {
     const remaining = Math.max(deadlineAt - Date.now(), 1);
     let bodyTimer: ReturnType<typeof setTimeout> | undefined;
     const deadline = new Promise<never>((_resolve, reject) => {
      bodyTimer = setTimeout(() => {
       // Abort the underlying stream too — otherwise the socket is left
       // held open behind a promise nobody is waiting on any more.
       try {
        controller.abort();
       } catch {
        /* already aborted */
       }
       reject(
        new DOMException(
         `Response body stalled — no data after ${remaining}ms.`,
         'AbortError',
        ),
       );
      }, remaining);
     });
     const read = (reader as (...a: unknown[]) => Promise<unknown>).apply(target, args);
     return Promise.race([read, deadline]).finally(() => {
      if (bodyTimer !== undefined) clearTimeout(bodyTimer);
     });
    };
   }
   // Bind to the real Response: `json`/`headers`/`clone` reach for internal
   // slots and throw an illegal-invocation if `this` is the proxy.
   const value = Reflect.get(target, prop, target);
   return typeof value === 'function' ? value.bind(target) : value;
  },
 });
}

export async function fetchWithTimeout(
 input: RequestInfo | URL,
 init: RequestInit = {},
 timeoutMs: number = AUTH_FETCH_TIMEOUT_MS,
): Promise<Response> {
 const controller = new AbortController();
 const deadlineAt = Date.now() + timeoutMs;
 const timer = setTimeout(() => controller.abort(), timeoutMs);
 let res: Response;
 try {
  res = await fetch(input, { credentials: 'include', ...init, signal: controller.signal });
 } finally {
  clearTimeout(timer);
 }
 // A blocked account is refused with 403 "suspended" on every call. Tell the auth
 // layer once so it can sign out WITH the reason instead of failing silently.
 // Sign-in endpoints are skipped: the login form shows that answer itself.
 if (res.status === 403 && typeof window !== 'undefined' && !String(input).includes('/auth/')) {
  try {
   const body = await res.clone().json();
   if (isSuspendedBody(403, body)) announceSuspended(suspensionReason(body));
  } catch {
   /* not JSON: nothing to announce */
  }
 }
 return withBodyDeadline(res, controller, deadlineAt);
}

/**
 * Read a JSON body without letting a NON-JSON one become the story.
 *
 * AUTH-02: an error page from a gateway is HTML, and `res.json()` on HTML
 * throws a `SyntaxError`. Sign-in used to parse the body BEFORE checking
 * `res.ok`, so a 502 landed in the same `catch` as a rejected credential and a
 * user with the CORRECT password was told their password was wrong. Callers
 * check `res.ok` first and use this to read whatever the body turned out to be;
 * `null` means "the body was not JSON", never "the request failed".
 *
 * A stalled body still rejects — that is AUTH-01's deadline doing its job and
 * must not be swallowed into a silent `null`.
 */
export async function readJsonBody<T = unknown>(res: Response): Promise<T | null> {
 try {
  return (await res.json()) as T;
 } catch (err) {
  if (isNetworkFailure(err)) throw err;
  return null;
 }
}

/**
 * AUTH-02: the server answered 2xx but the body was not the JSON the contract
 * promises — a gateway that rewrote the response, a truncated payload, an HTML
 * interstitial. Not the user's credential, and not a clean network failure
 * either; say so rather than picking one of the two.
 */
export const UNREADABLE_RESPONSE_MESSAGE =
 'Darshya sent a reply we could not read. Please try again in a moment.';

/**
 * The honest sentence for an auth call the server REJECTED, when the body
 * carried no usable message of its own.
 *
 * AUTH-02: a 5xx is our failure, not the user's credential. Saying "invalid
 * email or password" there sends someone to reset a password that was never
 * wrong — which is exactly what happens while the API is down.
 */
export function authHttpErrorMessage(status: number, fallback: string): string {
 if (status >= 500) {
  return `Darshya is not responding right now (HTTP ${status}). Your details were not the problem — please try again in a moment.`;
 }
 if (status === 429) {
  return 'Too many attempts. Please wait a few minutes and try again.';
 }
 return fallback;
}

/**
 * True when a thrown value is a stalled/failed network call rather than a
 * rejection the server actually sent. Callers use this to avoid telling a user
 * "invalid email or password" when the truth is "we never reached the server".
 */
export function isNetworkFailure(err: unknown): boolean {
 if (err instanceof DOMException && err.name === 'AbortError') return true;
 return err instanceof TypeError; // fetch rejects with TypeError on network error
}

/** The one message every stalled/unreachable auth call should show. */
export const NETWORK_ERROR_MESSAGE =
 'Could not reach Darshya — check your connection and try again.';

/**
 * Timeout budget for ordinary DATA loads (dashboards, portals, profile).
 *
 * RES-01 (2026-08-12): `fetchWithTimeout` was added for the auth pair only, so
 * the other ~230 awaited fetches in this app still had no timeout at all. Held
 * open with a route interception that accepts and never answers, /priest,
 * /profile, /messages, /dashboard and /payouts all sat on their loading
 * spinner at T+10s AND at T+30s — no error, no retry, nothing. `fetch` never
 * rejects on a stalled socket, so the `finally { setLoading(false) }` those
 * pages already have could never run.
 *
 * Shorter than the auth budget on purpose: a sign-in is a deliberate act the
 * user is watching and will wait out, a dashboard load is not.
 */
export const DATA_FETCH_TIMEOUT_MS = 15_000;

/**
 * The HTTP status a failure carries, if it carries one. Callers pass either a
 * `Response` (whose `status` lives on the prototype, so `in` finds it) or the
 * thrown value from a network/timeout failure, which has none.
 */
function loadErrorStatus(cause: unknown): number {
 return typeof cause === 'object' && cause !== null && 'status' in cause
  ? Number((cause as { status: unknown }).status)
  : Number.NaN;
}

/**
 * AUTH-06 (2026-08-28) — whether this failure means "sign in again".
 *
 * `friendlyApiError` has returned a `reauth` flag since P1 #208 and no screen
 * read it. `loadErrorMessage` never had one at all: it answers a 401 with
 * "Your session has expired — sign in again to see your live figures." and
 * hands back a bare string, so the ten surfaces that render it cannot tell a
 * dead session from a 500 and cannot offer the link that sentence instructs
 * the user to press. Telling someone to sign in again beside a Retry that
 * re-fires the request that just 401'd is worse than saying nothing: the Retry
 * looks like the way out.
 *
 * The signature of `loadErrorMessage` cannot change — every caller stores its
 * result in `string | null` state — so the flag ships alongside it. A caller
 * renders `<ReauthPrompt message={loadError} />` (default export,
 * components/ReauthPrompt.tsx) INSTEAD of its Retry button when this is true,
 * or links `reauthLoginHref(pathname)` from lib/friendly-error.ts directly.
 *
 * Both this and the sentence read one classification, so they cannot drift
 * into disagreeing about the same cause.
 *
 * AUTH-07 (F454, 2026-09-08): a 401 is not one thing, and this treated it as
 * one. See `loadErrorAuthReason` below — two of the six reasons the API can now
 * give are NOT "sign in again", and one of them is a database outage.
 */
export function loadErrorIsReauth(cause: unknown): boolean {
 if (loadErrorStatus(cause) !== 401) return false;
 const reason = loadErrorAuthReason(cause);
 // No reason: an API that has not shipped the header yet, a header CORS did not
 // expose, or any 401 raised outside the auth middleware. Answer exactly as this
 // function did before AUTH-07 — the default must be the old behaviour, not a
 // new one, or upgrading the web ahead of the API changes ten pages silently.
 if (reason === null) return true;
 return !NOT_REAUTH_REASONS.has(reason);
}

/**
 * AUTH-07 (F454, 2026-09-08) — WHY the API said 401.
 *
 * THE FINDING. `loadErrorIsReauth` was `loadErrorStatus(cause) === 401` and
 * `loadErrorMessage` answered every 401 with "Your session has expired — sign
 * in again to see your live figures." The API answers 401 in at least three
 * cases where that is false, all three read out of the source and two of them
 * verified against api.darshya.online on 2026-09-08:
 *
 *   - apps/api/src/middlewares/auth.ts:110 — no token was ever sent. Probed:
 *     {"error":"Unauthorized","message":"Missing or invalid Authorization
 *     header. Expected: Bearer <token>"}. Nothing expired.
 *   - apps/api/src/middlewares/auth.ts:341 — the credential verified and there
 *     is no `User` row behind it. Signing in again SUCCEEDS and lands back on
 *     the same 401: it is the AUTH-06 loop, not a remedy.
 *   - apps/api/src/middlewares/auth.ts:228 — a DATABASE OUTAGE. The
 *     `email_sessions` lookup THREW and the middleware answers 401. Telling a
 *     user their session expired here sends them to re-authenticate against the
 *     thing that is down. They try, they fail, and they conclude their account
 *     is broken.
 *
 * A FOURTH SITE IS NOT FIXED HERE, DELIBERATELY. apps/api/src/routes/auth.ts:1136
 * is the same database outage on POST /auth/login and it answers 401 "Invalid
 * credentials." — but that response never reaches this function. Sign-in goes
 * through lib/auth-context.tsx:939, which prefers the server's own `message`, so
 * an outage there renders as "Invalid credentials." — a different lie, and the
 * one AUTH-02 was written to stop ("a 5xx is our failure, not the user's
 * credential"). It defeats AUTH-02 by answering 401 instead of 5xx. The same
 * handler already gets this right 110 lines earlier — routes/auth.ts:1024 answers
 * an unreachable database with 503 "Sign-in is temporarily unavailable." The fix
 * is at that site, not in this file's copy; see the AUTH-07 report.
 *
 * WHY A HEADER. The obvious discriminator is a field in the 401 body, and the
 * API sends one too (`authReason`) for clients that parse JSON. It could not be
 * the only carrier for THIS bug: all ten callers hand a bare `Response` to a
 * SYNCHRONOUS classifier and never read the body of a failed load —
 * app/dashboard/page.tsx:116, app/payouts/page.tsx:103, app/profile/page.tsx:163
 * and seven more. Reading a body is a promise; reading a header is a property.
 * `X-Auth-Reason` is the shape that reaches the code with the defect without
 * touching ten pages that other lanes own, and it leaves `res.json()` intact for
 * the caller — this function never consumes the body.
 *
 * 401 ONLY, STRUCTURALLY. A reason on any other status is ignored and returns
 * null, so nothing here can promote a 403 into "sign in again". That is not
 * politeness: an earlier pass of AUTH-06 made `loadErrorIsReauth` true for 401
 * OR 403 and answered both with the expiry line, and because <ReauthPrompt>
 * renders INSTEAD of Retry, a suspended provider got exactly one control, it
 * took her to a sign-in that succeeded, the redirect returned her to the same
 * refusal, and the loop closed. The reason field is precisely the mechanism
 * that could undo that fix, so the 401 check is the first line.
 *
 * An unrecognised value returns null rather than being passed through, so a
 * newer API cannot make an older web build invent copy for a reason it has
 * never heard of.
 */
export const AUTH_REASON_HEADER = 'x-auth-reason';

/** Mirrors apps/api/src/lib/auth-reason.ts. */
export type AuthFailureReason =
 | 'no_credentials'
 | 'session_expired'
 | 'session_revoked'
 | 'invalid_credential'
 | 'registration_incomplete'
 | 'verify_unavailable';

const AUTH_FAILURE_REASONS: ReadonlySet<string> = new Set<AuthFailureReason>([
 'no_credentials',
 'session_expired',
 'session_revoked',
 'invalid_credential',
 'registration_incomplete',
 'verify_unavailable',
]);

/**
 * The two reasons for which signing in again is NOT the remedy — and for which
 * offering it as the ONLY control (which is what `reauth: true` does, see
 * components/LoadErrorBanner.tsx) is the defect, not the fix.
 *
 * `verify_unavailable` is the outage. Re-authenticating during a database
 * outage aims the user at the thing that is down; Retry is the correct control
 * and it must survive.
 *
 * `registration_incomplete` is the loop. The Supabase credential is fine, so
 * the sign-in succeeds and returns the user to the identical 401 — the exact
 * pathology AUTH-06's second pass removed for 403, reproduced under 401.
 */
const NOT_REAUTH_REASONS: ReadonlySet<AuthFailureReason> = new Set<AuthFailureReason>([
 'verify_unavailable',
 'registration_incomplete',
]);

export function loadErrorAuthReason(cause: unknown): AuthFailureReason | null {
 if (loadErrorStatus(cause) !== 401) return null;
 if (typeof cause !== 'object' || cause === null) return null;

 // A `Response`. `headers.get` is case-insensitive and returns null for a
 // header the browser did not expose, which is exactly the un-widened API.
 const headers = (cause as { headers?: unknown }).headers;
 if (headers && typeof (headers as Headers).get === 'function') {
  const fromHeader = (headers as Headers).get(AUTH_REASON_HEADER);
  if (AUTH_FAILURE_REASONS.has(fromHeader ?? '')) return fromHeader as AuthFailureReason;
 }

 // A body a caller already parsed, or a test fixture. Same vocabulary, so a
 // client that reads JSON instead of headers classifies identically.
 const fromBody = (cause as { authReason?: unknown }).authReason;
 if (typeof fromBody === 'string' && AUTH_FAILURE_REASONS.has(fromBody)) {
  return fromBody as AuthFailureReason;
 }

 return null;
}

/**
 * AUTH-06 (2026-08-28, second pass) — 403 is NOT a reason to sign in again,
 * and saying it was turned this fix into the bug it was fixing.
 *
 * `loadErrorIsReauth` answered true for 401 OR 403, and `loadErrorMessage`
 * answered both with "Your session has expired — sign in again to see your live
 * figures." A 403 never means an expired session here: every one of the ~40
 * `reply.code(403)` sites in the API is an authorization outcome, and
 * apps/api/src/middlewares/auth.ts:80 says so outright — "403 (not 401) signals
 * 'we know who you are, you just can't be here' so the frontend can show a
 * 'account suspended' screen instead of bouncing back to login". The two
 * populations are a suspended account (rejectIfBlocked, :88) and role guards.
 *
 * Because <ReauthPrompt> renders INSTEAD of Retry, a suspended provider was
 * given one control, it took her to a sign-in that SUCCEEDED, the redirect
 * carried her back to the same refusal, and the loop closed — while the one
 * sentence that could have ended it ("Account suspended — contact support")
 * was thrown away on the way past.
 */
export function loadErrorIsForbidden(cause: unknown): boolean {
 return loadErrorStatus(cause) === 403;
}

/**
 * AUTH-07 (F454) — one sentence per reason, each naming what happened AND the
 * exit that actually works.
 *
 * The rule these are written to: the message must be true, and the control the
 * screen puts beside it (components/LoadErrorBanner.tsx renders <ReauthPrompt>
 * when `loadErrorIsReauth`, Retry otherwise) must be a control that can end the
 * problem. The old copy failed both halves for five of these six.
 *
 * RES-02's clause is preserved throughout: a zero the server never sent is a
 * fabricated number and must always carry the banner saying so. The reauth
 * sentences say it as "to see your live figures" — the wording the ten portals
 * have shipped since 2026-08-12 — and the two non-reauth ones say it outright,
 * because their user is going to sit and look at those zeros for a while.
 */
const AUTH_REASON_MESSAGES: Record<AuthFailureReason, string> = {
 // UNCHANGED from the pre-AUTH-07 sentence. This is the one case it was right
 // about, and there is no reason to churn copy that was already true.
 session_expired: 'Your session has expired — sign in again to see your live figures.',

 // Nothing expired: no credential ever reached the API
 // (apps/api/src/middlewares/auth.ts:110). "Expired" would tell someone who has
 // never signed in on this device that something of theirs ran out.
 no_credentials: 'You are not signed in — sign in to see your live figures.',

 // apps/api/src/middlewares/auth.ts, email-session path: `revoked_at` is set.
 // Signing in again is right; "expired" is a lie about why, and the difference
 // matters to someone who revokes sessions after losing a phone.
 session_revoked: 'You were signed out of this session — sign in again to see your live figures.',

 // We refused the credential and genuinely cannot say more: a forgery, a demo
 // token in production, a token minted for another project. Claiming an expiry
 // here asserts knowledge the API does not have.
 invalid_credential: 'We could not verify your sign-in — sign in again to see your live figures.',

 // The credential VERIFIED; there is no Darshya account behind it
 // (apps/api/src/middlewares/auth.ts:341). Not reauth: the sign-in succeeds and
 // returns the user to this identical 401. The exit is finishing signup or
 // support, so the sentence has to carry it — the screen shows Retry, and Retry
 // cannot end this either.
 registration_incomplete:
  'Your sign-in worked, but there is no Darshya account attached to it yet — finish creating your account, or contact support@darshya.online if you already have one. The figures below are placeholders, not your real numbers.',

 // The outage. apps/api/src/middlewares/auth.ts:228 (the email_sessions lookup
 // threw) and apps/api/src/routes/auth.ts:1136 ("DB/Supabase unavailable").
 // Not reauth, and the sentence says so explicitly: the failure mode this whole
 // finding is about is a user being sent to re-authenticate against a database
 // that is down, trying, failing, and concluding their account is broken. Retry
 // is the correct control and it is the one the banner will show.
 verify_unavailable:
  'We could not check your sign-in just now — that is a problem on our side, not with your account, so signing in again will not help. The figures below are placeholders, not your real numbers — retry in a moment.',
};

/**
 * The one honest sentence to render when a data load fails.
 *
 * RES-02 (2026-08-12): 7 of 10 authenticated pages answered an HTTP 500 by
 * rendering fabricated zeros with NO error — /payouts said "Available to
 * withdraw ₹0", /temple-portal "₹0 Revenue This Month", /dashboard "No
 * Bookings Yet — begin your spiritual journey" to a devotee with confirmed
 * pujas. During a backend incident that tells every provider on the platform
 * that their business earned nothing. A zero the server never sent is a
 * fabricated number; it must always carry the banner saying so.
 *
 * Pass a `Response` (or anything carrying a numeric `status`) for an HTTP
 * failure, or the thrown value for a network/timeout failure.
 */
export function loadErrorMessage(cause: unknown): string {
 const status = loadErrorStatus(cause);
 if (Number.isFinite(status)) {
  // AUTH-07 (F454): the 401 branch used to be one sentence for six different
  // things. An error must say what happened and what to do next, and "Your
  // session has expired" during a database outage is neither. Ordered before
  // the reauth branch because two of these reasons are deliberately NOT reauth
  // and would otherwise fall through to the generic HTTP line.
  const reason = loadErrorAuthReason(cause);
  if (reason !== null) return AUTH_REASON_MESSAGES[reason];
  if (loadErrorIsReauth(cause)) {
   return 'Your session has expired — sign in again to see your live figures.';
  }
  // AUTH-06: signing in again cannot lift a suspension or grant a role, so this
  // must not borrow the sentence above. Naming support is the only exit, and
  // the placeholder warning still has to be said — the zeros on screen are
  // fabricated whatever the reason the real numbers did not arrive.
  if (loadErrorIsForbidden(cause)) {
   return 'You do not have access to these figures — the numbers below are placeholders, not your real data. Contact support@darshya.online if you think that is wrong.';
  }
  return `Couldn't load live data (HTTP ${status}). The figures below are placeholders, not your real numbers — retry.`;
 }
 if (isNetworkFailure(cause)) {
  return `${NETWORK_ERROR_MESSAGE} The figures below are placeholders, not your real numbers.`;
 }
 return "Couldn't load live data. The figures below are placeholders, not your real numbers — retry.";
}
