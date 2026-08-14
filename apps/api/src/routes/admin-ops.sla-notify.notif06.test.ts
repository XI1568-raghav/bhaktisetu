import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const notifyBookingEvent = vi.fn();
vi.mock('../services/booking-notify.service.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, notifyBookingEvent: (...a: unknown[]) => notifyBookingEvent(...a) };
});

import Fastify from 'fastify';
import { adminOpsRoutes } from './admin-ops.js';

/**
 * NOTIF-06, remaining half — THE PRODUCERS THAT BYPASS `updateBookingStatus`.
 *
 * The first pass gave the lifecycle events their producers: `in_progress`,
 * `completed` and `cancelled` now fan out from `BookingService.updateBookingStatus`,
 * and `offer_timeout` reaches the pandit from `sweepExpiredOffers`. That covers
 * every transition that goes THROUGH the service.
 *
 * This endpoint does not. POST /admin/ops/sla-overdue-bookings/resolve writes
 * `status` with a raw `prisma.pujaBooking.update`, so the fan-out added to the
 * service never runs for it — and this is the SLA-breach queue, i.e. precisely
 * the bookings where a devotee has already been let down once. An admin marks
 * her booking cancelled-with-refund and she is told nothing at all: no push, no
 * WhatsApp, no mail. She finds out by opening the app.
 *
 * `fulfill` is the same defect with a worse ending: the booking is stamped
 * `completed`, the puja is over, and the one message the product exists to send
 * ("your puja is complete, video proof coming") is never produced.
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
      await adminOpsRoutes(instance);
    },
    { prefix: '/api/v1/admin/ops' },
  );
  return app;
}

async function resolve(action: 'refund' | 'cancel' | 'fulfill') {
  const app = await buildApp();
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/ops/sla-overdue-bookings/resolve',
    headers: { 'content-type': 'application/json', authorization: 'Bearer demo-admin' },
    payload: JSON.stringify({ bookingIds: ['bk-1'], action, note: 'pandit no-show' }),
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  notifyBookingEvent.mockResolvedValue(undefined);
  process.env.NODE_ENV = 'test';
  delete process.env.CRON_AUTH_TOKEN;

  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
  );
  prismaMock.pujaBooking.findUnique.mockResolvedValue({
    id: 'bk-1',
    bookingNumber: 'BS-20260812-AAAAA',
    status: 'confirmed',
  } as never);
  prismaMock.pujaBooking.update.mockResolvedValue({ id: 'bk-1', status: 'cancelled' } as never);
});

describe('NOTIF-06 — the SLA-breach resolver tells the devotee', () => {
  it('fans out `cancelled` when an admin refunds a breached booking', async () => {
    const res = await resolve('refund');

    expect(res.statusCode).toBe(200);
    expect(prismaMock.pujaBooking.update).toHaveBeenCalledTimes(1);
    expect(
      notifyBookingEvent,
      'the booking was cancelled and the devotee was told nothing',
    ).toHaveBeenCalledWith('bk-1', 'cancelled');
  });

  it('fans out `completed` when an admin marks a breached booking fulfilled', async () => {
    prismaMock.pujaBooking.update.mockResolvedValue({ id: 'bk-1', status: 'completed' } as never);

    const res = await resolve('fulfill');

    expect(res.statusCode).toBe(200);
    expect(notifyBookingEvent).toHaveBeenCalledWith('bk-1', 'completed');
  });

  it('does not notify for a booking id that resolved to nothing', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null as never);
    prismaMock.pujaBooking.findFirst.mockResolvedValue(null as never);

    const res = await resolve('cancel');

    expect(res.statusCode).toBe(200);
    expect(notifyBookingEvent).not.toHaveBeenCalled();
  });

  it('still resolves the booking when the notification throws', async () => {
    // The status flip is the operator's action and it has already committed.
    // A dead BSP must never turn a 200 into a 500.
    notifyBookingEvent.mockRejectedValue(new Error('bsp down'));

    const res = await resolve('refund');

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).resolved).toHaveLength(1);
  });
});
