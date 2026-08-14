/**
 * /admin/revenue — AO-11 + AO-12 (prod sweep 2026-08-12).
 *
 * AO-11  The "Pending Payouts" card read Rs. 3,200 while the payout engine
 *        said Rs. 13,100 was owed. The card summed PENDING `Commission` rows
 *        (getRevenue.pendingPayouts) and is therefore blind to the entire
 *        legacy priest rail — 12 completed bookings worth Rs. 9,900 to a
 *        pandit. An operator settled Rs. 3,200, believed the queue was clear,
 *        and the pandit was never paid: the exact failure that loses supply.
 *        The same card's table was re-derived from `revenue.commissions`,
 *        which the service caps at `take: 50`, so the gap grew with volume.
 *
 *        GET /admin/bookings/payouts/pending already reconciles BOTH rails
 *        (priest sidecar + Commission ledger), excludes anything an open
 *        payout request has already claimed, and reports a `truncated` flag.
 *        That endpoint plus the open request queue is the whole liability.
 *
 * AO-12  The same table rendered `p.providerId` and `p.bookingId` verbatim:
 *        "9e15c3a2-0dc7-4677-ac45-f7dfaec619a6" with an empty booking cell,
 *        on the screen where money is authorised. /admin/commissions returns
 *        providerName, providerRole, bookingNumber and itemName for the same
 *        rows and /admin/commissions renders them correctly — getRevenue's
 *        serializer simply drops them.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' } }),
}));

import AdminRevenuePage from '../app/admin/revenue/page';

// ─── fixtures — shapes copied from live 127.0.0.1:4000 responses ─────────────

const WELLNESS_PROVIDER_ID = '9e15c3a2-0dc7-4677-ac45-f7dfaec619a6';
const ASTRO_PROVIDER_ID = 'ba87a424-e9d2-44f1-92a9-996441b31131';
const BOOKING_UUID = 'f224599e-9af6-4dab-bb65-37a90678283c';

/** GET /admin/revenue — pendingPayouts here is the Commission-only figure. */
const REVENUE = {
  totalCommissions: 2620,
  totalSubscriptions: 0,
  pendingPayouts: 3200,
  commissions: [
    {
      id: 'c-1',
      bookingId: null,
      providerId: WELLNESS_PROVIDER_ID,
      amount: 2800,
      status: 'PENDING',
      createdAt: '2026-08-12T09:00:00.000Z',
    },
    {
      id: 'c-2',
      bookingId: BOOKING_UUID,
      providerId: ASTRO_PROVIDER_ID,
      amount: 400,
      status: 'PENDING',
      createdAt: '2026-08-12T08:00:00.000Z',
    },
  ],
  subscriptionRevenue: [],
};

/** GET /admin/dashboard */
const DASHBOARD = {
  totalUsers: 23,
  usersByRole: {},
  totalRevenue: 58700,
  pendingApprovals: 4,
  activeSubscriptions: 6,
  recentTransactions: [],
};

/** GET /admin/bookings/payouts/pending — both rails, Rs. 13,100. */
const ACCRUAL = {
  ok: true,
  groups: [
    {
      providerId: '6a56eba6-e340-40bc-b236-97440ada4001',
      providerName: 'Demo Pandit',
      role: 'PRIEST',
      bookingsCount: 12,
      totalPayout: 9900,
    },
    {
      providerId: WELLNESS_PROVIDER_ID,
      providerName: 'Demo Wellness',
      role: 'WELLNESS_INSTRUCTOR',
      bookingsCount: 2,
      totalPayout: 2800,
    },
    {
      providerId: ASTRO_PROVIDER_ID,
      providerName: 'Acharya Vinod Sharma',
      role: 'ASTROLOGER',
      bookingsCount: 1,
      totalPayout: 400,
    },
  ],
  scanLimit: 500,
  truncated: false,
  schemaNote: null,
};

/** GET /admin/commissions — the enriched ledger the revenue page never read. */
const COMMISSION_PAGE = {
  data: [
    {
      id: 'c-1',
      bookingId: null,
      storeOrderId: null,
      wellnessEnrollmentId: 'we-1',
      providerId: WELLNESS_PROVIDER_ID,
      providerName: 'Demo Wellness',
      providerRole: 'WELLNESS_INSTRUCTOR',
      bookingNumber: null,
      itemName: 'Morning Hatha Yoga',
      amount: '2800',
      percentage: '0.2',
      grossAmount: '3500',
      platformCut: '700',
      ratePercent: 20,
      status: 'PENDING',
      createdAt: '2026-08-12T09:00:00.000Z',
    },
    {
      id: 'c-2',
      bookingId: BOOKING_UUID,
      storeOrderId: null,
      wellnessEnrollmentId: null,
      providerId: ASTRO_PROVIDER_ID,
      providerName: 'Acharya Vinod Sharma',
      providerRole: 'ASTROLOGER',
      bookingNumber: 'BS-20260812-0266C',
      itemName: 'Kundli consultation',
      amount: '400',
      percentage: '0.2',
      grossAmount: '500',
      platformCut: '100',
      ratePercent: 20,
      status: 'PENDING',
      createdAt: '2026-08-12T08:00:00.000Z',
    },
  ],
  page: 1,
  pageSize: 200,
  total: 2,
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
  accrual?: unknown;
  accrualStatus?: number;
  requests?: unknown[];
  commissions?: unknown;
}

