/**
 * AO-03 (prod sweep 2026-08-12) — /admin/payouts returned HTTP 404.
 *
 * The payout rail has been live on the API since 2026-08-06 and had no screen:
 * GET  /api/v1/admin/bookings/payout-requests[?status=]
 * POST /api/v1/admin/bookings/payout-requests/:id/process { action, reference?, failureReason? }
 * GET  /api/v1/admin/bookings/payouts/pending  (accrual summary, no control)
 *
 * Every settlement therefore had to be run by hand with curl, which for a solo
 * founder means providers do not get paid on schedule.
 *
 * What this file locks down beyond "the page exists":
 *
 *  1. The queue is the PayoutRequest list, not the Commission ledger. A pending
 *     Commission is money owed; only a PayoutRequest is settleable, because
 *     payout.service.processPayout looks the id up with payoutRequest.findUnique
 *     and 404s on anything else.
 *  2. Reject is a real, distinct action — it releases the linked commissions
 *     back to the provider's withdrawable balance — and it must never be fired
 *     as a side effect of the pay path.
 *  3. No destructive action reports success from a 200 alone. This codebase
 *     shipped "User updated (mock)" on /admin/users; on a money screen the same
 *     defect means a provider is recorded as paid and never sees a rupee. Both
 *     actions confirm the server's own status AND a refetch of the queue.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' } }),
}));

import AdminPayoutsPage from '../app/admin/payouts/page';

// ─── fixtures — shapes copied from live 127.0.0.1:4000 responses ─────────────

/** GET /admin/bookings/payout-requests?status=pending */
const PENDING_REQUEST = {
  id: 'e5505442-c652-4a98-a387-db0ad456bc69',
  providerId: 'b61f02c9-b795-4e2e-a1e8-1f10660520b9',
  providerName: 'Demo Pandit',
  providerEmail: 'pandit@demo.com',
  role: 'PANDIT',
  amount: '770',
  method: 'upi',
  status: 'pending',
  reference: null,
  requestedAt: '2026-08-12T15:47:45.702Z',
  processedAt: null,
  linkedCommissionCount: 1,
  linkedCommissionTotal: '770',
};

const COMPLETED_REQUEST = {
  ...PENDING_REQUEST,
  id: 'c0a1b627-12fe-402d-a6b3-92168a0308b0',
  amount: '2310',
  status: 'completed',
  reference: 'probe-ref-1',
  processedAt: '2026-08-12T15:44:29.026Z',
  linkedCommissionCount: 3,
  linkedCommissionTotal: '2310',
};

/** GET /admin/bookings/payouts/pending */
const ACCRUAL = {
  ok: true,
  groups: [
    {
      providerId: '6a56eba6-e340-40bc-b236-97440ada4001',
      providerName: 'Demo Pandit',
      role: 'PRIEST',
      bookingsCount: 13,
      totalPayout: 10763.25,
    },
    {
      providerId: 'ba87a424-e9d2-44f1-92a9-996441b31131',
      providerName: 'Acharya Vinod Sharma',
      role: 'ASTROLOGER',
      bookingsCount: 2,
      totalPayout: 700,
    },
  ],
  scanLimit: 500,
  truncated: false,
  schemaNote: 'Balance already claimed by an open payout request is excluded here.',
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
  /** Queue payload per successive GET of /payout-requests (last entry repeats). */
  queues?: unknown[][];
  /** Reply for POST …/process. */
  process?: (body: Record<string, unknown>) => Response;
  accrual?: unknown;
}

