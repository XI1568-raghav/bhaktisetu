/**
 * Launch fix 2026-10-07: the generic PATCH /bookings/:id door honours the same completion
 * window as PATCH /priest/bookings/:id/complete. The assigned pandit cannot move a puja to
 * `completed` / `video_uploaded` before the slot has started; an admin still can.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../routes/notifications.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, notifyUser: vi.fn().mockResolvedValue(0) };
});

import Fastify from 'fastify';
import { bookingRoutes } from './bookings.js';

const PANDIT = {
  id: 'user-demo-pandit-1',
  email: 'pandit@demo.com',
  phone: null,
  fullName: 'Demo Pandit',
  subscriptionTier: 'free',
  blocked: false,
};
const ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};
const BOOKING_ID = '33333333-3333-4333-8333-333333333333';

function booking(scheduledDate: Date) {
  return {
    userId: 'user-devotee-1',
    priestId: 'priest-1',
    status: 'in_progress',
    videoProofUrl: 'https://r2.example/video.mp4',
    scheduledDate,
    scheduledTimeSlot: '18:00',
    priest: { userId: PANDIT.id },
  };
}

async function patchStatus(token: 'pandit' | 'admin', status: string) {
  const app = Fastify({ logger: false });
  await app.register(
    async (instance) => {
      await bookingRoutes(instance);
    },
    { prefix: '/api/v1/bookings' },
  );
  const res = await app.inject({
    method: 'PATCH',
    url: `/api/v1/bookings/${BOOKING_ID}`,
    headers: { authorization: `Bearer demo-${token}`, 'content-type': 'application/json' },
    payload: JSON.stringify({ status }),
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) => {
    if (args.where.email === 'pandit@demo.com') return PANDIT;
    if (args.where.email === 'admin@demo.com') return ADMIN;
    return null;
  });
});

describe('PATCH /bookings/:id completion window', () => {
  it.each(['completed', 'video_uploaded'])(
    'refuses the assigned pandit moving to %s before the slot, with 409 too_early_to_complete',
    async (status) => {
      prismaMock.pujaBooking.findUnique.mockResolvedValue(booking(new Date('2999-01-01T00:00:00Z')) as never);
      const res = await patchStatus('pandit', status);
      expect(res.statusCode).toBe(409);
      expect(res.json()).toMatchObject({ code: 'too_early_to_complete' });
      expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
    },
  );

  it('does not apply the window once the slot has passed (the next gate decides)', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(booking(new Date('2020-01-01T00:00:00Z')) as never);
    const res = await patchStatus('pandit', 'completed');
    expect(res.json()?.code).not.toBe('too_early_to_complete');
  });

  it('an admin is not held back by the window (force-complete for remediation)', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(booking(new Date('2999-01-01T00:00:00Z')) as never);
    const res = await patchStatus('admin', 'completed');
    expect(res.json()?.code).not.toBe('too_early_to_complete');
  });
});
