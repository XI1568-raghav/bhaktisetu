import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminOpsRoutes, __testing } from './admin-ops.js';

// P0-17 SLA-breach bulk-resolve — integration tests for
// POST /api/v1/admin/ops/sla-overdue-bookings/resolve.
//
// Mounts adminOpsRoutes under /api/v1/admin/ops and exercises the four
// behaviours the founder-gated endpoint must guarantee:
//   (a) admin can resolve a refund  → 200, booking flipped to cancelled,
//       cancellationReason carries the 'SLA breach auto-refund' prefix;
//   (b) non-admin (devotee)         → 403;
//   (c) invalid action              → 400 (zod enum reject);
//   (d) unknown bookingId           → 200 with the id in the errors array.
//
// Demo-token auth: 'demo-admin' / 'demo-devotee' map to seeded users via
// prisma.user.findUnique({ where: { email } }). We mock that lookup to
// return synthetic user records — no DB needed. The demo-token path sets
// roles directly from the in-middleware DEMO_ROLE_MAP, so no
// userRoleAssignment mock is required.

const { resolveSchema } = __testing;

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
    await adminOpsRoutes(instance);
  }, { prefix: '/api/v1/admin/ops' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default demo-token → user resolution. requireRole('admin') reads roles
  // off the in-middleware DEMO_ROLE_MAP (admin → ['ADMIN','DEVOTEE'],
  // devotee → ['DEVOTEE']), so only the user row lookup needs mocking.
  prismaMock.user.findUnique.mockImplementation(
    async (args: { where: { email?: string } }) => {
      if (args.where.email === 'admin@demo.com') return DEMO_ADMIN;
      if (args.where.email === 'devotee@demo.com') return DEMO_DEVOTEE;
      return null;
    },
  );
  process.env.NODE_ENV = 'test'; // enables demo-token bypass in auth middleware
  // CRON_AUTH_TOKEN is irrelevant to the resolve route (it uses
  // authenticateUser + requireRole('admin')), but the token-gated GETs in
  // the same plugin read it at module load. Leave unset — we never hit them.
  delete process.env.CRON_AUTH_TOKEN;
});

describe('admin-ops resolveSchema', () => {
  it('accepts a valid refund payload', () => {
    const r = resolveSchema.safeParse({
      bookingIds: ['BS-20260427-K3HSD'],
      action: 'refund',
      note: 'priest no-show, refund devotee',
    });
    expect(r.success).toBe(true);
  });

  it('accepts all three valid actions', () => {
    for (const action of ['refund', 'fulfill', 'cancel'] as const) {
      expect(
        resolveSchema.safeParse({ bookingIds: ['x'], action, note: 'n' }).success,
      ).toBe(true);
    }
  });

  it('rejects an unknown action', () => {
    expect(
      resolveSchema.safeParse({ bookingIds: ['x'], action: 'rebill', note: 'n' }).success,
    ).toBe(false);
  });

  it('rejects an empty bookingIds array', () => {
    expect(
      resolveSchema.safeParse({ bookingIds: [], action: 'refund', note: 'n' }).success,
    ).toBe(false);
  });

  it('rejects a payload missing bookingIds', () => {
    expect(
      resolveSchema.safeParse({ action: 'refund', note: 'n' }).success,
    ).toBe(false);
  });

  it('rejects an empty note', () => {
    expect(
      resolveSchema.safeParse({ bookingIds: ['x'], action: 'refund', note: '' }).success,
    ).toBe(false);
  });

  it('caps bookingIds at 200', () => {
    const ids = Array.from({ length: 200 }, (_, i) => `id-${i}`);
    expect(
      resolveSchema.safeParse({ bookingIds: ids, action: 'cancel', note: 'n' }).success,
    ).toBe(true);
    expect(
      resolveSchema.safeParse({ bookingIds: [...ids, 'one-too-many'], action: 'cancel', note: 'n' })
        .success,
    ).toBe(false);
  });
});

