import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  user: { count: vi.fn() },
  pujaBooking: { count: vi.fn() },
  payment: { aggregate: vi.fn() },
  subscription: { count: vi.fn() },
  lead: { count: vi.fn() },
};
vi.mock('../src/prisma.js', () => ({
  getPrisma: () => mockPrisma,
  disconnectPrisma: vi.fn(),
}));

import { kpiSnapshot } from '../src/tools/kpi-snapshot.js';

beforeEach(() => vi.clearAllMocks());

describe('kpiSnapshot', () => {
  it('returns all-time totals + 7d deltas + active subs + pipeline leads', async () => {
    mockPrisma.user.count
      .mockResolvedValueOnce(1000) // all-time users
      .mockResolvedValueOnce(50); // 7d new users
    mockPrisma.pujaBooking.count
      .mockResolvedValueOnce(300) // all-time completed bookings
      .mockResolvedValueOnce(10); // 7d completed bookings
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 250000 } });
    mockPrisma.subscription.count.mockResolvedValue(42);
    mockPrisma.lead.count.mockResolvedValue(7);

    const result = await kpiSnapshot({});
    const data = JSON.parse(result.content[0].text);

    expect(data.allTime.totalUsers).toBe(1000);
    expect(data.allTime.completedBookings).toBe(300);
    expect(data.allTime.lifetimeRevenueInr).toBe(250000);
    expect(data.activeSubscriptions).toBe(42);
    expect(data.pipelineLeads).toBe(7);
    expect(data.last7d.newUsers).toBe(50);
    expect(data.last7d.completedBookings).toBe(10);
    expect(data.generatedAt).toBeDefined();

    // Active subs filter on status:'active'.
    expect(mockPrisma.subscription.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'active' } }),
    );
    // Pipeline leads = NEW + QUEUED.
    expect(mockPrisma.lead.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: { in: ['NEW', 'QUEUED'] } } }),
    );
    // Revenue counts only captured payments.
    expect(mockPrisma.payment.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        _sum: { amount: true },
        where: expect.objectContaining({ status: 'captured' }),
      }),
    );
  });

  it('returns zeros when prod is empty', async () => {
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.pujaBooking.count.mockResolvedValue(0);
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
    mockPrisma.subscription.count.mockResolvedValue(0);
    mockPrisma.lead.count.mockResolvedValue(0);

    const data = JSON.parse((await kpiSnapshot({})).content[0].text);
    expect(data.allTime.totalUsers).toBe(0);
    expect(data.allTime.lifetimeRevenueInr).toBe(0);
    expect(data.activeSubscriptions).toBe(0);
    expect(data.pipelineLeads).toBe(0);
  });
});
