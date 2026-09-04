import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { priestsPublicRoutes } from './priests-public.js';

/**
 * SCAL-04 — GET /api/v1/priests was the last unbounded read an ANONYMOUS caller
 * could trigger.
 *
 * Registered at server.ts:413 with NO preHandler, so it is fully public. It ran
 * `prisma.priest.findMany({ where, orderBy, select })` with no `take` and no
 * `cursor`, over the widest rows of any remaining unbounded read (bio,
 * languages[], specializations[]). The 5-minute Cache-Control on the response is
 * a CDN hint, not a database bound: a cold cache, a query-string permutation, or
 * any client that skips the CDN goes straight to Postgres for the whole table.
 *
 * The trap this test also guards: SCAL-09's lying number. `total` must come from
 * a paired `count(where)`, NOT from the length of the page — a paginated
 * response whose total is its own page size tells every client there is exactly
 * one page.
 */

const PRIEST = {
  id: 'p1',
  displayName: 'Pandit A',
  avatarUrl: null,
  bio: null,
  languages: ['hi'],
  specializations: ['marriage'],
  experienceYears: 10,
  ratingAvg: 4.8,
  ratingCount: 12,
  isVerified: true,
};

async function get(url: string) {
  const app = Fastify({ logger: false });
  await app.register(priestsPublicRoutes, { prefix: '/api/v1/priests' });
  const res = await app.inject({ method: 'GET', url });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.priest.findMany.mockResolvedValue([PRIEST] as never);
  prismaMock.priest.count.mockResolvedValue(137 as never);
  prismaMock.priestPujaOffering.groupBy.mockResolvedValue([] as never);
});

describe('SCAL-04 — GET /priests is bounded', () => {
  it('sends a take to Postgres instead of asking for every verified priest', async () => {
    await get('/api/v1/priests');
    const args = prismaMock.priest.findMany.mock.calls[0]![0] as any;
    expect(typeof args.take).toBe('number');
    expect(args.take).toBeGreaterThan(0);
    expect(args.skip).toBe(0);
  });

  it('caps limit so a caller cannot ask for the whole table', async () => {
    await get('/api/v1/priests?limit=100000');
    const args = prismaMock.priest.findMany.mock.calls[0]![0] as any;
    expect(args.take).toBeLessThanOrEqual(100);
  });

  it('pages with skip derived from page', async () => {
    await get('/api/v1/priests?page=3&limit=10');
    const args = prismaMock.priest.findMany.mock.calls[0]![0] as any;
    expect(args.take).toBe(10);
    expect(args.skip).toBe(20);
  });

  it('reports the TRUE total from a paired count, not the page length', async () => {
    const res = await get('/api/v1/priests?limit=1');
    const body = res.json();
    // SCAL-09's defect re-committed here would make this 1.
    expect(body.total).toBe(137);
    expect(body.priests).toHaveLength(1);
    // The count must carry the SAME where as the page, or the total describes a
    // different set than the rows.
    const findWhere = (prismaMock.priest.findMany.mock.calls[0]![0] as any).where;
    const countWhere = (prismaMock.priest.count.mock.calls[0]![0] as any).where;
    expect(countWhere).toEqual(findWhere);
  });

  it('keeps the existing `priests` array so current clients do not break', async () => {
    const res = await get('/api/v1/priests');
    const body = res.json();
    expect(Array.isArray(body.priests)).toBe(true);
    expect(body.priests[0].id).toBe('p1');
    expect(body.page).toBe(1);
    expect(typeof body.limit).toBe('number');
  });

  it('still bounds the query when the result set is empty', async () => {
    prismaMock.priest.findMany.mockResolvedValue([] as never);
    prismaMock.priest.count.mockResolvedValue(0 as never);
    const res = await get('/api/v1/priests');
    const body = res.json();
    expect(body.priests).toEqual([]);
    expect(body.total).toBe(0);
    expect((prismaMock.priest.findMany.mock.calls[0]![0] as any).take).toBeGreaterThan(0);
  });

  it('rejects a non-numeric page rather than silently paging from NaN', async () => {
    const res = await get('/api/v1/priests?page=abc');
    expect(res.statusCode).toBe(400);
  });
});