function mockApi(opts: MockOpts = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();

    if (url.includes('/admin/bookings/payouts/pending')) {
      if (opts.accrualStatus && opts.accrualStatus >= 400) {
        return jsonResponse({ error: 'accrual unavailable' }, { ok: false, status: opts.accrualStatus });
      }
      return jsonResponse(opts.accrual ?? ACCRUAL);
    }
    if (url.includes('/admin/bookings/payout-requests')) {
      return jsonResponse({ requests: opts.requests ?? [] });
    }
    if (url.includes('/admin/commissions')) {
      return jsonResponse(opts.commissions ?? COMMISSION_PAGE);
    }
    if (url.includes('/admin/revenue')) return jsonResponse(REVENUE);
    if (url.includes('/admin/dashboard')) return jsonResponse(DASHBOARD);
    throw new Error(`unexpected fetch: ${method} ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function renderPage() {
  render(<AdminRevenuePage />);
  // "Pending Payouts" is both an overview tile and a section heading — anchor
  // on the heading so the query is unambiguous.
  await screen.findByRole('heading', { name: /pending payouts/i });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── AO-11: one number for what we owe ───────────────────────────────────────

describe('AO-11 — Pending Payouts agrees with the payout engine', () => {
  it('reports the reconciled liability, not the Commission-only figure', async () => {
    mockApi();
    await renderPage();

    // 9,900 (priest rail) + 2,800 + 400 = 13,100. The old card said 3,200.
    await waitFor(() => expect(screen.getAllByText(/Rs\. 13,100/).length).toBeGreaterThan(0));
    expect(screen.queryByText('Rs. 3,200')).toBeNull();
  });

  it('adds money already claimed by an open payout request', async () => {
    mockApi({
      requests: [
        {
          id: 'pr-1',
          providerId: ASTRO_PROVIDER_ID,
          providerName: 'Acharya Vinod Sharma',
          providerEmail: 'astro@demo.com',
          role: 'ASTROLOGER',
          amount: '1000',
          method: 'upi',
          status: 'pending',
          reference: null,
          requestedAt: '2026-08-12T10:00:00.000Z',
          processedAt: null,
          linkedCommissionCount: 1,
          linkedCommissionTotal: '1000',
        },
      ],
    });
    await renderPage();

    // The accrual endpoint excludes claimed balance, so the queue is additive.
    await waitFor(() => expect(screen.getAllByText(/Rs\. 14,100/).length).toBeGreaterThan(0));
  });

  it('says the liability is a floor when the accrual scan was truncated', async () => {
    mockApi({ accrual: { ...ACCRUAL, truncated: true, scanLimit: 500 } });
    await renderPage();

    await waitFor(() => expect(screen.getByText(/floor/i)).toBeTruthy());
  });

  it('refuses to show a number at all when the payout engine is unreachable', async () => {
    mockApi({ accrualStatus: 500 });
    await renderPage();

    // Falling back to revenue.pendingPayouts would print a confident Rs. 3,200
    // that understates the real liability 4x — the defect, restated as a
    // fallback. An unknown liability has to read as unknown.
    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
    expect(screen.queryByText('Rs. 3,200')).toBeNull();
  });
});

// ─── AO-12: no raw ids on the screen where money is authorised ───────────────

describe('AO-12 — providers and bookings are named, not hex', () => {
  it('renders provider names in the owed table instead of provider uuids', async () => {
    mockApi();
    await renderPage();

    await waitFor(() => expect(screen.getAllByText('Demo Wellness').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Acharya Vinod Sharma').length).toBeGreaterThan(0);
    expect(screen.queryByText(WELLNESS_PROVIDER_ID)).toBeNull();
    expect(screen.queryByText(ASTRO_PROVIDER_ID)).toBeNull();
  });

  it('covers the priest rail the commission ledger cannot see', async () => {
    mockApi();
    await renderPage();

    await waitFor(() => expect(screen.getAllByText('Demo Pandit').length).toBeGreaterThan(0));
  });

  it('renders a human booking reference in the commissions table, never a bare uuid', async () => {
    mockApi();
    await renderPage();

    await waitFor(() => expect(screen.getByText('BS-20260812-0266C')).toBeTruthy());
    expect(screen.queryByText(BOOKING_UUID)).toBeNull();
    // A wellness commission has no bookingId at all — the cell used to be blank.
    expect(screen.getAllByText('Morning Hatha Yoga').length).toBeGreaterThan(0);
  });

  it('asks the enriched ledger endpoint for those names', async () => {
    const fetchMock = mockApi();
    await renderPage();

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.includes('/admin/commissions'))).toBe(true);
      expect(urls.some((u) => u.includes('/admin/bookings/payouts/pending'))).toBe(true);
    });
  });
});
