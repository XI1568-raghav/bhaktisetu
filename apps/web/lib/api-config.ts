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
 * read it. `loadErrorMessage` never had one at all: it answers a 401/403 with
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
 */
export function loadErrorIsReauth(cause: unknown): boolean {
 const status = loadErrorStatus(cause);
 return status === 401 || status === 403;
}

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
  if (loadErrorIsReauth(cause)) {
   return 'Your session has expired — sign in again to see your live figures.';
  }
  return `Couldn't load live data (HTTP ${status}). The figures below are placeholders, not your real numbers — retry.`;
 }
 if (isNetworkFailure(cause)) {
  return `${NETWORK_ERROR_MESSAGE} The figures below are placeholders, not your real numbers.`;
 }
 return "Couldn't load live data. The figures below are placeholders, not your real numbers — retry.";
}
