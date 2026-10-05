import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { templePortalRoutes } from './temple-portal.js';

// The temple's share is written when a booking is confirmed, but like the
// pandit's earning it is only payable once the puja has been performed AND
// proved (video_uploaded / delivered). Until then the portal shows it as
// upcoming, never as ready for settlement.

const MANAGER = {
  id: '77777777-7777-4777-8777-777777777777',
  email: 'temple@demo.com',
  phone: null,
  fullName: 'Demo Temple Manager',
  subscriptionTier: 'free',
  blocked: false,
};

const row = (id: string, bookingId: string, amount: string, status = 'pending') => ({
  id,
  bookingId,
  amount: { toString: () => amount },
  status,
  reference: null,
  processedAt: null,
  createdAt: new Date('2026-10-01'),
});

describe('GET /temple-portal/payouts: share held until the puja is performed and proved', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'temple@demo.com' ? MANAGER : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: MANAGER.id, role: 'TEMPLE_MANAGER' },
    ] as any);
    prismaMock.templeProfile.findUnique.mockResolvedValue({ templeName: 'Somnath', approved: true } as any);
    prismaMock.temple.findFirst.mockResolvedValue({ id: 'temple-1' } as any);
  });

  it('splits pending rows into payable (proved) and upcoming (not yet proved)', async () => {
    prismaMock.templePayout.findMany.mockResolvedValue([
      row('p1', 'b1', '50.00'),
      row('p2', 'b2', '30.00'),
      row('p3', 'b3', '20.00'),
      row('p4', 'b4', '10.00'),
      row('p5', 'b5', '5.00', 'completed'),
    ] as any);
    prismaMock.pujaBooking.findMany.mockResolvedValue([
      { id: 'b1', status: 'video_uploaded' },
      { id: 'b2', status: 'delivered' },
      { id: 'b3', status: 'completed' }, // performed but not yet proved: still held
      { id: 'b4', status: 'priest_assigned' },
      { id: 'b5', status: 'delivered' },
    ] as any);

    const app = Fastify();
    void app.register(templePortalRoutes, { prefix: '/api/v1/temple-portal' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/temple-portal/payouts',
      headers: { authorization: 'Bearer demo-temple' },
    });
    const body = res.json();
    expect(res.statusCode).toBe(200);
    expect(body.payableInr).toBe(80);
    expect(body.upcomingInr).toBe(30);
    expect(body.paidInr).toBe(5);
    const by = Object.fromEntries(body.payouts.map((p: any) => [p.id, p.releaseStatus]));
    expect(by).toEqual({ p1: 'payable', p2: 'payable', p3: 'upcoming', p4: 'upcoming', p5: 'paid' });
  });
});
