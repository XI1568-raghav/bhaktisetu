/**
 * RES-08 / RES-10 / RES-11 (prod sweep 2026-08-12) — three silent failures on
 * the same two screens.
 *
 * RES-08: Inbox polled every 3s with no in-flight guard, no timeout and no 5xx
 * backoff. With every request held open and never answered, /messages fired 12
 * API calls in 37 seconds while the UI sat on "Loading inbox…" — a fresh
 * request every 3s with the previous ones still pending, none of them ever
 * aborted, and a second 3s interval starts when a thread is opened (40 req/min
 * per tab). Chrome's 6-connections-per-host limit means the tab eventually
 * cannot issue any request at all: the client amplifies the outage.
 *
 * RES-10: send() was `if (res.ok) { … }` with no else and no catch, so on a
 * 500 the draft stayed in the box, nothing rendered, and the message was never
 * delivered; on a network failure it became an unhandled rejection. startCall()
 * was `if (!res.ok) return;` — the call button did literally nothing.
 *
 * RES-11: the "Go on duty" / "Go online" toggles were
 * `if (res.ok) setOnDuty(next)` with an empty catch, so a pandit who flips the
 * switch during a blip sees it snap back with no message and believes he is
 * accepting instant bookings when he is not.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Demo Devotee' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

import { Inbox } from '../components/Inbox';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

vi.setConfig({ testTimeout: 30_000 });

const CONVERSATION = {
  id: 'c1',
  kind: 'booking',
  side: 'devotee',
  counterparty: { id: 'p1', fullName: 'Pandit Ramesh', avatarUrl: null },
  linkedBookingId: null,
  subject: null,
  unread: 0,
  lastMessage: null,
  lastMessageAt: '2026-08-12T00:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// ── RES-08 ───────────────────────────────────────────────────────────────────

describe('RES-08 — the inbox poller does not storm a failing API', () => {
  it('skips a poll while one is still in flight instead of stacking sockets', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Never resolve: this is the "held open, never answered" condition that
    // produced 12 stacked requests in 37 seconds.
    const fetchMock = vi.fn(() => new Promise<Response>(() => undefined));
    vi.stubGlobal('fetch', fetchMock);

    render(<Inbox role="devotee" />);

    await vi.advanceTimersByTimeAsync(9_000);

    const convCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/conversations'));
    // One request out. Three 3s ticks must NOT produce three more.
    expect(convCalls.length).toBe(1);
  });

  it('aborts a stalled poll rather than waiting forever', async () => {
    const signals: Array<AbortSignal | undefined> = [];
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      signals.push(init?.signal ?? undefined);
      return new Promise<Response>(() => undefined);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Inbox role="devotee" />);

    await waitFor(() => expect(signals.length).toBeGreaterThan(0));
    // A poll with no AbortSignal can never stop — that is the defect.
    expect(signals[0]).toBeInstanceOf(AbortSignal);
  });

  it('backs off after repeated 5xx and says it is reconnecting', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn(async () => jsonResponse({ error: 'boom' }, 500));
    vi.stubGlobal('fetch', fetchMock);

    render(<Inbox role="devotee" />);

    await vi.advanceTimersByTimeAsync(12_000);
    const after12s = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/conversations'),
    ).length;

    // Flat 3s polling would have fired 5 times by now (t=0,3,6,9,12).
    // 3 → 6 → 12s backoff fires at t=0, 3, 9 → 3 calls.
    expect(after12s).toBeLessThanOrEqual(4);
    await waitFor(() => expect(screen.getByText(/reconnecting/i)).toBeTruthy());
  });
});

// ── RES-10 ───────────────────────────────────────────────────────────────────

describe('RES-10 — sending and calling report their own failure', () => {
  async function openThread(sendStatus: number) {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST' && url.includes('/messages')) {
        return jsonResponse({ error: 'Internal Server Error' }, sendStatus);
      }
      if (url.includes('/start-call')) return jsonResponse({ error: 'nope' }, 500);
      if (url.includes('/messages')) return jsonResponse({ messages: [], serverTime: 't0' });
      if (url.includes('/ratings')) return jsonResponse({ rating: null });
      if (url.includes('/conversations')) return jsonResponse({ conversations: [CONVERSATION] });
      return jsonResponse({});
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<Inbox role="devotee" />);
    const row = await screen.findByText('Pandit Ramesh');
    fireEvent.click(row.closest('button')!);
    return fetchMock;
  }

  it('a failed send keeps the draft and shows a retry affordance', async () => {
    await openThread(500);

    const box = await screen.findByPlaceholderText(/type a message/i);
    fireEvent.change(box, { target: { value: 'Namaste, is tomorrow confirmed?' } });
    fireEvent.click(screen.getByLabelText('Send'));

    await waitFor(() => expect(screen.getByText(/not sent/i)).toBeTruthy());
    // The words the devotee typed must still be there to retry with.
    expect((box as HTMLTextAreaElement).value).toBe('Namaste, is tomorrow confirmed?');
  });

  it('a failed call attempt says so instead of doing nothing', async () => {
    await openThread(200);

    fireEvent.click(await screen.findByLabelText('Start video call'));

    await waitFor(() => expect(screen.getByText(/could not start the call/i)).toBeTruthy());
  });
});

// ── RES-11 ───────────────────────────────────────────────────────────────────

describe('RES-11 — a duty/online toggle that fails says so', () => {
  it('the pandit portal surfaces a failed on-duty toggle', () => {
    const src = read('app/priest/page.tsx');
    // The empty `catch { /* keep prior state */ }` is exactly the silence.
    expect(src).not.toContain('catch { /* keep prior state */ }');
    expect(src).toMatch(/setDutyError/);
  });

  it('the astrologer portal surfaces a failed go-online toggle', () => {
    const src = read('app/astrologer-portal/page.tsx');
    expect(src).toMatch(/setOnlineError|onlineError/);
  });
});
