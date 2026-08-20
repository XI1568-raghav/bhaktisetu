import { describe, it, expect, vi, afterEach } from 'vitest';
import { useEffect } from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { fetchWithTimeout, isNetworkFailure, AUTH_FETCH_TIMEOUT_MS } from '../lib/api-config';
import { AuthProvider, useAuth } from '../lib/auth-context';

/**
 * AUTH-01 — the timeout helper disarmed itself on the very path it exists to
 * protect.
 *
 * `await fetch(...)` settles the moment RESPONSE HEADERS arrive. The original
 * helper cleared its abort timer in a `finally` attached to that await, so the
 * deadline was gone before the caller ever ran `await res.json()`. A server
 * that flushes headers and then stalls the body — a cold dyno, a proxy that
 * accepted and never finished, a suspended service behind a gateway — produced
 * exactly the permanent spinner the helper was added to remove: nothing after
 * the `await res.json()` runs, `setIsSubmitting(false)` is never reached, and
 * no error is ever shown.
 *
 * These tests exercise the SECOND half of the round trip: headers arrive fast,
 * the body never does. Against the pre-fix helper the first test hangs until
 * vitest kills it, because nothing on the body path is timed at all.
 */

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/**
 * A response whose headers are already here and whose body never arrives.
 * Modelled on a real stalled chunked transfer rather than on a rejected fetch.
 */
function headersThenStall(status = 200): Response {
  const stalled = {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    json: () => new Promise<never>(() => {}),
    text: () => new Promise<never>(() => {}),
  };
  return stalled as unknown as Response;
}

describe('AUTH-01 — the body read is inside the deadline, not outside it', () => {
  it('rejects when headers arrive but the body never does', async () => {
    globalThis.fetch = vi.fn(async () => headersThenStall()) as unknown as typeof fetch;

    const res = await fetchWithTimeout('https://example.invalid/auth/login', {}, 40);
    // Pre-fix this promise NEVER settles — the abort timer was already cleared
    // when the headers landed, so there is no deadline left on the body at all.
    await expect(res.json()).rejects.toThrow();
  }, 2_000);

  it('classifies the stalled body as a network failure, not a bad password', async () => {
    globalThis.fetch = vi.fn(async () => headersThenStall()) as unknown as typeof fetch;

    const res = await fetchWithTimeout('https://example.invalid/auth/login', {}, 40);
    let thrown: unknown = null;
    try {
      await res.json();
    } catch (err) {
      thrown = err;
    }
    expect(thrown).not.toBeNull();
    // This is what stops sign-in from answering "Invalid email or password" to
    // a user whose password was correct.
    expect(isNetworkFailure(thrown)).toBe(true);
  }, 2_000);

  it('times the text() body read too, not only json()', async () => {
    globalThis.fetch = vi.fn(async () => headersThenStall(502)) as unknown as typeof fetch;

    const res = await fetchWithTimeout('https://example.invalid/auth/login', {}, 40);
    await expect(res.text()).rejects.toThrow();
  }, 2_000);

  it('leaves a body that answers in time completely untouched', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ session: { accessToken: 'a' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    ) as unknown as typeof fetch;

    const res = await fetchWithTimeout('https://example.invalid/auth/login', {}, 5_000);
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/json');
    await expect(res.json()).resolves.toEqual({ session: { accessToken: 'a' } });
  });

  it('still surfaces a real HTTP error body, so !res.ok keeps its message', async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: 'Invalid email or password' }), { status: 401 }),
    ) as unknown as typeof fetch;

    const res = await fetchWithTimeout('https://example.invalid/auth/login', {}, 5_000);
    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: 'Invalid email or password' });
  });

  it('does not hold the deadline open after the body has been read', async () => {
    // A body that resolves must clear its own timer, or a long-lived tab
    // accumulates one live handle per auth call.
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    globalThis.fetch = vi.fn(
      async () => new Response('{}', { status: 200 }),
    ) as unknown as typeof fetch;

    const res = await fetchWithTimeout('https://example.invalid/auth/me', {}, 5_000);
    const callsBeforeBody = clearSpy.mock.calls.length;
    await res.json();
    expect(clearSpy.mock.calls.length).toBeGreaterThan(callsBeforeBody);
  });
});

/**
 * The end-to-end shape of the owner's original P0 report: "wrong password shows
 * no error and the loader spins forever". The credential path is what they
 * pressed, so bind it there, not only at the helper.
 */
type SignIn = (email: string, password: string) => Promise<{ success: boolean; message: string }>;

let signIn: SignIn | null = null;

function Probe() {
  const { signInWithCredentials, isLoading } = useAuth();
  useEffect(() => {
    signIn = signInWithCredentials;
  }, [signInWithCredentials]);
  return <span data-testid="state">{isLoading ? 'loading' : 'ready'}</span>;
}

describe('AUTH-01 — sign-in itself escapes a headers-then-stall server', () => {
  it('returns an actionable message instead of spinning forever', async () => {
    globalThis.fetch = vi.fn(async () => headersThenStall()) as unknown as typeof fetch;
    // Fake timers so the real 20s auth budget does not become 20s of suite.
    vi.useFakeTimers();

    const view = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(view.getByTestId('state').textContent).toBe('ready');

    let result: { success: boolean; message: string } | null = null;
    await act(async () => {
      // Pre-fix this promise NEVER settled: fetch resolved on headers, the
      // timer was already cleared, and `await res.json()` had no deadline at
      // all — so `setIsSubmitting(false)` was never reached and the spinner
      // turned forever, which is the owner's original P0 report verbatim.
      const pending = signIn!('real-user@example.com', 'the-correct-password').then((r) => {
        result = r;
      });
      await vi.advanceTimersByTimeAsync(AUTH_FETCH_TIMEOUT_MS + 1_000);
      await pending;
    });

    expect(result).not.toBeNull();
    expect(result!.success).toBe(false);
    // And it must not blame the password for a server that never answered.
    expect(result!.message).not.toMatch(/invalid email or password/i);
    expect(result!.message).toMatch(/could not reach/i);
  });
});
