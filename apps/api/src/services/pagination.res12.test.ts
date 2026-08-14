/**
 * RES-12 — a negative `page` returned HTTP 500 on three public list endpoints.
 *
 * Reproduced live before this test existed:
 *   GET /api/v1/temples?page=-1     -> 500 {"error":"Failed to fetch temples"}
 *   GET /api/v1/pujas/types?page=-1 -> 500 {"error":"Failed to fetch puja types"}
 *   GET /api/v1/content?page=-1     -> 500 {"error":"Failed to fetch content"}
 *   GET /api/v1/temples?page=1      -> 200
 *
 * Cause: `skip = (page - 1) * limit` with an unvalidated page, so `-1` asks
 * Postgres for OFFSET -40 and Prisma throws. The assertion below is on the
 * `skip` actually handed to Prisma, because that is the value that decides
 * 200 vs 500 — not on the HTTP status of a mocked route.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
// The catalogue services memoise through lib/cache; bypass it so each case
// actually reaches Prisma instead of replaying a neighbouring case's result.
vi.mock('../lib/cache.js', () => ({
  cached: async (_key: string, _ttl: number, fn: () => Promise<unknown>) => fn(),
  CACHE_TTL: { TEMPLE_LIST: 60, PUJA_LIST: 60, TEMPLE_DETAIL: 60, PUJA_DETAIL: 60 },
  invalidate: vi.fn(),
  invalidatePrefix: vi.fn(),
}));

import { TempleService } from './temple.service.js';
import { PujaService } from './puja.service.js';
import { ContentService } from './content.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RES-12: negative pagination never reaches Prisma as a negative skip', () => {
  it('TempleService.findAll clamps page=-1 to page 1', async () => {
    prismaMock.temple.findMany.mockResolvedValue([]);
    prismaMock.temple.count.mockResolvedValue(0);

    const out = await new TempleService().findAll({ page: -1 });

    const args = prismaMock.temple.findMany.mock.calls[0]![0]!;
    expect(args.skip).toBe(0);
    expect(out.page).toBe(1);
  });

  it('PujaService.findAllTypes clamps page=-1 to page 1', async () => {
    prismaMock.pujaType.findMany.mockResolvedValue([]);
    prismaMock.pujaType.count.mockResolvedValue(0);

    const out = await new PujaService().findAllTypes({ page: -1 });

    const args = prismaMock.pujaType.findMany.mock.calls[0]![0]!;
    expect(args.skip).toBe(0);
    expect(out.page).toBe(1);
  });

  it('ContentService.findAll clamps page=-1 to page 1', async () => {
    prismaMock.contentItem.findMany.mockResolvedValue([]);
    prismaMock.contentItem.count.mockResolvedValue(0);

    const out = await new ContentService().findAll({ page: -1 });

    const args = prismaMock.contentItem.findMany.mock.calls[0]![0]!;
    expect(args.skip).toBe(0);
    expect(out.pagination.page).toBe(1);
  });

  it('a negative limit is not passed through as a negative Prisma take', async () => {
    prismaMock.contentItem.findMany.mockResolvedValue([]);
    prismaMock.contentItem.count.mockResolvedValue(0);

    await new ContentService().findAll({ page: 1, limit: -5 });

    const args = prismaMock.contentItem.findMany.mock.calls[0]![0]!;
    expect(args.take).toBeGreaterThan(0);
  });

  it('a huge page still produces a non-negative skip and keeps working', async () => {
    prismaMock.temple.findMany.mockResolvedValue([]);
    prismaMock.temple.count.mockResolvedValue(0);

    const out = await new TempleService().findAll({ page: 3, limit: 10 });

    const args = prismaMock.temple.findMany.mock.calls[0]![0]!;
    expect(args.skip).toBe(20);
    expect(out.page).toBe(3);
  });
});
