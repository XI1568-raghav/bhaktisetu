import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { Prisma } from '@prisma/client';
import { payoutRequestRoutes } from './payout-requests.js';

// GET /payouts/commissions rows carry a releaseStatus so the web earnings
// panel can show Upcoming (after the session/puja) apart from Pending.

const ASTRO = {
  id: 'ba87a424-e9d2-44f1-92a9-996441b31131',
  email: 'astro@demo.com',
  phone: null,
  fullName: 'Astro',
  subscriptionTier: 'free',
  blocked: false,
};

const row = (id: string, bookingId: string, status = 'PENDING', payoutRequestId: string | null = null) => ({
  id,
  bookingId,
  payoutRequestId,
  providerId: ASTRO.id,
  amount: new Prisma.Decimal('300'),
  percentage: new Prisma.Decimal('0.2'),
  wellnessEnrollmentId: null,
  status,
  createdAt: new Date('2026-09-01'),
});

describe('GET /payouts/commissions releaseStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'astro@demo.com' ? ASTRO : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([{ userId: ASTRO.id, role: 'ASTROLOGER' }] as any);
    prismaMock.wellnessEnrollment.findMany.mockResolvedValue([]);
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ booking_id: 'consult-open' }]);
    prismaMock.commission.count.mockResolvedValue(4);
    prismaMock.commission.findMany.mockResolvedValue([
      row('c1', 'consult-open'),
      row('c2', 'consult-done'),
      row('c3', 'consult-x', 'PAID'),
      row('c4', 'consult-open', 'PENDING', 'pr-1'),
    ] as any);
  });

  it('flags held pending rows upcoming and the rest payable / paid / in_payout', async () => {
    const app = Fastify();
    void app.register(payoutRequestRoutes, { prefix: '/api/v1/payouts' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/payouts/commissions',
      headers: { authorization: 'Bearer demo-astro' },
    });
    expect(res.statusCode).toBe(200);
    const by = Object.fromEntries(res.json().data.map((r: any) => [r.id, r.releaseStatus]));
    expect(by).toEqual({ c1: 'upcoming', c2: 'payable', c3: 'paid', c4: 'in_payout' });
  });
});
