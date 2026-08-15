/**
 * AO-16 — nine admin endpoints were hardcoded stubs that lied.
 *
 * Probed live with an admin bearer token on the sweep (2026-08-12):
 *
 *   GET  /admin/temples   -> 200 {"temples":[],"total":0}   (20 temples seeded)
 *   GET  /admin/priests   -> 200 total 0                     (3 priests exist)
 *   GET  /admin/pujas     -> 200 []   GET /admin/content -> 200 []
 *   GET  /admin/payments  -> 200 []
 *   PATCH  /admin/temples/<nonexistent uuid> -> 200 {"message":"Temple updated"}
 *   DELETE /admin/temples/<nonexistent uuid> -> 200 {"message":"Temple deleted"}
 *   POST   /admin/users   -> 200 {"message":"User created"}  (no user created)
 *   DELETE /admin/users/<nonexistent>        -> 200 {"message":"User deleted"}
 *
 * Two different defects with two different fixes:
 *
 *  READS return a real, empty-looking answer that is simply WRONG. The models
 *  all exist, so they are implemented against Prisma. An admin list that says
 *  "no temples" when there are twenty is the kind of thing an operator acts on.
 *
 *  WRITES fabricate success. A stub that answers "deleted" is worse than one
 *  that 404s: it tells an operator a destructive action they just took
 *  succeeded. Making them real is a separate, careful piece of work (cascade
 *  behaviour, GDPR, audit trail), so until then they answer 501 and say so.
 *  Never a 200 for something that did not happen.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminRoutes } from './admin.js';

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

const GHOST = '00000000-0000-0000-0000-000000000000';

async function call(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  payload?: Record<string, unknown>,
) {
  const app = Fastify({ logger: false });
  await app.register(async (instance) => {
    await adminRoutes(instance);
  }, { prefix: '/api/v1/admin' });
  const res = await app.inject({
    method,
    url: `/api/v1/admin${url}`,
    headers: { authorization: 'Bearer demo-admin' },
    ...(payload === undefined ? {} : { payload }),
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
});

describe('AO-16 — the admin list endpoints read the database', () => {
  it('GET /temples returns the temples that exist', async () => {
    prismaMock.temple.findMany.mockResolvedValue([
      { id: 't1', name: 'Kashi Vishwanath', slug: 'kashi-vishwanath-varanasi', city: 'Varanasi' },
    ] as never);
    prismaMock.temple.count.mockResolvedValue(20 as never);

    const body = (await call('GET', '/temples')).json();

    // The stub answered total 0 against 20 seeded temples.
    expect(body.total).toBe(20);
    expect(body.temples).toHaveLength(1);
    expect(body.temples[0].name).toBe('Kashi Vishwanath');
    expect(prismaMock.temple.findMany).toHaveBeenCalled();
  });

  it('GET /priests returns the priests that exist', async () => {
    prismaMock.priest.findMany.mockResolvedValue([{ id: 'p1', displayName: 'Demo Pandit' }] as never);
    prismaMock.priest.count.mockResolvedValue(3 as never);

    const body = (await call('GET', '/priests')).json();

    expect(body.total).toBe(3);
    expect(body.priests).toHaveLength(1);
    expect(prismaMock.priest.findMany).toHaveBeenCalled();
  });

  it('GET /pujas returns the puja types that exist', async () => {
    prismaMock.pujaType.findMany.mockResolvedValue([{ id: 'pt1', name: 'Rudrabhishek' }] as never);
    prismaMock.pujaType.count.mockResolvedValue(12 as never);

    const body = (await call('GET', '/pujas')).json();

    expect(body.total).toBe(12);
    expect(body.pujas).toHaveLength(1);
  });

  it('GET /content returns the content that exists', async () => {
    prismaMock.contentItem.findMany.mockResolvedValue([
      { id: 'c1', title: 'Hanuman Chalisa' },
    ] as never);
    prismaMock.contentItem.count.mockResolvedValue(150 as never);

    const body = (await call('GET', '/content')).json();

    expect(body.total).toBe(150);
    expect(body.content).toHaveLength(1);
  });

  it('GET /payments returns the payments that exist', async () => {
    prismaMock.payment.findMany.mockResolvedValue([
      { id: 'pay1', amount: 1100, status: 'captured' },
    ] as never);
    prismaMock.payment.count.mockResolvedValue(7 as never);

    const body = (await call('GET', '/payments')).json();

    expect(body.total).toBe(7);
    expect(body.payments).toHaveLength(1);
  });

  it('a read that fails is an error, never an empty list', async () => {
    prismaMock.temple.findMany.mockRejectedValue(new Error('db down') as never);
    prismaMock.temple.count.mockRejectedValue(new Error('db down') as never);

    // "No temples" and "we could not look" must not render identically — that
    // is the whole class of bug this finding sits in.
    expect((await call('GET', '/temples')).statusCode).toBe(500);
  });
});

describe('AO-16 — a write that does nothing must not answer 200', () => {
  const fabricated: Array<
    ['POST' | 'PATCH' | 'DELETE', string, Record<string, unknown> | undefined]
  > = [
    ['PATCH', `/temples/${GHOST}`, { name: 'X-DELETE-ME' }],
    ['DELETE', `/temples/${GHOST}`, undefined],
    ['POST', '/priests', { userId: GHOST, displayName: 'Ghost' }],
    ['PATCH', `/priests/${GHOST}`, { displayName: 'Ghost' }],
    ['DELETE', `/priests/${GHOST}`, undefined],
    ['POST', '/pujas', { name: 'Ghost Puja', basePrice: 100 }],
    ['PATCH', `/pujas/${GHOST}`, { name: 'Ghost Puja' }],
    ['DELETE', `/pujas/${GHOST}`, undefined],
    ['POST', '/content', { title: 'Ghost', type: 'aarti' }],
    ['PATCH', `/content/${GHOST}`, { title: 'Ghost' }],
    ['DELETE', `/content/${GHOST}`, undefined],
    ['POST', '/users', { fullName: 'Ghost', email: 'ghost@x.com', role: 'DEVOTEE' }],
    ['DELETE', `/users/${GHOST}`, undefined],
  ];

  it.each(fabricated)('%s %s answers 501, not a fabricated success', async (method, url, payload) => {
    const res = await call(method, url, payload);
    expect(res.statusCode).toBe(501);
    const body = res.json();
    expect(JSON.stringify(body)).not.toMatch(/updated|deleted|created/i);
  });

  it('says the operation is not implemented rather than staying silent', async () => {
    const body = (await call('DELETE', `/temples/${GHOST}`)).json();
    expect(JSON.stringify(body)).toMatch(/not implemented/i);
  });

  it('leaves POST /temples — the one real write — alone', async () => {
    prismaMock.temple.create.mockResolvedValue({
      id: 't-new',
      name: 'New Temple',
      slug: 'new-temple',
    } as never);

    const res = await call('POST', '/temples', {
      name: 'New Temple',
      description: 'A temple created through the one real admin write.',
      deityPrimary: 'Shiva',
      addressLine: '12 Ganga Marg',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      pincode: '221001',
      lat: 25.3109,
      lng: 83.0107,
    });

    expect(res.statusCode).not.toBe(501);
    expect(prismaMock.temple.create).toHaveBeenCalled();
  });
});
