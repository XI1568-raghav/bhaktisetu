/**
 * Pandit fulfilment P1s from the prod sweep 2026-08-12 — the web half.
 *
 *  PF-04  No UI anywhere could mark a booking `delivered`; the final fulfilment
 *         step was curl-only, so bookings piled up in `video_uploaded` forever.
 *  PF-07  The list showed the first 20 of 51 assigned bookings with tab counts
 *         derived from that truncated page (told the pandit he had 15 accepted
 *         jobs when he had 25), and had no pager at all.
 *  PF-08  The detail page had no by-id fetch: it downloaded the (truncated)
 *         list and did `.find(b => b.id === id)`, so any booking past row 20
 *         rendered an empty shell.
 *  PF-09  Every date read "Invalid Date" — the helpers did
 *         `new Date(dateStr + 'T00:00:00')` on an ISO string the API already
 *         sends as `2026-08-19T00:00:00.000Z`.
 *  PF-10  Price Breakdown printed "Platform Commission -₹NaN".
 *  PF-15  A failed bookings fetch rendered "You have no assigned bookings yet".
 *  PF-03  A failed video-proof POST still rendered a green "Video Proof Uploaded".
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
  replace: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
  usePathname: () => '/priest/bookings',
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
  // Must delegate to the CURRENT global fetch: these suites swap
  // globalThis.fetch per test, and a captured reference would freeze the first
  // one. The signal is passed through so the pages' timeout wiring stays real.
  fetchWithTimeout: (input: RequestInfo | URL, init: RequestInit = {}) =>
    globalThis.fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
  isNetworkFailure: (e: unknown) => e instanceof TypeError,
  NETWORK_ERROR_MESSAGE: 'Could not reach Darshya.',
  loadErrorMessage: (c: unknown) =>
    typeof c === 'object' && c !== null && 'status' in c
      ? `Couldn't load live data (HTTP ${(c as { status: number }).status}).`
      : "Couldn't load live data.",
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

// The uploader itself is not under test; expose one button that hands the page
// a URL exactly as the real component's onUploaded callback does.
// The real component wraps onUploaded in try/catch and keeps its input open on
// failure; the stub mirrors that so a rejected submit is not an unhandled
// rejection here.
vi.mock('../components/provider/VideoProofUpload', () => ({
  default: ({ onUploaded }: { onUploaded?: (u: string) => void | Promise<void> }) => (
    <button
      type="button"
      onClick={() => {
        void Promise.resolve()
          .then(() => onUploaded?.('https://cdn.test/proof.mp4'))
          .catch(() => undefined);
      }}
    >
      stub-upload
    </button>
  ),
}));

vi.mock('../components/MyProviderProfileCard', () => ({ default: () => null }));

import PriestBookingsPage from '../app/priest/bookings/page';
import PriestBookingDetailPage from '../app/priest/bookings/view/page';
import PriestDashboard from '../app/priest/page';

vi.setConfig({ testTimeout: 30_000 });

const BOOKING_ID = 'b1330da2-c830-41ff-93da-ded81963b163';

/** 51 assigned bookings — the real shape of the seeded pandit's book. */
const COUNTS = {
  all: 51,
  confirmed: 9,
  priest_assigned: 25,
  in_progress: 1,
  completed: 13,
};

function apiBooking(n: number, over: Record<string, unknown> = {}) {
  return {
    id: `bk-${n}`,
    bookingNumber: `BS-20260812-${String(n).padStart(5, '0')}`,
    status: 'priest_assigned',
    // Exactly what the API serialises for a @db.Date column.
    scheduledDate: '2026-08-19T00:00:00.000Z',
    scheduledTimeSlot: '06:00',
    priceAmount: 1100,
    platformCommission: 330,
    priestPayout: 770,
    currency: 'INR',
    devoteeNames: [{ name: 'Ramesh' }],
    sankalpDetails: null,
    specialInstructions: null,
    videoProofUrl: null,
    videoUploadedAt: null,
    rating: null,
    reviewText: null,
    createdAt: '2026-08-12T00:00:00.000Z',
    temple: { id: 't1', name: `Temple ${n}`, city: 'Varanasi', state: 'Uttar Pradesh' },
    pujaType: { id: 'p1', name: `Puja ${n}`, durationMinutes: 60, description: 'x' },
    user: { fullName: 'Ramesh', phone: '+919876543210' },
    ...over,
  };
}

