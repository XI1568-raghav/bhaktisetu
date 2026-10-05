/**
 * A request budget for screens that build their own `fetch` call.
 *
 * WHY THIS EXISTS
 * ---------------
 * Three request paths reach the API from this app and only two of them are
 * bounded:
 *
 *   1. `@poojly/api-client`'s `api.*` — arms an `AbortController` with a 30s
 *      default (packages/api-client/src/client.ts:165-168).
 *   2. `lib/api.ts`'s `apiFetch`/`apiPost` — now race an `AbortController`
 *      against a 20s deadline.
 *   3. A screen that calls `fetch(`${apiBase()}/api/v1/...`)` directly, which
 *      it must whenever it needs a bearer header, a non-JSON reply or a
 *      non-`/api/v1` path. Those were bare `fetch` calls with NOTHING bounding
 *      them.
 *
 * A bare `fetch` NEVER settles on a half-open socket — captive portal, flaky
 * mobile data, a cold Render dyno. The line after the `await` therefore never
 * runs, so `setSubmitting(false)` never runs, so the button spins forever with
 * no error. That is the LIVE P0 in TASKS.md, and it was reproduced by every
 * category-3 caller in the devotee lane: gurukul-apply, gurukul-portal,
 * learn-sanskrit, lesson, puja-book and checkout.
 *
 * `lib/account-api.ts` and `app/(devotee)/delete-account.tsx` each grew their
 * own private copy of this race. This is the same shape, in one place, for the
 * callers that hold a `Response` rather than a parsed body.
 *
 * BELT AND BRACES, deliberately. The `AbortController` is armed so the socket
 * is actually released, AND the deadline is raced, because `fetch`'s abort is
 * not guaranteed to reject on every React Native platform build. Either one
 * alone can leave the promise pending; together they cannot.
 */

import { currentAcceptLanguage } from './language';

/** Matches `API_TIMEOUT_MS` in lib/api.ts and `ACCOUNT_REQUEST_TIMEOUT_MS`. */
export const FETCH_BUDGET_MS = 20_000;

/**
 * Copy for a request that never landed. A timeout and a dead socket are
 * indistinguishable from the app's side and have the same consequence, so they
 * say the same true thing rather than guessing at a cause.
 */
export const FETCH_NETWORK_MESSAGE =
  'Could not reach Darshya. Check your connection and try again.';

/** The request never landed: our deadline fired, or the socket failed. */
export class FetchBudgetError extends Error {
  /** true when OUR deadline fired, false for a socket that failed outright. */
  readonly timedOut: boolean;

  constructor(timedOut: boolean, message: string = FETCH_NETWORK_MESSAGE) {
    super(message);
    this.name = 'FetchBudgetError';
    this.timedOut = timedOut;
  }
}

function isAbort(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { name?: unknown; message?: unknown };
  if (e.name === 'AbortError') return true;
  return typeof e.message === 'string' && e.message.toLowerCase().includes('abort');
}

/**
 * `fetch`, guaranteed to settle within `budgetMs`.
 *
 * Rejects with `FetchBudgetError` — never with a bare `TypeError: Network
 * request failed`, whose message is not something to show a devotee. Resolves
 * with the `Response` untouched, so the caller keeps full control of status
 * handling (a 400 is an answer, not a failure).
 */
export async function fetchWithBudget(
  url: string,
  init: RequestInit = {},
  budgetMs: number = FETCH_BUDGET_MS,
): Promise<Response> {
  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : undefined;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      try {
        controller?.abort();
      } catch {
        // Aborting is best-effort; the rejection below is what callers see.
      }
      reject(new FetchBudgetError(true));
    }, budgetMs);
  });

  const attempt = (async () => {
    try {
      const headers = new Headers(init.headers as HeadersInit | undefined);
      if (!headers.has('Accept-Language')) headers.set('Accept-Language', currentAcceptLanguage());
      const withLang = { ...init, headers };
      return await fetch(url, controller ? { ...withLang, signal: controller.signal } : withLang);
    } catch (err) {
      throw new FetchBudgetError(isAbort(err));
    }
  })();

  try {
    return await Promise.race([attempt, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * The sentence a non-2xx body actually carries.
 *
 * Every route in this repo answers an error as JSON — `{error}`, `{message}`,
 * or zod's `{error, details:{fieldErrors, formErrors}}`. Screens were showing
 * `await res.text()` verbatim, so a devotee whose guardian phone was one digit
 * short read a raw JSON blob in an `Alert`. Never invents a cause: falls back
 * to naming the status when the body says nothing.
 */
export async function readErrorMessage(res: Response, fallback?: string): Promise<string> {
  const generic = fallback ?? `Request failed (HTTP ${res.status}).`;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return generic;
  }
  if (typeof body !== 'object' || body === null) return generic;
  const bag = body as Record<string, unknown>;

  const message = typeof bag.message === 'string' ? bag.message.trim() : '';
  if (message.length > 0) return message;

  const described = describeIssues(bag.details) ?? describeIssues(bag.issues);
  if (described) return described;

  const error = typeof bag.error === 'string' ? bag.error.trim() : '';
  if (error.length > 0 && error !== 'Bad Request' && error !== 'invalid_body') return error;

  return described ?? generic;
}

/** Turn a zod `flatten()` payload into a sentence naming the rejected field. */
function describeIssues(issues: unknown): string | undefined {
  if (typeof issues !== 'object' || issues === null) return undefined;
  const bag = issues as { fieldErrors?: unknown; formErrors?: unknown };

  if (Array.isArray(bag.formErrors)) {
    const first = bag.formErrors.find((m) => typeof m === 'string' && m.trim().length > 0);
    if (typeof first === 'string') return first;
  }

  if (typeof bag.fieldErrors === 'object' && bag.fieldErrors !== null) {
    const fields = Object.keys(bag.fieldErrors as Record<string, unknown>);
    if (fields.length === 1) {
      const messages = (bag.fieldErrors as Record<string, unknown>)[fields[0]!];
      const first = Array.isArray(messages)
        ? messages.find((m) => typeof m === 'string' && m.trim().length > 0)
        : undefined;
      if (typeof first === 'string') return `${fields[0]}: ${first}`;
      return `Please check the ${fields[0]} field.`;
    }
    if (fields.length > 1) {
      return `Please check these fields: ${fields.join(', ')}.`;
    }
  }

  return undefined;
}

/** True for a rejection this module raised (i.e. the request never landed). */
export function isNetworkFailure(err: unknown): boolean {
  return err instanceof FetchBudgetError;
}

/** The message to show for any rejection out of `fetchWithBudget`. */
export function failureMessage(err: unknown, fallback: string = FETCH_NETWORK_MESSAGE): string {
  if (err instanceof FetchBudgetError) return err.message;
  if (err instanceof Error && err.message.trim().length > 0) return err.message;
  return fallback;
}
