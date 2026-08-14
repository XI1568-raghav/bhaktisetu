import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { consultationRoutes } from './consultation.js';

/**
 * AW-06 (2026-08-12, P1) regression lock — cash leakage on cancellation.
 *
 * POST /consultation/:id/cancel flipped `astrologer_consultations.status` to
 * 'cancelled' and touched nothing else. The Commission row written at
 * verify-payment (amount = the astrologer's 80%) stayed PENDING and fully
 * withdrawable, so the platform refunded the devotee the full gross AND still
 * paid the astrologer their share through /payouts + the weekly settlement
 * cron — a 100% loss plus an 80% payout on every cancelled consultation, and a
 * self-deal any devotee could run against their own second account.
 *
 * The cancel handler must now unwind the ledger through the SAME shared leaf
 * module both puja refund rails use (services/ledger-reversal.service.ts) —
 * never a re-inlined copy — and only when the cancellation is refund-eligible.
 */

const DEVOTEE_ID = '2b5bd615-1633-4c95-9b09-03efb2b9e429';
const CONSULTATION_ID = '5523ab80-6591-43f0-9205-59ac341035b0';

const DEMO_DEVOTEE = {
  id: DEVOTEE_ID,
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

/** A confirmed, paid consultation scheduled comfortably inside the refund window. */
function confirmedRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CONSULTATION_ID,
    reference: 'AC-20260812-628085',
    user_id: DEVOTEE_ID,
    astrologer_id: '71e54617-6963-418e-845f-920f4350505b',
    astrologer_name: 'Acharya Vinod Sharma',
    minutes: 20,
    per_minute_rate_inr: '25.00',
    amount_inr: '500.00',
    currency: 'INR',
    status: 'confirmed',
    room_name: 'darshya-astrologer-acharya-vinod-sharma-e8cacedaa8ac',
    scheduled_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    paid_at: new Date(),
    ...overrides,
  };
}

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(consultationRoutes, { prefix: '/api/v1/consultation' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) => {
    if (args.where.email === 'devotee@demo.com') return DEMO_DEVOTEE;
    return null;
  });
  prismaMock.$executeRawUnsafe.mockResolvedValue(0);
  prismaMock.commission.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.commission.count.mockResolvedValue(0);
  prismaMock.templePayout.updateMany.mockResolvedValue({ count: 0 });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AW-06 — cancelling a refund-eligible consultation reverses the astrologer commission', () => {
  it('flips the PENDING, unclaimed Commission for that booking to REVERSED', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([confirmedRow()]);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/consultation/${CONSULTATION_ID}/cancel`,
      headers: { authorization: 'Bearer demo-devotee' },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json().refundEligible).toBe(true);

    expect(prismaMock.commission.updateMany).toHaveBeenCalledTimes(1);
    const [args] = prismaMock.commission.updateMany.mock.calls[0] as [
      { where: Record<string, unknown>; data: Record<string, unknown> },
    ];
    // Only unclaimed rows: money already PAID or linked to a PayoutRequest has
    // left the building and is a finance decision, not a cancel-handler one.
    expect(args.where).toMatchObject({
      bookingId: CONSULTATION_ID,
      status: 'PENDING',
      payoutRequestId: null,
    });
    expect(args.data).toEqual({ status: 'REVERSED' });
  });

  it('reports the reversal on the response so the caller is not guessing', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([confirmedRow()]);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/consultation/${CONSULTATION_ID}/cancel`,
      headers: { authorization: 'Bearer demo-devotee' },
    });
    await app.close();

    expect(res.json().commissionReversed).toBe(1);
  });

  it('does NOT reverse when the cancellation is past the 24h refund window', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      confirmedRow({ scheduled_at: new Date(Date.now() + 60 * 60 * 1000) }),
    ]);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/consultation/${CONSULTATION_ID}/cancel`,
      headers: { authorization: 'Bearer demo-devotee' },
    });
    await app.close();

    expect(res.json().refundEligible).toBe(false);
    // No refund is owed, so the astrologer keeps the earning.
    expect(prismaMock.commission.updateMany).not.toHaveBeenCalled();
  });

  it('survives an already-settled commission instead of 500ing on the puja-only flag write', async () => {
    // reverseBookingLedger marks the PujaBooking for manual reconciliation when
    // money has already moved. A consultation's bookingId is NOT a PujaBooking
    // row, so that write must never be allowed to fail the cancellation.
    prismaMock.$queryRawUnsafe.mockResolvedValue([confirmedRow()]);
    prismaMock.commission.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.commission.count.mockResolvedValue(1);
    prismaMock.pujaBooking.update.mockRejectedValue(
      Object.assign(new Error('No record was found for an update'), { code: 'P2025' }),
    );

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/consultation/${CONSULTATION_ID}/cancel`,
      headers: { authorization: 'Bearer demo-devotee' },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json().cancelled).toBe(true);
    expect(res.json().ledgerManualReview).toBe(1);
  });
});
