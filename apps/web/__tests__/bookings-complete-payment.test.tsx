/**
 * DB-03 (prod sweep 2026-08-12, P1) — clicking Pay persists a real booking
 * BEFORE the gateway opens, so every abandoned or failed checkout leaves an
 * unpayable `pending_payment` row behind.
 *
 * Observed live: POST /bookings/create-order returned 201 with
 * BS-20260812-QXUWN, and only THEN did GET /payments/config come back
 * `{"keyId":null,"isDemo":true}` and abort with "You have NOT been charged".
 * The row persisted at status pending_payment holding one of the offering's 5
 * slot seats for UNPAID_HOLD_MINUTES. The same devotee had 8 such rows. There
 * was no "Complete payment" control anywhere — not on /bookings, not on
 * /bookings/view — so the only available action was Cancel. Every failed
 * checkout was therefore unrecoverable revenue.
 *
 * The resume path must re-enter payment for the EXISTING booking. Posting
 * /bookings/create-order again is precisely the bug: it mints a second booking
 * and a second slot hold. POST /payments/create-order takes a bookingId and is
 * idempotent — it returns the already-initiated gateway order rather than a
 * duplicate (apps/api/src/services/payment.service.ts createRazorpayOrder).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
  usePathname: () => '/bookings/pay',
}));

import BookingsPage from '../app/bookings/page';
import ResumePaymentPage from '../app/bookings/pay/page';

vi.setConfig({ testTimeout: 45_000 });

// ─── /bookings list: the missing control ─────────────────────────────────────

function listRow(n: number, status: string) {
  return {
    id: `bk-${n}`,
    bookingNumber: `BS-20260812-${String(n).padStart(5, '0')}`,
    status,
    scheduledDate: '2027-09-12T00:00:00.000Z',
    scheduledTimeSlot: '07:00',
    priceAmount: '1151.00',
    videoProofUrl: null,
    createdAt: '2026-08-12T00:00:00.000Z',
    temple: { name: `Temple ${n}`, city: 'Varanasi' },
    pujaType: { name: `Puja ${n}` },
  };
}

function mockList(rows: ReturnType<typeof listRow>[]) {
  const payload = {
    bookings: rows,
    total: rows.length,
    page: 1,
    limit: 20,
    totalPages: 1,
    counts: { all: rows.length, upcoming: 0, completed: 0, cancelled: 0 },
  };
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  }) as unknown as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderWithQuery(node: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DB-03 — a pending_payment booking can be paid for', () => {
  it('the list offers "Complete payment" on an unpaid row', async () => {
    mockList([listRow(1, 'pending_payment')]);
    renderWithQuery(<BookingsPage />);
    await screen.findByText('Puja 1');

    const cta = screen.getByRole('link', { name: /complete payment/i });
    expect(cta.getAttribute('href')).toContain('bk-1');
  });

  it('does NOT offer it on a booking that is already paid', async () => {
    mockList([listRow(2, 'confirmed')]);
    renderWithQuery(<BookingsPage />);
    await screen.findByText('Puja 2');

    expect(screen.queryByRole('link', { name: /complete payment/i })).toBeNull();
  });

  it('an unpaid row is not silently hidden — Cancel stays available too', async () => {
    mockList([listRow(3, 'pending_payment')]);
    renderWithQuery(<BookingsPage />);
    await screen.findByText('Puja 3');

    // Anchored: DB-01 added a "Cancelled <count>" tab chip, which is also a
    // button matching /cancel/i. The row's own control is exactly "Cancel".
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeTruthy();
  });
});

// ─── /bookings/pay: the resume page ──────────────────────────────────────────

const PENDING_DETAIL = {
  id: 'bk-1',
  bookingNumber: 'BS-20260812-QXUWN',
  status: 'pending_payment',
  scheduledDate: '2027-09-12T00:00:00.000Z',
  scheduledTimeSlot: '07:00',
  priceAmount: '1151.00',
  currency: 'INR',
  temple: { name: 'Kashi Vishwanath Temple', city: 'Varanasi' },
  pujaType: { name: 'Rudrabhishek' },
};

/**
 * @param detail   what GET /bookings/:id returns
 * @param order    what POST /payments/create-order returns, or null for a 500
 */
function mockResume(detail: Record<string, unknown>, order: Record<string, unknown> | null) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/payments/create-order')) {
      if (!order) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'gateway down' }),
          text: async () => 'gateway down',
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 201,
        json: async () => order,
        text: async () => JSON.stringify(order),
      } as unknown as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => detail,
      text: async () => JSON.stringify(detail),
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Stub the Razorpay constructor the page loads onto window. */
function stubRazorpay() {
  const opened = vi.fn();
  const ctor = vi.fn(function (this: any) {
    this.open = opened;
    this.on = vi.fn();
  });
  (window as any).Razorpay = ctor;
  return { ctor, opened };
}

