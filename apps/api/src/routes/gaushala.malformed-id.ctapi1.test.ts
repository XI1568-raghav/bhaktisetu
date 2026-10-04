import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * CT-API-1 — a malformed `:id` path segment answered 500 instead of 404.
 *
 * Measured against api.darshya.online on 2026-09-09, before this fix:
 *
 *   GET /api/v1/gaushala/not-a-uuid                           -> 500
 *   GET /api/v1/gaushala/123                                  -> 500
 *   GET /api/v1/gaushala/__ct_zzz                             -> 500
 *   GET /api/v1/gaushala/abc-def                              -> 500
 *   GET /api/v1/gaushala/00000000-0000-4000-8000-000000000000 -> 404  (correct)
 *
 * The split is the id FORMAT, not whether the gaushala exists. `GaushalaProfile.id`
 * and `.userId` are both `@db.Uuid` (schema.prisma:1162-1163), so a segment that
 * cannot be parsed as a uuid never produced a lookup at all: Prisma raised P2023
 * and the error handler published it as INTERNAL_ERROR. The authenticated
 * `/gaushala-portal/cows/:id` family carries the same shape — `Cow.id` is
 * `@db.Uuid` too (schema.prisma:1602).
 *
 * 404, not 400: a mangled path segment is "no such resource" to the crawler that
 * followed a stale link. Same answer PJ-07 settled for routes/priests-public.ts
 * and PAR-13 for routes/astrologer-portal.ts.
 *
 * The constraint the guard must not break: the public directory still serves the
 * fixtures gs_001…gs_005, which are NOT uuids. A `z.string().uuid()` in front of
 * the handler would 404 every gaushala the site actually links to.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    gaushalaProfile: { findFirst: vi.fn() },
    cow: {
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    cowHealthRecord: { create: vi.fn() },
  },
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

// The portal half is authenticated; auth always succeeds here because the point
// is the id, not the guard in front of it.
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any) => {
    request.currentUser = {
      id: '659a2081-0abe-444d-9cb7-ac06e4147cd6',
      email: 'gau@demo.com',
      roles: ['GAUSHALA_MANAGER'],
    };
  },
}));

import Fastify from 'fastify';
import { gaushalaRoutes } from './gaushala.js';
import { gaushalaCowsRoutes } from './gaushala-cows.js';

/** What Prisma actually throws for a non-uuid against a `@db.Uuid` column. */
function p2023(model: string, method: string): Error {
  return Object.assign(
    new Error(
      `\nInvalid \`prisma.${model}.${method}()\` invocation in\n` +
        `E:\\NewClaude\\bhaktisetu\\apps\\api\\src\\routes\\gaushala.ts:30:52\n\n` +
        'Inconsistent column data: Error creating UUID, invalid character: expected an ' +
        'optional prefix of `urn:uuid:` followed by [0-9a-fA-F-], found `n` at 1',
    ),
    { code: 'P2023', clientVersion: '5.22.0' },
  );
}

/**
 * Every id the customer test sent, plus two that probe the guard's edges:
 * `gs_999` has the fixture prefix but is not a fixture, and `me` is the shape a
 * client sends when it confuses a collection route for a detail route.
 */
const MALFORMED_IDS = ['not-a-uuid', '123', '__ct_zzz', 'abc-def', 'gs_999', 'me'];

const ABSENT_UUID = '00000000-0000-4000-8000-000000000000';
const OWNER_ID = '659a2081-0abe-444d-9cb7-ac06e4147cd6';

function publicApp() {
  const app = Fastify({ logger: false });
  void app.register(gaushalaRoutes, { prefix: '/api/v1/gaushala' });
  return app;
}