function mockApi(opts: MockOpts = {}) {
  const queues = opts.queues ?? [[PENDING_REQUEST], []];
  let queueCall = 0;

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/payout-requests/') && url.endsWith('/process')) {
      if (method !== 'POST') throw new Error(`process called with ${method}`);
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      if (opts.process) return opts.process(body);
      const status = body.action === 'complete' ? 'completed' : body.action === 'reject' ? 'rejected' : 'failed';
      return jsonResponse({ ok: true, payout: { id: PENDING_REQUEST.id, status } });
    }
    if (url.includes('/admin/bookings/payout-requests')) {
      const q = queues[Math.min(queueCall, queues.length - 1)];
      queueCall += 1;
      return jsonResponse({ requests: q });
    }
    if (url.includes('/admin/bookings/payouts/pending')) {
      return jsonResponse(opts.accrual ?? ACCRUAL);
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

/**
 * `findAllByText` on purpose: the same provider legitimately appears twice —
 * once in the settlement queue and once in the accrual summary — and that
 * overlap is the point of showing both.
 */
async function renderPage() {
  render(<AdminPayoutsPage />);
  await screen.findAllByText('Demo Pandit');
}

async function openPayDialog(reference = 'UTR-99887766') {
  fireEvent.click(screen.getByRole('button', { name: /pay now/i }));
  const input = await screen.findByLabelText(/reference/i);
  fireEvent.change(input, { target: { value: reference } });
}

async function openRejectDialog(reason = 'Bank details bounced twice') {
  fireEvent.click(screen.getByRole('button', { name: /^reject$/i }));
  const input = await screen.findByLabelText(/reason/i);
  fireEvent.change(input, { target: { value: reason } });
}

const payConfirm = () => screen.getByRole('button', { name: /mark as paid/i });
const rejectConfirm = () => screen.getByRole('button', { name: /confirm rejection/i });

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── the missing screen ──────────────────────────────────────────────────────

describe('AO-03 — /admin/payouts renders the settlement queue', () => {
  it('loads the payout-request queue from the real endpoint', async () => {
    const fetchMock = mockApi();
    await renderPage();

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/admin/bookings/payout-requests'))).toBe(true);
    // Exact rupees, never a compact "Rs. 0.8K" — nobody approves a bank
    // transfer against a rounded figure.
    expect(screen.getAllByText(/Rs\. 770\.00/).length).toBeGreaterThan(0);
  });

  it('authenticates the queue fetch so the admin preHandler does not 401 it', async () => {
    const fetchMock = mockApi();
    await renderPage();
    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes('/payout-requests'));
    const headers = ((call?.[1] as RequestInit | undefined)?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-token');
  });

  it('shows the accrual summary as read-only — an unrequested balance is not settleable', async () => {
    mockApi();
    await renderPage();
    await screen.findByText('Acharya Vinod Sharma');
    expect(screen.getAllByText(/not settleable here/i).length).toBeGreaterThan(0);
  });

  it('says the queue is empty rather than rendering a control that no-ops', async () => {
    mockApi({ queues: [[]] });
    render(<AdminPayoutsPage />);
    await screen.findByText(/no payout requests/i);
    expect(screen.queryByRole('button', { name: /pay now/i })).toBeNull();
  });

  it('offers no pay or reject control on an already-processed request', async () => {
    mockApi({ queues: [[COMPLETED_REQUEST]] });
    render(<AdminPayoutsPage />);
    await screen.findAllByText('Demo Pandit');
    expect(screen.queryByRole('button', { name: /pay now/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^reject$/i })).toBeNull();
  });
});

// ─── complete ────────────────────────────────────────────────────────────────

describe('AO-03 — completing a payout', () => {
  it("POSTs action 'complete' with the operator's transfer reference", async () => {
    const fetchMock = mockApi();
    await renderPage();
    await openPayDialog('UTR-1234567890');
    fireEvent.click(payConfirm());

    await waitFor(() => expect(nonGetCalls(fetchMock).length).toBeGreaterThan(0));
    const [url, init] = nonGetCalls(fetchMock)[0] as [string, RequestInit];
    expect(String(url)).toContain(`/admin/bookings/payout-requests/${PENDING_REQUEST.id}/process`);
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.action).toBe('complete');
    expect(body.reference).toBe('UTR-1234567890');
  });

  it('will not submit without a transfer reference', async () => {
    const fetchMock = mockApi();
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /pay now/i }));
    await screen.findByLabelText(/reference/i);
    fireEvent.click(payConfirm());

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(nonGetCalls(fetchMock)).toHaveLength(0);
  });

  it('a double click cannot fire the transfer twice', async () => {
    const fetchMock = mockApi();
    await renderPage();
    await openPayDialog();
    const btn = payConfirm();
    fireEvent.click(btn);
    fireEvent.click(btn);

    await waitFor(() => expect(nonGetCalls(fetchMock).length).toBeGreaterThan(0));
    expect(nonGetCalls(fetchMock)).toHaveLength(1);
  });

  it('confirms settlement only after the server says completed and the refetch agrees', async () => {
    mockApi({ queues: [[PENDING_REQUEST], []] });
    await renderPage();
    await openPayDialog('UTR-99887766');
    fireEvent.click(payConfirm());

    const banner = await screen.findByRole('status');
    expect(banner.textContent).toMatch(/Demo Pandit/);
    expect(banner.textContent).toMatch(/UTR-99887766/);
  });

  it('refuses to claim success when the row is still pending after the refetch', async () => {
    mockApi({ queues: [[PENDING_REQUEST], [PENDING_REQUEST]] });
    await renderPage();
    await openPayDialog();
    fireEvent.click(payConfirm());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/still pending/i);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('surfaces the completion guard instead of reporting money as sent', async () => {
    mockApi({
      process: () =>
        jsonResponse(
          {
            error:
              'Cannot complete a payout request in "rejected" status — its commissions have already been released back to the provider\'s withdrawable balance.',
          },
          { ok: false, status: 400 },
        ),
    });
    await renderPage();
    await openPayDialog();
    fireEvent.click(payConfirm());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/already been released/i);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('warns before transferring against a request that owns no commissions', async () => {
    mockApi({ queues: [[{ ...PENDING_REQUEST, linkedCommissionCount: 0, linkedCommissionTotal: '0' }]] });
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /pay now/i }));
    await screen.findByLabelText(/reference/i);
    expect(screen.getByText(/owns no commissions/i)).toBeTruthy();
  });
});