describe('POST /api/v1/admin/ops/sla-overdue-bookings/resolve', () => {
  it('401 without auth header (authenticateUser runs before requireRole)', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/ops/sla-overdue-bookings/resolve',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ bookingIds: ['x'], action: 'refund', note: 'n' }),
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('403 for non-admin (devotee) even with a valid body', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/ops/sla-overdue-bookings/resolve',
      headers: {
        authorization: 'Bearer demo-devotee',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ bookingIds: ['x'], action: 'refund', note: 'n' }),
    });
    expect(res.statusCode).toBe(403);
    // Body must never reach Prisma for a non-admin.
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
    await app.close();
  });

  it('400 on invalid action (zod enum reject)', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/ops/sla-overdue-bookings/resolve',
      headers: {
        authorization: 'Bearer demo-admin',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ bookingIds: ['x'], action: 'rebill', note: 'n' }),
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as Record<string, unknown>;
    expect(body.error).toBe('Invalid body');
    expect(body.details).toBeDefined();
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
    await app.close();
  });

  it('admin refund: flips booking to cancelled with SLA-breach auto-refund annotation', async () => {
    // Found by UUID id (the canonical SLA-feed key).
    prismaMock.pujaBooking.findUnique.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000001',
      bookingNumber: 'BS-20260427-K3HSD',
      status: 'priest_assigned',
    });
    prismaMock.pujaBooking.update.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000001',
      status: 'cancelled',
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/ops/sla-overdue-bookings/resolve',
      headers: {
        authorization: 'Bearer demo-admin',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({
        bookingIds: ['00000000-0000-0000-0000-000000000001'],
        action: 'refund',
        note: 'priest no-show, refund devotee',
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      ok: boolean;
      resolved: { bookingId: string; action: string; status: string }[];
      errors: { bookingId: string; error: string }[];
    };
    expect(body.ok).toBe(true);
    expect(body.resolved).toHaveLength(1);
    expect(body.resolved[0]).toEqual({
      bookingId: 'BS-20260427-K3HSD',
      action: 'refund',
      status: 'cancelled',
    });
    expect(body.errors).toEqual([]);
    // The update must set status=cancelled + an annotated cancellationReason,
    // and stamp cancelledAt. It must NOT touch money — no payment/refund
    // service is invoked (none is imported by the route).
    expect(prismaMock.pujaBooking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        data: expect.objectContaining({
          status: 'cancelled',
          cancellationReason: expect.stringContaining('SLA breach auto-refund'),
          cancelledAt: expect.any(Date),
        }),
      }),
    );
    await app.close();
  });

  it('admin fulfill: flips booking to completed (no cancelledAt)', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000002',
      bookingNumber: 'BS-20260427-43U88',
      status: 'priest_assigned',
    });
    prismaMock.pujaBooking.update.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000002',
      status: 'completed',
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/ops/sla-overdue-bookings/resolve',
      headers: {
        authorization: 'Bearer demo-admin',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({
        bookingIds: ['00000000-0000-0000-0000-000000000002'],
        action: 'fulfill',
        note: 'priest delivered offline, proof on file',
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      resolved: { bookingId: string; action: string; status: string }[];
    };
    expect(body.resolved[0]).toEqual({
      bookingId: 'BS-20260427-43U88',
      action: 'fulfill',
      status: 'completed',
    });
    const updateCalls = (prismaMock.pujaBooking.update as ReturnType<typeof vi.fn>).mock.calls;
    const call = updateCalls[0]![0] as { data: { status: string; cancellationReason?: string; cancelledAt?: Date } };
    expect(call.data.status).toBe('completed');
    expect(call.data.cancellationReason).toContain('SLA breach fulfilled');
    expect(call.data.cancelledAt).toBeUndefined();
    await app.close();
  });

  it('unknown bookingId: reported in errors[], no update attempted for that id', async () => {
    // Both the UUID lookup and the bookingNumber fallback miss.
    prismaMock.pujaBooking.findUnique.mockResolvedValueOnce(null);
    prismaMock.pujaBooking.findFirst.mockResolvedValueOnce(null);

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/ops/sla-overdue-bookings/resolve',
      headers: {
        authorization: 'Bearer demo-admin',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({
        bookingIds: ['BS-NOPE-NOTREAL'],
        action: 'cancel',
        note: 'test unknown id',
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      ok: boolean;
      resolved: unknown[];
      errors: { bookingId: string; error: string }[];
    };
    expect(body.ok).toBe(true);
    expect(body.resolved).toEqual([]);
    expect(body.errors).toEqual([
      { bookingId: 'BS-NOPE-NOTREAL', error: 'Booking not found' },
    ]);
    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
    await app.close();
  });

  it('resolves by bookingNumber when the UUID lookup misses (BS-… form)', async () => {
    // Simulates the founder pasting the human-readable booking number from
    // the SLA feed rather than the UUID.
    prismaMock.pujaBooking.findUnique.mockResolvedValueOnce(null); // not a UUID
    prismaMock.pujaBooking.findFirst.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000003',
      bookingNumber: 'BS-20260427-H5FSK',
      status: 'priest_assigned',
    });
    prismaMock.pujaBooking.update.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000003',
      status: 'cancelled',
    });

    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/ops/sla-overdue-bookings/resolve',
      headers: {
        authorization: 'Bearer demo-admin',
        'content-type': 'application/json',
      },
      payload: JSON.stringify({
        bookingIds: ['BS-20260427-H5FSK'],
        action: 'cancel',
        note: 'duplicate booking',
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      resolved: { bookingId: string; action: string; status: string }[];
    };
    expect(body.resolved[0]).toEqual({
      bookingId: 'BS-20260427-H5FSK',
      action: 'cancel',
      status: 'cancelled',
    });
    expect(prismaMock.pujaBooking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { bookingNumber: 'BS-20260427-H5FSK' } }),
    );
    await app.close();
  });
});
