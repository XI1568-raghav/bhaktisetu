import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { ContentService } from './content.service.js';

let service: ContentService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new ContentService();
});

describe('ContentService.findAll', () => {
  it('always filters status:published', async () => {
    prismaMock.contentItem.findMany.mockResolvedValue([]);
    prismaMock.contentItem.count.mockResolvedValue(0);

    await service.findAll({});

    const call = prismaMock.contentItem.findMany.mock.calls[0][0];
    expect(call.where.status).toBe('published');
  });

  it('lowercases tag search', async () => {
    prismaMock.contentItem.findMany.mockResolvedValue([]);
    prismaMock.contentItem.count.mockResolvedValue(0);

    await service.findAll({ search: 'BHAJAN' });

    const call = prismaMock.contentItem.findMany.mock.calls[0][0];
    const tagClause = call.where.OR.find((c: any) => c.tags);
    expect(tagClause).toEqual({ tags: { has: 'bhajan' } });
  });

  it('returns {data, pagination} shape', async () => {
    prismaMock.contentItem.findMany.mockResolvedValue([{ id: 'c1' }]);
    prismaMock.contentItem.count.mockResolvedValue(1);

    const out = await service.findAll({});

    expect(out.data).toHaveLength(1);
    expect(out.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('isPremium boolean filter', async () => {
    prismaMock.contentItem.findMany.mockResolvedValue([]);
    prismaMock.contentItem.count.mockResolvedValue(0);

    await service.findAll({ isPremium: true });

    const call = prismaMock.contentItem.findMany.mock.calls[0][0];
    expect(call.where.isPremium).toBe(true);
  });
});

describe('ContentService.search', () => {
  it('empty query short-circuits without DB call', async () => {
    const out = await service.search('');
    expect(out).toEqual({ results: [], total: 0, query: '', page: 1, limit: 20 });
    expect(prismaMock.contentItem.findMany).not.toHaveBeenCalled();
  });
});