// ─── reject ──────────────────────────────────────────────────────────────────

describe('AO-03 — rejecting a payout request', () => {
  it("POSTs action 'reject' with the reason, never 'complete'", async () => {
    const fetchMock = mockApi();
    await renderPage();
    await openRejectDialog('Bank details bounced twice');
    fireEvent.click(rejectConfirm());

    await waitFor(() => expect(nonGetCalls(fetchMock).length).toBeGreaterThan(0));
    const init = nonGetCalls(fetchMock)[0][1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.action).toBe('reject');
    expect(body.failureReason).toBe('Bank details bounced twice');
    expect(body.reference).toBeUndefined();
  });

  it('will not reject without a reason — the provider has to be told why', async () => {
    const fetchMock = mockApi();
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^reject$/i }));
    await screen.findByLabelText(/reason/i);
    fireEvent.click(rejectConfirm());

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(nonGetCalls(fetchMock)).toHaveLength(0);
  });

  it('says the balance went back to the provider only once the server says rejected', async () => {
    mockApi({ queues: [[PENDING_REQUEST], []] });
    await renderPage();
    await openRejectDialog();
    fireEvent.click(rejectConfirm());

    const banner = await screen.findByRole('status');
    expect(banner.textContent).toMatch(/Demo Pandit/);
    expect(banner.textContent).toMatch(/balance/i);
  });

  it('refuses to claim a rejection the server did not make', async () => {
    // processPayout short-circuits on an already-completed request and answers
    // 200 with status 'completed' — a 200 here is not a rejection.
    mockApi({
      process: () => jsonResponse({ ok: true, payout: { id: PENDING_REQUEST.id, status: 'completed' } }),
    });
    await renderPage();
    await openRejectDialog();
    fireEvent.click(rejectConfirm());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/completed/i);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('refuses to claim success when the row is still pending after the refetch', async () => {
    mockApi({ queues: [[PENDING_REQUEST], [PENDING_REQUEST]] });
    await renderPage();
    await openRejectDialog();
    fireEvent.click(rejectConfirm());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/still pending/i);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('a network failure surfaces as an error, not a hung dialog', async () => {
    mockApi({
      process: () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await renderPage();
    await openRejectDialog();
    fireEvent.click(rejectConfirm());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBeTruthy();
    expect((rejectConfirm() as HTMLButtonElement).disabled).toBe(false);
  });
});
