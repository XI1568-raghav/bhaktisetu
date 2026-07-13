import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Prisma client so the tool runs against deterministic fixtures.
const mockPrisma = {
  user: { count: vi.fn() },
  pujaBooking: { count: vi.fn(), groupBy: vi.fn() },
  payment: { aggregate: vi.fn() },
  donation: { aggregate: vi.fn() },
};
vi.mock('../src/prisma.js', () => ({
  getPrisma: () => mockPrisma,
  disconnectPrisma: vi.fn(),
}));

import { funnelToday } from '../src/tools/funnel-today.js';

beforeEach(() => vi.clearAllMocks());

describe('funnelToday', () => {
  it('returns today + last-7d counts for each funnel stage', async () => {
    // count() returns total matching the where clause.
    mockPrisma.user.count.mockResolvedValue(3);
    mockPrisma.pujaBooking.count.mockResolvedValue(2);
    mockPrisma.pujaBooking.groupBy.mockResolvedValue([
      { status: 'confirmed', _count: { _all: 1 } },
      { status: 'pending_payment', _count: { _all: 1 } },
    ]);
    // aggregate returns { _sum: { amount: ... } }
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 1500 } });
    mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amountInr: 500 } });

    const result = await funnelToday({});
    const data = JSON.parse(result.content[0].text);

    expect(data.today.signups).toBe(3);
    expect(data.today.bookings).toBe(2);
    expect(data.today.bookingsByStatus.confirmed).toBe(1);
    expect(data.today.capturedRevenueInr).toBe(1500);
    expect(data.today.donationsInr).toBe(500);
    // last7d uses the same windowCounts helper against the same mocks, so its
    // fields mirror today's. Asserting the values (not just toBeDefined) locks
    // down the second window's wiring + field-mapping — a regression that
    // dropped a last7d field or broke the sevenDaysAgo call would otherwise pass.
    expect(data.last7d.signups).toBe(3);
    expect(data.last7d.bookings).toBe(2);
    expect(data.last7d.capturedRevenueInr).toBe(1500);
    expect(data.last7d.donationsInr).toBe(500);
    // Revenue only counts 'captured' payments (completed money).
    expect(mockPrisma.payment.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        _sum: { amount: true },
        where: expect.objectContaining({ status: 'captured' }),
      }),
    );
    // Donation "money received" state is 'paid' (DonationStatus), NOT 'captured'
    // (that's PaymentStatus). Lock this down — a regression to 'captured' would
    // silently match zero rows and report donations as always 0.
    expect(mockPrisma.donation.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        _sum: { amountInr: true },
        where: expect.objectContaining({ status: 'paid' }),
      }),
    );
  });

  it('returns zeros (not null) when prod is empty', async () => {
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.pujaBooking.count.mockResolvedValue(0);
    mockPrisma.pujaBooking.groupBy.mockResolvedValue([]);
    mockPrisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
    mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amountInr: null } });

    const data = JSON.parse((await funnelToday({})).content[0].text);
    expect(data.today.signups).toBe(0);
    expect(data.today.capturedRevenueInr).toBe(0);
  });
});
