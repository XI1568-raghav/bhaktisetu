/**
 * AO-18 — GET /admin/bookings answered 200 with an empty list for a status
 * that does not exist.
 *
 * `listQuerySchema.status` was `z.string().optional()`, so any string passed
 * validation and became `where.status`. Prisma then rejects the value as an
 * invalid enum member, the handler's own catch swallows the throw, and the
 * admin reads `{"bookings":[],"page":1,"limit":50,"total":0}` — indistinguish-
 * able from "there are no bookings in that state". Measured live on the sweep:
 * `?status=NOT_A_STATUS` -> 200 empty, while the sibling
 * /admin/bookings/payout-requests?status=… -> 400 with the legal values.
 *
 * Scope note, deliberate: this only adds the enum. `BookingStatus` is
 * lowercase and `CommissionStatus` is uppercase across the admin surface;
 * aligning that casing is a BREAKING change to a live API and stays an owner
 * decision, so the accepted values here are exactly the ones the column has
 * always held.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminBookingsRoutes } from './admin-bookings.js';

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

async function get(url: string) {
  const app = Fastify({ logger: false });
  await app.register(async (instance) => {
    await adminBookingsRoutes(instance);
  }, { prefix: '/api/v1/admin/bookings' });
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/admin/bookings${url}`,
    headers: { authorization: 'Bearer demo-admin' },
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
  prismaMock.pujaBooking.findMany.mockResolvedValue([] as never);
  prismaMock.pujaBooking.count.mockResolvedValue(0 as never);
});

describe('AO-18 — an unknown ?status is a 400, not an empty page', () => {
  it('rejects a status the enum has never held', async () => {
    const res = await get('?status=NOT_A_STATUS');
    expect(res.statusCode).toBe(400);
    // Never reached Prisma: the query must be refused before the DB is asked.
    expect(prismaMock.pujaBooking.findMany).not.toHaveBeenCalled();
  });

  it('names the legal values so the caller can fix the request', async () => {
    const body = (await get('?status=NOT_A_STATUS')).json();
    expect(JSON.stringify(body)).toMatch(/pending_payment/);
    expect(JSON.stringify(body)).toMatch(/video_uploaded/);
  });

  it('rejects a wrong-CASE status rather than reading it as "no rows"', async () => {
    // The exact trap the CommissionsPanel already shipped once. `COMPLETED` is
    // a real state spelled the other surface's way; answering 200/empty tells
    // the operator there are no completed bookings.
    const res = await get('?status=COMPLETED');
    expect(res.statusCode).toBe(400);
  });

  it('still serves every real status', async () => {
    for (const status of [
      'pending_payment',
      'confirmed',
      'priest_assigned',
      'in_progress',
      'completed',
      'video_uploaded',
      'delivered',
      'cancelled',
      'refunded',
    ]) {
      const res = await get(`?status=${status}`);
      expect(res.statusCode, `status=${status}`).toBe(200);
    }
  });

  it('still serves an unfiltered list', async () => {
    const res = await get('');
    expect(res.statusCode).toBe(200);
    expect(res.json().bookings).toEqual([]);
  });
});
