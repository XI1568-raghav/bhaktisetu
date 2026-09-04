import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

/**
 * DI-08 (F369) — the half the label fix did not close: SCOPE.
 *
 * The finding recorded /admin/revenue and /admin/commissions reporting figures
 * 5.8x apart, both under the word "commissions". Two things were wrong and only
 * one of them was a label.
 *
 *   QUANTITY  — fixed earlier. /admin/revenue shows the PLATFORM's take;
 *               Commission.amount is the PROVIDER's earning. Both screens now
 *               name which half they mean.
 *
 *   SCOPE     — still open. /admin/revenue's tile sums the WHOLE commission
 *               table (admin.service.getRevenue groups every PAID row by rate).
 *               CommissionsPanel summed only the ≤100 rows it had loaded. So an
 *               admin comparing "Platform take" on one screen with "Platform
 *               take" on the other still read two different numbers — the
 *               original complaint wearing better words.
 *
 * `GET /admin/commissions` has returned ledger-wide `totals` since the API side
 * of DI-08 landed (routes/admin.ts, `totalsByRate` grouped by `percentage` and
 * reduced through lib/commission-math.ts, over the SAME filter as `total`).
 * `unwrapPage` in lib/commission-api.ts threw the object away, so no consumer
 * could ever have used it.
 *
 * The fixture below makes the two scopes DIFFERENT on purpose: two rows on
 * screen out of 500 in the ledger. Page-scoped totals give ₹1,200; ledger-wide
 * gives ₹1,42,000. Against the pre-fix client the panel prints ₹1,200 and calls
 * it "Platform take (this page)"; the assertions here require the ledger figure
 * and the ledger label.
 */

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' } }),
}));

import { CommissionsPanel } from '../components/CommissionsPanel';

/** Two 20% rows on screen: provider 4,800 / platform 1,200 / gross 6,000. */
const PAGE_ROWS = [
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

/**
 * The whole ledger: 500 rows, of which the two above are page 1. Deliberately
 * NOT a multiple of the page sum, so a client that quietly kept summing the
 * page cannot coincidentally produce the right number.
 */
const LEDGER_TOTALS = {
  providerEarningsInr: 568000,
  platformTakeInr: 142000,
  grossInr: 710000,
};

const PAGE_SCOPED = { platformTake: '1,200', providerEarnings: '4,800', gross: '6,000' };
const LEDGER_SCOPED = { platformTake: '1,42,000', providerEarnings: '5,68,000', gross: '7,10,000' };

function jsonResponse(body: unknown) {
  const text = JSON.stringify(body);
  return {
    ok: true,
    status: 200,
    text: async () => text,
    json: async () => JSON.parse(text),
  } as unknown as Response;
}

function mockApi(opts: { totals?: unknown } = {}) {
  const payload: Record<string, unknown> = {
    data: PAGE_ROWS,
    page: 1,
    pageSize: 100,
    total: 500,
  };
  if ('totals' in opts) payload.totals = opts.totals;
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/admin/commissions')) return jsonResponse(payload);
    if (url.includes('/payouts/commissions')) return jsonResponse(payload);
    throw new Error(`unexpected fetch: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function renderPanel() {
  const { container } = render(<CommissionsPanel mode="admin" title="All commissions" />);
  await screen.findByText(/Provider earnings/i, undefined, { timeout: 15_000 });
  return container;
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DI-08 — the fixture makes the two scopes distinguishable', () => {
  it('the page sum and the ledger total are different numbers', () => {
    const pagePlatform = PAGE_ROWS.reduce((s, r) => s + Number(r.platformCut), 0);
    expect(pagePlatform).toBe(1200);
    expect(LEDGER_TOTALS.platformTakeInr).toBe(142000);
    expect(LEDGER_TOTALS.platformTakeInr).not.toBe(pagePlatform);
    // ...and the ledger totals themselves reconcile at the uniform 20/80 split,
    // so the assertions below are not pinned to an impossible ledger.
    expect(LEDGER_TOTALS.providerEarningsInr + LEDGER_TOTALS.platformTakeInr).toBe(
      LEDGER_TOTALS.grossInr,
    );
    expect(LEDGER_TOTALS.platformTakeInr / LEDGER_TOTALS.grossInr).toBeCloseTo(0.2, 6);
  });
});

describe('DI-08 — /admin/commissions reports the whole ledger when the API sends it', () => {
  it('prints the ledger-wide platform take, not the sum of the rows on screen', async () => {
    mockApi({ totals: LEDGER_TOTALS });
    const container = await renderPanel();

    await waitFor(() => {
      expect(container.textContent ?? '').toContain(LEDGER_SCOPED.platformTake);
    });
    const text = container.textContent ?? '';
    expect(text).toContain(LEDGER_SCOPED.providerEarnings);
    expect(text).toContain(LEDGER_SCOPED.gross);
    // The page-scoped figures must be GONE, not merely joined — two platform-take
    // numbers on one screen is the confusion this finding is about.
    expect(text).not.toContain(PAGE_SCOPED.platformTake);
    expect(text).not.toContain(PAGE_SCOPED.gross);
  });

  it('labels the cards with the scope they actually cover', async () => {
    mockApi({ totals: LEDGER_TOTALS });
    const container = await renderPanel();

    const text = container.textContent ?? '';
    expect(text).toMatch(/Platform take \(whole ledger\)/i);
    expect(text).toMatch(/Provider earnings \(whole ledger\)/i);
    expect(text).toMatch(/Gross booking value \(whole ledger\)/i);
    expect(text).not.toMatch(/Platform take \(this page\)/i);
  });

  it('says the totals now line up with /admin/revenue instead of warning that they cannot', async () => {
    mockApi({ totals: LEDGER_TOTALS });
    const container = await renderPanel();

    const text = container.textContent ?? '';
    // The old caveat told the operator the two screens "only meet when one page
    // holds every row". With ledger-wide totals that is no longer true, and
    // leaving it up would tell them to distrust a figure that is now correct.
    expect(text).not.toMatch(/only meet when one page holds every row/i);
    expect(text).toMatch(/all 500 records/i);
  });
});

describe('DI-08 — the page-scoped fallback survives for the provider route', () => {
  it('falls back to summing the page when the API sends no totals', async () => {
    // GET /payouts/commissions computes no totals — a provider's own earnings
    // screen must still show something rather than blanking.
    mockApi();
    const container = await renderPanel();

    await waitFor(() => {
      expect(container.textContent ?? '').toContain(PAGE_SCOPED.platformTake);
    });
    const text = container.textContent ?? '';
    expect(text).toMatch(/Platform take \(this page\)/i);
    expect(text).toMatch(/only meet when one page holds every row/i);
  });

  it('ignores a malformed totals object rather than rendering NaN', async () => {
    mockApi({ totals: { providerEarningsInr: 'not-a-number', platformTakeInr: null } });
    const container = await renderPanel();

    const text = container.textContent ?? '';
    expect(text).not.toMatch(/NaN/);
    expect(text).toMatch(/Platform take \(this page\)/i);
  });
});
