/**
 * AO-03 (prod sweep 2026-08-12) — /admin/refunds returned HTTP 404.
 *
 * The refund rail exists on the API and had no screen:
 *   GET  /api/v1/admin/bookings/refunds/pending
 *        → { bookings: [ …booking, pujaType, temple, user, payments[] ], schemaNote }
 *        (BookingStatus has no REFUND_REQUESTED — the queue is `cancelled`
 *         bookings whose Payment is still captured/authorized)
 *   POST /api/v1/admin/bookings/refunds/:bookingId/approve
 *        body { reason?, refundType?: 'full'|'partial', amountInr? }
 *        → 200 { ok: true, refund: ProcessRefundResult } | 502 { error, refund }
 *   POST /api/v1/admin/bookings/refunds/:bookingId/reject   body { reason }
 *        → { booking }
 *   GET  /api/v1/admin/bookings?status=refunded  → { bookings, page, limit, total }
 *
 * Two things this file is strict about, both learned from live behaviour:
 *
 *  1. approve returns 200 with `ok: true` on the SKIPPED path too
 *     (already-refunded). And it returns 502 with `{ error }` when Razorpay is
 *     unconfigured or declines — which is what the local stack actually does.
 *     A screen that reads the HTTP status alone reports a refund that never
 *     reached the devotee's card.
 *  2. reject does NOT change booking.status or the payment — the row stays in
 *     the queue by design. So "it disappeared" is the wrong proof; the proof is
 *     the [refund-rejected] marker the server writes into cancellationReason.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' } }),
}));

import AdminRefundsPage from '../app/admin/refunds/page';

// ─── fixtures ────────────────────────────────────────────────────────────────

const PENDING_BOOKING = {
  id: 'ffcf075e-0686-4ae6-ab1e-f3abc40dde45',
  bookingNumber: 'BS-20260812-6A2ZP',
  status: 'cancelled',
  priceAmount: '1151',
  currency: 'INR',
  cancelledAt: '2026-08-12T15:46:30.435Z',
  cancellationReason: 'Booking cancelled',
  scheduledDate: '2026-11-15T00:00:00.000Z',
  pujaType: { name: 'Rudrabhishek', slug: 'rudrabhishek' },
  temple: { name: 'Kashi Vishwanath', slug: 'kashi-vishwanath', city: 'Varanasi' },
  user: { fullName: 'Ananya Iyer', phone: '+919812345678' },
  payments: [{ id: 'pay-1', status: 'captured', amount: '1151' }],
};

const REFUNDED_BOOKING = {
  id: '8add2b95-1660-4cf0-84a8-5b073958895d',
  bookingNumber: 'BS-20260812-J3M76',
  status: 'refunded',
  priceAmount: '1151',
  currency: 'INR',
  cancelledAt: '2026-08-12T15:46:30.435Z',
  cancellationReason: '[refunded] Booking cancelled',
  scheduledDate: '2026-11-15T00:00:00.000Z',
  pujaType: { name: 'Satyanarayan Puja', slug: 'satyanarayan-puja' },
  temple: { name: 'Kashi Vishwanath', slug: 'kashi-vishwanath', city: 'Varanasi' },
  user: { fullName: 'Refund Probe', phone: null },
};

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const text = JSON.stringify(body);
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    text: async () => text,
    json: async () => JSON.parse(text),
  } as unknown as Response;
}

interface MockOpts {
  /** Refund-queue payload per successive GET (last entry repeats). */
  queues?: unknown[][];
  approve?: (body: Record<string, unknown>) => Response;
  reject?: (body: Record<string, unknown>) => Response;
  history?: unknown[];
}

