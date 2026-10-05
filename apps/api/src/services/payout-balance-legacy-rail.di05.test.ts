import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    commission: { aggregate: vi.fn(), findMany: vi.fn() },
    priest: { findUnique: vi.fn() },
    priestPayout: { findMany: vi.fn() },
    wellnessEnrollment: { findMany: vi.fn() },
    pujaBooking: { findMany: vi.fn() },
  },
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../routes/notifications.js', () => ({ notifyUser: vi.fn().mockResolvedValue(0) }));

import { getPayoutBalance } from './payout.service.js';

/**
 * DI-05, the fourth surface — "four surfaces, four numbers".
 *
 * getPayoutBalance sums the Commission ledger and NOTHING else. A pandit whose
 * earnings sit on the LEGACY PriestPayout rail therefore reads his money on
 * /priest/payouts and Rs 0 on /payouts — the page apps/web/app/payouts/page.tsx
 * renders, which is role-gated to include 'priest' and is the redirect target of
 * /settings/earnings. Same pandit, same money, two screens, two answers.
 *
 * WHAT THIS FIX DELIBERATELY DOES NOT DO: it does not add the legacy rail into
 * `availableInr`. That number gates POST /payouts/request, and requestPayout
 * sizes the actual PayoutRequest from Commission rows INSIDE its transaction
 * (payout.service.ts, RV-06). Folding sidecar money into `availableInr` would
 * let a pandit clear the MIN_PAYOUT_INR gate on money this rail cannot settle,
 * and would put a withdrawable-looking figure next to a button that cannot pay
 * it. The legacy rail is reported as its OWN figure, settled by its own process.
 * `availableInr` stays exactly what requestPayout can actually transfer.
 */

const USER = 'user-pandit-1';
const PRIEST = 'priest-row-1';

function aggregatesTo(map: Record<string, string | null>) {
  prismaMock.commission.aggregate.mockImplementation(async (args: any) => {
    const w = args?.where ?? {};
    let key = 'other';
    if (w.status === 'PENDING' && w.payoutRequestId === null) key = 'pending';
    else if (w.status === 'PAID') key = 'paid';
    else if (w.payoutRequest) key = 'inflight';
    const v = map[key] ?? null;
    return { _sum: { amount: v === null ? null : new Prisma.Decimal(v) } };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  aggregatesTo({ pending: null, paid: null, inflight: null });
  prismaMock.commission.findMany.mockResolvedValue([]);
  prismaMock.priest.findUnique.mockResolvedValue(null);
  prismaMock.priestPayout.findMany.mockResolvedValue([]);
  prismaMock.wellnessEnrollment.findMany.mockResolvedValue([]);
  prismaMock.pujaBooking.findMany.mockResolvedValue([]);
});

describe('DI-05 — getPayoutBalance reports the legacy pandit rail', () => {
  it('shows sidecar money instead of answering Rs 0 across the board', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ id: PRIEST });
    prismaMock.priestPayout.findMany.mockResolvedValue([
      { bookingId: 'bk-1', amount: new Prisma.Decimal('770.00'), status: 'pending' },
      { bookingId: 'bk-2', amount: new Prisma.Decimal('1200.00'), status: 'completed' },
    ]);

    const out = await getPayoutBalance(USER);

    // The whole finding: this pandit is owed 770 and has been paid 1200, and
    // every one of these numbers used to be 0.
    expect(out.legacyPandit.pendingInr).toBe(770);
    expect(out.legacyPandit.paidOutInr).toBe(1200);
    expect(out.legacyPandit.hasLegacyRail).toBe(true);
  });

  it('leaves availableInr untouched — the legacy rail is NOT withdrawable here', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ id: PRIEST });
    prismaMock.priestPayout.findMany.mockResolvedValue([
      { bookingId: 'bk-1', amount: new Prisma.Decimal('770.00'), status: 'pending' },
    ]);

    const out = await getPayoutBalance(USER);

    // requestPayout sizes from Commission rows only. If this were 770 the
    // pandit would clear the minimum-payout gate on money the request cannot
    // settle, and POST /payouts/request would throw after promising a balance.
    expect(out.availableInr).toBe(0);
  });

  it('never double-reports a booking the unified rail already owns', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ id: PRIEST });
    // The route excludes commission-backed bookings from the legacy read.
    prismaMock.commission.findMany.mockResolvedValue([{ bookingId: 'bk-1' }]);
    prismaMock.priestPayout.findMany.mockResolvedValue([]);

    const out = await getPayoutBalance(USER);

    const where = prismaMock.priestPayout.findMany.mock.calls[0]![0].where;
    expect(where.priestId).toBe(PRIEST);
    expect(where.bookingId).toEqual({ notIn: ['bk-1'] });
    expect(out.legacyPandit.pendingInr).toBe(0);
  });

  it('costs a non-pandit provider nothing — no Priest row, no sidecar read', async () => {
    prismaMock.priest.findUnique.mockResolvedValue(null);

    const out = await getPayoutBalance('user-astrologer-1');

    expect(prismaMock.priestPayout.findMany).not.toHaveBeenCalled();
    expect(out.legacyPandit.hasLegacyRail).toBe(false);
    expect(out.legacyPandit.pendingInr).toBe(0);
  });

  it('still reports the unified rail exactly as before', async () => {
    aggregatesTo({ pending: '500.00', paid: '250.00', inflight: '100.00' });

    const out = await getPayoutBalance(USER);

    expect(out.availableInr).toBe(500);
    expect(out.paidOutInr).toBe(250);
    expect(out.pendingInr).toBe(100);
  });
});
