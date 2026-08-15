import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  selectTemplePayouts,
  selectTempleBookings,
  selectAstrologerEarnings,
  selectProviderCommissions,
  selectPayoutBalance,
} from '../api-contracts';

/**
 * PAR-22, the build half.
 *
 * The finding has two parts. The first — the home "search bar" that was a
 * disguised tab link — was closed earlier and is pinned by
 * home-search-honesty.par22.test.ts. This file covers the second: four
 * provider-money surfaces that exist on the web and had NO app screen at all.
 *
 *   web /temple-portal/payouts      -> app/(temple)/payouts.tsx
 *   web /temple-portal/bookings     -> app/(temple)/bookings.tsx
 *   web /astrologer-portal/earnings -> app/(astrologer)/earnings.tsx
 *   web /wellness-portal/earnings   -> app/(wellness)/earnings.tsx
 *
 * Each fixture below is transcribed from the reply object in the route handler,
 * cited by file:line, INCLUDING the Decimal-as-string encoding that has caused
 * this class of bug repeatedly (`amount: r.amount.toString()`).
 *
 * The assertions that matter most are the failure ones. Every one of these
 * endpoints answers 403 with `{error: '...'}` to a caller without the role, and
 * a selector that shrugs and returns an empty ledger makes the screen state
 * "you have been paid ₹0" to a provider who was merely refused. That is a false
 * financial claim, and it is the exact shape of the PAR-02..PAR-07 family.
 */

// ─── temple payouts ──────────────────────────────────────────────────────────
// apps/api/src/routes/temple-portal.ts:360-372
const TEMPLE_PAYOUTS = {
  payouts: [
    {
      id: 'e5a1b2c3-0000-4000-8000-000000000001',
      bookingId: '11111111-2222-4333-8444-555555555555',
      amount: '2310.00',
      status: 'completed',
      reference: 'TPO-2026-0007',
      processedAt: '2026-08-12T09:15:00.000Z',
      createdAt: '2026-08-11T09:15:00.000Z',
    },
    {
      id: 'e5a1b2c3-0000-4000-8000-000000000002',
      bookingId: null,
      amount: '550.50',
      status: 'pending',
      reference: null,
      processedAt: null,
      createdAt: '2026-08-13T09:15:00.000Z',
    },
  ],
  total: 2,
  pendingInr: 550.5,
  paidInr: 2310,
};

describe('PAR-22 selectTemplePayouts', () => {
  it('parses the Decimal STRING amount into a number', () => {
    const vm = selectTemplePayouts(TEMPLE_PAYOUTS)!;
    expect(vm.rows[0]!.amountInr).toBe(2310);
    expect(vm.rows[1]!.amountInr).toBe(550.5);
  });

  it('takes pendingInr/paidInr from the server, not a local re-sum', () => {
    const vm = selectTemplePayouts(TEMPLE_PAYOUTS)!;
    expect(vm.pendingInr).toBe(550.5);
    expect(vm.paidInr).toBe(2310);
  });

  it('returns null for the 403 body instead of an empty ledger', () => {
    // Verbatim: temple-portal.ts:348.
    expect(selectTemplePayouts({ error: 'TEMPLE_MANAGER role required' })).toBeNull();
  });

  it('keeps the empty-but-authorised case distinguishable from the refusal', () => {
    // temple-portal.ts:352 — a manager with no matched temple gets a real,
    // empty ledger. That is genuinely "no payouts", and must NOT be null.
    const vm = selectTemplePayouts({ payouts: [], total: 0, pendingInr: 0, paidInr: 0 });
    expect(vm).not.toBeNull();
    expect(vm!.rows).toHaveLength(0);
  });

  it('drops a row with no id rather than rendering a keyless entry', () => {
    const vm = selectTemplePayouts({ payouts: [{ amount: '10' }], total: 1 });
    expect(vm!.rows).toHaveLength(0);
  });
});

// ─── temple bookings ─────────────────────────────────────────────────────────
// apps/api/src/routes/temple-portal.ts:624-641
const TEMPLE_BOOKINGS = {
  bookings: [
    {
      id: 'bb111111-0000-4000-8000-000000000001',
      bookingNumber: 'BS-20260815-A1B2C',
      status: 'confirmed',
      scheduledDate: '2026-08-20T00:00:00.000Z',
      scheduledTimeSlot: '06:00',
      priceAmount: '1501.00',
      pujaName: 'Satyanarayan Katha',
      pujaCategory: 'vishnu',
      priestName: 'Pandit Ramesh Sharma',
      devoteeName: 'Arjun Sharma',
      devoteeEmail: 'arjun@example.com',
      dispatchTier: 'scheduled',
      assignedVia: 'self',
      createdAt: '2026-08-14T10:00:00.000Z',
    },
  ],
  total: 1,
};

