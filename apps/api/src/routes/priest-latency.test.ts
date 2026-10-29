import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { priestRoutes } from './priest.js';
import { __priestIdCacheClear } from '../lib/priest-id-cache.js';

/**
 * Latency (2026-10-29): every /priest/* request read the Priest row twice, once
 * in requireRole('priest') for its status and again in the handler for its id,
 * and each read is a ~0.4 s round trip to the remote database. The guard now
 * leaves the id it read; the handler reuses it. Responses are unchanged.
 */

const USER_ID = '3f7c1a5e-9b2d-4c6a-8e10-2b4d6f8a0c11';
const PRIEST_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

async function get(path: string) {
  const app = Fastify({ logger: false });
  await app.register(async (i) => { await priestRoutes(i); }, { prefix: '/api/v1/priest' });
  const res = await app.inject({ method: 'GET', url: `/api/v1/priest${path}`, headers: { authorization: 'Bearer demo-priest' } });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  __priestIdCacheClear();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'pandit@demo.com'
      ? { id: USER_ID, email: 'pandit@demo.com', phone: null, fullName: 'P', subscriptionTier: 'free', blocked: false }
      : null,
  );
  prismaMock.priest.findUnique.mockResolvedValue({ id: PRIEST_ID, userId: USER_ID, status: 'active' } as never);
  prismaMock.pujaBooking.findMany.mockResolvedValue([] as never);
  prismaMock.review.findMany.mockResolvedValue([] as never);
  prismaMock.priestPujaOffering.findMany.mockResolvedValue([] as never);
  (prismaMock as any).$queryRawUnsafe.mockResolvedValue([]);
});

describe('priest routes read the Priest row once per request', () => {
  it.each(['/pujas', '/reviews'])('GET %s: one Priest read (the guard), and it uses that id', async (path) => {
    const res = await get(path);
    expect(res.statusCode).toBe(200);
    expect(prismaMock.priest.findUnique).toHaveBeenCalledTimes(1);
  });

  it('GET /pujas scopes the query to the id the guard read', async () => {
    await get('/pujas');
    expect(prismaMock.priestPujaOffering.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { priestId: PRIEST_ID } }),
    );
  });

  it('an inactive pandit is still refused with 403 and leaves nothing behind for the next request', async () => {
    prismaMock.priest.findUnique.mockResolvedValue({ id: PRIEST_ID, userId: USER_ID, status: 'inactive' } as never);
    const first = await get('/pujas');
    expect(first.statusCode).toBe(403);
    expect(prismaMock.priestPujaOffering.findMany).not.toHaveBeenCalled();
    // Reactivated: the guard reads live again and lets the request through.
    prismaMock.priest.findUnique.mockResolvedValue({ id: PRIEST_ID, userId: USER_ID, status: 'active' } as never);
    expect((await get('/pujas')).statusCode).toBe(200);
  });

  it('a suspension takes effect on the very next request (the guard is never cached)', async () => {
    expect((await get('/pujas')).statusCode).toBe(200);
    prismaMock.priest.findUnique.mockResolvedValue({ id: PRIEST_ID, userId: USER_ID, status: 'suspended' } as never);
    expect((await get('/pujas')).statusCode).toBe(403);
  });

  it('reviews: the hidden-review lookup does not hold back the booking-ratings read', async () => {
    let hiddenResolve: (v: unknown[]) => void = () => undefined;
    (prismaMock as any).$queryRawUnsafe.mockImplementation(() => new Promise((r) => { hiddenResolve = r as typeof hiddenResolve; }));
    const pending = get('/reviews');
    await new Promise((r) => setTimeout(r, 60));
    // The hidden lookup is still outstanding, yet the second query has started.
    expect(prismaMock.pujaBooking.findMany).toHaveBeenCalled();
    hiddenResolve([]);
    expect((await pending).statusCode).toBe(200);
  });
});
