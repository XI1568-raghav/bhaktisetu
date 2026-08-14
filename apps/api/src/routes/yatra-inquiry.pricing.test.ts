import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { yatraInquiryRoutes } from './yatra-inquiry.js';

// COM-05 (prod sweep 2026-08-12): POST /yatra-inquiry/create-order took the
// amount to charge straight from the request body —
//   `totalInr: z.number().int().min(500).max(2_000_000)` — with no auth in
// front of it. A ₹1,49,000/head Char Dham premium package could be paid for
// with ₹500 by anyone on the internet, and the HMAC in /verify-payment would
// happily confirm it, because the signature is checked against a Razorpay
// order created at the attacker's own amount.
//
// These tests pin the two halves of the fix:
//   1. the endpoint requires an authenticated caller;
//   2. the charged amount is derived server-side from the package catalogue,
//      never from the client.

const DEMO_DEVOTEE = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

function makeApp() {
  const app = Fastify();
  void app.register(yatraInquiryRoutes, { prefix: '/api/v1/yatra-inquiry' });
  return app;
}

const BODY = {
  yatraSlug: 'char-dham',
  yatraTitle: 'Char Dham Yatra',
  packageTier: 'premium' as const,
  startDate: '2026-09-10',
  travelersCount: 2,
  // The attack: ₹500 for a ₹2,98,000 booking.
  totalInr: 500,
  buyer: {
    name: 'QA Buyer',
    email: 'qa@example.com',
    phone: '9876543210',
    country: 'India',
  },
};

describe('yatra create-order — server-derived price + auth (COM-05)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'devotee@demo.com' ? DEMO_DEVOTEE : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
    prismaMock.$executeRawUnsafe.mockResolvedValue(1);
    prismaMock.$queryRawUnsafe.mockImplementation(async (_sql: string, ...args: any[]) => [
      {
        id: '22222222-2222-4222-8222-222222222222',
        reference: 'YTR-20260813-ABCDEF',
        yatra_slug: args[1],
        yatra_title: args[2],
        package_tier: args[3],
        start_date: args[4],
        travelers_count: args[5],
        amount_inr: String(args[6]),
        currency: 'INR',
        buyer_name: args[7],
        buyer_email: args[8],
        buyer_phone: args[9],
        buyer_country: args[10],
        razorpay_order_id: args[11],
        razorpay_payment_id: null,
        status: 'pending_payment',
        created_at: new Date(),
        paid_at: null,
      },
    ]);
  });

  it('rejects an unauthenticated create-order', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/yatra-inquiry/create-order',
      payload: BODY,
    });
    expect(res.statusCode).toBe(401);
  });

  it('charges the catalogue price, not the client-sent totalInr', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/yatra-inquiry/create-order',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: BODY,
    });
    expect(res.statusCode).toBe(201);
    const json = res.json();
    // char-dham premium = ₹1,49,000 per person × 2 travellers.
    expect(json.amountInPaise).toBe(149000 * 2 * 100);
    expect(json.amountInr).toBe(149000 * 2);
  });

  it('persists the server-derived amount, never the client one', async () => {
    const app = makeApp();
    await app.inject({
      method: 'POST',
      url: '/api/v1/yatra-inquiry/create-order',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: BODY,
    });
    const insert = prismaMock.$queryRawUnsafe.mock.calls.find((c: any[]) =>
      String(c[0]).includes('INSERT INTO yatra_bookings'),
    );
    expect(insert).toBeDefined();
    // positional arg 7 (index 7 counting the SQL string) is amount_inr.
    expect(insert![7]).toBe(149000 * 2);
    expect(insert!).not.toContain(500);
  });

  it('rejects an unknown yatra slug rather than trusting the client price', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/yatra-inquiry/create-order',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { ...BODY, yatraSlug: 'not-a-real-yatra' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('unknown_package');
  });

  it('rejects when the client-displayed total disagrees with the server price', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/yatra-inquiry/create-order',
      headers: { authorization: 'Bearer demo-devotee' },
      payload: { ...BODY, totalInr: 500, confirmTotalInr: 500 },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('price_mismatch');
    expect(res.json().serverTotalInr).toBe(149000 * 2);
  });
});
