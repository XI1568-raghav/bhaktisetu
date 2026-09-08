/**
 * CT-ADMIN-2 — /admin/reports called uncollected money "revenue".
 *
 * Measured on prod with the ct+admin token (2026-09-08):
 *
 *   GET /admin/reports          -> popularPujas revenueInr 4703 + 1102 + 502 = 6307
 *   GET /admin/bookings         -> 19 rows: 13 cancelled, 6 pending_payment, 0 paid
 *   GET /admin/payments         -> 6 rows, NOT ONE with status `captured`
 *   GET /admin/dashboard        -> totalRevenue 0
 *   GET /admin/metrics/investor -> gmvCumulativePaise 0
 *
 * The 6,307 was the price of six bookings still sitting in `pending_payment`
 * with no captured payment behind any of them, so three admin money screens
 * disagreed about the same platform on the same day. The row counts cross-check
 * exactly, so nothing was mis-added — the population was wrong for the label.
 *
 * AO-15 put the Popular Pujas card and the Total Bookings tile on one status
 * whitelist, which was the right fix for the COUNT and is left alone here: a
 * booking that was cancelled or refunded is not a booking the platform did, and
 * every other status on the way to delivery is. What it could not fix is that
 * "did this booking happen?" and "did the money arrive?" are different
 * questions, and only the payments table can answer the second one.
 *
 * So the money sum keeps that whitelist and adds the evidence: a booking counts
 * toward revenue when a `captured` Payment row points at it — the same test
 * /admin/dashboard applies (`payment.aggregate({ where: { status: 'captured' }})`)
 * and the same idiom /admin/metrics already uses for a paying user
 * (`payments: { some: { status: 'captured' } }`, routes/admin-metrics.ts:214).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { AdminService, __reportsTesting } from './admin.service.js';

const service = new AdminService();

type GroupByArgs = {
  by?: string[];
  where?: {
    status?: { in?: string[] };
    payments?: { some?: { status?: string } };
  };
};

/** The two puja-type groupBys getReports issues, in the order it issues them. */
function pujaGroupByCalls(): GroupByArgs[] {
  return prismaMock.pujaBooking.groupBy.mock.calls
    .map((c: unknown[]) => c[0] as GroupByArgs)
    .filter((a) => Boolean(a?.by?.includes('pujaTypeId')));
}

/**
 * The prod shape, reduced to one puja type: three bookings that were made
 * (so the tile counts three) of which one was paid for (so revenue is 1,102,
 * not 6,307). Which groupBy is answered is decided by the `where` the caller
 * sent, exactly as Postgres would decide it.
 */
const BOOKED_TOTAL = new Prisma.Decimal('6307');
const COLLECTED_TOTAL = new Prisma.Decimal('1102');

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.count.mockResolvedValue(0 as never);
  prismaMock.pujaBooking.count.mockResolvedValue(0 as never);
  prismaMock.pujaBooking.groupBy.mockImplementation((async (args: GroupByArgs) => {
    const paidOnly = args?.where?.payments?.some?.status === 'captured';
    return [
      {
        pujaTypeId: 'pt-1',
        _count: { _all: 3 },
        _sum: { priceAmount: paidOnly ? COLLECTED_TOTAL : BOOKED_TOTAL },
        _avg: { rating: 4.6 },
      },
    ];
  }) as never);
  prismaMock.pujaType.findMany.mockResolvedValue([{ id: 'pt-1', name: 'Rudrabhishek' }] as never);
  prismaMock.wellnessEnrollment.groupBy.mockResolvedValue([] as never);
  prismaMock.wellnessSession.findMany.mockResolvedValue([] as never);
  prismaMock.wellnessProfile.findMany.mockResolvedValue([] as never);
  prismaMock.chatConversation.groupBy.mockResolvedValue([] as never);
  prismaMock.astrologerProfile.findMany.mockResolvedValue([] as never);
  // getReports catches ANY throw into an all-empty shape, so an unmocked call
  // would hide every assertion below under a passing empty array.
  prismaMock.user.groupBy.mockResolvedValue([] as never);
});

describe('CT-ADMIN-2 — the money column is money that arrived', () => {
  it('keeps the count population intact, pending_payment included', () => {
    // The "Total Bookings" tile is currently RIGHT and must not move: a booking
    // awaiting payment is still a booking the platform took.
    expect(__reportsTesting.COUNTED_BOOKING_STATUSES).toContain('pending_payment');
    expect(__reportsTesting.COUNTED_BOOKING_STATUSES).not.toContain('cancelled');
    expect(__reportsTesting.COUNTED_BOOKING_STATUSES).not.toContain('refunded');
  });

  it('sums money only over bookings with a captured payment', async () => {
    await service.getReports();
    const calls = pujaGroupByCalls();
    expect(calls, 'getReports no longer issues a separate money aggregate').toHaveLength(2);

    const [countCall, moneyCall] = calls;
    // The count keeps the shared whitelist and NOTHING else — AO-15's invariant.
    expect(countCall!.where?.status?.in).toEqual([...__reportsTesting.COUNTED_BOOKING_STATUSES]);
    expect(countCall!.where?.payments).toBeUndefined();

    // The money aggregate keeps that whitelist (cancelled and refunded money is
    // not revenue either) and adds the payment evidence.
    expect(moneyCall!.where?.status?.in).toEqual([...__reportsTesting.COUNTED_BOOKING_STATUSES]);
    expect(moneyCall!.where?.payments?.some?.status).toBe('captured');
  });

  it('reports the collected figure as revenueInr, not the booked one', async () => {
    const reports = await service.getReports();
    const row = reports.popularPujas[0]!;

    expect(row.bookings).toBe(3);
    // The defect: 6307 of pipeline rendered under a field named revenueInr.
    expect(row.revenueInr).toBe(1102);
    expect(row.revenueInr).not.toBe(6307);
  });

  it('still publishes the booked value, under a name that says so', async () => {
    // The pipeline number is useful — it is just not revenue. Shipping both,
    // over populations that differ only by "was it paid for", makes the
    // relationship visible instead of leaving a reader to infer it.
    const row = (await service.getReports()).popularPujas[0]!;
    expect(row.bookedValueInr).toBe(6307);
    expect(row.revenueInr).toBeLessThanOrEqual(row.bookedValueInr);
  });

  it('reads zero revenue on the prod state, agreeing with /admin/dashboard', async () => {
    // Six pending_payment bookings, no captured payment: the money aggregate
    // matches nothing. /admin/dashboard said 0 that day, and so must this.
    prismaMock.pujaBooking.groupBy.mockImplementation((async (args: GroupByArgs) => {
      const paidOnly = args?.where?.payments?.some?.status === 'captured';
      if (paidOnly) return [];
      return [
        {
          pujaTypeId: 'pt-1',
          _count: { _all: 6 },
          _sum: { priceAmount: BOOKED_TOTAL },
          _avg: { rating: null },
        },
      ];
    }) as never);

    const row = (await service.getReports()).popularPujas[0]!;
    expect(row.bookings).toBe(6);
    expect(row.revenueInr).toBe(0);
    expect(row.bookedValueInr).toBe(6307);
  });
});
