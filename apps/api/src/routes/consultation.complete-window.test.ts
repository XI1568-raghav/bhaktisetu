/**
 * Launch fix 2026-10-07: a consultation cannot be marked complete before its booked start.
 * Completing releases the astrologer's held earning (payout.service holds it until
 * status = completed), so completing early paid for a session that had not happened.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { consultationRoutes } from './consultation.js';

const ASTRO = {
  id: 'user-demo-astro-1',
  email: 'astro@demo.com',
  phone: null,
  fullName: 'Demo Astro',
  subscriptionTier: 'free',
  blocked: false,
};
const ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

const ID = '3b5bd615-1111-4111-8111-111111111111';

function row(scheduledAt: Date | null) {
  return {
    id: ID,
    reference: 'AC-20261007-ABCDEF',
    user_id: '2b5bd615-1111-4111-8111-111111111111',
    astrologer_id: ASTRO.id,
    astrologer_name: 'Demo Astro',
    minutes: 30,
    amount_inr: '500',
    currency: 'INR',
    status: 'confirmed',
    room_name: 'darshya-ac',
    scheduled_at: scheduledAt,
    created_at: new Date('2026-10-01T00:00:00Z'),
    paid_at: new Date('2026-10-01T00:00:00Z'),
  };
}

async function complete(token: 'astro' | 'admin') {
  const app = Fastify({ logger: false });
  await app.register(
    async (instance) => {
      await consultationRoutes(instance);
    },
    { prefix: '/api/v1/consultation' },
  );
  const res = await app.inject({
    method: 'PATCH',
    url: `/api/v1/consultation/${ID}/complete`,
    headers: { authorization: `Bearer demo-${token}` },
  });
  await app.close();
  return res;
}

function updateCalls() {
  return prismaMock.$executeRawUnsafe.mock.calls.filter(([sql]) => /SET status = 'completed'/.test(String(sql)));
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) => {
    if (args.where.email === 'astro@demo.com') return ASTRO;
    if (args.where.email === 'admin@demo.com') return ADMIN;
    return null;
  });
  prismaMock.$executeRawUnsafe.mockResolvedValue(1 as never);
  prismaMock.astrologerProfile.findUnique.mockResolvedValue(null as never);
});

describe('PATCH /consultation/:id/complete, completion window', () => {
  it('the assigned astrologer is refused with 409 too_early_to_complete before the booked start', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([row(new Date('2999-01-01T10:00:00Z'))] as never);
    const res = await complete('astro');
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ code: 'too_early_to_complete' });
    expect(res.json().error).toMatch(/cannot be marked complete before it starts/);
    expect(updateCalls()).toHaveLength(0);
  });

  it('the assigned astrologer can complete once the booked start has passed', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([row(new Date('2020-01-01T10:00:00Z'))] as never);
    const res = await complete('astro');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ completed: true });
    expect(updateCalls()).toHaveLength(1);
  });

  it('admin may force-complete before the start (remediation path)', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([row(new Date('2999-01-01T10:00:00Z'))] as never);
    const res = await complete('admin');
    expect(res.statusCode).toBe(200);
    expect(updateCalls()).toHaveLength(1);
  });

  it('an on-demand consultation (no scheduled_at) is not gated', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([row(null)] as never);
    const res = await complete('astro');
    expect(res.statusCode).toBe(200);
  });
});
