import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { astrologerPortalRoutes } from './astrologer-portal.js';

/**
 * PAR-13, the server half.
 *
 * The app half is done: apps/mobile/app/(astrologer)/dashboard.tsx now reads the
 * keys the route actually sends and renders an unreachable dashboard as
 * unreachable instead of a confident ₹0. This is the other half, which the
 * mobile fix explicitly could not reach.
 *
 * POST /auth/login as astro@demo.com returns `user.id = "demo-astro"` — not a
 * UUID. `AstrologerProfile.userId` is `@db.Uuid` and `Commission.providerId` is
 * `@db.Uuid`, so both `astrologerProfile.findUnique({ where: { userId } })`
 * (astrologer-portal.ts:129) and the ledger's
 * `commission.findMany({ where: { providerId: userId } })` throw Prisma P2023
 * "Error creating UUID, invalid character ... found `m` at 3". Nothing catches
 * them, so the request 500s and the body carries
 * `E:\NewClaude\bhaktisetu\apps\api\src\routes\astrologer-portal.ts:53:52` plus
 * four lines of server source.
 *
 * Every other portal — priest, temple, store, gaushala, wellness — takes the
 * same non-UUID demo ids and answers 200. A user id that cannot be a UUID
 * simply cannot match a uuid column: that is a lookup that misses, not an
 * exception. Treating it as a miss is both correct and what the other five do.
 *
 * The information-disclosure half is asserted separately: whatever the outcome,
 * the response body may never contain a filesystem path or a Prisma frame.
 */

const NON_UUID_ID = 'demo-astro';

const DEMO_ASTRO = {
  id: NON_UUID_ID,
  email: 'astro@demo.com',
  phone: null,
  fullName: 'Demo Astrologer',
  subscriptionTier: 'free',
  blocked: false,
};

/** What Prisma actually throws for a non-UUID against a @db.Uuid column. */
function p2023(model: string, line: number): Error {
  return Object.assign(
    new Error(
      `\nInvalid \`prisma.${model}.findUnique()\` invocation in\nE:\\NewClaude\\bhaktisetu\\apps\\api\\src\\routes\\astrologer-portal.ts:${line}:52\n\n  ${line} const profile = await prisma.${model}.findUnique({\nInconsistent column data: Error creating UUID, invalid character: expected an optional prefix of \`urn:uuid:\` followed by [0-9a-fA-F-], found \`m\` at 3`,
    ),
    { code: 'P2023', clientVersion: '5.22.0' },
  );
}

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(astrologerPortalRoutes, { prefix: '/api/v1/astrologer-portal' });
  return app;
}

async function dashboard() {
  const app = await buildApp();
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/astrologer-portal/dashboard',
    headers: { authorization: 'Bearer demo-astro' },
  });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
    args.where.email === 'astro@demo.com' ? DEMO_ASTRO : null,
  );
  // Both uuid-typed lookups reject, exactly as the live database does.
  prismaMock.astrologerProfile.findUnique.mockRejectedValue(
    p2023('astrologerProfile', 129),
  );
  prismaMock.commission.findMany.mockRejectedValue(p2023('commission', 74));
  prismaMock.pujaBooking.findMany.mockResolvedValue([]);
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PAR-13 — a non-UUID account id is a miss, not a 500', () => {
  it('answers 200 for the demo astrologer instead of a Prisma crash', async () => {
    const res = await dashboard();
    expect(res.statusCode).toBe(200);
  });

  it('never reaches the uuid columns with a value that cannot be a uuid', async () => {
    await dashboard();
    expect(prismaMock.astrologerProfile.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.commission.findMany).not.toHaveBeenCalled();
  });

  it('reports the missing profile honestly rather than inventing one', async () => {
    const body = (await dashboard()).json();
    expect(body.profile).toBeNull();
    expect(body.stats.approved).toBe(false);
    expect(body.stats.totalEarningsInr).toBe(0);
    expect(body.stats.pricePerMinute).toBe(0);
    expect(body.upcomingSessions).toEqual([]);
  });

  it('leaks no server path, source frame or ORM invocation in the body', async () => {
    const raw = (await dashboard()).body;
    expect(raw).not.toContain('NewClaude');
    expect(raw).not.toContain('astrologer-portal.ts:');
    expect(raw).not.toContain('Invalid `prisma.');
    expect(raw).not.toContain('P2023');
  });

  it('PATCH /profile answers a clean 4xx, not a 500 with source code', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/astrologer-portal/profile',
      headers: { authorization: 'Bearer demo-astro' },
      payload: { displayName: 'Renamed' },
    });
    await app.close();
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(500);
    expect(res.body).not.toContain('NewClaude');
    expect(res.body).not.toContain('Invalid `prisma.');
  });
});

describe('PAR-13 — a real UUID astrologer is untouched by the guard', () => {
  const REAL_ID = 'ba87a424-e9d2-44f1-92a9-996441b31131';

  beforeEach(() => {
    prismaMock.user.findUnique.mockImplementation(async (args: { where: { email?: string } }) =>
      args.where.email === 'astro@demo.com' ? { ...DEMO_ASTRO, id: REAL_ID } : null,
    );
    prismaMock.astrologerProfile.findUnique.mockResolvedValue({
      id: '71e54617-6963-418e-845f-920f4350505b',
      userId: REAL_ID,
      displayName: 'Acharya Vinod Sharma',
      pricePerMinute: 25,
      approved: true,
      rating: 4.6,
      totalConsultations: 12,
    });
    prismaMock.commission.findMany.mockResolvedValue([]);
  });

  it('still queries the profile and renders it', async () => {
    const res = await dashboard();
    expect(res.statusCode).toBe(200);
    expect(prismaMock.astrologerProfile.findUnique).toHaveBeenCalled();
    const body = res.json();
    expect(body.profile?.displayName).toBe('Acharya Vinod Sharma');
    expect(body.stats.approved).toBe(true);
    expect(body.stats.pricePerMinute).toBe(25);
    expect(body.stats.rating).toBe(4.6);
  });
});