function mockApi(opts: MockOpts = {}) {
  const queues = opts.queues ?? [[PENDING_BOOKING], []];
  let queueCall = 0;

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};

    if (method === 'POST' && url.endsWith('/approve')) {
      return opts.approve
        ? opts.approve(body)
        : jsonResponse({
            ok: true,
            refund: {
              ok: true,
              refundId: 'rfnd_test_1',
              paymentId: 'pay-1',
              bookingId: PENDING_BOOKING.id,
              amountInr: 1151,
              status: 'refunded',
            },
          });
    }
    if (method === 'POST' && url.endsWith('/reject')) {
      return opts.reject
        ? opts.reject(body)
        : jsonResponse({
            booking: {
              ...PENDING_BOOKING,
              cancellationReason: `[refund-rejected] ${String(body.reason ?? '')}`,
            },
          });
    }
    if (url.includes('/admin/bookings/refunds/pending')) {
      const q = queues[Math.min(queueCall, queues.length - 1)];
      queueCall += 1;
      return jsonResponse({ bookings: q, schemaNote: 'cancelled bookings with un-refunded captures' });
    }
    if (url.includes('/admin/bookings?') || url.includes('status=refunded')) {
      const rows = opts.history ?? [REFUNDED_BOOKING];
      return jsonResponse({ bookings: rows, page: 1, limit: 25, total: rows.length });
    }
    throw new Error(`unexpected fetch: ${method} ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function nonGetCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter(
    (c) => ((c[1] as RequestInit | undefined)?.method ?? 'GET').toUpperCase() !== 'GET',
  );
}

async function renderPage() {
  render(<AdminRefundsPage />);
  await screen.findByText('BS-20260812-6A2ZP');
}

async function openRefundDialog(reason = 'Priest unavailable on the scheduled date') {
  fireEvent.click(screen.getByRole('button', { name: /^refund$/i }));
  const input = await screen.findByLabelText(/reason/i);
  fireEvent.change(input, { target: { value: reason } });
}

async function openRejectDialog(reason = 'Puja was performed, video proof on file') {
  fireEvent.click(screen.getByRole('button', { name: /^reject$/i }));
  const input = await screen.findByLabelText(/reason/i);
  fireEvent.change(input, { target: { value: reason } });
}

const refundConfirm = () => screen.getByRole('button', { name: /confirm refund/i });
const rejectConfirm = () => screen.getByRole('button', { name: /confirm rejection/i });

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── the missing screen ──────────────────────────────────────────────────────

describe('AO-03 — /admin/refunds renders the refund queue', () => {
  it('loads the refund queue from the real endpoint', async () => {
    const fetchMock = mockApi();
    await renderPage();

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/admin/bookings/refunds/pending'))).toBe(true);
    expect(screen.getByText('Ananya Iyer')).toBeTruthy();
  });

  it('authenticates the queue fetch so the admin preHandler does not 401 it', async () => {
    const fetchMock = mockApi();
    await renderPage();
    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes('/refunds/pending'));
    const headers = ((call?.[1] as RequestInit | undefined)?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-token');
  });

  it('shows already-refunded bookings so an operator can see what was paid back', async () => {
    mockApi();
    await renderPage();
    expect(await screen.findByText('BS-20260812-J3M76')).toBeTruthy();
  });

  it('reports an empty queue rather than rendering a control with nothing behind it', async () => {
    mockApi({ queues: [[]] });
    render(<AdminRefundsPage />);
    await screen.findByText(/no refunds awaiting/i);
    expect(screen.queryByRole('button', { name: /^refund$/i })).toBeNull();
  });
});

// ─── approve ─────────────────────────────────────────────────────────────────

describe('AO-03 — approving a refund', () => {
  it('POSTs to the approve endpoint with a full refund by default', async () => {
    const fetchMock = mockApi();
    await renderPage();
    await openRefundDialog('Priest unavailable');
    fireEvent.click(refundConfirm());

    await waitFor(() => expect(nonGetCalls(fetchMock).length).toBeGreaterThan(0));
    const [url, init] = nonGetCalls(fetchMock)[0] as [string, RequestInit];
    expect(String(url)).toContain(`/admin/bookings/refunds/${PENDING_BOOKING.id}/approve`);
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.refundType).toBe('full');
    expect(body.reason).toBe('Priest unavailable');
  });

  it('sends amountInr when a partial refund is chosen', async () => {
    const fetchMock = mockApi();
    await renderPage();
    await openRefundDialog();
    fireEvent.click(screen.getByLabelText(/partial/i));
    fireEvent.change(await screen.findByLabelText(/amount/i), { target: { value: '575.50' } });
    fireEvent.click(refundConfirm());

    await waitFor(() => expect(nonGetCalls(fetchMock).length).toBeGreaterThan(0));
    const body = JSON.parse(String((nonGetCalls(fetchMock)[0][1] as RequestInit).body)) as Record<string, unknown>;
    expect(body.refundType).toBe('partial');
    expect(body.amountInr).toBe(575.5);
  });

  it('will not send a partial refund larger than the captured payment', async () => {
    const fetchMock = mockApi();
    await renderPage();
    await openRefundDialog();
    fireEvent.click(screen.getByLabelText(/partial/i));
    fireEvent.change(await screen.findByLabelText(/amount/i), { target: { value: '99999' } });
    fireEvent.click(refundConfirm());

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(nonGetCalls(fetchMock)).toHaveLength(0);
  });

  it('will not submit without a reason', async () => {
    const fetchMock = mockApi();
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^refund$/i }));
    await screen.findByLabelText(/reason/i);
    fireEvent.click(refundConfirm());

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(nonGetCalls(fetchMock)).toHaveLength(0);
  });

  it('a double click cannot fire the refund twice', async () => {
    const fetchMock = mockApi();
    await renderPage();
    await openRefundDialog();
    const btn = refundConfirm();
    fireEvent.click(btn);
    fireEvent.click(btn);

    await waitFor(() => expect(nonGetCalls(fetchMock).length).toBeGreaterThan(0));
    expect(nonGetCalls(fetchMock)).toHaveLength(1);
  });

  it('confirms only after the gateway refund succeeded and the row left the queue', async () => {
    mockApi({ queues: [[PENDING_BOOKING], []] });
    await renderPage();
    await openRefundDialog();
    fireEvent.click(refundConfirm());

    const banner = await screen.findByRole('status');
    expect(banner.textContent).toMatch(/BS-20260812-6A2ZP/);
    expect(banner.textContent).toMatch(/rfnd_test_1/);
  });

  it('surfaces the 502 the local stack returns when Razorpay is unconfigured', async () => {
    mockApi({
      approve: () =>
        jsonResponse(
          {
            error: 'razorpay env vars not configured',
            refund: { ok: false, bookingId: PENDING_BOOKING.id, error: 'razorpay env vars not configured' },
          },
          { ok: false, status: 502 },
        ),
    });
    await renderPage();
    await openRefundDialog();
    fireEvent.click(refundConfirm());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/razorpay/i);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('refuses to claim a refund when the body says ok:false behind a 200', async () => {
    mockApi({
      approve: () =>
        jsonResponse({
          ok: true,
          refund: { ok: false, bookingId: PENDING_BOOKING.id, error: 'No captured payment found for this booking' },
        }),
    });
    await renderPage();
    await openRefundDialog();
    fireEvent.click(refundConfirm());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/no captured payment/i);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('reports the idempotent skip honestly instead of as a fresh refund', async () => {
    mockApi({
      queues: [[PENDING_BOOKING], []],
      approve: () =>
        jsonResponse({
          ok: true,
          refund: { ok: true, skipped: true, reason: 'already-refunded', bookingId: PENDING_BOOKING.id, status: 'refunded' },
        }),
    });
    await renderPage();
    await openRefundDialog();
    fireEvent.click(refundConfirm());

    const banner = await screen.findByRole('status');
    expect(banner.textContent).toMatch(/already/i);
    expect(banner.textContent).not.toMatch(/rfnd_test_1/);
  });

  it('refuses to claim success when the booking is still in the queue after the refetch', async () => {
    mockApi({ queues: [[PENDING_BOOKING], [PENDING_BOOKING]] });
    await renderPage();
    await openRefundDialog();
    fireEvent.click(refundConfirm());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/still/i);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a network failure surfaces as an error, not a hung dialog', async () => {
    mockApi({
      approve: () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await renderPage();
    await openRefundDialog();
    fireEvent.click(refundConfirm());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBeTruthy();
    expect((refundConfirm() as HTMLButtonElement).disabled).toBe(false);
  });
});

// ─── reject ──────────────────────────────────────────────────────────────────

describe('AO-03 — rejecting a refund request', () => {
  it('POSTs the reason to the reject endpoint', async () => {
    const fetchMock = mockApi();
    await renderPage();
    await openRejectDialog('Puja was performed, video proof on file');
    fireEvent.click(rejectConfirm());

    await waitFor(() => expect(nonGetCalls(fetchMock).length).toBeGreaterThan(0));
    const [url, init] = nonGetCalls(fetchMock)[0] as [string, RequestInit];
    expect(String(url)).toContain(`/admin/bookings/refunds/${PENDING_BOOKING.id}/reject`);
    expect(JSON.parse(String(init.body)).reason).toBe('Puja was performed, video proof on file');
  });

  it('will not send an empty reason the API would 400', async () => {
    const fetchMock = mockApi();
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^reject$/i }));
    await screen.findByLabelText(/reason/i);
    fireEvent.click(rejectConfirm());

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(nonGetCalls(fetchMock)).toHaveLength(0);
  });

  it('confirms once the refetched booking carries the [refund-rejected] marker', async () => {
    mockApi({
      queues: [
        [PENDING_BOOKING],
        [{ ...PENDING_BOOKING, cancellationReason: '[refund-rejected] Puja was performed, video proof on file' }],
      ],
    });
    await renderPage();
    await openRejectDialog();
    fireEvent.click(rejectConfirm());

    const banner = await screen.findByRole('status');
    expect(banner.textContent).toMatch(/BS-20260812-6A2ZP/);
    expect(banner.textContent).toMatch(/rejected/i);
  });

  it('refuses to claim a rejection the server did not persist', async () => {
    // 200 from the endpoint, but the refetched booking has no marker — the exact
    // "reported success, persisted nothing" shape of AO-01.
    mockApi({ queues: [[PENDING_BOOKING], [PENDING_BOOKING]] });
    await renderPage();
    await openRejectDialog();
    fireEvent.click(rejectConfirm());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/not recorded|does not show/i);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('does not fire the refund endpoint from the reject path', async () => {
    const fetchMock = mockApi({
      queues: [[PENDING_BOOKING], [{ ...PENDING_BOOKING, cancellationReason: '[refund-rejected] x' }]],
    });
    await renderPage();
    await openRejectDialog();
    fireEvent.click(rejectConfirm());

    await waitFor(() => expect(nonGetCalls(fetchMock).length).toBeGreaterThan(0));
    expect(nonGetCalls(fetchMock).every((c) => !String(c[0]).endsWith('/approve'))).toBe(true);
  });
});
