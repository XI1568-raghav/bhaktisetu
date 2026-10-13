import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { getBookingById } = vi.hoisted(() => ({ getBookingById: vi.fn() }));
vi.mock('../services/booking.service.js', async (importOriginal) => {
  const actual = (await importOriginal()) as { bookingService: Record<string, unknown> } & Record<string, unknown>;
  return { ...actual, bookingService: Object.assign(Object.create(actual.bookingService as object), { getBookingById }) };
});

import Fastify from 'fastify';
import { bookingRoutes } from './bookings.js';

// QA 2026-10-13: /bookings/:id/cancel-quote on an UNPAID booking printed a refund tier
// ("75% refund") for a payment that never happened.

const DEVOTEE = { id: '99999999-9999-4999-8999-999999999999', email: 'devotee@demo.com', phone: null, fullName: 'D', subscriptionTier: 'free', blocked: false };
const BK = '11111111-1111-4111-8111-111111111111';

async function quote() {
  const app = Fastify({ logger: false });
  await app.register(bookingRoutes, { prefix: '/api/v1/bookings' });
  const res = await app.inject({ method: 'GET', url: `/api/v1/bookings/${BK}/cancel-quote`, headers: { authorization: 'Bearer demo-devotee' } });
  await app.close();
  return res;
}

function slotInHours(h: number) {
  const t = new Date(Date.now() + h * 3_600_000);
  return { scheduledDate: new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate())), scheduledTimeSlot: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ALLOW_DEMO_TOKENS = 'true';
  prismaMock.user.findUnique.mockImplementation(async (a: any) => (a.where.email === 'devotee@demo.com' ? DEVOTEE : null));
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
  prismaMock.pujaBooking.findUnique.mockResolvedValue({ cancelPolicyJson: null } as any);
});

describe('GET /bookings/:id/cancel-quote', () => {
  it('shows NO refund tier for an unpaid (pending_payment) booking', async () => {
    getBookingById.mockResolvedValue({ status: 'pending_payment', priceAmount: '1151', ...slotInHours(60) });
    const res = await quote();
    expect(res.statusCode).toBe(200);
    const b = res.json();
    expect(b).toMatchObject({ unpaid: true, cancellationAllowed: true, refundFraction: 0, refundAmountInr: 0, feeAmountInr: 0 });
    expect(b.tierLabel).toMatch(/nothing was charged/i);
    expect(b.tierLabel).not.toMatch(/%/);
  });

  it('an unpaid booking stays cancellable even inside the 24h cutoff', async () => {
    getBookingById.mockResolvedValue({ status: 'pending_payment', priceAmount: '1151', ...slotInHours(5) });
    const b = (await quote()).json();
    expect(b.cancellationAllowed).toBe(true);
    expect(b.unpaid).toBe(true);
  });

  it('a paid booking still gets the ladder tier (not flagged unpaid)', async () => {
    getBookingById.mockResolvedValue({ status: 'confirmed', priceAmount: '1000', ...slotInHours(72) });
    const b = (await quote()).json();
    expect(b.unpaid).toBeUndefined();
    expect(b.refundFraction).toBe(1);
    expect(b.refundAmountInr).toBe(1000);
    expect(b.tierLabel).toMatch(/refund/i);
  });

  it('a paid booking inside the cutoff still reports cancellation is not allowed', async () => {
    getBookingById.mockResolvedValue({ status: 'confirmed', priceAmount: '1000', ...slotInHours(6) });
    const b = (await quote()).json();
    expect(b.cancellationAllowed).toBe(false);
    expect(b.refundAmountInr).toBe(0);
  });
});
