import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';
// SCAL-08: the in-process cache fallback is real now, so a suite that asserts
// on the query a service issues must start each test from a cold cache.
import { __memoryCacheClear } from '../lib/cache.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { PujaService } from './puja.service.js';

let service: PujaService;

beforeEach(() => {
  vi.clearAllMocks();
  __memoryCacheClear();
  service = new PujaService();
});

describe('PujaService.findAllTypes', () => {
  it('returns paginated results with default page/limit', async () => {
    prismaMock.pujaType.findMany.mockResolvedValue([
      { id: 'p1', name: 'Ganesh Puja', basePrice: 1100 },
    ]);
    prismaMock.pujaType.count.mockResolvedValue(1);

    const out = await service.findAllTypes({});

    expect(out.pujaTypes).toHaveLength(1);
    expect(out.total).toBe(1);
    expect(out.page).toBe(1);
    expect(out.limit).toBe(20);
    expect(out.totalPages).toBe(1);
    expect(prismaMock.pujaType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        skip: 0,
        take: 20,
      })
    );
  });

  it('applies category filter', async () => {
    prismaMock.pujaType.findMany.mockResolvedValue([]);
    prismaMock.pujaType.count.mockResolvedValue(0);

    await service.findAllTypes({ category: 'WEDDING' });

    const call = prismaMock.pujaType.findMany.mock.calls[0]![0]!;
    expect(call.where.category).toBe('WEDDING');
  });

  it('applies deity filter as case-insensitive contains', async () => {
    prismaMock.pujaType.findMany.mockResolvedValue([]);
    prismaMock.pujaType.count.mockResolvedValue(0);

    await service.findAllTypes({ deity: 'shiva' });

    const call = prismaMock.pujaType.findMany.mock.calls[0]![0]!;
    expect(call.where.deity).toEqual({ contains: 'shiva', mode: 'insensitive' });
  });

  it('applies search across name/description/deity', async () => {
    prismaMock.pujaType.findMany.mockResolvedValue([]);
    prismaMock.pujaType.count.mockResolvedValue(0);

    await service.findAllTypes({ search: 'rudra' });

    const call = prismaMock.pujaType.findMany.mock.calls[0]![0]!;
    expect(call.where.OR).toEqual([
      { name: { contains: 'rudra', mode: 'insensitive' } },
      { description: { contains: 'rudra', mode: 'insensitive' } },
      { deity: { contains: 'rudra', mode: 'insensitive' } },
    ]);
  });

  it('paginates correctly for page 3 limit 5', async () => {
    prismaMock.pujaType.findMany.mockResolvedValue([]);
    prismaMock.pujaType.count.mockResolvedValue(13);

    const out = await service.findAllTypes({ page: 3, limit: 5 });

    expect(prismaMock.pujaType.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 })
    );
    expect(out.total).toBe(13);
    expect(out.page).toBe(3);
    expect(out.totalPages).toBe(3);
  });
});

describe('PujaService.findBySlug', () => {
  it('returns null when not found', async () => {
    prismaMock.pujaType.findUnique.mockResolvedValue(null);
    const out = await service.findBySlug('does-not-exist');
    expect(out).toBeNull();
  });

  it('flattens templeOfferings into a temples array on success', async () => {
    prismaMock.pujaType.findUnique.mockResolvedValue({
      id: 'p1',
      slug: 'ganesh-puja',
      name: 'Ganesh Puja',
      templeOfferings: [
        {
          id: 'off-1',
          priceOverride: null,
          temple: { id: 't1', name: 'X', slug: 'x', city: 'Mumbai', state: 'MH' },
        },
      ],
    });

    const out = await service.findBySlug('ganesh-puja');

    expect(out).not.toBeNull();
    expect(out!.temples).toHaveLength(1);
    expect(out!.temples[0]!.offeringId).toBe('off-1');
  });
});
