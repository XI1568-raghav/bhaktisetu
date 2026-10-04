import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminBookingsRoutes } from './admin-bookings.js';

/**
 * Customer test 2026-10-05 — the admin could not see a stranded booking.
 *
 * A paid booking in the default "scheduled" tier sits `confirmed` with no pandit
 * until one takes it. The admin menu had no Bookings page, and the list API could
 * filter by status but not by "no pandit yet", and did not say which pandit held
 * a booking. On launch day the person running the platform had no screen that
 * answered "which paid bookings is nobody working on?".
 */
const DEMO_ADMIN = {
  id: 'user-demo-admin-1', email: 'admin@demo.com', phone: null, fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass', blocked: false,
};

async function get(query: string) {
  const app = Fastify({ logger: false });
  await app.register(async (i) => { await adminBookingsRoutes(i); }, { prefix: '/api/v1/admin/bookings' });
  const res = await app.inject({ method: 'GET', url: `/api/v1/admin/bookings${query}`, headers: { authorization: 'Bearer demo-admin' } });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
  );
  prismaMock.pujaBooking.findMany.mockResolvedValue([]);
  prismaMock.pujaBooking.count.mockResolvedValue(0);
});

describe('GET /admin/bookings?waiting=1', () => {
  it('asks only for paid bookings that have no pandit, soonest slot first', async () => {
    const res = await get('?waiting=1');
    expect(res.statusCode).toBe(200);
    const args = prismaMock.pujaBooking.findMany.mock.calls[0]![0] as any;
    expect(args.where).toEqual({ status: 'confirmed', priestId: null });
    expect(args.orderBy).toEqual([{ scheduledDate: 'asc' }, { createdAt: 'asc' }]);
    expect((prismaMock.pujaBooking.count.mock.calls[0]![0] as any).where).toEqual({ status: 'confirmed', priestId: null });
  });

  it('accepts "true" as well, and ignores any other value', async () => {
    await get('?waiting=true');
    expect((prismaMock.pujaBooking.findMany.mock.calls[0]![0] as any).where).toEqual({ status: 'confirmed', priestId: null });
    vi.clearAllMocks();
    prismaMock.pujaBooking.findMany.mockResolvedValue([]);
    prismaMock.pujaBooking.count.mockResolvedValue(0);
    const res = await get('?waiting=maybe');
    expect(res.statusCode).toBe(400);
  });

  it('leaves the default list exactly as it was: newest first, any status', async () => {
    await get('');
    const args = prismaMock.pujaBooking.findMany.mock.calls[0]![0] as any;
    expect(args.where).toEqual({});
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('a status filter still works and is not overridden by waiting being absent', async () => {
    await get('?status=delivered');
    expect((prismaMock.pujaBooking.findMany.mock.calls[0]![0] as any).where).toEqual({ status: 'delivered' });
  });

  it('says which pandit holds each booking', async () => {
    await get('');
    const include = (prismaMock.pujaBooking.findMany.mock.calls[0]![0] as any).include;
    expect(include.priest).toEqual({ select: { displayName: true } });
  });
});
