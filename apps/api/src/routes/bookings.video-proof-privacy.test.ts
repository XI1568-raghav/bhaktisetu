import { describe, it, expect, vi, beforeEach } from 'vitest';

const BID = 'b0000000-0000-4000-8000-000000000001';
const OWNER = 'a0000000-0000-4000-8000-000000000001';
const PANDIT_USER = 'a0000000-0000-4000-8000-000000000002';
const MANAGER = 'a0000000-0000-4000-8000-000000000003';
const TEMPLE = 'c0000000-0000-4000-8000-000000000001';
const KEY = `booking-proofs/${BID}/1791908298776-4f45e65fd4bd.mp4`;

const { prismaMock, signProofRead, managerTemple, who } = vi.hoisted(() => ({
  prismaMock: { pujaBooking: { findUnique: vi.fn() }, priest: { findUnique: vi.fn() } } as Record<string, any>,
  signProofRead: vi.fn(),
  managerTemple: vi.fn(),
  who: { user: null as any },
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/r2.js', () => ({ signProofRead, r2: { enabled: true } }));
vi.mock('./temple-portal.js', () => ({ resolveManagerTempleId: managerTemple }));
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (req: any) => { req.currentUser = who.user; },
  requireRole: () => async () => undefined,
}));

import Fastify from 'fastify';
import { bookingRoutes } from './bookings.js';

async function get(user: any) {
  who.user = user;
  const app = Fastify({ logger: false });
  await app.register(bookingRoutes, { prefix: '/api/v1/bookings' });
  const res = await app.inject({ method: 'GET', url: `/api/v1/bookings/${BID}/video` });
  await app.close();
  return res;
}
const u = (id: string, roles: string[]) => ({ id, roles });
const row = (videoProofUrl: string | null) => ({
  id: BID, bookingNumber: 'BS-1', userId: OWNER, templeId: TEMPLE, priestId: 'p1', videoProofUrl, videoUploadedAt: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.pujaBooking.findUnique.mockResolvedValue(row(KEY));
  prismaMock.priest.findUnique.mockResolvedValue({ userId: PANDIT_USER });
  signProofRead.mockResolvedValue('https://storage.test/sign/x?token=abc');
  managerTemple.mockResolvedValue(TEMPLE);
});

describe('GET /bookings/:id/video — private proof', () => {
  it.each([
    ['devotee owner', u(OWNER, ['DEVOTEE'])],
    ['assigned pandit', u(PANDIT_USER, ['PANDIT', 'DEVOTEE'])],
    ['manager of the booking temple', u(MANAGER, ['TEMPLE_MANAGER', 'DEVOTEE'])],
    ['admin', u('a0000000-0000-4000-8000-0000000000ff', ['ADMIN', 'DEVOTEE'])],
  ])('%s gets a short-lived signed URL', async (_n, user) => {
    const res = await get(user);
    expect(res.statusCode).toBe(200);
    const b = res.json();
    expect(b.videoUrl).toBe('https://storage.test/sign/x?token=abc');
    expect(b.private).toBe(true);
    expect(b.expiresIn).toBe(300);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(signProofRead).toHaveBeenCalledWith(KEY, 300);
  });

  it.each([
    ['another devotee', u('a0000000-0000-4000-8000-000000000009', ['DEVOTEE'])],
    ['a different pandit', u('a0000000-0000-4000-8000-000000000008', ['PANDIT', 'DEVOTEE'])],
    ['store owner', u('a0000000-0000-4000-8000-000000000007', ['STORE_OWNER', 'DEVOTEE'])],
  ])('%s is denied and nothing is signed', async (_n, user) => {
    const res = await get(user);
    expect(res.statusCode).toBe(403);
    expect(signProofRead).not.toHaveBeenCalled();
  });

  it('a manager of a DIFFERENT temple is denied', async () => {
    managerTemple.mockResolvedValue('c0000000-0000-4000-8000-0000000000ee');
    expect((await get(u(MANAGER, ['TEMPLE_MANAGER', 'DEVOTEE']))).statusCode).toBe(403);
  });

  it('an unlinked temple manager is denied', async () => {
    managerTemple.mockResolvedValue(null);
    expect((await get(u(MANAGER, ['TEMPLE_MANAGER']))).statusCode).toBe(403);
  });

  it('legacy http(s) value is returned as-is, not signed', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(row('https://x.supabase.co/storage/v1/object/public/darshya-media/booking-proofs/a.mp4'));
    const b = (await get(u(OWNER, ['DEVOTEE']))).json();
    expect(b.videoUrl).toMatch(/object\/public/);
    expect(b.private).toBe(false);
    expect(signProofRead).not.toHaveBeenCalled();
  });

  it('a key that belongs to another booking (tampered row) is never signed', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(row('booking-proofs/b0000000-0000-4000-8000-0000000000aa/1791908298776-4f45e65fd4bd.mp4'));
    expect((await get(u(OWNER, ['DEVOTEE']))).statusCode).toBe(503);
    expect(signProofRead).not.toHaveBeenCalled();
  });

  it('a path-traversal key is never signed', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(row(`booking-proofs/${BID}/../../kyc/x.mp4`));
    expect((await get(u(OWNER, ['DEVOTEE']))).statusCode).toBe(503);
    expect(signProofRead).not.toHaveBeenCalled();
  });

  it('storage down: 503 with a friendly message, no URL', async () => {
    signProofRead.mockResolvedValue(null);
    const res = await get(u(OWNER, ['DEVOTEE']));
    expect(res.statusCode).toBe(503);
    expect(JSON.stringify(res.json())).not.toMatch(/token|storage\.test/);
  });

  it('no proof yet: not_available', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(row(null));
    const res = await get(u(OWNER, ['DEVOTEE']));
    expect(res.json()).toMatchObject({ status: 'not_available', videoUrl: null });
  });

  it('unknown booking is 404', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(null);
    expect((await get(u(OWNER, ['DEVOTEE']))).statusCode).toBe(404);
  });
});
