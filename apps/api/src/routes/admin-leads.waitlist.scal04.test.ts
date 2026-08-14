import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/email.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import Fastify from 'fastify';
import { adminLeadsRoutes } from './admin-leads.js';

/**
 * SCAL-04 (P1) — GET /admin/waitlist/stats read the WHOLE waitlist table.
 *
 * `waitlist.findMany({ select: { status, referredByEmail, email } })` — no
 * `where`, no `take`, no `cursor` — and then counted four statuses and tallied
 * referrers in a JavaScript for-loop. It is the same shape the finding measured
 * at 33,360 kB on `userRoleAssignment.findMany()`: every row of a table that
 * grows with signups, pulled into a 512 MB Render container, to produce six
 * scalars and a top-20 list.
 *
 * Postgres can answer both with `groupBy`: one row per status, and a
 * `take: 20` ordered group for the referrer leaderboard. The numbers must come
 * out identical — that is what the assertions below pin, so this cannot be
 * satisfied by deleting the endpoint's contents.
 */

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

function makeApp() {
  const app = Fastify();
  void app.register(adminLeadsRoutes, { prefix: '/api/v1/admin' });
  return app;
}

/** The dynamic model handle the route reaches for. */
type WaitlistMock = {
  findMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
};

let waitlist: WaitlistMock;

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockImplementation(async (args: never) =>
    (args as { where: { email?: string } }).where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
  );

  waitlist = {
    findMany: vi.fn(async () => []),
    count: vi.fn(async () => 0),
    groupBy: vi.fn(async (args: unknown) => {
      const by = (args as { by: string[] }).by;
      if (by.includes('status')) {
        return [
          { status: 'PENDING', _count: { _all: 4 } },
          { status: 'CONFIRMED', _count: { _all: 3 } },
          { status: 'INVITED', _count: { _all: 2 } },
          { status: 'CONVERTED', _count: { _all: 1 } },
        ];
      }
      if (by.includes('referredByEmail')) {
        return [
          { referredByEmail: 'ravi@example.com', _count: { _all: 5 } },
          { referredByEmail: 'sita@example.com', _count: { _all: 2 } },
        ];
      }
      return [];
    }),
  };
  (prismaMock as unknown as { waitlist?: WaitlistMock }).waitlist = waitlist;
});

describe('SCAL-04 — /admin/waitlist/stats stops reading the whole table', () => {
  it('issues no unbounded findMany — every read is scoped or aggregated', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/waitlist/stats',
      headers: { authorization: 'Bearer demo-admin' },
    });
    expect(res.statusCode).toBe(200);

    for (const call of waitlist.findMany.mock.calls) {
      const args = (call[0] ?? {}) as Record<string, unknown>;
      expect(
        'where' in args || 'take' in args || 'cursor' in args,
        `waitlist.findMany was called with no where/take/cursor: ${JSON.stringify(args)}`,
      ).toBe(true);
    }
  });

  it('still returns the exact funnel counts, now from SQL', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/waitlist/stats',
      headers: { authorization: 'Bearer demo-admin' },
    });
    const body = res.json() as {
      total: number;
      confirmed: number;
      invited: number;
      converted: number;
      funnel: { pending: number; confirmed: number; invited: number; converted: number };
    };

    expect(body.total).toBe(10);
    expect(body.confirmed).toBe(3);
    expect(body.invited).toBe(2);
    expect(body.converted).toBe(1);
    expect(body.funnel).toEqual({ pending: 4, confirmed: 3, invited: 2, converted: 1 });
  });

  it('still returns the referrer leaderboard, ranked, now bounded by take', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/waitlist/stats',
      headers: { authorization: 'Bearer demo-admin' },
    });
    const body = res.json() as {
      topReferrers: Array<{ rank: number; email: string; referralCount: number }>;
    };

    expect(body.topReferrers).toEqual([
      { rank: 1, email: 'ravi@example.com', referralCount: 5 },
      { rank: 2, email: 'sita@example.com', referralCount: 2 },
    ]);

    const referrerCall = waitlist.groupBy.mock.calls.find((c) =>
      ((c[0] as { by: string[] }).by ?? []).includes('referredByEmail'),
    );
    expect(referrerCall, 'the leaderboard is not grouped in SQL').toBeDefined();
    expect((referrerCall![0] as { take?: number }).take).toBe(20);
  });
});
