/**
 * The admin dashboard's "Revenue (this month)" summed every `captured` Payment,
 * including payments on bookings that were cancelled and are still waiting for
 * their refund. That money is owed back, not earned. It is now reported
 * separately as `pendingRefundInr`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { AdminService } from './admin.service.js';

type PayRow = { amount: number; bookingStatus: string | null };

/** Answers payment.aggregate the way Postgres would for the two where shapes. */
function wirePayments(rows: PayRow[]) {
  prismaMock.payment.aggregate.mockImplementation((async (args: { where: any }) => {
    const w = args.where;
    const matched = rows.filter((r) => {
      if (w.booking?.status === 'cancelled') return r.bookingStatus === 'cancelled';
      if (Array.isArray(w.OR)) return r.bookingStatus !== 'cancelled'; // no booking, or not cancelled
      return true;
    });
    return { _sum: { amount: matched.length ? matched.reduce((s, r) => s + r.amount, 0) : null } };
  }) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.count.mockResolvedValue(0 as never);
  prismaMock.userRoleAssignment.groupBy.mockResolvedValue([] as never);
  prismaMock.marketplaceSubscription.count.mockResolvedValue(0 as never);
  prismaMock.transaction.findMany.mockResolvedValue([] as never);
  prismaMock.transaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } } as never);
  for (const m of ['panditProfile', 'storeProfile', 'astrologerProfile', 'wellnessProfile', 'gaushalaProfile', 'templeProfile'] as const) {
    (prismaMock as any)[m].count.mockResolvedValue(0);
  }
});

describe('admin dashboard revenue vs cancelled-pending-refund captures', () => {
  it('excludes captures on cancelled bookings from totalRevenue and reports them as pendingRefundInr', async () => {
    wirePayments([
      { amount: 1000, bookingStatus: 'confirmed' },
      { amount: 300, bookingStatus: null }, // wellness / store payment, no booking
      { amount: 700, bookingStatus: 'cancelled' }, // awaiting refund
    ]);
    const out = await new AdminService().getDashboard();
    expect(out.totalRevenue).toBe(1300);
    expect(out.pendingRefundInr).toBe(700);
  });

  it('reads 0 pending refund when nothing is cancelled', async () => {
    wirePayments([{ amount: 500, bookingStatus: 'completed' }]);
    const out = await new AdminService().getDashboard();
    expect(out.totalRevenue).toBe(500);
    expect(out.pendingRefundInr).toBe(0);
  });
});
