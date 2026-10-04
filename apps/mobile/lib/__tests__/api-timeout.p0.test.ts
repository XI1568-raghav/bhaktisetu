/**
 * Regression test for the LIVE P0 in TASKS.md — the infinite spinner.
 *
 * `lib/api.ts`'s `apiFetch` / `apiPost` were bare `fetch` calls with no
 * AbortController. A bare `fetch` never settles on a half-open socket, so
 *
 *     setBusy(true); await apiPost(...); setBusy(false);
 *
 * left `setBusy(false)` unreachable: the spinner turned forever and no error
 * was ever shown. Three screens grew private workarounds; the source stayed
 * broken. These tests pin the fix at the source.
 *
 * The second half pins the other half of that defect: the old code threw
 * `new Error('API error: ' + status)` and discarded the body, so a 400 that
 * named the exact field the server rejected reached the user as "API error:
 * 400".
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = process.env.EXPO_PUBLIC_API_URL;

/**
 * `lib/api.ts` resolves its base URL at MODULE LOAD and throws outside
 * `__DEV__` when the env is unset, so the env must be in place before the
 * import and the registry reset between cases.
 */
async function loadApi() {
  process.env.EXPO_PUBLIC_API_URL = 'https://api.test.invalid';
  vi.resetModules();
  return import('../api');
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (ORIGINAL_ENV === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = ORIGINAL_ENV;
});

describe('lib/api settles every request within the budget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('rejects a stalled GET instead of hanging forever', async () => {
    const { apiFetch, API_TIMEOUT_MS, ApiNetworkError } = await loadApi();

    // A socket that accepts and never answers — exactly what a captive portal
    // or a cold dyno does, and what a bare fetch can never recover from.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );

    const pending = apiFetch('/anything');
    const assertion = expect(pending).rejects.toBeInstanceOf(ApiNetworkError);
    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS + 1);
    await assertion;
  });

  it('rejects a stalled POST instead of hanging forever', async () => {
    const { apiPost, API_TIMEOUT_MS, API_NETWORK_MESSAGE } = await loadApi();

    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );

    const pending = apiPost('/anything', { a: 1 });
    const assertion = expect(pending).rejects.toThrow(API_NETWORK_MESSAGE);
    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS + 1);
    await assertion;
  });

  it('arms an AbortController so the stalled socket is actually released', async () => {
    const { apiFetch, API_TIMEOUT_MS } = await loadApi();

    let seen: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        seen = init?.signal ?? undefined;
        return new Promise<Response>(() => {});
      }),
    );

    const pending = apiFetch('/anything').catch(() => undefined);
    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS + 1);
    await pending;

    expect(seen).toBeDefined();
    expect(seen?.aborted).toBe(true);
  });

  it('a stalled BODY is the same infinite spinner, so it is on the deadline too', async () => {
    const { apiFetch, API_TIMEOUT_MS, ApiNetworkError } = await loadApi();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: () => new Promise(() => {}),
      })),
    );

    const pending = apiFetch('/anything');
    const assertion = expect(pending).rejects.toBeInstanceOf(ApiNetworkError);
    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS + 1);
    await assertion;
  });

  it('clears the timer on a fast response so nothing keeps the app awake', async () => {
    const { apiFetch } = await loadApi();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) })),
    );

    await expect(apiFetch('/anything')).resolves.toEqual({ ok: true });
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('lib/api reports what the server actually said', () => {
  it('surfaces a `message` field verbatim instead of "API error: 400"', async () => {
    const { apiPost } = await loadApi();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'ValidationError',
          message: 'Password must be at least 8 characters',
        }),
      })),
    );

    await expect(apiPost('/auth/signup', {})).rejects.toThrow(
      'Password must be at least 8 characters',
    );
  });

  it('names the rejected field from a zod issue bag', async () => {
    const { apiPost } = await loadApi();

    // The verbatim shape of a 400 from apps/api/src/routes/leads-self-onboard.ts.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        json: async () => ({
          ok: false,
          error: 'invalid_body',
          issues: { formErrors: [], fieldErrors: { templeName: ['Required'] } },
        }),
      })),
    );

    await expect(apiPost('/leads/self-onboard', {})).rejects.toThrow(/templeName/);
  });

  it('carries the status so a caller can tell 401 from 500', async () => {
    const { apiFetch, ApiError } = await loadApi();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      })),
    );

    await expect(apiFetch('/admin/users')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    });
    await expect(apiFetch('/admin/users')).rejects.toBeInstanceOf(ApiError);
  });

  it('does not turn a non-JSON error page into a parse crash', async () => {
    const { apiFetch } = await loadApi();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON');
        },
      })),
    );

    await expect(apiFetch('/anything')).rejects.toThrow('HTTP 502');
  });

  it('a dead socket is a network failure, not a server error', async () => {
    const { apiFetch, API_NETWORK_MESSAGE } = await loadApi();

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Network request failed');
      }),
    );

    await expect(apiFetch('/anything')).rejects.toThrow(API_NETWORK_MESSAGE);
  });
});
