import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminBookingsRoutes, __testing } from './admin-bookings.js';

// ── RV-22 regression lock ────────────────────────────────────────────────────
//
// GET /admin/bookings/payouts/pending ran three paginationless findMany calls,
// and the commission scan was re-executed once per non-priest role — three
// identical serial full-table reads. It also swallowed any failure into
// `{ groups: [] }`, so a broken query was indistinguishable from "nothing left
// to settle" and an admin could skip a payout run.

const { resolveScanLimit, PAYOUT_SCAN_DEFAULT, PAYOUT_SCAN_MAX, PAYOUT_SCAN_MIN } = __testing;

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

const DEMO_DEVOTEE = {
  id: 'user-demo-devotee-1',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(async (instance) => {
    await adminBookingsRoutes(instance);
  }, { prefix: '/api/v1/admin/bookings' });
  return app;
}

async function getPending(query = '') {
  const app = await buildApp();
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/admin/bookings/payouts/pending${query}`,
    headers: { authorization: 'Bearer demo-admin' },
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test'; // enables the demo-token bypass in auth middleware
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) => {
    if (args.where.email === 'admin@demo.com') return DEMO_ADMIN;
    if (args.where.email === 'devotee@demo.com') return DEMO_DEVOTEE;
    return null;
  });
  // Default: nothing pending anywhere. Individual tests override.
  prismaMock.pujaBooking.findMany.mockResolvedValue([] as never);
  prismaMock.priestPayout.findMany.mockResolvedValue([] as never);
  prismaMock.commission.findMany.mockResolvedValue([] as never);
  prismaMock.priest.findMany.mockResolvedValue([] as never);
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([] as never);
  prismaMock.user.findMany.mockResolvedValue([] as never);
});

describe('resolveScanLimit — RV-22', () => {
  it('defaults when the operator passes nothing or nonsense', () => {
    for (const raw of [undefined, '', 'abc', '0', '-5', 'NaN']) {
      expect(resolveScanLimit(raw)).toBe(PAYOUT_SCAN_DEFAULT);
    }
  });

  it('clamps into [MIN, MAX] so no query can be unbounded again', () => {
    expect(resolveScanLimit('1')).toBe(PAYOUT_SCAN_MIN);
    expect(resolveScanLimit('999999')).toBe(PAYOUT_SCAN_MAX);
    expect(resolveScanLimit(String(PAYOUT_SCAN_MAX + 1))).toBe(PAYOUT_SCAN_MAX);
  });

  it('honours a sane operator-supplied window, floored to an integer', () => {
    expect(resolveScanLimit('750')).toBe(750);
    expect(resolveScanLimit('750.9')).toBe(750);
  });
});

describe('GET /admin/bookings/payouts/pending — RV-22', () => {
  it('403 for a non-admin — the summary is operator-only', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/bookings/payouts/pending',
      headers: { authorization: 'Bearer demo-devotee' },
    });
    expect(res.statusCode).toBe(403);
    expect(prismaMock.pujaBooking.findMany).not.toHaveBeenCalled();
    await app.close();
  });

  it('bounds every scan with a take instead of reading whole tables', async () => {
    const res = await getPending();
    expect(res.statusCode).toBe(200);

    const bookingArgs = prismaMock.pujaBooking.findMany.mock.calls[0]![0] as {
      take?: number;
      orderBy?: unknown;
    };
    expect(bookingArgs.take).toBe(PAYOUT_SCAN_DEFAULT);
    // Newest-first, so the bounded window is the settlement-relevant one.
    expect(bookingArgs.orderBy).toEqual({ createdAt: 'desc' });

    const commissionArgs = prismaMock.commission.findMany.mock.calls[0]![0] as { take?: number };
    expect(commissionArgs.take).toBe(PAYOUT_SCAN_DEFAULT);

    expect(res.json()).toMatchObject({ ok: true, scanLimit: PAYOUT_SCAN_DEFAULT, truncated: false });
  });

  it('lets an operator widen the window for a big settlement run', async () => {
    const res = await getPending('?limit=1500');
    expect((prismaMock.pujaBooking.findMany.mock.calls[0]![0] as { take: number }).take).toBe(1500);
    expect(res.json()).toMatchObject({ scanLimit: 1500 });
  });

  it('fetches the PENDING commissions ONCE, not once per non-priest role', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      { providerId: 'prov-1', amount: new Prisma.Decimal('1000') },
    ] as never);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([{ userId: 'prov-1' }] as never);
    prismaMock.user.findMany.mockResolvedValue([{ id: 'prov-1', fullName: 'Astro Devi' }] as never);

    const res = await getPending();

    // Three non-priest roles are aggregated; the identical scan must not repeat.
    expect(prismaMock.commission.findMany).toHaveBeenCalledTimes(1);
    const groups = (res.json() as { groups: Array<{ role: string }> }).groups;
    expect(groups.map((g) => g.role).sort()).toEqual([
      'ASTROLOGER',
      'GAUSHALA_MANAGER',
      'WELLNESS_INSTRUCTOR',
    ]);
  });

  it('scopes the already-paid lookup to the window and never truncates it', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([
      { id: 'bk-1', priestId: 'pr-1', priceAmount: new Prisma.Decimal('1000') },
      { id: 'bk-2', priestId: 'pr-1', priceAmount: new Prisma.Decimal('1000') },
    ] as never);
    prismaMock.priestPayout.findMany.mockResolvedValue([{ bookingId: 'bk-1' }] as never);
    prismaMock.priest.findMany.mockResolvedValue([
      { id: 'pr-1', user: { fullName: 'Pandit Ramesh' } },
    ] as never);

    const res = await getPending();

    const payoutArgs = prismaMock.priestPayout.findMany.mock.calls[0]![0] as {
      where: { bookingId: { in: string[] } };
      take?: number;
    };
    expect(payoutArgs.where.bookingId.in).toEqual(['bk-1', 'bk-2']);
    // A `take` here would under-detect settled bookings and re-surface them as
    // pending — the one failure mode that can make an admin pay a pandit twice.
    expect(payoutArgs.take).toBeUndefined();

    const groups = (res.json() as { groups: Array<{ bookingsCount: number }> }).groups;
    expect(groups).toHaveLength(1);
    expect(groups[0]!.bookingsCount).toBe(1); // bk-1 already paid, only bk-2 pending
  });

  it('flags truncated when a scan fills its window — a partial view must not read as "all settled"', async () => {
    const full = Array.from({ length: PAYOUT_SCAN_DEFAULT }, (_, i) => ({
      id: `bk-${i}`,
      priestId: null,
      priceAmount: new Prisma.Decimal('1000'),
    }));
    prismaMock.pujaBooking.findMany.mockResolvedValue(full as never);

    expect((await getPending()).json()).toMatchObject({ truncated: true });
  });

  it('reports ok:false on failure so an empty list is never mistaken for "nothing to pay"', async () => {
    prismaMock.pujaBooking.findMany.mockRejectedValue(new Error('db down'));

    const res = await getPending();
    expect(res.statusCode).toBe(200); // the dashboard still renders
    expect(res.json()).toMatchObject({ ok: false, groups: [], truncated: false });
  });
});
