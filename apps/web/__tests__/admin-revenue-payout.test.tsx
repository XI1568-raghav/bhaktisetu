/**
 * AO-02 (prod sweep 2026-08-12) — "Pay Now" on /admin/revenue was a dead button.
 *
 * apps/web/app/admin/revenue/page.tsx:339 rendered
 *
 *     <button className="px-3 py-1.5 bg-green-600 …">Pay Now</button>
 *
 * with a className and nothing else — no onClick, no handler, no request. The
 * live instrumentation in the sweep read "any non-GET request fired? false" and
 * GET /admin/revenue afterwards still reported the same pendingPayouts. On the
 * one screen in the whole admin panel that looks like it moves money to a
 * provider, clicking it did nothing at all and said nothing at all.
 *
 * Two further things this file locks down, because AO-01 on the adjacent screen
 * is the same family of defect (admin Block/Delete rendered "User updated
 * (mock)" while persisting nothing):
 *
 *  1. The control targets the REAL rail. A payout is settled by
 *     POST /api/v1/admin/bookings/payout-requests/:id/process with
 *     { action: 'complete', reference } — a PayoutRequest id, never a
 *     Commission id. A PENDING Commission that no provider has requested a
 *     payout for is not payable and must not carry a pay control.
 *  2. Success is never claimed optimistically. The button reports success only
 *     when the server says the request reached `completed` AND a refetch shows
 *     it gone from the pending queue. Anything else is an error on screen.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' } }),
}));

import AdminRevenuePage from '../app/admin/revenue/page';

// ─── fixtures ────────────────────────────────────────────────────────────────

const REVENUE = {
  totalCommissions: 12000,
  totalSubscriptions: 4000,
  pendingPayouts: 3200,
  commissions: [
    {
      id: 'comm-unrequested',
      bookingId: 'BS-20260812-AAAAA',
      providerId: 'prov-1',
      amount: 1200,
      status: 'PENDING',
      createdAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 'comm-paid',
      bookingId: 'BS-20260812-BBBBB',
      providerId: 'prov-2',
      amount: 800,
      status: 'PAID',
      createdAt: '2026-08-02T00:00:00.000Z',
    },
  ],
  subscriptionRevenue: [],
};

const DASHBOARD = {
  totalUsers: 10,
  usersByRole: {},
  totalRevenue: 58700,
  pendingApprovals: 0,
  activeSubscriptions: 3,
  recentTransactions: [],
};

/**
 * GET /admin/bookings/payouts/pending — the reconciled liability (AO-11). The
 * page reads provider balances from here, not from `revenue.commissions`,
 * because only this endpoint covers the legacy priest rail and excludes
 * balance an open payout request has already claimed.
 */
const ACCRUAL = {
  ok: true,
  groups: [
    {
      providerId: 'prov-1',
      providerName: 'Demo Wellness',
      role: 'WELLNESS_INSTRUCTOR',
      bookingsCount: 1,
      totalPayout: 1200,
    },
  ],
  scanLimit: 500,
  truncated: false,
  schemaNote: null,
};

/** GET /admin/commissions — the enriched ledger (AO-12): names, not uuids. */
const COMMISSION_PAGE = {
  data: [
    {
      id: 'comm-unrequested',
      bookingId: 'booking-uuid-1',
      providerId: 'prov-1',
      providerName: 'Demo Wellness',
      providerRole: 'WELLNESS_INSTRUCTOR',
      bookingNumber: 'BS-20260812-AAAAA',
      itemName: 'Rudrabhishek',
      amount: '1200',
      percentage: '0.2',
      grossAmount: '1500',
      platformCut: '300',
      ratePercent: 20,
      status: 'PENDING',
      createdAt: '2026-08-01T00:00:00.000Z',
    },
  ],
  page: 1,
  pageSize: 200,
  total: 1,
};

const PENDING_REQUEST = {
  id: 'pr-1',
  providerId: 'prov-9',
  providerName: 'Acharya Vinod Sharma',
  providerEmail: 'vinod@example.com',
  role: 'PANDIT',
  amount: '3200.00',
  method: 'upi',
  status: 'pending',
  reference: null,
  requestedAt: '2026-08-10T00:00:00.000Z',
  processedAt: null,
  linkedCommissionCount: 4,
  linkedCommissionTotal: '3200.00',
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
  /** Pending payout-request queue returned by each GET (in call order). */
  queues?: unknown[][];
  /** What POST …/process replies with. */
  process?: () => Response;
}

