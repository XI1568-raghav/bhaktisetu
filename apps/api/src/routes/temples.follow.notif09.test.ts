import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { templeRoutes } from './temples.js';

/**
 * NOTIF-09, remaining half — THE AUDIENCE HAS NO WAY TO EXIST.
 *
 * The first pass did the right thing to the aarti job: the global
 * `aartiOptIn: true` branch is gone, and jobs/aarti-notify.ts now pushes only
 * to devotees who FOLLOW the temple whose aarti is firing. That ended one
 * opt-in producing twenty pushes a day about temples the devotee never chose,
 * starting at 02:45 IST.
 *
 * But `temple_follows` holds zero rows and — verified across apps/api/src —
 * `templeFollow` appears in exactly one file, jobs/aarti-notify.ts, and only as
 * a READ. There is no endpoint, service or job anywhere that inserts one. So
 * the fix as it stands converts a feature that notified the wrong people into a
 * feature that can notify nobody, permanently, and the "15-minute aarti
 * reminders" toggle on the darshan page is now honestly wired to an audience
 * that cannot be joined.
 *
 * A read-only fix to a fan-out is not a fix; it is a quieter failure. The
 * follow has to be writable.
 */

const DEMO_DEVOTEE = {
  id: 'user-demo-devotee-1',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

const TEMPLE = { id: 'temple-1', slug: 'kashi-vishwanath', name: 'Kashi Vishwanath' };

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(
    async (instance) => {
      await templeRoutes(instance);
    },
    { prefix: '/api/v1/temples' },
  );
  return app;
}

function call(method: 'POST' | 'DELETE' | 'GET', url: string, auth = true) {
  return buildApp().then(async (app) => {
    const res = await app.inject({
      method,
      url,
      headers: auth ? { authorization: 'Bearer demo-devotee' } : {},
    });
    await app.close();
    return res;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'devotee@demo.com' ? DEMO_DEVOTEE : null,
  );
  prismaMock.temple.findUnique.mockResolvedValue(TEMPLE as never);
  prismaMock.templeFollow.upsert.mockResolvedValue({ id: 'tf-1' } as never);
  prismaMock.templeFollow.deleteMany.mockResolvedValue({ count: 1 } as never);
  prismaMock.templeFollow.findMany.mockResolvedValue([] as never);
});

describe('NOTIF-09 — a devotee can follow a temple', () => {
  it('creates the follow row the aarti job reads', async () => {
    const res = await call('POST', '/api/v1/temples/kashi-vishwanath/follow');

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).following).toBe(true);
    expect(
      prismaMock.templeFollow.upsert,
      'nothing on the platform can write a temple_follows row, so the aarti audience is empty by construction',
    ).toHaveBeenCalledTimes(1);
    const args = prismaMock.templeFollow.upsert.mock.calls[0]![0] as {
      create: { userId: string; templeId: string };
    };
    expect(args.create).toEqual({ userId: DEMO_DEVOTEE.id, templeId: TEMPLE.id });
  });

  it('is idempotent — following twice is one row, not a duplicate', async () => {
    // The unique is (userId, templeId); an upsert means a devotee tapping the
    // bell twice does not double their aarti pushes.
    const args = await call('POST', '/api/v1/temples/kashi-vishwanath/follow').then(
      () => prismaMock.templeFollow.upsert.mock.calls[0]![0] as { where: unknown },
    );
    expect(args.where).toEqual({ userId_templeId: { userId: DEMO_DEVOTEE.id, templeId: TEMPLE.id } });
  });

  it('unfollows', async () => {
    const res = await call('DELETE', '/api/v1/temples/kashi-vishwanath/follow');

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).following).toBe(false);
    expect(prismaMock.templeFollow.deleteMany).toHaveBeenCalledWith({
      where: { userId: DEMO_DEVOTEE.id, templeId: TEMPLE.id },
    });
  });

  it('requires a signed-in devotee', async () => {
    const res = await call('POST', '/api/v1/temples/kashi-vishwanath/follow', false);
    expect(res.statusCode).toBe(401);
  });

  it('404s for a temple that does not exist', async () => {
    prismaMock.temple.findUnique.mockResolvedValue(null as never);

    const res = await call('POST', '/api/v1/temples/no-such-temple/follow');

    expect(res.statusCode).toBe(404);
    // The message matters: a missing ROUTE also answers 404, so asserting only
    // the status would pass on a codebase where the endpoint does not exist.
    expect(JSON.parse(res.body).error).toBe('Temple not found');
    expect(prismaMock.templeFollow.upsert).not.toHaveBeenCalled();
  });

  it('reports which temples this devotee follows', async () => {
    prismaMock.templeFollow.findMany.mockResolvedValue([
      { templeId: 'temple-1', createdAt: new Date('2026-08-01T00:00:00Z') },
    ] as never);

    const res = await call('GET', '/api/v1/temples/follows/mine');

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { templeIds: string[] };
    expect(body.templeIds).toEqual(['temple-1']);
  });
});
