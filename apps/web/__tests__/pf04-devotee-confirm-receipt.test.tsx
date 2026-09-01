import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

/**
 * PF-04 / F099 (P1) — "No UI anywhere can mark a booking delivered".
 *
 * `video_uploaded -> delivered` is the last step of fulfilment and the step
 * that recognises revenue: the state machine
 * (apps/api/src/services/booking.service.ts) has
 * `video_uploaded: ['delivered','refunded']`, and the route authorises BOTH
 * parties to drive it — `OWNER_ALLOWED_TRANSITIONS = ['cancelled','delivered']`
 * and `ASSIGNED_PRIEST_ALLOWED_TRANSITIONS` (apps/api/src/routes/bookings.ts).
 * A `curl -X PATCH .../bookings/<id> -d '{"status":"delivered"}'` returned 200
 * and no client ever sent it.
 *
 * A previous wave gave the PANDIT that control on /priest/bookings/view
 * (guarded by priest-fulfilment-p1.test.tsx). It did NOT give it to the
 * devotee, which is the surface the audit named first — "either the devotee
 * confirms receipt or the pandit closes the job from the portal" — so a
 * booking whose pandit never opens the portal still had no human path out of
 * `video_uploaded`, and the payout it gates never minted.
 *
 * RED BEFORE THE FIX. Measured on the pre-change file: /bookings/view rendered
 * no control matching /received|delivered|confirm/i inside the video panel and
 * issued zero PATCH requests, so every assertion below failed. The last test
 * is the anti-vacuity guard in the other direction: the control must NOT be
 * offered on a status the API would refuse.
 */

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Test Devotee', email: 'd@x.test', phone: '9990000000' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const searchParams = new URLSearchParams('id=bk-1');
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/bookings/view',
}));

import BookingViewPage from '../app/bookings/view/page';

vi.setConfig({ testTimeout: 45_000 });

const PROOF = 'https://cdn.example.com/proof/bk-1.mp4';

function bookingRow(status: string, videoProofUrl: string | null = PROOF) {
  return {
    id: 'bk-1',
    bookingNumber: 'BS-20260901-00001',
    status,
    scheduledDate: '2026-08-20T00:00:00.000Z',
    scheduledTimeSlot: '07:00',
    priceAmount: '1100.00',
    videoProofUrl,
    videoUploadedAt: '2026-08-20T09:00:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
    temple: { name: 'Kashi Vishwanath', city: 'Varanasi', state: 'Uttar Pradesh' },
    pujaType: { name: 'Rudrabhishek', slug: 'rudrabhishek' },
    payments: [{ status: 'captured', amount: '1100.00', refundAmount: null }],
  };
}

function jsonOk(body: unknown) {
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) } as unknown as Response;
}

/**
 * Serves the detail row. `patchStatus` (when set) makes the PATCH fail with
 * that status and body; otherwise the PATCH succeeds and the NEXT detail read
 * returns the delivered row, exactly as the server would.
 */
function mockApi(opts: { status?: string; patchFail?: { code: number; body: string } } = {}) {
  let current = opts.status ?? 'video_uploaded';
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/bookings/bk-1') && (init?.method ?? 'GET').toUpperCase() === 'PATCH') {
      if (opts.patchFail) {
        return {
          ok: false,
          status: opts.patchFail.code,
          json: async () => JSON.parse(opts.patchFail!.body),
          text: async () => opts.patchFail!.body,
        } as unknown as Response;
      }
      current = 'delivered';
      return jsonOk({ booking: bookingRow(current) });
    }
    if (url.includes('/cancel-quote')) return jsonOk({});
    if (url.includes('/bookings/bk-1')) return jsonOk({ booking: bookingRow(current) });
    return jsonOk({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function renderView() {
  render(<BookingViewPage />);
  await screen.findByRole('heading', { name: /Rudrabhishek/i }, { timeout: 15_000 });
}

function patchCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(
    (c) => String((c[1] as RequestInit | undefined)?.method ?? '').toUpperCase() === 'PATCH',
  );
}

const receiptButton = () =>
  screen.getByRole('button', { name: /I have received my recording/i });

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PF-04 — the devotee can close a booking out', () => {
  it('offers a delivery-confirmation control on a video_uploaded booking', async () => {
    mockApi();
    await renderView();
    expect(receiptButton()).toBeTruthy();
  });

  it('PATCHes the booking to delivered, authenticated', async () => {
    const fetchMock = mockApi();
    await renderView();

    fireEvent.click(receiptButton());
    await waitFor(() => expect(patchCalls(fetchMock).length).toBe(1));

    const [url, init] = patchCalls(fetchMock)[0] as [RequestInfo | URL, RequestInit];
    expect(String(url)).toContain('/bookings/bk-1');
    expect(JSON.parse(String(init.body))).toEqual({ status: 'delivered' });
    const headers = init.headers as Record<string, string>;
    expect(String(headers.Authorization ?? '')).toContain('test-token');
  });

  it('re-reads the booking so the page shows the server status, not a guess', async () => {
    const fetchMock = mockApi();
    await renderView();
    const readsBefore = fetchMock.mock.calls.filter(
      (c) => String((c[1] as RequestInit | undefined)?.method ?? 'GET').toUpperCase() === 'GET',
    ).length;

    fireEvent.click(receiptButton());

    await waitFor(() => {
      const readsAfter = fetchMock.mock.calls.filter(
        (c) => String((c[1] as RequestInit | undefined)?.method ?? 'GET').toUpperCase() === 'GET',
      ).length;
      expect(readsAfter).toBeGreaterThan(readsBefore);
    });
    // Delivered — so the control is gone and the status pill has moved.
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /I have received my recording/i })).toBeNull(),
    );
  });

  it('surfaces a refused transition instead of pretending it worked', async () => {
    // The state machine answers 409 with its own sentence; showing it beats
    // "please try again", which cannot succeed against a terminal status.
    mockApi({
      patchFail: {
        code: 409,
        body: JSON.stringify({ error: 'This booking has already been refunded.' }),
      },
    });
    await renderView();

    fireEvent.click(receiptButton());
    await waitFor(() =>
      expect(document.body.textContent).toContain('This booking has already been refunded.'),
    );
    // And the control is still there, because nothing was delivered.
    expect(receiptButton()).toBeTruthy();
  });

  it('never offers the control on a status the API would refuse', async () => {
    // `booked` is not in the state machine's `-> delivered` edge set, so
    // offering the button here would be a control that can only 409.
    mockApi({ status: 'booked' });
    await renderView();
    expect(screen.queryByRole('button', { name: /I have received my recording/i })).toBeNull();
  });

  it('does not ask for confirmation of a recording the page cannot open', async () => {
    // DB-09: `video_uploaded` with an unusable proof URL renders the
    // "being processed" panel. Asking the devotee to confirm receipt of a
    // video that will not play is the lie DB-09 removed.
    mockApi({ status: 'video_uploaded' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/bookings/bk-1')) {
          return jsonOk({ booking: bookingRow('video_uploaded', 'not a url at all') });
        }
        return jsonOk({});
      }),
    );
    await renderView();
    expect(screen.queryByRole('button', { name: /I have received my recording/i })).toBeNull();
  });
});
