import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { consultationRoutes } from './consultation.js';

/**
 * AW-14 (2026-08-12, P2) — the write half.
 *
 * `AstrologerProfile.totalConsultations` is read by the PUBLIC astrologer
 * directory as the `consultationCount` badge and is one of its ORDER BY keys
 * (routes/astrology.ts:82, :140, :153), but nothing in the codebase ever wrote
 * it: /consultation/verify-payment created the Commission row and stopped. So
 * every genuinely onboarded astrologer advertised "0 consults" for life.
 *
 * The increment lives inside the same idempotency guard as the ledger write, so
 * a replayed verify cannot double-count.
 */

const REAL_PROFILE_ID = '71e54617-6963-418e-845f-920f4350505b';
const REAL_USER_ID = 'ba87a424-e9d2-44f1-92a9-996441b31131';
const CONSULTATION_ID = '5523ab80-6591-43f0-9205-59ac341035b0';

const DEMO_DEVOTEE = {
  id: '2b5bd615-1633-4c95-9b09-03efb2b9e429',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

const PENDING_ROW = {
  id: CONSULTATION_ID,
  reference: 'AC-20260812-628085',
  user_id: DEMO_DEVOTEE.id,
  astrologer_id: REAL_PROFILE_ID,
  astrologer_name: 'Acharya Vinod Sharma',
  minutes: 15,
  amount_inr: '375',
  currency: 'INR',
  status: 'pending',
  room_name: null,
  razorpay_order_id: 'order_demo_1',
  razorpay_payment_id: null,
  scheduled_at: null,
  created_at: new Date(),
  paid_at: null,
};

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(consultationRoutes, { prefix: '/api/v1/consultation' });
  return app;
}

/** The fire-and-forget ledger block runs off the response; let it drain. */
const drain = () => new Promise((r) => setTimeout(r, 20));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'devotee@demo.com' ? DEMO_DEVOTEE : null,
  );
  prismaMock.$executeRawUnsafe.mockResolvedValue(0);
  prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) =>
    /FROM astrologer_consultations WHERE id/.test(String(sql)) ? [PENDING_ROW] : [],
  );
  prismaMock.astrologerProfile.findUnique.mockResolvedValue({
    id: REAL_PROFILE_ID,
    userId: REAL_USER_ID,
  });
  prismaMock.commission.findFirst.mockResolvedValue(null);
  prismaMock.commission.createMany.mockResolvedValue({ count: 1 });
  prismaMock.astrologerProfile.update.mockResolvedValue({ id: REAL_PROFILE_ID });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function verify() {
  const app = await buildApp();
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/consultation/verify-payment',
    headers: { authorization: 'Bearer demo-devotee' },
    payload: { consultationId: CONSULTATION_ID },
  });
  await drain();
  await app.close();
  return res;
}

describe('AW-14 — verify-payment maintains the public consultation counter', () => {
  it('increments the astrologer profile counter by exactly 1', async () => {
    const res = await verify();
    expect(res.statusCode).toBe(200);
    expect(prismaMock.astrologerProfile.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.astrologerProfile.update).toHaveBeenCalledWith({
      where: { id: REAL_PROFILE_ID },
      data: { totalConsultations: { increment: 1 } },
    });
  });

  it('does not touch the counter when the ledger row already exists (replayed verify)', async () => {
    prismaMock.commission.findFirst.mockResolvedValue({ id: 'commission-1' });
    const res = await verify();
    expect(res.statusCode).toBe(200);
    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
    expect(prismaMock.astrologerProfile.update).not.toHaveBeenCalled();
  });

  it('does not touch the counter when there is no creditable astrologer', async () => {
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(null);
    prismaMock.astrologerProfile.findFirst.mockResolvedValue(null);
    const res = await verify();
    expect(res.statusCode).toBe(200);
    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
    expect(prismaMock.astrologerProfile.update).not.toHaveBeenCalled();
  });

  it('a counter failure never unwinds or hides the Commission row', async () => {
    prismaMock.astrologerProfile.update.mockRejectedValue(new Error('deadlock detected'));
    const res = await verify();
    expect(res.statusCode).toBe(200);
    // Commission.amount is the PROVIDER's 80% earning; percentage is the
    // PLATFORM's rate (lib/commission-math.ts). Both must survive intact.
    // DI-06 (F367): the insert is `createMany({ skipDuplicates })` —
    // ON CONFLICT DO NOTHING against UNIQUE commissions.booking_id, which this
    // writer shares with the puja-booking mint because the column is
    // polymorphic across puja_bookings and astrologer_consultations.
    expect(prismaMock.commission.createMany).toHaveBeenCalledWith({
      data: [
        {
          bookingId: CONSULTATION_ID,
          providerId: REAL_USER_ID,
          amount: 300,
          percentage: 0.2,
          status: 'PENDING',
        },
      ],
      skipDuplicates: true,
    });
  });
});
