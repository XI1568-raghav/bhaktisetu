import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { wellnessPortalRoutes } from './wellness-portal.js';

/**
 * AW-12 (2026-08-12, P2): GET /wellness-portal/instructor/mine 500'd on 100% of
 * calls. Both raw-SQL predicates bound a JS string against a non-text Postgres
 * column, and Prisma sends raw params typed as `text` (unlike node-postgres,
 * which leaves them unknown and lets the planner infer) — so Postgres refused:
 *
 *   42883  operator does not exist: uuid = text
 *   42883  operator does not exist: "WellnessSessionStatus" = text
 *
 * Both were reproduced through Prisma against the real local Postgres before
 * the fix: the bare id predicate raised the first, and adding only the id cast
 * then exposed the second on the status filter. Both casts are asserted here so
 * neither can regress on its own.
 */

const INSTRUCTOR_UUID = '9e15c3a2-0dc7-4677-ac45-f7dfaec619a6';

const DEMO_INSTRUCTOR = {
  id: INSTRUCTOR_UUID,
  email: 'wellness@demo.com',
  phone: null,
  fullName: 'Demo Instructor',
  subscriptionTier: 'free',
  blocked: false,
};

function makeApp() {
  const app = Fastify();
  void app.register(wellnessPortalRoutes, { prefix: '/api/v1/wellness-portal' });
  return app;
}

/**
 * Stands in for Postgres' type resolution. An equality whose left side is one
 * of these non-text columns and whose right side is a bare `$n` with no `::`
 * cast is exactly what the server rejected with 42883, so raise the same shape.
 * Cast comparisons resolve normally.
 */
const NON_TEXT_COLUMNS: Record<string, string> = {
  instructor_id: 'uuid',
  status: '"WellnessSessionStatus"',
};

function rejectUncastPredicates(sql: string) {
  const stripped = sql.replace(/--[^\n]*/g, '');
  for (const [column, pgType] of Object.entries(NON_TEXT_COLUMNS)) {
    const uncast = new RegExp(`${column}\\s*=\\s*\\$\\d+(?!\\s*::)`);
    if (uncast.test(stripped)) {
      throw Object.assign(
        new Error(
          `Raw query failed. Code: \`42883\`. Message: \`ERROR: operator does not exist: ${pgType} = text\``,
        ),
        { code: 'P2010' },
      );
    }
  }
}

const SESSION_ROW = {
  id: '11111111-1111-1111-1111-111111111111',
  instructor_id: INSTRUCTOR_UUID,
  title: 'Sunrise Hatha',
  description: 'Morning flow',
  type: 'YOGA',
  scheduled_at: new Date('2026-09-01T05:30:00.000Z'),
  duration_minutes: 60,
  capacity: 12,
  price_inr: '1000.00',
  room_url: null,
  status: 'SCHEDULED',
  created_at: new Date('2026-08-01T00:00:00.000Z'),
  updated_at: new Date('2026-08-01T00:00:00.000Z'),
};

describe('AW-12 — GET /wellness-portal/instructor/mine casts its raw-SQL params', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue(DEMO_INSTRUCTOR);
    prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) => {
      rejectUncastPredicates(sql);
      return /COUNT\(\*\)/.test(sql) ? [{ total: 1 }] : [SESSION_ROW];
    });
  });

  it('returns 200 with the instructor rows instead of a 42883 uuid = text 500', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/wellness-portal/instructor/mine',
      headers: { authorization: 'Bearer demo-wellness' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(1);
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0].id).toBe(SESSION_ROW.id);
    await app.close();
  });

  it('casts the status filter too — the enum column also refuses a text param', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/wellness-portal/instructor/mine?status=SCHEDULED',
      headers: { authorization: 'Bearer demo-wellness' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(1);
    await app.close();
  });

  it('both the page query and the count query carry both casts', async () => {
    const app = makeApp();
    await app.inject({
      method: 'GET',
      url: '/api/v1/wellness-portal/instructor/mine?status=LIVE',
      headers: { authorization: 'Bearer demo-wellness' },
    });
    const issued: string[] = prismaMock.$queryRawUnsafe.mock.calls.map(
      (c: unknown[]) => (c[0] as string).replace(/--[^\n]*/g, ''),
    );
    expect(issued).toHaveLength(2);
    for (const sql of issued) {
      expect(sql).toMatch(/instructor_id\s*=\s*\$1::uuid/);
      expect(sql).toMatch(/status\s*=\s*\$2::"WellnessSessionStatus"/);
    }
    await app.close();
  });

  it('an account id that cannot be a uuid answers an empty page, never a 22P02 crash', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...DEMO_INSTRUCTOR, id: 'legacy-non-uuid-id' });
    prismaMock.$queryRawUnsafe.mockImplementation(async () => {
      throw Object.assign(
        new Error(
          'Raw query failed. Code: `22P02`. Message: `ERROR: invalid input syntax for type uuid: "legacy-non-uuid-id"`',
        ),
        { code: 'P2010' },
      );
    });
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/wellness-portal/instructor/mine',
      headers: { authorization: 'Bearer demo-wellness' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ total: 0, sessions: [] });
    // The guard must short-circuit BEFORE Postgres is asked; otherwise the
    // throwing mock above would have surfaced as a 500.
    expect(prismaMock.$queryRawUnsafe).not.toHaveBeenCalled();
    await app.close();
  });
});
