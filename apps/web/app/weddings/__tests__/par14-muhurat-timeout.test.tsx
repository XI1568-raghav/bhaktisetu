/**
 * PAR-14 (residual) — the muhurat finder was the last bare `fetch` on an auth
 * surface.
 *
 * The "infinite spinner, no error" P0 was traced to `fetch` having no timeout:
 * a half-open socket (flaky mobile, captive portal, cold Render dyno) means the
 * promise never settles, so the line after the `await` — the one that clears
 * the spinner and sets the error — never runs. Nine call sites got a budget;
 * this one did not, because nobody had measured how long the API's
 * mhah-panchang Ayanamsa/dasha scan takes across a wide date window and a blind
 * 15s cap could have turned a slow success into a failure.
 *
 * 45s does not need that measurement. It is three times the app's own
 * DATA_FETCH_TIMEOUT_MS and still finite.
 *
 * This test drives the actual failure: a fetch that never resolves on its own
 * and only settles when its AbortSignal fires. Without a signal being passed at
 * all it hangs forever and the test times out, which is the defect.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

vi.mock('../../../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', role: 'devotee' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

import MuhuratPage from '../muhurat/page';

/** A fetch that resolves ONLY when the caller aborts it. */
function hangingFetch() {
  return vi.fn(
    (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) return; // no budget → hangs forever, exactly as before
        signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      }),
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('PAR-14 — a stalled muhurat request ends in a sentence, not a spinner', () => {
  it('passes an AbortSignal, so the request cannot hang forever', async () => {
    const f = hangingFetch();
    vi.stubGlobal('fetch', f);

    const { container } = render(<MuhuratPage />);
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(f).toHaveBeenCalled());
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal!.aborted).toBe(false);

    // Cross-origin call: credentials must stay off, or the browser blocks the
    // response unless the API answers Access-Control-Allow-Credentials.
    expect(init.credentials).toBe('omit');
  });

  it('surfaces a recoverable message once the budget expires', async () => {
    const f = hangingFetch();
    vi.stubGlobal('fetch', f);

    const { container } = render(<MuhuratPage />);
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(f).toHaveBeenCalled());

    // Just past the 45s budget.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(45_001);
    });

    await waitFor(() =>
      expect(
        screen.getByText(/could not reach the muhurat service/i),
      ).toBeTruthy(),
    );
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.signal!.aborted).toBe(true);
  });

  it('does not fire the budget early — a slow success is still a success', async () => {
    const f = hangingFetch();
    vi.stubGlobal('fetch', f);

    const { container } = render(<MuhuratPage />);
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(f).toHaveBeenCalled());

    // The app's ordinary data budget is 15s. This endpoint is deliberately
    // allowed to take longer than that.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    const init = f.mock.calls[0][1] as RequestInit;
    expect(init.signal!.aborted).toBe(false);
    expect(screen.queryByText(/could not reach the muhurat service/i)).toBeNull();
  });
});
