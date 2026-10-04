/**
 * Public listing + detail must hide approved-but-junk gaushala/temple profiles
 * (no DB delete), and leave passing records, pagination and other types alone.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { ProviderService } from './provider.service.js';

const junk = {
  id: 'junk-1',
  userId: 'u-junk',
  gaushalaName: 'saharanpur',
  description: 'skkss',
  address: 'ssdwdqe',
  totalCows: 5,
  approved: true,
};
const good = (n: number) => ({
  id: `good-${n}`,
  userId: `u-good-${n}`,
  gaushalaName: `Shri Krishna Gaushala ${n}`,
  description: 'Traditional gaushala near Vrindavan caring for indigenous breed cows.',
  address: 'Vrindavan Road, Mathura',
  totalCows: 100 - n,
  approved: true,
});
const goodTemple = {
  id: 't-good',
  userId: 'u-t',
  templeName: 'Shri Mahakaleshwar Temple',
  description: 'Ancient jyotirlinga temple on the banks of the Shipra river.',
  address: 'Jaisinghpura, Ujjain, Madhya Pradesh',
  totalStreams: 3,
  approved: true,
};
const junkTemple = { id: 't-junk', userId: 'u-tj', templeName: 'x', description: 'y', address: 'z', totalStreams: 9, approved: true };

let service: ProviderService;
beforeEach(() => {
  vi.clearAllMocks();
  service = new ProviderService();
  prismaMock.review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } } as never);
});

describe('public cause listing quality filter', () => {
  it('hides a junk gaushala and keeps good ones, total excludes the junk', async () => {
    prismaMock.gaushalaProfile.findMany.mockResolvedValue([junk, good(1), good(2)] as never);

    const out = await service.getProviders('gaushala', { page: 1, limit: 20 });

    expect(out.providers.map((p) => p.id)).toEqual(['good-1', 'good-2']);
    expect(out.total).toBe(2);
  });

  it('paginates after filtering', async () => {
    prismaMock.gaushalaProfile.findMany.mockResolvedValue([junk, good(1), good(2), good(3)] as never);

    const out = await service.getProviders('gaushala', { page: 2, limit: 2 });

    expect(out.providers.map((p) => p.id)).toEqual(['good-3']);
    expect(out.total).toBe(3);
  });

  it('hides a junk temple profile too', async () => {
    prismaMock.templeProfile.findMany.mockResolvedValue([junkTemple, goodTemple] as never);

    const out = await service.getProviders('temple', { page: 1, limit: 20 });

    expect(out.providers.map((p) => p.id)).toEqual(['t-good']);
    expect(out.total).toBe(1);
  });

  it('detail endpoint returns null for a junk approved gaushala', async () => {
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(junk as never);
    expect(await service.getProviderById('gaushala', 'junk-1')).toBeNull();
  });

  it('detail endpoint still returns a good gaushala', async () => {
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(good(1) as never);
    const p = await service.getProviderById('gaushala', 'good-1');
    expect(p?.id).toBe('good-1');
  });
});
