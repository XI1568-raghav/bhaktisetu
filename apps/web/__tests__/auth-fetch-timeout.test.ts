import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  fetchWithTimeout,
  isNetworkFailure,
  NETWORK_ERROR_MESSAGE,
  AUTH_FETCH_TIMEOUT_MS,
} from '../lib/api-config';

/**
 * Reported from production 2026-08-11: "no error message for wrong login,
 * loader keeps loading — same happens for google sign in".
 *
 * Root cause: every auth call used a bare `fetch`, which has no timeout. A
 * stalled connection meant the promise never settled, so the line after the
 * `await` (`setIsSubmitting(false)`) never ran and no error was ever set — an
 * infinite spinner with nothing to act on, on both the email/password path and
 * the Google callback.
 *
 * These tests bind to that: a request that never answers must REJECT within the
 * budget, and the rejection must be classifiable as a network failure so the UI
 * says "could not reach Darshya" instead of blaming the user's password.
 */

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('fetchWithTimeout — the infinite-spinner fix', () => {
  it('aborts a request that never answers, instead of hanging forever', async () => {
    // A server that accepts the connection and says nothing — the exact failure
    // mode a bare fetch cannot escape.
    globalThis.fetch = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          );
        }),
    ) as unknown as typeof fetch;

    await expect(fetchWithTimeout('https://example.invalid/auth/login', {}, 40)).rejects.toThrow(
      /abort/i,
    );
  });

  it('passes an AbortSignal through to fetch (without one there is no timeout at all)', async () => {
    const spy = vi.fn(async () => new Response('{}', { status: 200 }));
    globalThis.fetch = spy as unknown as typeof fetch;

    await fetchWithTimeout('https://example.invalid/auth/login', { method: 'POST' });

    const init = spy.mock.calls[0]![1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.method).toBe('POST');
  });

  it('returns the response untouched on the happy path', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }), { status: 401 }),
    ) as unknown as typeof fetch;

    const res = await fetchWithTimeout('https://example.invalid/auth/login');
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('clears its timer so a resolved call cannot abort a later one', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    globalThis.fetch = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch;

    await fetchWithTimeout('https://example.invalid/auth/me');

    expect(clearSpy).toHaveBeenCalled();
  });

  it('budgets 20s by default — generous enough for a cold dyno on mobile', () => {
    expect(AUTH_FETCH_TIMEOUT_MS).toBe(20_000);
  });
});

describe('isNetworkFailure — do not blame the password for a dead network', () => {
  it('classifies an abort as a network failure', () => {
    expect(isNetworkFailure(new DOMException('aborted', 'AbortError'))).toBe(true);
  });

  it("classifies fetch's TypeError as a network failure", () => {
    expect(isNetworkFailure(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('does NOT classify an ordinary error as a network failure', () => {
    // A real server rejection must keep its own message — otherwise every
    // genuine "invalid credentials" would read as a connectivity problem.
    expect(isNetworkFailure(new Error('Invalid email or password'))).toBe(false);
    expect(isNetworkFailure('boom')).toBe(false);
    expect(isNetworkFailure(null)).toBe(false);
  });

  it('has a message that names the real problem', () => {
    expect(NETWORK_ERROR_MESSAGE).toMatch(/could not reach/i);
    expect(NETWORK_ERROR_MESSAGE).not.toMatch(/password/i);
  });
});
