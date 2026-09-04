/**
 * DI-08 (P2) — two admin screens reported figures 5.8x apart, both labelled
 * "commissions".
 *
 * MEASURED, not assumed. The recorded pair was /admin/revenue "Commissions
 * Earned" = 1142.91 against an /admin/commissions ledger summing to 6580.
 * 6580 / 1142.91 = 5.7572. Those two numbers are not the same quantity:
 *
 *   Commission.amount  IS the PROVIDER's earning  (apps/api/src/lib/commission-math.ts)
 *   platform take      = amount * p / (1 - p)
 *   gross              = amount / (1 - p)
 *
 * At the documented uniform 20% take the ratio of provider-earnings to
 * platform-take is exactly 0.8 / 0.2 = 4.0000, so the LABELS explain the
 * direction of the gap. (They do not explain its size — 5.7572 implies a
 * blended effective take of 14.80%, which is a data question that needs a
 * live `SELECT percentage, count(*) FROM commissions GROUP BY percentage`
 * and is recorded as a lead, not asserted here.)
 *
 * The API side was already fixed: admin.service.ts sets
 * `totalCommissions = platformTakeInr` and admin.ts returns
 * `totals.{providerEarningsInr, platformTakeInr, grossInr}`, all routed
 * through commission-math.ts. This file pins the WEB side, which still
 * printed one of them as "Commissions Earned" and the other as
 * "Total earned (paid)".
 *
 * Every assertion below runs against RENDERED text, so a label that is
 * changed in a comment but not in the markup cannot pass.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' } }),
}));

import AdminRevenuePage from '../app/admin/revenue/page';
import { CommissionsPanel } from '../components/CommissionsPanel';

// ─── fixtures ───────────────────────────────────────────────────────────────

/**
 * The live pair, to scale. Provider earnings 6,580 at a blended 14.8% take
 * gives a platform take of 1,142.91 and a gross of 7,722.91 — the exact
 * numbers the finding recorded, so the ratio under test is the real one.
 */
const REVENUE = {
  totalCommissions: 1142.91,
  totalSubscriptions: 0,
  pendingPayouts: 0,
  commissions: [],
  subscriptionRevenue: [],
};

const DASHBOARD = {
  totalUsers: 3,
  usersByRole: {},
  totalRevenue: 7722.91,
  pendingApprovals: 0,
  activeSubscriptions: 0,
  recentTransactions: [],
};

const ACCRUAL = { ok: true, groups: [], scanLimit: 500, truncated: false, schemaNote: null };

/** Two 20% rows: provider 4,000 + 800 = 4,800; platform 1,000 + 200 = 1,200. */
const LEDGER_ROWS = [
  {
    id: 'c-1',
    bookingId: 'b-1',
    providerId: 'prov-1',
    providerName: 'Pandit Sharma',
    providerRole: 'PANDIT',
    bookingNumber: 'BS-20260812-AAAAA',
    itemName: 'Satyanarayan Puja',
    amount: '4000.00',
    percentage: '0.2',
    grossAmount: '5000.00',
    platformCut: '1000.00',
    ratePercent: 20,
    status: 'PAID',
    payoutReference: 'PYT-9001',
    processedAt: '2026-08-12T09:00:00.000Z',
    createdAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'c-2',
    bookingId: 'b-2',
    providerId: 'prov-1',
    providerName: 'Pandit Sharma',
    providerRole: 'PANDIT',
    bookingNumber: 'BS-20260812-BBBBB',
    itemName: 'Griha Pravesh',
    amount: '800.00',
    percentage: '0.2',
    grossAmount: '1000.00',
    platformCut: '200.00',
    ratePercent: 20,
    status: 'PENDING',
    payoutReference: null,
    processedAt: null,
    createdAt: '2026-08-02T00:00:00.000Z',
  },
];

