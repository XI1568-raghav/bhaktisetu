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
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'prov-1', role: 'ASTROLOGER', isPrimary: true },
    ] as never);
    prismaMock.user.findMany.mockResolvedValue([{ id: 'prov-1', fullName: 'Astro Devi' }] as never);

    const res = await getPending();

    // No priest bookings in this fixture, so the ledger-ownership probe is
    // skipped and the pending scan is the only commission read.
    expect(prismaMock.commission.findMany).toHaveBeenCalledTimes(1);
    const groups = (res.json() as { groups: Array<{ role: string }> }).groups;
    expect(groups.map((g) => g.role)).toEqual(['ASTROLOGER']);
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

// ── batch9-review regression locks (2026-08-11) ──────────────────────────────
//
// Three independent ways this read-only summary told an admin to transfer money
// that was already owed to no one. Each test below fails if its fix is reverted.

/** The pending-balance scan, as opposed to the rail-A ownership probe. */
function pendingScanArgs(): { where: Record<string, unknown>; take?: number } {
  const call = prismaMock.commission.findMany.mock.calls
    .map((c) => c[0] as { where?: Record<string, unknown> })
    .find((a) => a?.where?.status === 'PENDING');
  if (!call) throw new Error('pending commission scan was never issued');
  return call as { where: Record<string, unknown>; take?: number };
}

describe('GET /admin/bookings/payouts/pending — double-transfer locks', () => {
  it('excludes commissions already claimed by an open payout request', async () => {
    // Commissions stay PENDING while linked to a request — processPayout only
    // flips them to PAID on completion. Reporting them here as well made the
    // same Rs 9,000 owed in two admin surfaces at once: settle from this summary
    // by UPI, then complete the request, and Rs 18,000 leaves on Rs 11,250 of
    // revenue.
    await getPending();
    expect(pendingScanArgs().where).toEqual({ status: 'PENDING', payoutRequestId: null });
  });

  it('drops a priest booking the Commission ledger owns — the legacy rail must not re-bill it', async () => {
    prismaMock.pujaBooking.findMany.mockResolvedValue([
      { id: 'bk-1', priestId: 'pr-1', priceAmount: new Prisma.Decimal('5000') },
      { id: 'bk-2', priestId: 'pr-1', priceAmount: new Prisma.Decimal('1000') },
    ] as never);
    // createPriestPayout REFUSES when a Commission owns the booking, so bk-1 has
    // no PriestPayout row at all and could never enter `alreadyPaidIds` the old
    // way — it was reported as owed forever, on top of the Rs 4,000 the unified
    // rail had already paid.
    prismaMock.priestPayout.findMany.mockResolvedValue([] as never);
    prismaMock.commission.findMany.mockImplementation(async (args: unknown) => {
      const where = (args as { where?: { bookingId?: unknown; status?: string } }).where ?? {};
      if (where.bookingId) return [{ bookingId: 'bk-1' }] as never; // rail-A owns bk-1
      return [] as never;
    });
    prismaMock.priest.findMany.mockResolvedValue([
      { id: 'pr-1', user: { fullName: 'Pandit Ramesh' } },
    ] as never);

    const groups = (await getPending()).json().groups as Array<{
      bookingsCount: number;
      totalPayout: number;
    }>;
    expect(groups).toHaveLength(1);
    expect(groups[0]!.bookingsCount).toBe(1);
    // Only bk-2: 0.75 x 1,000. bk-1's Rs 3,750 is not this rail's to pay.
    expect(groups[0]!.totalPayout).toBe(750);
  });

  it('emits ONE group per dual-role provider, not one per role each carrying the full total', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      { providerId: 'prov-1', amount: new Prisma.Decimal('4000') },
      { providerId: 'prov-1', amount: new Prisma.Decimal('5000') },
    ] as never);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'prov-1', role: 'WELLNESS_INSTRUCTOR', isPrimary: false },
      { userId: 'prov-1', role: 'ASTROLOGER', isPrimary: false },
    ] as never);
    prismaMock.user.findMany.mockResolvedValue([{ id: 'prov-1', fullName: 'Astro Devi' }] as never);

    const groups = (await getPending()).json().groups as Array<{
      role: string;
      totalPayout: number;
    }>;
    expect(groups).toHaveLength(1);
    // Declared payout precedence — the same answer resolveProviderRoleForUser
    // stamps onto the PayoutRequest, so queue and summary never disagree.
    expect(groups[0]!.role).toBe('ASTROLOGER');
    // The dashboard's "Total owed" is a sum over groups: two rows would have
    // read Rs 18,000 against a real Rs 9,000.
    expect(groups.reduce((s, g) => s + g.totalPayout, 0)).toBe(9000);
  });

  it('lets a primary assignment override precedence', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      { providerId: 'prov-1', amount: new Prisma.Decimal('1000') },
    ] as never);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'prov-1', role: 'PANDIT', isPrimary: true },
      { userId: 'prov-1', role: 'STORE_OWNER', isPrimary: false },
    ] as never);
    prismaMock.user.findMany.mockResolvedValue([{ id: 'prov-1', fullName: 'Pandit Ramesh' }] as never);

    const groups = (await getPending()).json().groups as Array<{ role: string }>;
    expect(groups).toHaveLength(1);
    expect(groups[0]!.role).toBe('PANDIT');
  });

  it('reports a STORE_OWNER balance the hardcoded role list never queried', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      { providerId: 'prov-2', amount: new Prisma.Decimal('2500') },
    ] as never);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'prov-2', role: 'STORE_OWNER', isPrimary: true },
    ] as never);
    prismaMock.user.findMany.mockResolvedValue([{ id: 'prov-2', fullName: 'Samagri Store' }] as never);

    const groups = (await getPending()).json().groups as Array<{
      role: string;
      totalPayout: number;
    }>;
    expect(groups).toEqual([
      expect.objectContaining({ role: 'STORE_OWNER', totalPayout: 2500 }),
    ]);
  });

  it('surfaces a balance whose provider has no payout role instead of dropping it', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      { providerId: 'prov-3', amount: new Prisma.Decimal('700') },
    ] as never);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'prov-3', role: 'DEVOTEE', isPrimary: true },
    ] as never);
    prismaMock.user.findMany.mockResolvedValue([{ id: 'prov-3', fullName: 'Orphan Row' }] as never);

    const groups = (await getPending()).json().groups as Array<{
      role: string;
      totalPayout: number;
    }>;
    expect(groups).toEqual([expect.objectContaining({ role: 'UNKNOWN', totalPayout: 700 })]);
  });
});

