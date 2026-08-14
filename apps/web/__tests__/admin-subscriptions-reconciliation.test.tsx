/**
 * /admin/subscriptions — AO-09 (prod sweep 2026-08-12).
 *
 * The screen whose entire job is subscriptions reported "ACTIVE SUBS 0 / TOTAL
 * RECORDS 0 / ACTIVE MRR Rs. 0" and "No subscriptions match the current
 * filters", while /admin/revenue rendered six Subscriptions-by-Role rows and
 * /admin/dashboard returned activeSubscriptions: 6 off the same table. Two
 * admin screens gave incompatible answers for one quantity and the authoritative
 * one was wrong.
 *
 * The cause is server-side and outside this lane: routes/admin-subscriptions.ts
 * returns a literal `const subs: unknown[] = []` with a `note` field the UI
 * never rendered. What the page CAN do — and what the finding asks for — is stop
 * publishing a hard zero it cannot support: take the count from the same source
 * /admin/dashboard and /admin/revenue use, render the real per-role breakdown,
 * and say plainly that per-subscription detail is missing rather than showing
 * "none exist".
 *
 * Also fixed here: the third tile was labelled "ACTIVE MRR". The underlying
 * figure is the sum of `MarketplaceSubscription.amount` over each subscription's
 * own term — the live ENTERPRISE row is Rs 5,000 for a YEAR — so presenting it
 * as monthly recurring revenue overstates MRR 12x for annual plans.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' } }),
}));

vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AdminSubscriptionsPage from '../app/admin/subscriptions/page';

// ─── fixtures ────────────────────────────────────────────────────────────────

/** GET /admin/subscriptions — the live stub: zero rows, plus its own note. */
const STUB_SUBSCRIPTIONS = {
  status: 'all',
  limit: 100,
  subscriptions: [],
  total: 0,
  active: 0,
  activeMrr: 0,
  plans: [],
  note: 'Marketplace subscriptions schema not yet shipped. Tracking baseline FREE-tier role counts.',
};

/** GET /admin/dashboard — the count both other admin screens display. */
const DASHBOARD = {
  totalUsers: 23,
  usersByRole: {},
  totalRevenue: 58700,
  pendingApprovals: 4,
  activeSubscriptions: 7,
  recentTransactions: [],
};

/** GET /admin/revenue — the same ACTIVE rows, grouped by plan+role. */
const REVENUE = {
  totalCommissions: 2620,
  totalSubscriptions: 5000,
  pendingPayouts: 3200,
  commissions: [],
  subscriptionRevenue: [
    { plan: 'ENTERPRISE', role: 'DEVOTEE', count: 1, totalAmount: 5000 },
    { plan: 'FREE', role: 'PANDIT', count: 1, totalAmount: 0 },
    { plan: 'FREE', role: 'TEMPLE_MANAGER', count: 1, totalAmount: 0 },
  ],
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
  subscriptions?: unknown;
  dashboard?: unknown;
  revenue?: unknown;
  dashboardStatus?: number;
}

function mockApi(opts: MockOpts = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.includes('/admin/subscriptions')) {
      return jsonResponse(opts.subscriptions ?? STUB_SUBSCRIPTIONS);
    }
    if (url.includes('/admin/dashboard')) {
      if (opts.dashboardStatus && opts.dashboardStatus >= 400) {
        return jsonResponse({ error: 'dashboard failed' }, { ok: false, status: opts.dashboardStatus });
      }
      return jsonResponse(opts.dashboard ?? DASHBOARD);
    }
    if (url.includes('/admin/revenue')) return jsonResponse(opts.revenue ?? REVENUE);
    throw new Error(`unexpected fetch: ${method} ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function renderPage() {
  render(<AdminSubscriptionsPage />);
  await screen.findByRole('heading', { name: /marketplace subscriptions/i });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── one quantity, one answer ────────────────────────────────────────────────

describe('AO-09 — /admin/subscriptions agrees with /admin/revenue and /admin/dashboard', () => {
  it('shows the real active count instead of a hardcoded zero', async () => {
    mockApi();
    await renderPage();

    await waitFor(() => expect(screen.getByText('7')).toBeTruthy());
  });

  it('renders the per-role breakdown the revenue screen already shows', async () => {
    mockApi();
    await renderPage();

    await waitFor(() => expect(screen.getAllByText(/ENTERPRISE/i).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/temple mgr|temple_manager/i).length).toBeGreaterThan(0);
  });

  it('says the per-subscription detail is missing rather than "no subscriptions"', async () => {
    mockApi();
    await renderPage();

    await waitFor(() =>
      expect(screen.getByText(/per-subscription detail/i)).toBeTruthy(),
    );
    expect(screen.queryByText(/no subscriptions match the current filters/i)).toBeNull();
  });

  it('surfaces the endpoint’s own note instead of swallowing it', async () => {
    mockApi();
    await renderPage();

    await waitFor(() =>
      expect(screen.getByText(/schema not yet shipped/i)).toBeTruthy(),
    );
  });
});

// ─── the money label has to match the money ──────────────────────────────────

describe('AO-09 — the subscription value tile is not labelled MRR', () => {
  it('does not call a mixed monthly/annual sum "MRR"', async () => {
    mockApi();
    await renderPage();

    await waitFor(() => expect(screen.getAllByText(/5,000/).length).toBeGreaterThan(0));
    expect(screen.queryByText(/mrr/i)).toBeNull();
  });
});

// ─── an unknown count is not zero ────────────────────────────────────────────

describe('AO-09 — a failed count reads as unknown, never as zero', () => {
  it('shows no count at all when the dashboard call fails', async () => {
    mockApi({ dashboardStatus: 500 });
    await renderPage();

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