function portalApp() {
  const app = Fastify({ logger: false });
  void app.register(gaushalaCowsRoutes, { prefix: '/api/v1/gaushala-portal' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.gaushalaProfile.findFirst.mockImplementation(async (args: any) => {
    const ors: any[] = args?.where?.OR ?? [];
    const bad = ors.find((o) => typeof o.id === 'string' && !/^[0-9a-f-]{36}$/i.test(o.id));
    if (bad) throw p2023('gaushalaProfile', 'findFirst');
    return null;
  });
  prismaMock.cow.findFirst.mockImplementation(async (args: any) => {
    const id = args?.where?.id;
    if (typeof id === 'string' && !/^[0-9a-f-]{36}$/i.test(id)) {
      throw p2023('cow', 'findFirst');
    }
    return null;
  });
});

describe('CT-API-1 — GET /gaushala/:id', () => {
  it.each(MALFORMED_IDS)('answers 404, not 500, for %s', async (id) => {
    const app = publicApp();
    const res = await app.inject({ method: 'GET', url: `/api/v1/gaushala/${id}` });
    await app.close();

    expect(res.statusCode).toBe(404);
    // The lookup must be skipped, not merely survived: an id that cannot be a
    // uuid cannot match a uuid column, so the query has no work to do.
    expect(prismaMock.gaushalaProfile.findFirst).not.toHaveBeenCalled();
  });

  it('leaks no driver internals in the 404 body', async () => {
    const app = publicApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/gaushala/not-a-uuid' });
    await app.close();

    expect(res.body).not.toMatch(/prisma/i);
    expect(res.body).not.toMatch(/P2023/);
    expect(res.body).not.toMatch(/NewClaude/);
  });

  it('still resolves the fixture ids the directory links to', async () => {
    const app = publicApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/gaushala/gs_001' });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json().gaushala.id).toBe('gs_001');
    expect(prismaMock.gaushalaProfile.findFirst).not.toHaveBeenCalled();
  });

  it('still queries for a well-formed uuid, and 404s when it is absent', async () => {
    const app = publicApp();
    const res = await app.inject({ method: 'GET', url: `/api/v1/gaushala/${ABSENT_UUID}` });
    await app.close();

    expect(res.statusCode).toBe(404);
    expect(prismaMock.gaushalaProfile.findFirst).toHaveBeenCalledTimes(1);
  });

  it('still resolves an approved profile by uuid', async () => {
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue({
      id: '69206fc0-9e9b-441a-a85f-b2d703b15afd',
      userId: OWNER_ID,
      gaushalaName: 'Shri Krishna Gaushala',
      address: 'Raman Reti, Vrindavan',
      city: 'Vrindavan',
      totalCows: 512,
      description: 'ISKCON-affiliated cow shelter.',
      approved: true,
    } as any);

    const app = publicApp();
    const res = await app.inject({ method: 'GET', url: `/api/v1/gaushala/${OWNER_ID}` });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json().gaushala.source).toBe('profile');
  });
});

describe('CT-API-1 — /gaushala-portal/cows/:id', () => {
  it.each(MALFORMED_IDS)('GET answers 404, not 500, for %s', async (id) => {
    const app = portalApp();
    const res = await app.inject({ method: 'GET', url: `/api/v1/gaushala-portal/cows/${id}` });
    await app.close();

    expect(res.statusCode).toBe(404);
    expect(prismaMock.cow.findFirst).not.toHaveBeenCalled();
  });

  it('PATCH answers 404, not 500, for a malformed id', async () => {
    const app = portalApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/gaushala-portal/cows/not-a-uuid',
      payload: { name: 'Nandini' },
    });
    await app.close();

    expect(res.statusCode).toBe(404);
    expect(prismaMock.cow.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.cow.update).not.toHaveBeenCalled();
  });

  it('DELETE answers 404, not 500, for a malformed id', async () => {
    const app = portalApp();
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/gaushala-portal/cows/not-a-uuid',
    });
    await app.close();

    expect(res.statusCode).toBe(404);
    expect(prismaMock.cow.delete).not.toHaveBeenCalled();
  });

  it('POST /cows/:id/health answers 404, not 500, for a malformed id', async () => {
    const app = portalApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/gaushala-portal/cows/not-a-uuid/health',
      payload: { recordType: 'checkup', notes: 'Routine.' },
    });
    await app.close();

    expect(res.statusCode).toBe(404);
    expect(prismaMock.cowHealthRecord.create).not.toHaveBeenCalled();
  });

  it('keeps 400-for-a-bad-body ahead of the id check on the write paths', async () => {
    const app = portalApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/gaushala-portal/cows/not-a-uuid/health',
      payload: { recordType: 'not_a_type', notes: '' },
    });
    await app.close();

    expect(res.statusCode).toBe(400);
  });

  it('still queries for a well-formed uuid, and 404s when the cow is absent', async () => {
    const app = portalApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/gaushala-portal/cows/${ABSENT_UUID}`,
    });
    await app.close();

    expect(res.statusCode).toBe(404);
    expect(prismaMock.cow.findFirst).toHaveBeenCalledTimes(1);
  });

  it('still returns a cow that exists', async () => {
    prismaMock.cow.findFirst.mockResolvedValue({
      id: ABSENT_UUID,
      gaushalaId: OWNER_ID,
      tagNumber: 'GS-01',
      name: 'Nandini',
      healthRecords: [],
    } as any);

    const app = portalApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/gaushala-portal/cows/${ABSENT_UUID}`,
    });
    await app.close();

    expect(res.statusCode).toBe(200);
    expect(res.json().cow.name).toBe('Nandini');
  });
});