/**
 * Routes the three GETs the page makes plus the one POST the button makes.
 * Returns the mock so tests can assert on what actually crossed the wire —
 * a dead control is only provably dead at this layer.
 */
function mockApi(opts: MockOpts = {}) {
  const queues = opts.queues ?? [[PENDING_REQUEST], []];
  let queueCall = 0;

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/payout-requests/') && url.endsWith('/process')) {
      if (method !== 'POST') throw new Error(`process called with ${method}`);
      return opts.process
        ? opts.process()
        : jsonResponse({ ok: true, payout: { id: 'pr-1', status: 'completed' } });
    }
    if (url.includes('/admin/bookings/payout-requests')) {
      const q = queues[Math.min(queueCall, queues.length - 1)];
      queueCall += 1;
      return jsonResponse({ requests: q });
    }
    if (url.includes('/admin/bookings/payouts/pending')) return jsonResponse(ACCRUAL);
    if (url.includes('/admin/commissions')) return jsonResponse(COMMISSION_PAGE);
    if (url.includes('/admin/revenue')) return jsonResponse(REVENUE);
    if (url.includes('/admin/dashboard')) return jsonResponse(DASHBOARD);
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

/** Renders the page and waits for the payout queue to paint. */
async function renderPage() {
  render(<AdminRevenuePage />);
  await screen.findByText('Acharya Vinod Sharma');
}

/** Opens the confirm dialog and fills in the transfer reference. */
async function openConfirm(reference = 'UTR-99887766') {
  fireEvent.click(screen.getByRole('button', { name: /pay now/i }));
  const input = await screen.findByLabelText(/reference/i);
  fireEvent.change(input, { target: { value: reference } });
  return input;
}

function confirmButton() {
  return screen.getByRole('button', { name: /mark as paid|confirm payout/i });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── the dead control ────────────────────────────────────────────────────────

describe('AO-02 — Pay Now issues a real request', () => {
  it('renders the payable queue from the payout-request endpoint, not the commission ledger', async () => {
    const fetchMock = mockApi();
    await renderPage();

    const urls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/admin/bookings/payout-requests'))).toBe(true);
    expect(screen.getByText('Acharya Vinod Sharma')).toBeTruthy();
  });

  it('fires POST …/payout-requests/:id/process — the sweep measured zero non-GET requests', async () => {
    const fetchMock = mockApi();
    await renderPage();
    await openConfirm();
    fireEvent.click(confirmButton());

    await waitFor(() => {
      expect(nonGetCalls(fetchMock).length).toBeGreaterThan(0);
    });

    const post = nonGetCalls(fetchMock)[0];
    expect(String(post[0])).toContain('/admin/bookings/payout-requests/pr-1/process');
    expect(((post[1] as RequestInit).method ?? '').toUpperCase()).toBe('POST');
  });

  it("sends action 'complete' with the operator's transfer reference", async () => {
    const fetchMock = mockApi();
    await renderPage();
    await openConfirm('UTR-1234567890');
    fireEvent.click(confirmButton());

    await waitFor(() => expect(nonGetCalls(fetchMock).length).toBeGreaterThan(0));
    const init = nonGetCalls(fetchMock)[0][1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.action).toBe('complete');
    expect(body.reference).toBe('UTR-1234567890');
  });

  it('authenticates the call so the admin preHandler does not 401 it', async () => {
    const fetchMock = mockApi();
    await renderPage();
    await openConfirm();
    fireEvent.click(confirmButton());

    await waitFor(() => expect(nonGetCalls(fetchMock).length).toBeGreaterThan(0));
    const init = nonGetCalls(fetchMock)[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
  });

  it('targets a PayoutRequest id, never a Commission id (that 404s "not found")', async () => {
    const fetchMock = mockApi();
    await renderPage();
    await openConfirm();
    fireEvent.click(confirmButton());

    await waitFor(() => expect(nonGetCalls(fetchMock).length).toBeGreaterThan(0));
    const url = String(nonGetCalls(fetchMock)[0][0]);
    expect(url).toContain('pr-1');
    expect(url).not.toContain('comm-unrequested');
  });
});

// ─── the three states ────────────────────────────────────────────────────────

describe('AO-02 — loading state', () => {
  it('disables the confirm control and shows progress while the transfer is in flight', async () => {
    let release: (r: Response) => void = () => {};
    mockApi({
      process: () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }) as unknown as Response,
    });
    await renderPage();
    await openConfirm();

    const btn = confirmButton();
    fireEvent.click(btn);

    await waitFor(() => {
      expect((confirmButton() as HTMLButtonElement).disabled).toBe(true);
    });
    expect(screen.getByText(/processing|paying/i)).toBeTruthy();

    release(jsonResponse({ ok: true, payout: { id: 'pr-1', status: 'completed' } }));
    await waitFor(() => expect(screen.queryByLabelText(/reference/i)).toBeNull());
  });

  it('a double click cannot fire the transfer twice', async () => {
    const fetchMock = mockApi();
    await renderPage();
    await openConfirm();

    const btn = confirmButton();
    fireEvent.click(btn);
    fireEvent.click(btn);

    await waitFor(() => expect(nonGetCalls(fetchMock).length).toBeGreaterThan(0));
    expect(nonGetCalls(fetchMock)).toHaveLength(1);
  });
});

