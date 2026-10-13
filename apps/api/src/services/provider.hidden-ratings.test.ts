import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { providerService } from './provider.service.js';
import { __resetReviewModerationCache } from '../lib/review-moderation.js';

// QA 2026-10-13: hidden ratings leave public lists AND the recomputed average.

const HIDDEN = 'aaaaaaaa-0000-4000-8000-000000000002';

beforeEach(() => {
  vi.clearAllMocks();
  __resetReviewModerationCache();
});

describe('hidden ratings are excluded from the public provider detail', () => {
  it('filters the review list and the aggregate with notIn(hidden)', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ id: HIDDEN }]);
    prismaMock.wellnessProfile.findUnique.mockResolvedValue({ id: 'wp1', userId: 'u1', displayName: 'Yogini', approved: true, rating: 0 } as any);
    prismaMock.wellnessProfile.findFirst.mockResolvedValue({ id: 'wp1', userId: 'u1', displayName: 'Yogini', approved: true, rating: 0 } as any);
    prismaMock.review.findMany.mockResolvedValue([]);
    prismaMock.review.aggregate.mockResolvedValue({ _avg: { rating: 5 }, _count: { _all: 1 } } as any);
    await providerService.getProviderById('wellness', 'wp1').catch(() => undefined);
    expect(prismaMock.review.findMany).toHaveBeenCalled();
    expect(prismaMock.review.aggregate).toHaveBeenCalled();
    const listWhere = (prismaMock.review.findMany.mock.calls[0]![0] as any).where;
    const aggWhere = (prismaMock.review.aggregate.mock.calls[0]![0] as any).where;
    expect(listWhere.id).toEqual({ notIn: [HIDDEN] });
    expect(aggWhere.id).toEqual({ notIn: [HIDDEN] });
  });

  it('with nothing hidden the queries are unchanged (no id filter)', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    prismaMock.wellnessProfile.findUnique.mockResolvedValue({ id: 'wp1', userId: 'u1', displayName: 'Yogini', approved: true, rating: 0 } as any);
    prismaMock.wellnessProfile.findFirst.mockResolvedValue({ id: 'wp1', userId: 'u1', displayName: 'Yogini', approved: true, rating: 0 } as any);
    prismaMock.review.findMany.mockResolvedValue([]);
    prismaMock.review.aggregate.mockResolvedValue({ _avg: { rating: 0 }, _count: { _all: 0 } } as any);
    await providerService.getProviderById('wellness', 'wp1').catch(() => undefined);
    expect(prismaMock.review.findMany).toHaveBeenCalled();
    const listWhere = (prismaMock.review.findMany.mock.calls[0]![0] as any).where;
    expect(listWhere.id).toBeUndefined();
  });
});