describe('PAR-22 selectTempleBookings', () => {
  it('reads `priceAmount`, which is what THIS route sends', () => {
    // The dashboard's recentBookings send `priceInr`; this route sends
    // `priceAmount`. Reading the dashboard's name here is the PAR-02 failure —
    // a successful request rendering a blank price on every row.
    expect(Object.keys(TEMPLE_BOOKINGS.bookings[0]!)).toContain('priceAmount');
    expect(Object.keys(TEMPLE_BOOKINGS.bookings[0]!)).not.toContain('priceInr');
    expect(selectTempleBookings(TEMPLE_BOOKINGS)![0]!.priceInr).toBe(1501);
  });

  it('reads `devoteeName`, not the dashboard`s `devotee`', () => {
    expect(selectTempleBookings(TEMPLE_BOOKINGS)![0]!.devoteeName).toBe('Arjun Sharma');
  });

  it('returns null on the 403 body rather than "no one has booked"', () => {
    expect(selectTempleBookings({ error: 'TEMPLE_MANAGER role required' })).toBeNull();
  });

  it('leaves an unparseable price null rather than calling it zero', () => {
    const rows = selectTempleBookings({
      bookings: [{ id: 'x', priceAmount: null, status: 'confirmed' }],
    })!;
    expect(rows[0]!.priceInr).toBeNull();
  });
});

// ─── astrologer earnings ─────────────────────────────────────────────────────
// apps/api/src/routes/astrologer-portal.ts:417-426 + loadAstrologerLedger:113-127
const ASTROLOGER_EARNINGS = {
  data: [
    {
      id: 'c1111111-0000-4000-8000-000000000001',
      bookingId: 'd1111111-0000-4000-8000-000000000001',
      status: 'PAID',
      createdAt: '2026-08-12T07:00:00.000Z',
      grossAmountInr: 1000,
      platformCutInr: 200,
      earningsInr: 800,
    },
    {
      id: 'c1111111-0000-4000-8000-000000000002',
      bookingId: null,
      status: 'REVERSED',
      createdAt: '2026-08-13T07:00:00.000Z',
      grossAmountInr: 500,
      platformCutInr: 100,
      earningsInr: 400,
    },
  ],
  summary: {
    totalEarningsInr: 800,
    pendingInr: 0,
    paidInr: 800,
    astrologerShare: 0.8,
  },
};

describe('PAR-22 selectAstrologerEarnings', () => {
  it('separates the astrologer earning from the price the devotee paid', () => {
    const vm = selectAstrologerEarnings(ASTROLOGER_EARNINGS)!;
    expect(vm.rows[0]!.earningsInr).toBe(800);
    expect(vm.rows[0]!.grossInr).toBe(1000);
    expect(vm.rows[0]!.platformCutInr).toBe(200);
  });

  it('carries the summary the server computed, which excludes REVERSED', () => {
    const vm = selectAstrologerEarnings(ASTROLOGER_EARNINGS)!;
    // 800 + 400 = 1200 if the rows were summed locally. The server's 800 is the
    // right answer: the reversed 400 is a refunded consultation (AW-06).
    expect(vm.totalEarningsInr).toBe(800);
    expect(vm.rows).toHaveLength(2);
  });

  it('reads astrologerShare as the FRACTION the route sends', () => {
    expect(selectAstrologerEarnings(ASTROLOGER_EARNINGS)!.astrologerShare).toBe(0.8);
  });

  it('returns null for the 403 body', () => {
    expect(selectAstrologerEarnings({ error: 'ASTROLOGER role required' })).toBeNull();
  });
});

// ─── unified provider ledger + balance ───────────────────────────────────────
// apps/api/src/routes/payout-requests.ts:139-161 and :44-51
const PROVIDER_COMMISSIONS = {
  data: [
    {
      id: 'f1111111-0000-4000-8000-000000000001',
      bookingId: 'a1111111-0000-4000-8000-000000000001',
      payoutRequestId: null,
      providerId: 'u1111111-0000-4000-8000-000000000001',
      amount: '960.00',
      grossAmount: '1200.00',
      platformCut: '240.00',
      ratePercent: 20,
      status: 'PENDING',
      createdAt: '2026-08-12T07:00:00.000Z',
    },
    {
      // Written BEFORE COMMISSION_CONVENTION_CUTOVER — derived fields are null
      // by design, because that row's `amount` may carry either convention.
      id: 'f1111111-0000-4000-8000-000000000002',
      bookingId: null,
      payoutRequestId: null,
      providerId: 'u1111111-0000-4000-8000-000000000001',
      amount: '300.00',
      grossAmount: null,
      platformCut: null,
      ratePercent: null,
      status: 'PAID',
      createdAt: '2026-07-30T07:00:00.000Z',
    },
  ],
  total: 2,
  page: 1,
  pageSize: 100,
};

