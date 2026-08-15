/**
 * AO-15 — two numbers on one screen that cannot both be true.
 *
 * Sweep (2026-08-12), /admin/reports read:
 *   Total Bookings 53 · Cancelled 1
 *   Popular Pujas: Rudrabhishek 49 + Ganesh Puja 5 = 54
 *
 * The tile's `statusGroups` whitelist excludes cancelled/refunded; the
 * `pujaAgg` groupBy right below it applied NO status filter at all, so
 * cancelled bookings were counted as popular ones and the discrepancy grows
 * with every cancellation. The same groupBy summed `priceAmount` across
 * pending_payment and cancelled rows and the card rendered it as "Rs. 54.7K",
 * so the per-puja profitability read an operator takes off that card is
 * inflated by money nobody ever paid.
 *
 * One population for both figures: the same whitelist the Total Bookings tile
 * uses. The money column keeps its field name (renaming the VALUE would move
 * a number on a live dashboard) but is now the booked value of exactly the
 * bookings counted beside it, and the UI labels it "booked".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { AdminService, __reportsTesting } from './admin.service.js';

const service = new AdminService();

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.count.mockResolvedValue(0 as never);
  prismaMock.pujaBooking.count.mockResolvedValue(0 as never);
  prismaMock.pujaBooking.groupBy.mockResolvedValue([
    {
      pujaTypeId: 'pt-1',
      _count: { _all: 49 },
      _sum: { priceAmount: new Prisma.Decimal('53900') },
      _avg: { rating: 4.6 },
    },
  ] as never);
  prismaMock.pujaType.findMany.mockResolvedValue([
    { id: 'pt-1', name: 'Rudrabhishek' },
  ] as never);
  prismaMock.wellnessEnrollment.groupBy.mockResolvedValue([] as never);
  prismaMock.wellnessSession.findMany.mockResolvedValue([] as never);
  prismaMock.wellnessProfile.findMany.mockResolvedValue([] as never);
  prismaMock.chatConversation.groupBy.mockResolvedValue([] as never);
  prismaMock.astrologerProfile.findMany.mockResolvedValue([] as never);
  prismaMock.temple.findMany.mockResolvedValue([] as never);
  // Geographic distribution — getReports catches ANY throw into an all-empty
  // shape, so an unmocked call would hide the assertion under test.
  prismaMock.user.groupBy.mockResolvedValue([] as never);
});

describe('AO-15 — Popular Pujas counts the same bookings the tile counts', () => {
  it('publishes one status whitelist for both figures', () => {
    const { COUNTED_BOOKING_STATUSES } = __reportsTesting;
    // Exactly the "Total Bookings" tile's set: everything that is a real
    // booking, and nothing that was cancelled or refunded away.
    expect([...COUNTED_BOOKING_STATUSES].sort()).toEqual(
      [
        'confirmed',
        'completed',
        'delivered',
        'in_progress',
        'pending_payment',
        'priest_assigned',
        'video_uploaded',
      ].sort(),
    );
    expect(COUNTED_BOOKING_STATUSES).not.toContain('cancelled');
    expect(COUNTED_BOOKING_STATUSES).not.toContain('refunded');
  });

  it('filters the popular-pujas groupBy by that whitelist', async () => {
    await service.getReports();

    const call = prismaMock.pujaBooking.groupBy.mock.calls.find((c: unknown[]) =>
      Boolean((c[0] as { by?: string[] } | undefined)?.by?.includes('pujaTypeId')),
    );
    expect(call, 'popular-pujas groupBy was not issued').toBeDefined();
    const args = call![0] as { where?: { status?: { in?: string[] } } };

    // Before the fix there was no `where` on this groupBy at all.
    expect(args.where?.status?.in).toBeDefined();
    expect(args.where!.status!.in).toEqual([...__reportsTesting.COUNTED_BOOKING_STATUSES]);
  });

  it('counts the tile with the same whitelist it filters the card by', async () => {
    await service.getReports();

    const totalTileCall = prismaMock.pujaBooking.count.mock.calls.find((c: unknown[]) => {
      const where = (c[0] as { where?: { status?: { in?: string[] } } } | undefined)?.where;
      return (
        where?.status?.in?.length === __reportsTesting.COUNTED_BOOKING_STATUSES.length &&
        where.status.in.includes('pending_payment')
      );
    });
    expect(totalTileCall, 'Total Bookings tile no longer uses the shared set').toBeDefined();
  });

  it('still returns the popular pujas it was asked for', async () => {
    const reports = await service.getReports();
    expect(reports.popularPujas[0]).toMatchObject({
      name: 'Rudrabhishek',
      bookings: 49,
      revenueInr: 53900,
    });
  });
});
