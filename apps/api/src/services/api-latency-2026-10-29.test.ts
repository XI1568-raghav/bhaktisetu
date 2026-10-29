import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Latency (2026-10-29). Each remote-database statement costs ~0.4 s, so the
 * number of statements in a row is the response time. These pin the three
 * changes that keep every answer identical while removing waits.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    priestPayout: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      findFirst: vi.fn(),
    },
    commission: { aggregate: vi.fn(), findMany: vi.fn() },
    priest: { findUnique: vi.fn() },
    wellnessEnrollment: { findMany: vi.fn() },
    pujaBooking: { findMany: vi.fn() },
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));
vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../routes/notifications.js', () => ({ notifyUser: vi.fn().mockResolvedValue(0) }));

import { PriestService } from './priest.service.js';
import { getPayoutBalance, unfinishedConsultationIds, __resetConsultationsTableProbe } from './payout.service.js';
import { hiddenReviewIds } from '../lib/review-moderation.js';

beforeEach(() => {
  vi.clearAllMocks();
  __resetConsultationsTableProbe();
});

describe('priest payout history: one wave of reads', () => {
  it('starts all five reads before any resolves and returns the same shape', async () => {
    const gates: Array<() => void> = [];
    const gated = <T>(value: T) => new Promise<T>((res) => { gates.push(() => res(value)); });
    prismaMock.priestPayout.findMany.mockImplementation(() => gated([{ id: 'p1' }]));
    prismaMock.priestPayout.count.mockImplementation(() => gated(1));
    prismaMock.priestPayout.aggregate
      .mockImplementationOnce(() => gated({ _sum: { amount: 700 } }))
      .mockImplementationOnce(() => gated({ _sum: { amount: 300 } }));
    prismaMock.priestPayout.findFirst.mockImplementation(() => gated({ amount: 100, processedAt: new Date('2026-10-01') }));

    const pending = new PriestService().getPayoutHistory('priest-1', { page: 1, limit: 20 });
    await new Promise((r) => setTimeout(r, 10));
    expect(gates).toHaveLength(5);
    gates.forEach((g) => g());
    const out = await pending;
    expect(out).toMatchObject({
      payouts: [{ id: 'p1' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      summary: { totalEarned: 700, pending: 300, lastPayout: { amount: 100 } },
    });
  });
});

describe('payout balance', () => {
  it('asks whether the consultations table exists once, then remembers a yes', async () => {
    prismaMock.$queryRawUnsafe
      .mockResolvedValueOnce([{ present: true }])
      .mockResolvedValue([{ booking_id: 'c-1' }]);
    expect(await unfinishedConsultationIds(prismaMock as never, 'u1')).toEqual(['c-1']);
    expect(await unfinishedConsultationIds(prismaMock as never, 'u1')).toEqual(['c-1']);
    const probes = prismaMock.$queryRawUnsafe.mock.calls.filter((c) => /to_regclass/.test(String(c[0])));
    expect(probes).toHaveLength(1);
  });

  it('a missing table still answers [] and is re-probed after the recheck window', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ present: false }]);
    expect(await unfinishedConsultationIds(prismaMock as never, 'u1')).toEqual([]);
    expect(await unfinishedConsultationIds(prismaMock as never, 'u1')).toEqual([]);
    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 61_000);
    expect(await unfinishedConsultationIds(prismaMock as never, 'u1')).toEqual([]);
    vi.useRealTimers();
    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(2);
  });

  it('a pandit: the legacy-rail read overlaps the balance sums instead of following them', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ present: false }]);
    prismaMock.wellnessEnrollment.findMany.mockResolvedValue([]);
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    prismaMock.priest.findUnique.mockResolvedValue({ id: 'priest-1' });
    const order: string[] = [];
    prismaMock.commission.aggregate.mockImplementation(async (args: any) => {
      order.push('sum');
      await new Promise((r) => setTimeout(r, 25));
      order.push('sum-done');
      return { _sum: { amount: args.where.status === 'PAID' ? 50 : 200 } };
    });
    prismaMock.commission.findMany.mockImplementation(async () => {
      order.push('owned');
      await new Promise((r) => setTimeout(r, 25));
      return [{ bookingId: 'b-owned' }];
    });
    prismaMock.priestPayout.findMany.mockImplementation(async (args: any) => {
      order.push('sidecar');
      expect(args.where).toEqual({ priestId: 'priest-1', bookingId: { notIn: ['b-owned'] } });
      return [
        { bookingId: 'b1', amount: 120, status: 'completed' },
        { bookingId: 'b2', amount: 80, status: 'pending' },
      ];
    });
    const out = await getPayoutBalance('u1');
    // wave 2's sum started before the first wave-2 sum finished, together with the legacy read.
    const w2 = order.slice(order.indexOf('owned') - 1);
    expect(w2.indexOf('owned')).toBeLessThan(w2.indexOf('sum-done'));
    expect(out).toEqual({
      availableInr: 200,
      upcomingInr: 0,
      pendingInr: 200,
      paidOutInr: 50,
      legacyPandit: { hasLegacyRail: true, pendingInr: 80, paidOutInr: 120 },
    });
  });

  it('a non-pandit costs no legacy-rail reads', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ present: false }]);
    prismaMock.wellnessEnrollment.findMany.mockResolvedValue([]);
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    prismaMock.priest.findUnique.mockResolvedValue(null);
    prismaMock.commission.aggregate.mockResolvedValue({ _sum: { amount: 10 } });
    const out = await getPayoutBalance('u1');
    expect(prismaMock.commission.findMany).not.toHaveBeenCalled();
    expect(prismaMock.priestPayout.findMany).not.toHaveBeenCalled();
    expect(out.legacyPandit).toEqual({ hasLegacyRail: false, pendingInr: 0, paidOutInr: 0 });
  });
});

describe('hidden-review lookup', () => {
  it('a missing table is remembered, so a page of reviews does not pay a failed read each time', async () => {
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('relation "review_moderation" does not exist'));
    expect(await hiddenReviewIds()).toEqual([]);
    expect(await hiddenReviewIds()).toEqual([]);
    expect(await hiddenReviewIds()).toEqual([]);
    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(1);
  });
});
