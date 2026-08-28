import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

/**
 * LEG-07 (P1) — the cancellation and refund dialogs never state the AMOUNT,
 * and the refund dialog promised the whole payment back.
 *
 * /bookings/view carried two confirm dialogs. Neither quoted a number:
 *
 *   cancel dialog   "Any refund due under the cancellation policy will be
 *                    processed within 5-7 business days."
 *   refund dialog   "Confirm cancellation & refund. Your payment will be
 *                    returned within 5-7 business days."
 *   success state   "Refund requested. It will be processed within 1 hour and
 *                    credited within 5-7 business days."
 *
 * The refund line is the serious one. The ladder in
 * apps/api/src/services/cancellation.service.ts has FOUR tiers, and "your
 * payment will be returned" is true in exactly one of them (48h+, 100%). A
 * devotee cancelling 30 hours out reads an unconditional promise of a full
 * refund and is then paid 75%. That is the sentence a chargeback is opened on.
 *
 * The API has been able to answer this the whole time: GET
 * /bookings/:id/cancel-quote (routes/bookings.ts, authenticated) returns
 * refundAmountInr, feeAmountInr, refundFraction and tierLabel from
 * cancellationService.computeDevoteeRefund — the SAME function the executors
 * use, so the quote and the payout cannot disagree. apps/web had zero
 * references to it.
 *
 * Every assertion below was confirmed RED before the fix: no dialog rendered
 * any rupee amount, the refund dialog rendered the unconditional promise, and
 * /cancel-quote was never requested.
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

/**
 * A paid booking well outside the 24h cutoff, so both controls are offered.
 *
 * Five days out rather than 40 hours: `isRefundable` recomputes the slot from
 * the DATE plus `scheduledTimeSlot`, so a 40-hour offset lands under 24h
 * whenever the slot time is earlier in the day than the current clock.
 *
 * The QUOTE below is still the partial 75% tier. That is deliberate and not a
 * contradiction — the quote is the server's answer, mocked here, and the whole
 * point of this finding is that the dialog must print whatever the ladder
 * returns instead of assuming a full refund.
 */
function bookingRow() {
  const scheduled = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  return {
    id: 'bk-1',
    bookingNumber: 'BS-20260828-00001',
    status: 'confirmed',
    scheduledDate: scheduled.toISOString(),
    scheduledTimeSlot: '07:00',
    priceAmount: '1100.00',
    videoProofUrl: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    temple: { name: 'Kashi Vishwanath', city: 'Varanasi', state: 'Uttar Pradesh' },
    pujaType: { name: 'Rudrabhishek', slug: 'rudrabhishek' },
    payments: [{ status: 'captured', amount: '1100.00', refundAmount: null }],
  };
}

/** The 24-48h tier: 75% back, ₹275 retained. */
const QUOTE = {
  bookingId: 'bk-1',
  refundFraction: 0.75,
  refundAmountInr: 825,
  feeAmountInr: 275,
  tierLabel: '24–48 hours before the slot',
  hoursUntilSlot: 40,
  refundDaysLabel: '5-7 business days',
};