function listPage(page: number, view: string) {
  const size = 20;
  const total = COUNTS[view as keyof typeof COUNTS] ?? COUNTS.all;
  const start = (page - 1) * size;
  const rows = Array.from({ length: Math.max(0, Math.min(size, total - start)) }, (_, i) =>
    apiBooking(start + i + 1),
  );
  return {
    bookings: rows,
    total,
    page,
    limit: size,
    totalPages: Math.max(1, Math.ceil(total / size)),
    counts: COUNTS,
  };
}

function ok(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function fail(status: number, body: string) {
  return {
    ok: false,
    status,
    json: async () => ({ error: body }),
    text: async () => body,
  } as unknown as Response;
}

/** Default happy-path API. Individual tests override with their own mock. */
function mockApi(extra?: (url: URL, init?: RequestInit) => Response | undefined) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'https://api.test');
    const custom = extra?.(url, init);
    if (custom) return custom;
    if (/\/priest\/bookings\/[^/]+$/.test(url.pathname)) {
      return ok({ booking: apiBooking(21, { id: BOOKING_ID }) });
    }
    if (url.pathname.endsWith('/priest/bookings')) {
      return ok(listPage(Number(url.searchParams.get('page') || '1'), url.searchParams.get('view') || 'all'));
    }
    if (url.pathname.endsWith('/priest/dashboard')) {
      return ok({
        priest: { id: 'p', displayName: 'Demo Pandit', avatarUrl: null, ratingAvg: 4.6, ratingCount: 43 },
        earnings: { total: 0, thisMonth: 0, pending: 2310 },
        bookings: { total: 51, upcoming: 26, completed: 13 },
        upcomingBookings: [
          {
            id: 'bk-1',
            bookingNumber: 'BS-20260812-00001',
            status: 'priest_assigned',
            scheduledDate: '2026-08-19T00:00:00.000Z',
            scheduledTimeSlot: '06:00',
            devoteeNames: [{ name: 'Ramesh' }],
            priestPayout: 770,
            temple: { id: 't1', name: 'Kashi Vishwanath', city: 'Varanasi' },
            pujaType: { id: 'p1', name: 'Rudrabhishek' },
          },
        ],
      });
    }
    return ok({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function urlsFor(fetchMock: ReturnType<typeof mockApi>, fragment: string) {
  return fetchMock.mock.calls
    .map((c) => String(c[0]))
    .filter((u) => u.includes(fragment))
    .map((u) => new URL(u, 'https://api.test'));
}

function tabButton(label: string) {
  return screen
    .getAllByRole('button')
    .find((b) => (b.textContent || '').trim().startsWith(label))!;
}

beforeEach(() => {
  nav.params = new URLSearchParams();
  nav.replace.mockClear();
  nav.push.mockClear();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── PF-09 ───────────────────────────────────────────────────────────────────

describe('PF-09 — dates render instead of "Invalid Date"', () => {
  it('booking list card shows the scheduled day', async () => {
    mockApi();
    render(<PriestBookingsPage />);
    await screen.findByText('Puja 1');
    expect(screen.queryAllByText(/Invalid Date/i)).toHaveLength(0);
    expect(screen.getAllByText(/19 Aug 2026/).length).toBeGreaterThan(0);
  });

  it('booking detail Schedule & Location shows the scheduled day', async () => {
    nav.params = new URLSearchParams(`id=${BOOKING_ID}`);
    mockApi();
    render(<PriestBookingDetailPage />);
    await screen.findByText(/Schedule & Location/);
    expect(screen.queryAllByText(/Invalid Date/i)).toHaveLength(0);
    expect(screen.getByText(/19 August 2026/)).toBeTruthy();
  });

  it('dashboard Upcoming Bookings shows the scheduled day', async () => {
    mockApi();
    render(<PriestDashboard />);
    await screen.findByText('Rudrabhishek');
    expect(screen.queryAllByText(/Invalid Date/i)).toHaveLength(0);
    expect(screen.getByText(/19 Aug 2026/)).toBeTruthy();
  });
});

// ─── PF-07 ───────────────────────────────────────────────────────────────────

describe('PF-07 — the pandit sees all 51 bookings, with honest counts', () => {
  it('asks for an explicit page and limit instead of taking the server default', async () => {
    const fetchMock = mockApi();
    render(<PriestBookingsPage />);
    await screen.findByText('Puja 1');
    const q = urlsFor(fetchMock, '/priest/bookings')[0]!.searchParams;
    expect(q.get('page')).toBe('1');
    expect(q.get('limit')).toBeTruthy();
  });

  it('tab badges come from the server counts, not from the 20 loaded rows', async () => {
    mockApi();
    render(<PriestBookingsPage />);
    await screen.findByText('Puja 1');
    expect(within(tabButton('All')).getByText('51')).toBeTruthy();
    expect(within(tabButton('Accepted')).getByText('25')).toBeTruthy();
    expect(within(tabButton('Completed')).getByText('13')).toBeTruthy();
    // The pre-fix strip printed the length of the truncated page here.
    expect(within(tabButton('All')).queryByText('20')).toBeNull();
  });

  it('Next reaches row 21+, which had no route to the screen before', async () => {
    const fetchMock = mockApi();
    render(<PriestBookingsPage />);
    await screen.findByText('Puja 1');

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await screen.findByText('Puja 21');
    expect(urlsFor(fetchMock, '/priest/bookings').some((u) => u.searchParams.get('page') === '2')).toBe(true);
  });

  it('switching tab filters server-side so the chip and the list agree', async () => {
    const fetchMock = mockApi();
    render(<PriestBookingsPage />);
    await screen.findByText('Puja 1');

    fireEvent.click(tabButton('Completed'));

    await waitFor(() => {
      expect(
        urlsFor(fetchMock, '/priest/bookings').some((u) => u.searchParams.get('view') === 'completed'),
      ).toBe(true);
    });
  });
});

// ─── PF-15 ───────────────────────────────────────────────────────────────────

describe('PF-15 — a failed fetch is not reported as an empty day', () => {
  it('shows an error with a retry instead of "no assigned bookings yet"', async () => {
    mockApi((url) =>
      url.pathname.endsWith('/priest/bookings') ? fail(500, 'upstream exploded') : undefined,
    );
    render(<PriestBookingsPage />);

    await screen.findByRole('alert');
    expect(screen.queryByText(/no assigned bookings yet/i)).toBeNull();
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
  });
});

// ─── PF-08 ───────────────────────────────────────────────────────────────────

describe('PF-08 — the detail page opens a booking by id', () => {
  it('fetches the single booking rather than scanning the list', async () => {
    nav.params = new URLSearchParams(`id=${BOOKING_ID}`);
    const fetchMock = mockApi();
    render(<PriestBookingDetailPage />);

    await screen.findByText('Puja 21');
    const calls = urlsFor(fetchMock, '/priest/bookings').map((u) => u.pathname);
    expect(calls.some((p) => p.endsWith(`/priest/bookings/${BOOKING_ID}`))).toBe(true);
    // The list endpoint must not be pulled down just to render one booking.
    expect(calls.some((p) => p.endsWith('/priest/bookings'))).toBe(false);
  });
});

// ─── PF-10 ───────────────────────────────────────────────────────────────────

describe('PF-10 — Price Breakdown shows the real commission', () => {
  it('renders -₹330 and never ₹NaN', async () => {
    nav.params = new URLSearchParams(`id=${BOOKING_ID}`);
    mockApi();
    render(<PriestBookingDetailPage />);

    await screen.findByText('Price Breakdown');
    const row = screen.getByText('Platform Commission').parentElement!;
    expect(row.textContent).toContain('₹330');
    expect(row.textContent).not.toContain('NaN');
  });

  it('shows a dash, not ₹NaN, if the API ever omits the column', async () => {
    nav.params = new URLSearchParams(`id=${BOOKING_ID}`);
    mockApi((url) =>
      /\/priest\/bookings\/[^/]+$/.test(url.pathname)
        ? ok({ booking: apiBooking(21, { id: BOOKING_ID, platformCommission: undefined }) })
        : undefined,
    );
    render(<PriestBookingDetailPage />);

    await screen.findByText('Price Breakdown');
    const row = screen.getByText('Platform Commission').parentElement!;
    expect(row.textContent).not.toContain('NaN');
  });
});

// ─── PF-04 ───────────────────────────────────────────────────────────────────

describe('PF-04 — the pandit can close the job from the portal', () => {
  it('offers a delivery control once proof is filed and PATCHes the booking', async () => {
    nav.params = new URLSearchParams(`id=${BOOKING_ID}`);
    const fetchMock = mockApi((url) =>
      /\/priest\/bookings\/[^/]+$/.test(url.pathname)
        ? ok({
            booking: apiBooking(21, {
              id: BOOKING_ID,
              status: 'video_uploaded',
              videoProofUrl: 'https://cdn.test/proof.mp4',
              videoUploadedAt: '2026-08-12T09:00:00.000Z',
            }),
          })
        : undefined,
    );
    render(<PriestBookingDetailPage />);

    const btn = await screen.findByRole('button', { name: /deliver/i });
    fireEvent.click(btn);

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        (c) => String(c[0]) === `https://api.test/bookings/${BOOKING_ID}`,
      );
      expect(call).toBeTruthy();
      const init = call![1] as RequestInit;
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(String(init.body))).toEqual({ status: 'delivered' });
    });
  });

  it('does not offer it before proof exists', async () => {
    nav.params = new URLSearchParams(`id=${BOOKING_ID}`);
    mockApi((url) =>
      /\/priest\/bookings\/[^/]+$/.test(url.pathname)
        ? ok({ booking: apiBooking(21, { id: BOOKING_ID, status: 'completed' }) })
        : undefined,
    );
    render(<PriestBookingDetailPage />);

    await screen.findByText('Price Breakdown');
    expect(screen.queryByRole('button', { name: /deliver/i })).toBeNull();
  });

  /*
   * PF-04, the reachability half (2026-08-19).
   *
   * The control above closed the literal finding — a delivery button now exists
   * — but only on the detail page, and only for a pandit who happens to be
   * standing on it. `getActionButton` in the LIST had no `video_uploaded`
   * branch, so it fell through to `default: null`: the pandit's primary screen
   * rendered a booking that is one tap from paying him with NO call to action
   * at all, while every other actionable status on that same screen has one.
   *
   * The Completed tab is where those rows land (PRIEST_BOOKING_VIEWS.completed
   * = completed + video_uploaded + delivered) and it is exactly where the
   * dashboard's "Upload Video" quick action sends him
   * (/priest/bookings?status=completed). So the one screen built to show him
   * unfinished fulfilment work showed the stuck rows as inert.
   *
   * These assert on RENDERED OUTPUT, never on source text.
   */
  function listOf(rows: Array<Record<string, unknown>>) {
    return {
      bookings: rows,
      total: rows.length,
      page: 1,
      limit: 20,
      totalPages: 1,
      counts: COUNTS,
    };
  }

  it('offers the delivery control on the bookings LIST, not only on the detail page', async () => {
    const fetchMock = mockApi((url) =>
      url.pathname.endsWith('/priest/bookings')
        ? ok(
            listOf([
              apiBooking(3, {
                id: BOOKING_ID,
                status: 'video_uploaded',
                videoProofUrl: 'https://cdn.test/proof.mp4',
                videoUploadedAt: '2026-08-12T09:00:00.000Z',
              }),
            ]),
          )
        : undefined,
    );
    render(<PriestBookingsPage />);

    await screen.findByText('Puja 3');
    fireEvent.click(screen.getByRole('button', { name: /deliver/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        (c) => String(c[0]) === `https://api.test/bookings/${BOOKING_ID}`,
      );
      expect(call).toBeTruthy();
      const init = call![1] as RequestInit;
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(String(init.body))).toEqual({ status: 'delivered' });
    });
  });

  it('re-reads the book after delivering so the row leaves the tab it was in', async () => {
    const fetchMock = mockApi((url) =>
      url.pathname.endsWith('/priest/bookings')
        ? ok(
            listOf([
              apiBooking(3, {
                id: BOOKING_ID,
                status: 'video_uploaded',
                videoProofUrl: 'https://cdn.test/proof.mp4',
              }),
            ]),
          )
        : undefined,
    );
    render(<PriestBookingsPage />);

    await screen.findByText('Puja 3');
    const before = urlsFor(fetchMock, '/priest/bookings').length;
    fireEvent.click(screen.getByRole('button', { name: /deliver/i }));

    await waitFor(() => {
      expect(urlsFor(fetchMock, '/priest/bookings').length).toBeGreaterThan(before);
    });
  });

  it('surfaces a rejected delivery instead of silently doing nothing', async () => {
    mockApi((url, init) => {
      if (url.pathname === `/bookings/${BOOKING_ID}` && init?.method === 'PATCH') {
        return fail(409, '{"message":"Video proof required"}');
      }
      return url.pathname.endsWith('/priest/bookings')
        ? ok(
            listOf([
              apiBooking(3, {
                id: BOOKING_ID,
                status: 'video_uploaded',
                videoProofUrl: 'https://cdn.test/proof.mp4',
              }),
            ]),
          )
        : undefined;
    });
    render(<PriestBookingsPage />);

    await screen.findByText('Puja 3');
    fireEvent.click(screen.getByRole('button', { name: /deliver/i }));

    await screen.findByRole('alert');
    expect(screen.getByText(/Video proof required/i)).toBeTruthy();
  });

  it('never offers it on a row that is already delivered', async () => {
    mockApi((url) =>
      url.pathname.endsWith('/priest/bookings')
        ? ok(
            listOf([
              apiBooking(4, {
                id: BOOKING_ID,
                status: 'delivered',
                videoProofUrl: 'https://cdn.test/proof.mp4',
              }),
            ]),
          )
        : undefined,
    );
    render(<PriestBookingsPage />);

    await screen.findByText('Puja 4');
    expect(screen.queryByRole('button', { name: /deliver/i })).toBeNull();
  });
});

// ─── PF-03 ───────────────────────────────────────────────────────────────────

describe('PF-03 — a failed proof upload cannot render as success', () => {
  it('surfaces the API error and keeps the upload control available', async () => {
    nav.params = new URLSearchParams(`id=${BOOKING_ID}`);
    mockApi((url, init) => {
      if (url.pathname.endsWith('/video') && init?.method === 'POST') {
        return fail(
          400,
          '{"error":"Video proof can only be uploaded for bookings in \\"completed\\" status."}',
        );
      }
      return /\/priest\/bookings\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith('/video')
        ? ok({ booking: apiBooking(21, { id: BOOKING_ID, status: 'completed' }) })
        : undefined;
    });
    render(<PriestBookingDetailPage />);

    fireEvent.click(await screen.findByText('stub-upload'));

    await waitFor(() => {
      expect(screen.getByText(/Video proof can only be uploaded/i)).toBeTruthy();
    });
    expect(screen.queryByText(/Video Proof Uploaded/i)).toBeNull();
    expect(screen.getByText('stub-upload')).toBeTruthy();
  });
});