describe('GET /admin/bookings/payout-requests — status validation', () => {
  async function listRequests(query: string) {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/bookings/payout-requests${query}`,
      headers: { authorization: 'Bearer demo-admin' },
    });
    await app.close();
    return res;
  }

  it('400s on a status the enum cannot hold instead of 500ing the queue', async () => {
    // `?status=Pending` (wrong case), a typo, or the 'reversed' that migration
    // 20260810000000 added to ProviderPayoutStatus but NOT to
    // PayoutRequestStatus used to reach Prisma unvalidated and throw
    // PrismaClientValidationError out of an unhandled handler.
    for (const bad of ['Pending', 'reversed', 'nonsense']) {
      const res = await listRequests(`?status=${bad}`);
      expect(res.statusCode).toBe(400);
    }
    expect(prismaMock.payoutRequest.findMany).not.toHaveBeenCalled();
  });

  it('passes a legal status through, and treats absent/empty as "all"', async () => {
    prismaMock.payoutRequest.findMany.mockResolvedValue([] as never);

    expect((await listRequests('?status=completed')).statusCode).toBe(200);
    expect(
      (prismaMock.payoutRequest.findMany.mock.calls[0]![0] as { where: unknown }).where,
    ).toEqual({ status: 'completed' });

    expect((await listRequests('')).statusCode).toBe(200);
    expect(
      (prismaMock.payoutRequest.findMany.mock.calls[1]![0] as { where: unknown }).where,
    ).toEqual({});

    expect((await listRequests('?status=')).statusCode).toBe(200);
    expect(
      (prismaMock.payoutRequest.findMany.mock.calls[2]![0] as { where: unknown }).where,
    ).toEqual({});
  });
});