describe('AO-02 — success state', () => {
  it('confirms the settlement only after the server says completed', async () => {
    mockApi();
    await renderPage();
    await openConfirm('UTR-99887766');
    fireEvent.click(confirmButton());

    const banner = await screen.findByRole('status');
    expect(banner.textContent).toMatch(/Acharya Vinod Sharma/);
    expect(banner.textContent).toMatch(/UTR-99887766/);
  });

  it('drops the settled request out of the pending queue', async () => {
    mockApi({ queues: [[PENDING_REQUEST], []] });
    await renderPage();
    await openConfirm();
    fireEvent.click(confirmButton());

    await screen.findByRole('status');
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /pay now/i })).toBeNull();
    });
  });
});

describe('AO-02 — failure state (never a silent or fake success)', () => {
  it('shows the API error message when the server rejects the payout', async () => {
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
    await openConfirm();
    fireEvent.click(confirmButton());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/already been released/i);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('surfaces a 404 rather than reporting the money as sent', async () => {
    mockApi({
      process: () => jsonResponse({ error: 'Payout request not found.' }, { ok: false, status: 404 }),
    });
    await renderPage();
    await openConfirm();
    fireEvent.click(confirmButton());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/not found/i);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('refuses to claim success when the server returns a non-completed status', async () => {
    mockApi({
      process: () => jsonResponse({ ok: true, payout: { id: 'pr-1', status: 'pending' } }),
    });
    await renderPage();
    await openConfirm();
    fireEvent.click(confirmButton());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/pending/i);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('refuses to claim success when the request is still pending after the refetch', async () => {
    // Server said completed, but the row is still in the pending queue — the
    // exact "reported success, persisted nothing" shape of AO-01.
    mockApi({ queues: [[PENDING_REQUEST], [PENDING_REQUEST]] });
    await renderPage();
    await openConfirm();
    fireEvent.click(confirmButton());

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
    await openConfirm();
    fireEvent.click(confirmButton());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBeTruthy();
    expect((confirmButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it('will not submit without a transfer reference', async () => {
    const fetchMock = mockApi();
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /pay now/i }));
    await screen.findByLabelText(/reference/i);

    fireEvent.click(confirmButton());

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(nonGetCalls(fetchMock)).toHaveLength(0);
  });
});

// ─── no fake controls left behind ────────────────────────────────────────────

describe('AO-02 — the commission ledger carries no pay control', () => {
  it('lists a PENDING commission without offering to pay it', async () => {
    mockApi({ queues: [[]] });
    render(<AdminRevenuePage />);
    await screen.findByText(/BS-20260812-AAAAA/);

    // The money is still shown as owed, but nothing here is settleable: the
    // accrual summary is a balance, and processPayout only takes a
    // PayoutRequest id.
    expect(screen.queryByRole('button', { name: /pay now/i })).toBeNull();
    expect(screen.getByText(/not settleable here/i)).toBeTruthy();
  });

  it('says the payout queue is empty rather than rendering a control that no-ops', async () => {
    mockApi({ queues: [[]] });
    render(<AdminRevenuePage />);
    await screen.findByText(/no payout requests/i);

    expect(screen.queryByRole('button', { name: /pay now/i })).toBeNull();
  });
});
