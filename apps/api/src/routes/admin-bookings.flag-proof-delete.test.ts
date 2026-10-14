import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
const deleteProofObject = vi.fn();
vi.mock('../lib/r2.js', () => ({ deleteProofObject: (k: string) => deleteProofObject(k) }));

import Fastify from 'fastify';
import { adminBookingsRoutes } from './admin-bookings.js';

const ADMIN = { id: 'user-demo-admin-1', email: 'admin@demo.com', phone: null, fullName: 'Demo Admin', subscriptionTier: 'bhakti_pass', blocked: false };
const BID = '11111111-2222-3333-4444-555555555555';
const KEY = `booking-proofs/${BID}/1700000000000-abcdef012345.mp4`;

async function flag(videoProofUrl: string | null) {
  prismaMock.pujaBooking.findUnique.mockResolvedValue({ id: BID, status: 'video_uploaded', videoProofUrl, cancellationReason: null } as never);
  prismaMock.pujaBooking.update.mockResolvedValue({ id: BID, bookingNumber: 'BS-1', status: 'completed', videoProofUrl: null } as never);
  const app = Fastify({ logger: false });
  await app.register(async (i) => { await adminBookingsRoutes(i); }, { prefix: '/api/v1/admin/bookings' });
  const res = await app.inject({
    method: 'POST', url: `/api/v1/admin/bookings/${BID}/video-proof/flag`,
    headers: { authorization: 'Bearer demo-admin' }, payload: { reason: 'blurry, cannot see the puja' },
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (a: { where: { email?: string } }) => (a.where.email === 'admin@demo.com' ? ADMIN : null));
  deleteProofObject.mockResolvedValue(true);
});

describe('flag invalid proof removes the stored private object', () => {
  it('deletes the stored key after clearing the column', async () => {
    const res = await flag(KEY);
    expect(res.statusCode).toBe(200);
    expect(deleteProofObject).toHaveBeenCalledWith(KEY);
  });
  it('still flags when the delete throws', async () => {
    deleteProofObject.mockRejectedValue(new Error('r2 down'));
    expect((await flag(KEY)).statusCode).toBe(200);
  });
  it('still flags when the delete reports failure', async () => {
    deleteProofObject.mockResolvedValue(false);
    expect((await flag(KEY)).statusCode).toBe(200);
  });
  it('never deletes a legacy external URL', async () => {
    expect((await flag('https://youtu.be/abc')).statusCode).toBe(200);
    expect(deleteProofObject).not.toHaveBeenCalled();
  });
});