function jsonOk(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

/** Mocks the detail fetch and the quote fetch; `quote: null` makes the quote fail. */
function mockApi(opts: { quote?: unknown | null } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/cancel-quote')) {
      if (opts.quote === null) {
        return { ok: false, status: 500, json: async () => ({ error: 'boom' }) } as unknown as Response;
      }
      return jsonOk(opts.quote ?? QUOTE);
    }
    if (url.includes('/bookings/bk-1')) return jsonOk({ booking: bookingRow() });
    return jsonOk({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function quoteCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter((c) => String(c[0]).includes('/cancel-quote'));
}

async function renderView() {
  render(<BookingViewPage />);
  // The puja name appears twice (page heading and the summary row), so anchor
  // on the heading rather than on the text.
  await screen.findByRole('heading', { name: /Rudrabhishek/i }, { timeout: 15_000 });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LEG-07 — the refund dialog states the real amount', () => {
  it('asks the API what this cancellation is actually worth', async () => {
    const fetchMock = mockApi();
    await renderView();

    fireEvent.click(screen.getByRole('button', { name: /request cancellation & refund/i }));
    await waitFor(() => expect(quoteCalls(fetchMock).length).toBeGreaterThan(0));

    // Authenticated — the endpoint is behind authenticateUser.
    const headers = (quoteCalls(fetchMock)[0]?.[1] as RequestInit | undefined)?.headers as
      | Record<string, string>
      | undefined;
    expect(String(headers?.Authorization ?? '')).toContain('test-token');
  });

  it('shows the rupee figure the ladder will actually pay', async () => {
    mockApi();
    await renderView();
    fireEvent.click(screen.getByRole('button', { name: /request cancellation & refund/i }));

    await waitFor(() => expect(document.body.textContent).toMatch(/825/));
    const body = document.body.textContent ?? '';
    // The retained amount too — a refund screen that shows only the credit
    // leaves the devotee to discover the fee from their bank statement.
    expect(body).toMatch(/275/);
  });

  it('makes no unconditional promise that the payment comes back', async () => {
    mockApi();
    await renderView();
    fireEvent.click(screen.getByRole('button', { name: /request cancellation & refund/i }));

    await waitFor(() => expect(document.body.textContent).toMatch(/825/));
    expect(document.body.textContent).not.toMatch(/your payment will be returned/i);
  });

  it('does not let the devotee confirm before the amount is known', async () => {
    // A pending quote must not be confirmable: the whole point is that they
    // agree to a number, not to a dialog.
    let release: (() => void) | null = null;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/cancel-quote')) {
        await gate;
        return jsonOk(QUOTE);
      }
      if (url.includes('/bookings/bk-1')) return jsonOk({ booking: bookingRow() });
      return jsonOk({});
    });
    vi.stubGlobal('fetch', fetchMock);

    await renderView();
    fireEvent.click(screen.getByRole('button', { name: /request cancellation & refund/i }));

    const confirm = await screen.findByRole('button', { name: /confirm refund/i });
    expect(confirm).toHaveProperty('disabled', true);

    release!();
    await waitFor(() => expect(screen.getByRole('button', { name: /confirm refund/i })).toHaveProperty('disabled', false));
  });

  it('falls back to the published policy, with a link, when the quote fails', async () => {
    mockApi({ quote: null });
    await renderView();
    fireEvent.click(screen.getByRole('button', { name: /request cancellation & refund/i }));

    await waitFor(() => expect(document.body.textContent).toMatch(/could not work out/i));
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/your payment will be returned/i);
    const link = document.querySelector('a[href="/refunds"]');
    expect(link, 'no link to the published refund policy').not.toBeNull();
  });
});

describe('LEG-07 — the cancel dialog states the real amount too', () => {
  it('quotes the figure rather than "any refund due"', async () => {
    mockApi();
    await renderView();
    fireEvent.click(screen.getByRole('button', { name: /^cancel booking$/i }));

    await waitFor(() => expect(document.body.textContent).toMatch(/825/));
    expect(document.body.textContent).not.toMatch(/any refund due under the cancellation policy/i);
  });
});

describe('LEG-07 — the success state echoes the amount', () => {
  it('names the figure the devotee just agreed to', async () => {
    mockApi();
    await renderView();
    fireEvent.click(screen.getByRole('button', { name: /request cancellation & refund/i }));
    await waitFor(() => expect(document.body.textContent).toMatch(/825/));

    fireEvent.click(screen.getByRole('button', { name: /confirm refund/i }));
    // The amount is IN the sentence — "Refund of ₹825 requested" — so the two
    // are asserted together rather than as separate substrings, which is what
    // makes this a statement of the figure and not a number floating elsewhere
    // on the page.
    await waitFor(() =>
      expect(document.body.textContent).toMatch(/refund of ₹?825 requested/i),
    );
  });
});
