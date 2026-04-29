import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { TempleService } from './temple.service.js';

let service: TempleService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new TempleService();
});

describe('TempleService.findAll', () => {
  it('always filters by status:active', async () => {
    prismaMock.temple.findMany.mockResolvedValue([]);
    prismaMock.temple.count.mockResolvedValue(0);

    await service.findAll({});

    const call = prismaMock.temple.findMany.mock.calls[0]![0]!;
    expect(call.where.status).toBe('active');
  });

  it('applies city/state filters case-insensitively', async () => {
    prismaMock.temple.findMany.mockResolvedValue([]);
    prismaMock.temple.count.mockResolvedValue(0);

    await service.findAll({ city: 'Varanasi', state: 'UP' });

    const call = prismaMock.temple.findMany.mock.calls[0]![0]!;
    expect(call.where.city).toEqual({ equals: 'Varanasi', mode: 'insensitive' });
    expect(call.where.state).toEqual({ equals: 'UP', mode: 'insensitive' });
  });

  it('applies isVerified + liveDarshan boolean filters', async () => {
    prismaMock.temple.findMany.mockResolvedValue([]);
    prismaMock.temple.count.mockResolvedValue(0);

    await service.findAll({ isVerified: true, liveDarshan: false });

    const call = prismaMock.temple.findMany.mock.calls[0]![0]!;
    expect(call.where.isVerified).toBe(true);
    expect(call.where.liveDarshanEnabled).toBe(false);
  });

  it('search clause spans 4 fields', async () => {
    prismaMock.temple.findMany.mockResolvedValue([]);
    prismaMock.temple.count.mockResolvedValue(0);

    await service.findAll({ search: 'shiva' });

    const call = prismaMock.temple.findMany.mock.calls[0]![0]!;
    expect(call.where.OR).toHaveLength(4);
  });

  it('orders by trustScore desc then name asc', async () => {
    prismaMock.temple.findMany.mockResolvedValue([]);
    prismaMock.temple.count.mockResolvedValue(0);

    await service.findAll({});

    const call = prismaMock.temple.findMany.mock.calls[0]![0]!;
    expect(call.orderBy).toEqual([{ trustScore: 'desc' }, { name: 'asc' }]);
  });

  it('paginates: page 2 limit 5 => skip 5 take 5', async () => {
    prismaMock.temple.findMany.mockResolvedValue([]);
    prismaMock.temple.count.mockResolvedValue(7);

    const out = await service.findAll({ page: 2, limit: 5 });

    expect(prismaMock.temple.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 })
    );
    expect(out.totalPages).toBe(2);
  });
});

describe('TempleService.search', () => {
  it('returns empty fast path on empty query', async () => {
    const out = await service.search('');
    expect(out).toEqual({ results: [], total: 0, query: '', page: 1, limit: 20 });
    expect(prismaMock.temple.findMany).not.toHaveBeenCalled();
  });
});
