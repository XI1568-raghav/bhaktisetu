import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const processPayout = vi.fn();
vi.mock('../services/payout.service.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, processPayout: (...a: unknown[]) => processPayout(...a) };
});

import Fastify from 'fastify';
import { adminBookingsRoutes } from './admin-bookings.js';

/**
 * DI-10 — a repeat "Complete" was indistinguishable from the first, on a
 * MANUAL-transfer flow.
 *
 * Five concurrent completes on PayoutRequest c0a1b627 (₹2,310) all returned
 * HTTP 200 with identical bodies, and a later sequential re-complete did too.
 * The ledger is safe — exactly ₹2,310 flipped to PAID once and the reference
 * kept its original value — but the human is not informed: the actual bank/UPI
 * transfer happens OUTSIDE the system, so an admin who clicks Complete twice
 * gets two identical successes and no signal that the first click already
 * recorded a transfer. That invites a second real-world payment the software
 * will never know about.
 *
 * `changed` was already computed inside the transaction and then thrown away.
 * This pins that it reaches the caller.
 */

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(
    async (instance) => {
      await adminBookingsRoutes(instance);
    },
    { prefix: '/api/v1/admin/bookings' },
  );
  return app;
}

async function complete(reference?: string) {
  const app = await buildApp();
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/bookings/payout-requests/11111111-1111-4111-8111-111111111111/process',
    headers: { authorization: 'Bearer demo-admin', 'content-type': 'application/json' },
    payload: JSON.stringify({ action: 'complete', reference }),
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
  );
});

describe('DI-10 — the second Complete says it changed nothing', () => {
  it('reports alreadyCompleted:false and the processing timestamp on the first call', async () => {
    const processedAt = new Date('2026-08-12T09:00:00.000Z');
    processPayout.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      status: 'completed',
      processedAt,
      reference: 'UTR123',
      alreadyCompleted: false,
    });

    const res = await complete('UTR123');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.payout.alreadyCompleted).toBe(false);
    expect(body.payout.reference).toBe('UTR123');
  });

  it('reports alreadyCompleted:true on a repeat, carrying when and under which reference', async () => {
    const processedAt = new Date('2026-08-12T09:00:00.000Z');
    processPayout.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      status: 'completed',
      processedAt,
      reference: 'UTR123',
      alreadyCompleted: true,
    });

    const res = await complete('UTR-SECOND-CLICK');
    expect(res.statusCode).toBe(200);
    const body = res.json();

    // The whole finding: this response must NOT be identical to the first one.
    expect(body.payout.alreadyCompleted).toBe(true);
    expect(body.payout.processedAt).toBe(processedAt.toISOString());
    // And it must show the reference that was actually recorded, not the one
    // the second click just typed — otherwise the UI reassures the admin with
    // a reference no transfer was made under.
    expect(body.payout.reference).toBe('UTR123');
  });
});