describe('PAR-22 selectProviderCommissions', () => {
  it('always surfaces `amount` — it is what actually gets paid out', () => {
    const vm = selectProviderCommissions(PROVIDER_COMMISSIONS)!;
    expect(vm.rows[0]!.amountInr).toBe(960);
    expect(vm.rows[1]!.amountInr).toBe(300);
  });

  it('preserves the deliberate NULLs on pre-cutover rows', () => {
    // The server nulls these on purpose: the ledger is mixed and deriving a
    // gross from a pre-cutover row states a confidently wrong rupee figure.
    // Coercing them to 0 here would put "Price ₹0" on a real earning.
    const vm = selectProviderCommissions(PROVIDER_COMMISSIONS)!;
    expect(vm.rows[1]!.grossInr).toBeNull();
    expect(vm.rows[1]!.platformCutInr).toBeNull();
    expect(vm.rows[1]!.ratePercent).toBeNull();
  });

  it('returns null for the 403 body', () => {
    expect(selectProviderCommissions({ error: 'Provider role required' })).toBeNull();
  });
});

describe('PAR-22 selectPayoutBalance', () => {
  const BALANCE = {
    availableInr: 1260,
    pendingInr: 0,
    paidOutInr: 4200,
    kycVerified: false,
    kycOnFile: true,
  };

  it('reads all three figures plus both KYC gates', () => {
    const vm = selectPayoutBalance(BALANCE)!;
    expect(vm.availableInr).toBe(1260);
    expect(vm.pendingInr).toBe(0);
    expect(vm.paidOutInr).toBe(4200);
    expect(vm.kycVerified).toBe(false);
    expect(vm.kycOnFile).toBe(true);
  });

  it('treats a genuine zero balance as data, not as a missing response', () => {
    const vm = selectPayoutBalance({ ...BALANCE, availableInr: 0 });
    expect(vm).not.toBeNull();
    expect(vm!.availableInr).toBe(0);
  });

  it('returns null for the 403 body rather than a ₹0 balance', () => {
    expect(selectPayoutBalance({ error: 'Provider role required' })).toBeNull();
  });
});

// ─── the screens themselves exist and are reachable ──────────────────────────

const APP = path.resolve(__dirname, '../../app');

/** Source with comments stripped — a guard must match code, not its own prose. */
function code(rel: string): string {
  return readFileSync(path.join(APP, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('PAR-22 — the four missing screens exist', () => {
  const screens: Array<[string, string]> = [
    ['temple payouts', '(temple)/payouts.tsx'],
    ['temple bookings', '(temple)/bookings.tsx'],
    ['astrologer earnings', '(astrologer)/earnings.tsx'],
    ['wellness earnings', '(wellness)/earnings.tsx'],
  ];

  for (const [name, rel] of screens) {
    it(`${name} has a screen file`, () => {
      expect(existsSync(path.join(APP, rel))).toBe(true);
    });
  }

  it('astrologer earnings is a tab, not an orphan route', () => {
    expect(code('(astrologer)/_layout.tsx')).toMatch(/name="earnings"/);
  });

  it('wellness earnings is a tab, not an orphan route', () => {
    expect(code('(wellness)/_layout.tsx')).toMatch(/name="earnings"/);
  });

  it('temple bookings and payouts are tabs', () => {
    const layout = code('(temple)/_layout.tsx');
    expect(layout).toMatch(/name="bookings"/);
    expect(layout).toMatch(/name="payouts"/);
  });

  it('nothing was made unreachable to make room on the temple tab bar', () => {
    // `subscription` moved off the bar. A registered-but-hidden route with no
    // link to it is the same as a deleted screen, so the dashboard carries one.
    const layout = code('(temple)/_layout.tsx');
    const hidden = /name="subscription"[^>]*href:\s*null/.test(layout);
    if (hidden) {
      expect(code('(temple)/dashboard.tsx')).toMatch(/\(temple\)\/subscription/);
    }
  });

  it('the temple screens call the SCOPED portal routes, never the public ones', () => {
    // PAR-09 was exactly this: a manager shown every temple's data as their own.
    expect(code('(temple)/payouts.tsx')).toMatch(/useTemplePortalPayouts/);
    expect(code('(temple)/bookings.tsx')).toMatch(/useTemplePortalBookings/);
  });

  it('no earnings screen renders a hardcoded rupee figure', () => {
    // PAR-10 deleted "Earnings (mo) ₹54,200" — a string literal with no
    // endpoint behind it — from the wellness dashboard. Not again.
    for (const rel of ['(astrologer)/earnings.tsx', '(wellness)/earnings.tsx', '(temple)/payouts.tsx']) {
      expect(code(rel), rel).not.toMatch(/['"`]\s*₹\s*[\d,]+/);
    }
  });
});
