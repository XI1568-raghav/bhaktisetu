import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { templePortalRoutes } from './temple-portal.js';

// The dashboard used to count the temple's share the moment payment confirmed
// (TemplePayout rows are minted then). That share is only releasable once the
// puja is performed AND proved (video_uploaded / delivered) - the same rule
// GET /payouts applies. The dashboard must split Released from Upcoming with
// that rule, and must never show unreleased share as earned.

const MANAGER = {
  id: '77777777-7777-4777-8777-777777777777',
  email: 'temple@demo.com',
  phone: null,
  fullName: 'Demo Temple Manager',
  subscriptionTier: 'free',
  blocked: false,
};

const now = new Date();
const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15);
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);

const row = (bookingId: string, amount: string, status: string, createdAt: Date) => ({
  id: `p-${bookingId}`,
  bookingId,
  amount: { toString: () => amount },
  status,
  createdAt,
});

async function dashboard() {
  const app = Fastify();
  void app.register(templePortalRoutes, { prefix: '/api/v1/temple-portal' });
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/temple-portal/dashboard',
    headers: { authorization: 'Bearer demo-temple' },
  });
  expect(res.statusCode).toBe(200);
  return res.json();
}

describe('GET /temple-portal/dashboard: released vs upcoming share', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'temple@demo.com' ? MANAGER : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: MANAGER.id, role: 'TEMPLE_MANAGER' },
    ] as any);
    prismaMock.templeProfile.findUnique.mockResolvedValue({
      templeName: 'Somnath',
      approved: true,
      totalStreams: 0,
    } as any);
    prismaMock.temple.findFirst.mockResolvedValue({ id: 'temple-1' } as any);
    prismaMock.pujaBooking.count.mockResolvedValue(5);
  });

  it('counts only proved/paid share as released and the rest as upcoming', async () => {
    prismaMock.templePayout.findMany.mockResolvedValue([
      row('b1', '50.00', 'pending', thisMonth), // proved -> payable -> released
      row('b2', '30.00', 'pending', thisMonth), // confirmed only -> upcoming
      row('b3', '20.00', 'pending', lastMonth), // performed, not proved -> upcoming
      row('b4', '10.00', 'completed', lastMonth), // paid -> released
    ] as any);
    prismaMock.pujaBooking.findMany.mockImplementation(async (args: any) =>
      args?.where?.id?.in
        ? [
            { id: 'b1', status: 'video_uploaded' },
            { id: 'b2', status: 'confirmed' },
            { id: 'b3', status: 'completed' },
            { id: 'b4', status: 'delivered' },
          ]
        : [],
    );

    const { stats } = await dashboard();
    expect(stats.releasedInr).toBe(60);
    expect(stats.upcomingInr).toBe(50);
    expect(stats.monthReleasedInr).toBe(50);
    expect(stats.monthUpcomingInr).toBe(30);
    // The legacy "revenue" keys must not carry unreleased share either.
    expect(stats.totalRevenueInr).toBe(60);
    expect(stats.monthRevenueInr).toBe(50);
  });

  it('shows zero released when nothing has been proved yet', async () => {
    prismaMock.templePayout.findMany.mockResolvedValue([row('b1', '40.00', 'pending', thisMonth)] as any);
    prismaMock.pujaBooking.findMany.mockImplementation(async (args: any) =>
      args?.where?.id?.in ? [{ id: 'b1', status: 'confirmed' }] : [],
    );
    const { stats } = await dashboard();
    expect(stats.releasedInr).toBe(0);
    expect(stats.totalRevenueInr).toBe(0);
    expect(stats.upcomingInr).toBe(40);
  });

  it('treats a pending row with no booking as upcoming, never released', async () => {
    prismaMock.templePayout.findMany.mockResolvedValue([
      { ...row('x', '25.00', 'pending', thisMonth), bookingId: null },
    ] as any);
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    const { stats } = await dashboard();
    expect(stats.releasedInr).toBe(0);
    expect(stats.upcomingInr).toBe(25);
  });
  it('returns scheduledTimeSlot (not a stale field name) on recentBookings', async () => {
    prismaMock.templePayout.findMany.mockResolvedValue([] as any);
    prismaMock.pujaBooking.findMany.mockImplementation(async (args: any) =>
      args?.where?.id?.in
        ? []
        : [
            {
              id: 'b9',
              bookingNumber: 'BS-20261013-AAAAA',
              user: { fullName: 'Asha' },
              pujaType: { name: 'Rudrabhishek' },
              scheduledDate: new Date('2026-10-20'),
              scheduledTimeSlot: '06:00-08:00',
              priceAmount: { toString: () => '501' },
              status: 'confirmed',
            },
          ],
    );
    const body = await dashboard();
    expect(body.recentBookings[0]).toMatchObject({ id: 'b9', scheduledTimeSlot: '06:00-08:00', priceInr: 501 });
  });
});
