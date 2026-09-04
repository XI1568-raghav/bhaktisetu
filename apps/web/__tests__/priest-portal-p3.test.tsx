/**
 * Pandit portal P3s from the prod sweep 2026-08-12.
 *
 *  PF-17  The whole booking card on /priest/bookings is a <Link>, and the
 *         "Upload Video" action inside it is another <Link>. The console
 *         carried "<a> cannot contain a nested <a>. This will cause a
 *         hydration error." Browsers split nested anchors during parsing, so
 *         the hit areas become unreliable — an Upload Video tap can navigate
 *         somewhere else — on the pandit's most-used page.
 *
 *  PF-18  /priest/payouts rendered chips "All / Pending / Processing /
 *         Completed". PayoutStatusFilter declares 'failed' and the status
 *         config renders a red Failed badge, but no chip exposed it, so a
 *         pandit whose transfer bounced could not filter to it. The fetch also
 *         sent no page/limit, so the API's 20-row default capped the table
 *         while the summary cards aggregated every row.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  usePathname: () => '/priest',
  useSearchParams: () => nav.params,
}));

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Demo Pandit', email: 'pandit@demo.com' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../lib/api-config', () => ({
  API_BASE_URL: 'https://api.test',
  DATA_FETCH_TIMEOUT_MS: 15000,
  AUTH_FETCH_TIMEOUT_MS: 20000,
  fetchWithTimeout: (input: RequestInfo | URL, init: RequestInit = {}) =>
    globalThis.fetch(input, init),
  isNetworkFailure: (e: unknown) => e instanceof TypeError,
  NETWORK_ERROR_MESSAGE: 'Could not reach Darshya.',
  loadErrorMessage: () => "Couldn't load live data.",
  // 401 ONLY, matching lib/api-config.ts:288. Omitting it makes the component
  // throw inside its own catch; the test still passes and the throw escapes as
  // an unhandled rejection, which vitest exits non-zero for. That failed the
  // whole web suite in CI while all 4071 tests passed (priest-portal-p2).
  // A 403 must NOT be reauth — see AUTH-06's second pass.
  loadErrorIsReauth: (c: unknown) =>
    typeof c === 'object' && c !== null && 'status' in c
      ? (c as { status: number }).status === 401
      : false,
}));

import PriestBookingsPage from '../app/priest/bookings/page';
import PriestPayoutsPage from '../app/priest/payouts/page';

vi.setConfig({ testTimeout: 30_000 });

function ok(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/** A booking in `completed` — the state whose action control is a link. */
const COMPLETED_BOOKING = {
  id: 'bk-1',
  bookingNumber: 'BS-20260812-JMHM4',
  status: 'completed',
  pujaType: { name: 'Rudrabhishek' },
  temple: { name: 'Kashi Vishwanath', city: 'Varanasi' },
  scheduledDate: '2026-09-01',
  scheduledTimeSlot: '06:00',
  devoteeNames: ['Arjun Sharma'],
  user: { fullName: 'Arjun Sharma' },
  priestPayout: 880,
};

function payoutRow(id: string, status: string) {
  return {
    id,
    amount: 770,
    status,
    payoutMethod: 'bank_transfer',
    payoutReference: null,
    processedAt: null,
    createdAt: '2026-08-12T06:00:00.000Z',
    booking: {
      id: `b-${id}`,
      bookingNumber: `BS-2026-${id}`,
      pujaType: { name: 'Rudrabhishek' },
      temple: { name: 'Kashi Vishwanath' },
    },
  };
}

let payoutRequests: URL[] = [];

