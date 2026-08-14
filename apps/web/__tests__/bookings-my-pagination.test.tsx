/**
 * DB-01 (prod sweep 2026-08-12) — My Bookings showed 20 of 81 bookings and
 * presented that truncated page as the total.
 *
 * The defect had three parts, all asserted here:
 *
 *  1. The page fetched `${API_BASE_URL}/bookings/my` with NO page/limit, so the
 *     API's default `limit: Math.min(Number(limit) || 20, 100)` silently capped
 *     the list (apps/api/src/routes/bookings.ts:716). Verified live against the
 *     seeded devotee: GET /bookings/my → 20 rows, {"total":81,"totalPages":5};
 *     GET /bookings/my?limit=100 → 81 rows.
 *  2. There was no pager of any kind, so rows 21..81 — including the booking the
 *     devotee had just paid for — were unreachable from the UI.
 *  3. The tab counts were `bookings.length` of the ALREADY-TRUNCATED array, so
 *     the "All" chip read 20 and was displayed as if it were the total.
 *
 * The fix moves the filtering and the counting to the server: the page asks for
 * one page of one `view`, and renders the server's `counts` on the chips. These
 * tests fail on the pre-fix page.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', role: 'devotee' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// AuthGuard only gates rendering; the list itself is what is under test.
vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import BookingsPage from '../app/bookings/page';

// Each assertion here drives a real react-query fetch → render cycle through
// happy-dom, and a pager walk chains several of them. The 5s default is a
// coin-flip on a loaded machine; this is a slow suite, not a flaky one.
vi.setConfig({ testTimeout: 45_000 });

// ─── fixtures ────────────────────────────────────────────────────────────────

/** Shape the seeded devotee actually has on the live stack: 81 total. */
const COUNTS = { all: 81, upcoming: 62, completed: 13, cancelled: 1 };

function apiBooking(n: number, over: Record<string, unknown> = {}) {
  return {
    id: `b${n}`,
    bookingNumber: `BS-20260812-${String(n).padStart(5, '0')}`,
    status: 'confirmed',
    scheduledDate: '2026-09-12T00:00:00.000Z',
    scheduledTimeSlot: '07:00',
    priceAmount: '1100.00',
    videoProofUrl: null,
    createdAt: '2026-08-12T00:00:00.000Z',
    temple: { name: `Temple ${n}`, city: 'Varanasi' },
    pujaType: { name: `Puja ${n}` },
    ...over,
  };
}

/** Page `p` of the 81-row set, 20 per page (5 pages, last one has 1 row). */
function pageOf(p: number, view: string) {
  const size = 20;
  const total = view === 'all' ? COUNTS.all : COUNTS[view as keyof typeof COUNTS];
  const start = (p - 1) * size;
  const rows = Array.from({ length: Math.max(0, Math.min(size, total - start)) }, (_, i) =>
    apiBooking(start + i + 1),
  );
  return {
    bookings: rows,
    total,
    page: p,
    limit: size,
    totalPages: Math.max(1, Math.ceil(total / size)),
    counts: COUNTS,
  };
}

function mockApi() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'https://x.test');
    const p = Number(url.searchParams.get('page') || '1');
    const view = url.searchParams.get('view') || 'all';
    return {
      ok: true,
      status: 200,
      json: async () => pageOf(p, view),
      text: async () => JSON.stringify(pageOf(p, view)),
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BookingsPage />
    </QueryClientProvider>,
  );
}

/** The chip button for a tab, e.g. "All" — label and count live inside it. */
function tabButton(label: string) {
  return screen
    .getAllByRole('button')
    .find((b) => (b.textContent || '').trim().startsWith(label))!;
}

/** Query-string of the Nth /bookings/my request. */
function bookingsCalls(fetchMock: ReturnType<typeof mockApi>) {
  return fetchMock.mock.calls
    .map((c) => String(c[0]))
    .filter((u) => u.includes('/bookings/my'))
    .map((u) => new URL(u, 'https://x.test').searchParams);
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── the headline defect ─────────────────────────────────────────────────────

describe('DB-01 — tab counts come from the server, not from the returned page', () => {
  it('the All chip shows the server total (81), not the 20 rows on this page', async () => {
    mockApi();
    renderPage();
    await screen.findByText('Puja 1');

    const all = tabButton('All');
    expect(within(all).getByText('81')).toBeTruthy();
    // The pre-fix page printed `bookings.length` here.
    expect(within(all).queryByText('20')).toBeNull();
  });

  it('every other chip uses its own server count, not a slice of one page', async () => {
    mockApi();
    renderPage();
    await screen.findByText('Puja 1');

    expect(within(tabButton('Upcoming')).getByText('62')).toBeTruthy();
    expect(within(tabButton('Completed')).getByText('13')).toBeTruthy();
    expect(within(tabButton('Cancelled')).getByText('1')).toBeTruthy();
  });

  it('tells the devotee how many bookings exist beyond this page', async () => {
    mockApi();
    renderPage();
    await screen.findByText('Puja 1');

    // Some visible statement of the real size — the pre-fix page had no text
    // anywhere mentioning 81, only the 20 rows it had loaded.
    expect(screen.getByText(/of 81 bookings/i)).toBeTruthy();
  });
});

// ─── pagination ──────────────────────────────────────────────────────────────

describe('DB-01 — the list is paginated instead of silently truncated', () => {
  it('asks for an explicit page and limit rather than taking the server default', async () => {
    const fetchMock = mockApi();
    renderPage();
    await screen.findByText('Puja 1');

    const q = bookingsCalls(fetchMock)[0]!;
    expect(q.get('page')).toBe('1');
    expect(q.get('limit')).toBeTruthy();
  });

  it('Next fetches page 2 and renders rows 21+ (previously unreachable)', async () => {
    const fetchMock = mockApi();
    renderPage();
    await screen.findByText('Puja 1');

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await screen.findByText('Puja 21');
    expect(bookingsCalls(fetchMock).some((q) => q.get('page') === '2')).toBe(true);
  });

  it('Previous is disabled on page 1 and Next is disabled on the last page', async () => {
    mockApi();
    renderPage();
    await screen.findByText('Puja 1');

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();

    // Walk to page 5 of 5, waiting on the rendered first row of each page
    // (a DOM fact) rather than on the fetch call.
    for (let p = 2; p <= 5; p++) {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
      await screen.findByText(`Puja ${(p - 1) * 20 + 1}`, undefined, { timeout: 10_000 });
    }
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    // Four sequential fetch+render round trips — the slowest test in the file.
  });
});

// ─── server-side tab filtering ───────────────────────────────────────────────

describe('DB-01 — tabs filter server-side so the chip and the list agree', () => {
  it('switching to Completed asks the API for that view', async () => {
    const fetchMock = mockApi();
    renderPage();
    await screen.findByText('Puja 1');

    fireEvent.click(tabButton('Completed'));

    await waitFor(
      () => {
        expect(bookingsCalls(fetchMock).some((q) => q.get('view') === 'completed')).toBe(true);
      },
      { timeout: 4000 },
    );
  });

  it('changing tab resets to page 1', async () => {
    const fetchMock = mockApi();
    renderPage();
    await screen.findByText('Puja 1');

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await screen.findByText('Puja 21', undefined, { timeout: 4000 });

    fireEvent.click(tabButton('Cancelled'));

    await waitFor(
      () => {
        const last = bookingsCalls(fetchMock).at(-1)!;
        expect(last.get('view')).toBe('cancelled');
        expect(last.get('page')).toBe('1');
      },
      { timeout: 4000 },
    );
  });
});