describe('DB-03 — the resume page reuses the existing booking', () => {
  afterEach(() => {
    delete (window as any).Razorpay;
  });

  it('shows what is owed on the booking the customer already created', async () => {
    mockResume(PENDING_DETAIL, null);
    renderWithQuery(<ResumePaymentPage />);

    await screen.findByText(/BS-20260812-QXUWN/);
    expect(screen.getByText(/Rudrabhishek/)).toBeTruthy();
    // The amount appears twice by design — in the summary and on the Pay
    // button — so assert the button carries it rather than requiring one node.
    expect(screen.getAllByText(/1,151/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /pay ₹1,151/i })).toBeTruthy();
  });

  it('pays the EXISTING booking — never POSTs /bookings/create-order again', async () => {
    const fetchMock = mockResume(PENDING_DETAIL, {
      orderId: 'order_live_abc',
      amount: 115100,
      currency: 'INR',
      paymentId: 'pay-row-1',
      razorpayKeyId: 'rzp_test_realkey123',
    });
    stubRazorpay();
    renderWithQuery(<ResumePaymentPage />);
    await screen.findByText(/BS-20260812-QXUWN/);

    fireEvent.click(screen.getByRole('button', { name: /pay/i }));

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.includes('/payments/create-order'))).toBe(true);
    });

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    // A second /bookings/create-order is the original defect: another booking
    // row, another 30-minute slot hold, for one customer intent.
    expect(urls.some((u) => u.includes('/bookings/create-order'))).toBe(false);

    const orderCall = fetchMock.mock.calls.find((c) =>
      String(c[0]).includes('/payments/create-order'),
    )!;
    expect(JSON.parse(String((orderCall[1] as RequestInit).body))).toEqual({
      bookingId: 'bk-1',
    });
  });

  it('opens the gateway with the key the order was minted with', async () => {
    mockResume(PENDING_DETAIL, {
      orderId: 'order_live_abc',
      amount: 115100,
      currency: 'INR',
      paymentId: 'pay-row-1',
      razorpayKeyId: 'rzp_test_realkey123',
    });
    const { ctor, opened } = stubRazorpay();
    renderWithQuery(<ResumePaymentPage />);
    await screen.findByText(/BS-20260812-QXUWN/);

    fireEvent.click(screen.getByRole('button', { name: /pay/i }));

    await waitFor(() => expect(opened).toHaveBeenCalled());
    const opts = ctor.mock.calls[0]![0] as any;
    expect(opts.key).toBe('rzp_test_realkey123');
    expect(opts.order_id).toBe('order_live_abc');
    expect(opts.amount).toBe(115100);
  });

  it('refuses the placeholder key rather than opening a doomed checkout', async () => {
    mockResume(PENDING_DETAIL, {
      orderId: 'order_demo_1',
      amount: 115100,
      currency: 'INR',
      paymentId: 'pay-row-1',
      razorpayKeyId: 'rzp_test_demo',
    });
    const { opened } = stubRazorpay();
    renderWithQuery(<ResumePaymentPage />);
    await screen.findByText(/BS-20260812-QXUWN/);

    fireEvent.click(screen.getByRole('button', { name: /pay/i }));

    await screen.findByText(/temporarily unavailable/i);
    expect(opened).not.toHaveBeenCalled();
  });

  it('never claims success when the order call fails', async () => {
    mockResume(PENDING_DETAIL, null);
    stubRazorpay();
    renderWithQuery(<ResumePaymentPage />);
    await screen.findByText(/BS-20260812-QXUWN/);

    fireEvent.click(screen.getByRole('button', { name: /pay/i }));

    // The 500 body carries `error: 'gateway down'` and the page surfaces the
    // server's own reason rather than a generic one — that is the honest
    // behaviour, so assert on what the server actually said.
    await waitFor(() => {
      expect(screen.getByText(/gateway down/i)).toBeTruthy();
    });
    // No optimistic "payment complete" anywhere.
    expect(screen.queryByText(/payment (complete|successful|received)/i)).toBeNull();
  });

  it('is honest when the booking is not actually awaiting payment', async () => {
    mockResume({ ...PENDING_DETAIL, status: 'confirmed' }, null);
    renderWithQuery(<ResumePaymentPage />);

    await screen.findByText(/already/i);
    expect(screen.queryByRole('button', { name: /^pay/i })).toBeNull();
  });
});