const COMMISSION_PAGE = {
  data: LEDGER_ROWS,
  page: 1,
  pageSize: 100,
  total: 2,
  totals: { providerEarningsInr: 4800, platformTakeInr: 1200, grossInr: 6000 },
};

function jsonResponse(body: unknown) {
  const text = JSON.stringify(body);
  return {
    ok: true,
    status: 200,
    text: async () => text,
    json: async () => JSON.parse(text),
  } as unknown as Response;
}

function mockApi() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/admin/bookings/payouts/pending')) return jsonResponse(ACCRUAL);
    if (url.includes('/admin/bookings/payout-requests')) return jsonResponse({ requests: [] });
    if (url.includes('/admin/commissions')) return jsonResponse(COMMISSION_PAGE);
    if (url.includes('/payouts/commissions')) return jsonResponse(COMMISSION_PAGE);
    if (url.includes('/admin/revenue')) return jsonResponse(REVENUE);
    if (url.includes('/admin/dashboard')) return jsonResponse(DASHBOARD);
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// ───────────────────────────────────────────────────────────────────────────
// The premise — the two figures really are different quantities
// ───────────────────────────────────────────────────────────────────────────

describe('DI-08 — the arithmetic the two screens disagreed about', () => {
  it('provider earnings over platform take is 4.0000 at the uniform 20% take', () => {
    const providerEarnings = 4800;
    const platformTake = 1200;
    expect(providerEarnings / platformTake).toBeCloseTo(4, 4);
    expect(providerEarnings + platformTake).toBe(6000);
  });

  it('the recorded 5.7572 pair is a blended 14.80% take, not a 20% one', () => {
    // ratio = (1 - p) / p  =>  p = 1 / (1 + ratio)
    const ratio = 6580 / 1142.91;
    expect(ratio).toBeCloseTo(5.7572, 3);
    const impliedTake = 1 / (1 + ratio);
    expect(impliedTake).toBeCloseTo(0.148, 3);
    // Which is NOT 20%: the labels explain the gap's direction, never its size.
    expect(impliedTake).not.toBeCloseTo(0.2, 2);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// /admin/revenue
// ───────────────────────────────────────────────────────────────────────────

describe('DI-08 — /admin/revenue names the platform take as the platform take', () => {
  it('does not label a money card with a bare "Commissions" word', async () => {
    mockApi();
    const { container } = render(<AdminRevenuePage />);
    await screen.findByText('Total Revenue');

    const text = container.textContent ?? '';
    // "Commissions Earned" reads as gross commission volume — the ledger sum —
    // when the number under it is the platform's own cut of that volume.
    expect(text).not.toContain('Commissions Earned');
    expect(text).not.toMatch(/\bTotal Commissions\b/);
  });

  it('labels the card so the figure under it can only be read one way', async () => {
    mockApi();
    const { container } = render(<AdminRevenuePage />);
    await screen.findByText('Total Revenue');

    const text = container.textContent ?? '';
    expect(text).toMatch(/Platform take/i);
    // And the value it carries is still getRevenue().totalCommissions, which
    // admin.service.ts sets to platformTakeInr.
    await waitFor(() => {
      expect(container.textContent ?? '').toContain('1,142.91');
    });
  });
});

// ───────────────────────────────────────────────────────────────────────────
// /admin/commissions and the provider-facing panel
// ───────────────────────────────────────────────────────────────────────────

describe('DI-08 — CommissionsPanel says whose money each total is', () => {
  it('the provider view no longer calls its figure a bare "Total earned"', async () => {
    mockApi();
    const { container } = render(<CommissionsPanel mode="me" />);
    await screen.findByText('Satyanarayan Puja');

    const text = container.textContent ?? '';
    expect(text).not.toContain('Total earned (paid)');
    expect(text).toMatch(/Provider earnings \(paid/i);
  });

  it('the admin view shows a total at all, instead of an unsummed ledger', async () => {
    mockApi();
    const { container } = render(<CommissionsPanel mode="admin" />);
    await screen.findByText('Satyanarayan Puja');

    const text = container.textContent ?? '';
    // The screen an admin compares against /admin/revenue had NO total on it:
    // the only way to get 6,580 was to add the column up by eye, which is how
    // it came to be read as the same quantity as the 1,142.91 next door.
    expect(text).toMatch(/Platform take/i);
    expect(text).toMatch(/Gross/i);
    expect(text).toMatch(/Provider earnings/i);
  });

  it('the three page totals reconcile: provider + platform = gross', async () => {
    mockApi();
    const { container } = render(<CommissionsPanel mode="admin" />);
    await screen.findByText('Satyanarayan Puja');

    const text = container.textContent ?? '';
    // 4,800 provider + 1,200 platform = 6,000 gross, all three on screen.
    expect(text).toContain('4,800');
    expect(text).toContain('1,200');
    expect(text).toContain('6,000');
  });

  it('prints no total where the API refused to derive one', async () => {
    /**
     * Found while fixing this finding, and it is the finding's own defect
     * pointed the other way.
     *
     * `GET /payouts/commissions` (apps/api/src/routes/payout-requests.ts:145)
     * emits `grossAmount` / `platformCut` as NULL for every row written before
     * COMMISSION_CONVENTION_CUTOVER — the ledger is deliberately mixed, the
     * owner declined a backfill, and pre-cutover rows carry the PLATFORM's cut
     * in `amount` rather than the provider's. The route's own comment says a
     * blank cell is honest and a wrong rupee figure is not.
     *
     * A total that coerces those nulls to 0 turns that blank cell into a
     * confident "Gross ₹800" against a real ₹1,000 — a lying number introduced
     * by the fix for lying numbers. When any loaded row is non-derivable the
     * derived totals must abstain, and say why.
     */
    const NON_DERIVABLE = {
      ...LEDGER_ROWS[0],
      id: 'c-old',
      itemName: 'Legacy puja',
      grossAmount: null,
      platformCut: null,
      ratePercent: null,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/commissions')) {
        return jsonResponse({
          data: [LEDGER_ROWS[1], NON_DERIVABLE],
          page: 1,
          pageSize: 100,
          total: 2,
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<CommissionsPanel mode="me" />);
    await screen.findByText('Legacy puja');

    // Scoped to the CARDS, not the whole container: the derivable row's own
    // ₹200 / ₹1,000 belong in its table cells and must stay there. It is the
    // page TOTAL that has to abstain, and a container-wide string ban would
    // have flagged the correct per-row rendering as the defect.
    const cardValue = (label: string): string => {
      const card = screen.getByText(label).closest('div')?.parentElement;
      expect(card, `no card found for ${label}`).toBeTruthy();
      return card!.textContent ?? '';
    };

    expect(cardValue('Gross booking value (this page)')).toContain('—');
    expect(cardValue('Gross booking value (this page)')).not.toContain('₹1,000');
    expect(cardValue('Platform take (this page)')).toContain('—');
    expect(cardValue('Platform take (this page)')).not.toContain('₹200');
    expect(container.textContent ?? '').toMatch(/1 of 2 rows/i);

    // Provider earnings stays: `amount` is authoritative on every row, which is
    // exactly why the route emits it unconditionally.
    expect(cardValue('Provider earnings (this page)')).toContain('4,800');
  });

  it('says the totals are page-scoped whenever the ledger is longer than the page', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/admin/commissions')) {
        return jsonResponse({ ...COMMISSION_PAGE, total: 500 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<CommissionsPanel mode="admin" />);
    await screen.findByText('Satyanarayan Puja');

    const text = container.textContent ?? '';
    // A page-scoped sum presented as a global one is the same defect in a
    // different costume, so the caveat has to travel with the numbers.
    expect(text).toMatch(/this page/i);
    expect(text).toContain('of 500');
  });
});
