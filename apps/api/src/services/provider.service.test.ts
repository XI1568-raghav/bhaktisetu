import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { ProviderService } from './provider.service.js';

let service: ProviderService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new ProviderService();
});

describe('ProviderService.getProviders (DB path)', () => {
  it('queries panditProfile with approved+city+rating filters', async () => {
    prismaMock.panditProfile.findMany.mockResolvedValue([{ id: 'p1' }]);
    prismaMock.panditProfile.count.mockResolvedValue(1);

    const out = await service.getProviders('pandit', { city: 'Pune', minRating: 4.5, page: 1, limit: 10 });

    expect(out.total).toBe(1);
    const call = prismaMock.panditProfile.findMany.mock.calls[0]![0]!;
    expect(call.where.approved).toBe(true);
    expect(call.where.city).toEqual({ contains: 'Pune', mode: 'insensitive' });
    expect(call.where.rating).toEqual({ gte: 4.5 });
  });

  it('paginates skip/take correctly: page 3 limit 5 → skip 10', async () => {
    prismaMock.panditProfile.findMany.mockResolvedValue([]);
    prismaMock.panditProfile.count.mockResolvedValue(0);

    await service.getProviders('pandit', { page: 3, limit: 5 });

    const call = prismaMock.panditProfile.findMany.mock.calls[0]![0]!;
    expect(call.skip).toBe(10);
    expect(call.take).toBe(5);
  });

  it('applies price_asc sort to pandit pricePerPuja', async () => {
    prismaMock.panditProfile.findMany.mockResolvedValue([]);
    prismaMock.panditProfile.count.mockResolvedValue(0);

    await service.getProviders('pandit', { sort: 'price_asc' });

    const call = prismaMock.panditProfile.findMany.mock.calls[0]![0]!;
    expect(call.orderBy.pricePerPuja).toBe('asc');
  });

  it('applies specialty filter via has', async () => {
    prismaMock.astrologerProfile.findMany.mockResolvedValue([]);
    prismaMock.astrologerProfile.count.mockResolvedValue(0);

    await service.getProviders('astrologer', { specialty: 'Numerology' });

    const call = prismaMock.astrologerProfile.findMany.mock.calls[0]![0]!;
    expect(call.where.specialties).toEqual({ has: 'Numerology' });
  });

  it('routes gaushala to gaushalaProfile with totalCows desc order', async () => {
    prismaMock.gaushalaProfile.findMany.mockResolvedValue([]);
    prismaMock.gaushalaProfile.count.mockResolvedValue(0);

    await service.getProviders('gaushala', {});

    const call = prismaMock.gaushalaProfile.findMany.mock.calls[0]![0]!;
    expect(call.orderBy).toEqual({ totalCows: 'desc' });
  });
});

describe('ProviderService.getProviders (mock fallback)', () => {
  it('falls back to in-memory mocks when prisma throws', async () => {
    prismaMock.panditProfile.findMany.mockRejectedValue(new Error('db down'));
    prismaMock.panditProfile.count.mockResolvedValue(0);

    const out = await service.getProviders('pandit', {});

    expect(out.providers.length).toBeGreaterThan(0);
    expect(out.total).toBeGreaterThan(0);
  });

  it('mock fallback applies city filter (case-insensitive substring)', async () => {
    prismaMock.panditProfile.findMany.mockRejectedValue(new Error());
    const out = await service.getProviders('pandit', { city: 'NASHIK' });
    expect(out.providers.every((p: any) => p.city.toLowerCase().includes('nashik'))).toBe(true);
  });

  it('mock fallback applies minRating filter', async () => {
    prismaMock.panditProfile.findMany.mockRejectedValue(new Error());
    const out = await service.getProviders('pandit', { minRating: 4.85 });
    expect(out.providers.every((p: any) => p.rating >= 4.85)).toBe(true);
  });
});

describe('ProviderService.getProviderById', () => {
  it('returns null when DB returns null and mock has no match', async () => {
    prismaMock.panditProfile.findUnique.mockResolvedValue(null);
    const out = await service.getProviderById('pandit', 'nope');
    expect(out).toBeNull();
  });

  it('attaches reviews from prisma when DB hit', async () => {
    prismaMock.panditProfile.findUnique.mockResolvedValue({ id: 'pandit-001', name: 'X' });
    prismaMock.review.findMany.mockResolvedValue([
      { id: 'r1', rating: 5, comment: 'Great' },
    ]);

    const out = await service.getProviderById('pandit', 'pandit-001');
    expect((out as any).reviews).toHaveLength(1);
    const reviewCall = prismaMock.review.findMany.mock.calls[0]![0]!;
    expect(reviewCall.where.providerType).toBe('PANDIT');
  });

  it('falls back to mock data + mockReviews when prisma errors', async () => {
    prismaMock.panditProfile.findUnique.mockRejectedValue(new Error());
    const out = await service.getProviderById('pandit', 'pandit-001');
    expect(out).not.toBeNull();
    expect((out as any).id).toBe('pandit-001');
    expect(Array.isArray((out as any).reviews)).toBe(true);
  });
});

describe('ProviderService.addReview', () => {
  it('creates review via prisma and returns shaped response', async () => {
    prismaMock.review.create.mockResolvedValue({
      id: 'rev-99',
      rating: 5,
      comment: 'Excellent',
      createdAt: new Date('2026-04-01'),
    });

    const out = await service.addReview({
      userId: 'u-1',
      providerId: 'pandit-001',
      providerType: 'PANDIT',
      rating: 5,
      comment: 'Excellent',
    });

    expect(out.review.id).toBe('rev-99');
    expect(out.message).toBe('Review submitted');
  });

  it('falls back to in-memory store when prisma errors', async () => {
    prismaMock.review.create.mockRejectedValue(new Error());

    const out = await service.addReview({
      userId: 'u-1',
      providerId: 'pandit-001',
      providerType: 'PANDIT',
      rating: 4,
    });

    expect(out.message).toMatch(/demo/);
    expect(out.review.rating).toBe(4);
  });
});

describe('ProviderService.updateProvider', () => {
  it('returns null in mock fallback when userId mismatches owner', async () => {
    prismaMock.panditProfile.update.mockRejectedValue(new Error());
    const out = await service.updateProvider('pandit', 'pandit-001', 'different-user', { bio: 'New' });
    expect(out).toBeNull();
  });

  it('merges updates onto provider in mock fallback when ownership matches', async () => {
    prismaMock.panditProfile.update.mockRejectedValue(new Error());
    const out = await service.updateProvider('pandit', 'pandit-001', 'user-002', { bio: 'Updated' });
    expect((out as any).bio).toBe('Updated');
  });
});