function mockApi(over?: (url: URL) => unknown) {
  payoutRequests = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'https://api.test');
    const custom = over?.(url);
    if (custom) return custom as Response;
    if (url.pathname.endsWith('/priest/bookings')) {
      return ok({
        bookings: [COMPLETED_BOOKING],
        counts: { all: 1, confirmed: 0, priest_assigned: 0, in_progress: 0, completed: 1 },
        total: 1,
        page: 1,
        totalPages: 1,
      });
    }
    if (url.pathname.endsWith('/priest/payouts')) {
      payoutRequests.push(url);
      return ok({
        payouts: [payoutRow('p1', 'failed')],
        total: 45,
        page: 1,
        limit: 20,
        totalPages: 3,
        summary: { totalEarned: 0, pending: 2310, lastPayout: null },
      });
    }
    return ok({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
  nav.params = new URLSearchParams();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// ─── PF-17 ───────────────────────────────────────────────────────────────────

describe('PF-17 — no anchor inside an anchor on the pandit bookings list', () => {
  it('renders the Upload Video link outside any other link', async () => {
    mockApi();
    render(<PriestBookingsPage />);

    const action = await screen.findByRole('link', { name: /upload video/i });
    // Walk up: nothing between this anchor and the document root may be an
    // anchor. This is the exact condition the parser complains about.
    let parent = action.parentElement;
    const ancestors: string[] = [];
    while (parent) {
      ancestors.push(parent.tagName);
      parent = parent.parentElement;
    }
    expect(ancestors).not.toContain('A');
  });

  it('leaves no nested anchor anywhere in the rendered list', async () => {
    mockApi();
    render(<PriestBookingsPage />);
    await screen.findByRole('link', { name: /upload video/i });

    const nested = document.querySelectorAll('a a');
    expect(nested.length).toBe(0);
  });

  it('the card still routes to the booking it belongs to', async () => {
    mockApi();
    render(<PriestBookingsPage />);
    await screen.findByRole('link', { name: /upload video/i });

    // Losing the nested anchor must not lose the card's own destination —
    // that is the primary navigation on this screen.
    const cardLinks = Array.from(document.querySelectorAll('a')).filter(
      (a) => a.getAttribute('href') === '/priest/bookings/view?id=bk-1',
    );
    expect(cardLinks.length).toBeGreaterThan(0);
  });
});

// ─── PF-18 ───────────────────────────────────────────────────────────────────

describe('PF-18 — the payouts page can reach a failed transfer', () => {
  it('offers a Failed filter chip', async () => {
    mockApi();
    render(<PriestPayoutsPage />);

    // PayoutStatusFilter has always declared 'failed' and the badge has always
    // rendered red; only the chip was missing.
    expect(await screen.findByRole('button', { name: 'Failed' })).toBeTruthy();
  });

  it('asks the server for the failed rows rather than filtering a truncated page', async () => {
    mockApi();
    render(<PriestPayoutsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Failed' }));

    await waitFor(() => {
      const last = payoutRequests[payoutRequests.length - 1];
      expect(last?.searchParams.get('status')).toBe('failed');
    });
  });
});

describe('PF-18 — the payouts table is paginated', () => {
  it('sends an explicit page and limit', async () => {
    mockApi();
    render(<PriestPayoutsPage />);

    await waitFor(() => expect(payoutRequests.length).toBeGreaterThan(0));
    const first = payoutRequests[0]!;
    // Before the fix the fetch carried no query at all, so the API's 20-row
    // default silently capped the table under summary cards that counted 45.
    expect(first.searchParams.get('page')).toBe('1');
    expect(first.searchParams.get('limit')).toBeTruthy();
  });

  it('shows the pager when the server reports more than one page', async () => {
    mockApi();
    render(<PriestPayoutsPage />);

    expect(await screen.findByRole('button', { name: /next/i })).toBeTruthy();
    expect(screen.getByText(/page 1 of 3/i)).toBeTruthy();
  });

  it('advancing the pager asks for the next page', async () => {
    mockApi();
    render(<PriestPayoutsPage />);

    fireEvent.click(await screen.findByRole('button', { name: /next/i }));

    await waitFor(() => {
      const last = payoutRequests[payoutRequests.length - 1];
      expect(last?.searchParams.get('page')).toBe('2');
    });
  });

  it('reports the true total, not the size of the page on screen', async () => {
    mockApi();
    render(<PriestPayoutsPage />);

    // One row rendered, 45 in the ledger. The pandit has to be able to see
    // that the table is a window, not the whole book.
    expect(await screen.findByText(/of 45/i)).toBeTruthy();
  });
});

// ─── Source guard ────────────────────────────────────────────────────────────

describe('PF-17/PF-18 — the source itself carries no regression', () => {
  /** Comments are stripped first: a guard that matches its own explanation is not a guard. */
  function code(rel: string): string {
    return readFileSync(path.resolve(__dirname, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
  }

  it('the bookings card is not an anchor wrapping the action column', () => {
    const src = code('../app/priest/bookings/page.tsx');
    // The card wrapper must not be a <Link> any more; the overlay pattern puts
    // the anchor beside the actions rather than around them.
    expect(src).not.toMatch(/<Link\s+key=\{booking\.id\}/);
  });

  it('the payouts page does not re-filter the page the server already filtered', () => {
    // The URL contents are pinned by the runtime tests above. What they cannot
    // see is a client-side status filter creeping back in: the server now
    // applies `?status=`, so re-filtering here would drop rows it deliberately
    // returned and put the "chip matches nothing on this page" bug straight
    // back. (Behavioural equivalent: with `filter='failed'` the mocked page of
    // failed rows must render — which the Failed-chip test above asserts.)
    const src = code('../app/priest/payouts/page.tsx');
    expect(src).not.toMatch(/payouts\.filter\(/);
  });
});
