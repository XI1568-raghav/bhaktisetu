// EXPO_PUBLIC_API_URL is baked into every EAS profile (development / preview /
// production / testflight) via eas.json `env`. If a device build is missing it,
// fail loud at first call rather than 100% of requests silently hitting
// localhost:4000 — which is unreachable from physical devices and looks like a
// generic network error to users. __DEV__ allows the simulator/local Expo Go
// flow to keep using a localhost dev server when no env is configured.
declare const __DEV__: boolean;

function resolveApiBase(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env && env.trim().length > 0) return env;
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return 'http://localhost:4000';
  }
  throw new Error(
    'mobile/lib/api: EXPO_PUBLIC_API_URL not set in this build. Configure it in eas.json `env` for every profile before building.'
  );
}

const API_ROOT = resolveApiBase();
const API_BASE = `${API_ROOT}/api/v1`;

/**
 * Shared API root (no trailing slash, no `/api/v1` suffix) for screens that
 * build their own auth-bearing fetch calls. Use this instead of re-reading
 * `process.env.EXPO_PUBLIC_API_URL` per-screen — that pattern silently fell
 * back to `localhost:4000` (unreachable from devices) in 6 screens. This
 * reuses the loud-failing resolver above, so a misconfigured build fails at
 * first call rather than silently hitting localhost.
 */
export function apiBase(): string {
  return API_ROOT;
}

// ─── Request budget (the infinite-spinner P0, fixed at source) ───────────────
//
// `apiFetch` and `apiPost` were bare `fetch` calls with no AbortController.
// A bare `fetch` NEVER settles on a half-open socket — captive portal, flaky
// mobile data, a cold Render dyno — so the line after the `await` never runs.
// Every screen that does
//
//     setBusy(true); await apiPost(...); setBusy(false);
//
// therefore span its spinner forever and showed no error, which is the LIVE P0
// recorded in TASKS.md. apps/web fixed the same defect with `fetchWithTimeout`
// in apps/web/lib/api-config.ts; three mobile screens
// ((auth)/forgot-password, (devotee)/delete-account, lib/account-api) each grew
// their own private workaround because this file was left alone. It is fixed
// here now, so the workarounds are belt to these braces rather than the only
// thing standing between a devotee and a frozen screen.
//
// 20s matches apps/web's AUTH_FETCH_TIMEOUT_MS and the per-screen races that
// already exist, so no screen's observable budget changes.
export const API_TIMEOUT_MS = 20_000;

/**
 * Copy for a request that never landed. A timeout and a dead socket are
 * indistinguishable from the app's side and have the same consequence, so they
 * say the same true thing rather than guessing at a cause.
 */
export const API_NETWORK_MESSAGE =
  'Could not reach Darshya. Check your connection and try again.';

/** Copy for a 2xx whose body was not the JSON the contract promises. */
export const API_UNREADABLE_MESSAGE =
  'Darshya sent a response the app could not read. Please try again.';

/** A non-2xx answer. `status` lets a caller tell 400 from 401 from 500. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** The request never landed: timeout, aborted socket, or transport failure. */
export class ApiNetworkError extends Error {
  /** true when OUR deadline fired, false for a socket that failed outright. */
  readonly timedOut: boolean;

  constructor(timedOut: boolean, message: string = API_NETWORK_MESSAGE) {
    super(message);
    this.name = 'ApiNetworkError';
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
 * Turn a zod `flatten()` payload into a sentence naming the fields the server
 * rejected. Several public routes (`/leads/self-onboard`, `/waitlist`) answer
 * 400 `{ error: 'invalid_body', issues: { fieldErrors, formErrors } }`, and
 * surfacing only `"invalid_body"` — or the old `"API error: 400"` — told the
 * applicant nothing about which field to fix.
 */
function describeIssues(issues: unknown): string | undefined {
  if (typeof issues !== 'object' || issues === null) return undefined;
  const bag = issues as { fieldErrors?: unknown; formErrors?: unknown };

  if (Array.isArray(bag.formErrors)) {
    const first = bag.formErrors.find((m) => typeof m === 'string' && m.trim().length > 0);
    if (typeof first === 'string') return first;
  }

  if (typeof bag.fieldErrors === 'object' && bag.fieldErrors !== null) {
    const byField = bag.fieldErrors as Record<string, unknown>;
    const fields = Object.keys(byField);
    const only = fields.length === 1 ? fields[0] : undefined;
    if (only !== undefined) {
      const messages = byField[only];
      const first = Array.isArray(messages)
        ? messages.find((m) => typeof m === 'string' && m.trim().length > 0)
        : undefined;
      if (typeof first === 'string') return `${only}: ${first}`;
      return `Please check the ${only} field.`;
    }
    if (fields.length > 1) {
      return `Please check these fields: ${fields.join(', ')}.`;
    }
  }

  return undefined;
}

/**
 * The message a non-2xx body carries, if it carries one.
 *
 * The old code threw `new Error('API error: ' + status)` and discarded the
 * body, so a 400 explaining exactly which field was wrong reached the user as
 * "API error: 400". Reads `message` first (auth, admin), then `error`
 * (leads/waitlist), then the zod issue bag, and never invents a cause.
 */
async function messageFor(res: Response): Promise<string> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return `Request failed (HTTP ${res.status}).`;
  }
  if (typeof body !== 'object' || body === null) {
    return `Request failed (HTTP ${res.status}).`;
  }

  const bag = body as Record<string, unknown>;
  const message = typeof bag.message === 'string' ? bag.message.trim() : '';
  if (message.length > 0) return message;

  const described = describeIssues(bag.issues);
  if (described) return described;

  const error = typeof bag.error === 'string' ? bag.error.trim() : '';
  if (error.length > 0 && error !== 'invalid_body') return error;

  return `Request failed (HTTP ${res.status}).`;
}

async function send<T>(
  url: string,
  init: RequestInit,
  signal: AbortSignal | undefined,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, signal ? { ...init, signal } : init);
  } catch (err) {
    throw new ApiNetworkError(isAbort(err));
  }

  if (!res.ok) throw new ApiError(res.status, await messageFor(res));

  try {
    return (await res.json()) as T;
  } catch (err) {
    if (isAbort(err)) throw new ApiNetworkError(true);
    throw new ApiNetworkError(false, API_UNREADABLE_MESSAGE);
  }
}

/**
 * One request, guaranteed to settle within `API_TIMEOUT_MS`.
 *
 * Belt AND braces on purpose, for the reason lib/account-api.ts already
 * documents: `AbortController` is armed so the socket is actually released,
 * and the deadline is ALSO raced, because `fetch`'s abort is not guaranteed to
 * reject on every React Native platform build. Either one alone can leave the
 * promise pending; together they cannot.
 *
 * The deadline covers the body read as well as the response headers — a
 * stalled body is the same infinite spinner as a stalled connection.
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
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
      reject(new ApiNetworkError(true));
    }, API_TIMEOUT_MS);
  });

  try {
    return await Promise.race([send<T>(url, init, controller?.signal), deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * A screen that must build its own request (a bearer header, a non-JSON body,
 * an error shape it reads itself) cannot come through here. `fetchWithBudget`
 * in lib/fetch-budget.ts is the same deadline for those callers — use it
 * rather than a bare `fetch`.
 */
export async function apiFetch<T>(path: string): Promise<T> {
  return request<T>(path);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
