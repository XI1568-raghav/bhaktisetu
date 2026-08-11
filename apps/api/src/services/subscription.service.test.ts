import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { SubscriptionService } from './subscription.service.js';

let service: SubscriptionService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new SubscriptionService();
});

describe('SubscriptionService.getPlans', () => {
  it('returns full plan catalogue when no role provided', () => {
    const plans = service.getPlans();
    expect(plans.length).toBeGreaterThan(0);
  });

  it('filters by role', () => {
    const plans = service.getPlans('PANDIT');
    expect(plans.every((p) => p.roles.includes('PANDIT'))).toBe(true);
  });

  it('returns empty array for unknown role', () => {
    const plans = service.getPlans('NOT_A_ROLE');
    expect(plans).toEqual([]);
  });

  it('every plan has required shape', () => {
    for (const p of service.getPlans()) {
      expect(p).toEqual(expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        plan: expect.any(String),
        price: expect.any(Number),
        currency: 'INR',
        roles: expect.any(Array),
        features: expect.any(Array),
      }));
    }
  });

  it('exactly one popular plan per role bucket', () => {
    const buckets: Record<string, number> = {};
    for (const p of service.getPlans()) {
      if (!p.popular) continue;
      const key = p.roles.sort().join(',');
      buckets[key] = (buckets[key] ?? 0) + 1;
    }
    for (const [key, count] of Object.entries(buckets)) {
      expect(count, `popular count for ${key}`).toBe(1);
    }
  });
});

describe('SubscriptionService.subscribe', () => {
  it('throws on unknown plan id', async () => {
    await expect(
      service.subscribe('user-1', 'plan-does-not-exist', 'PANDIT')
    ).rejects.toThrow(/Plan not found/);
  });

  it('throws when role does not match plan', async () => {
    await expect(
      service.subscribe('user-1', 'plan-pandit-basic', 'STORE_OWNER')
    ).rejects.toThrow(/not available for role/);
  });

  it('creates subscription + transaction for paid plan', async () => {
    prismaMock.marketplaceSubscription.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.marketplaceSubscription.create.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      plan: 'BASIC',
      role: 'PANDIT',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-02-01'),
      amount: 999,
      status: 'ACTIVE',
    });
    prismaMock.transaction.create.mockResolvedValue({});

    const out = await service.subscribe('user-1', 'plan-pandit-basic', 'PANDIT');

    expect(out.plan).toBe('BASIC');
    expect(out.amount).toBe(999);
    expect(prismaMock.marketplaceSubscription.updateMany).toHaveBeenCalled();
    expect(prismaMock.transaction.create).toHaveBeenCalled();
  });

  it('skips transaction creation for free plan', async () => {
    prismaMock.marketplaceSubscription.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.marketplaceSubscription.create.mockResolvedValue({
      id: 'sub-2',
      userId: 'user-1',
      plan: 'FREE',
      role: 'PANDIT',
      startDate: new Date(),
      endDate: new Date(),
      amount: 0,
      status: 'ACTIVE',
    });

    await service.subscribe('user-1', 'plan-pandit-free', 'PANDIT');

    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });
});

describe('SubscriptionService.getMySubscription', () => {
  it('returns null when no active subscription exists', async () => {
    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue(null);
    const out = await service.getMySubscription('user-1');
    expect(out).toBeNull();
  });

  it('returns existing active subscription', async () => {
    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      plan: 'PRO',
      role: 'PANDIT',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-02-01'),
      amount: 2999,
      status: 'ACTIVE',
    });

    const out = await service.getMySubscription('user-1');
    expect(out!.plan).toBe('PRO');
    expect(out!.amount).toBe(2999);
  });
});

describe('SubscriptionService — NRI Premium (Layer AR)', () => {
  it('exposes nri_premium_yearly plan with USD price', () => {
    const plans = service.getPlans('DEVOTEE');
    const nri = plans.find((p) => p.id === 'nri_premium_yearly');
    expect(nri).toBeDefined();
    expect(nri!.price).toBe(5000);
    expect(nri!.priceUsd).toBe(60);
    expect(nri!.interval).toBe('year');
    expect(nri!.durationDays).toBe(365);
    expect(nri!.plan).toBe('ENTERPRISE');
  });

  // The three createStripeAnnualSubscription tests were removed 2026-08-11 with
  // the method itself (Stripe rail removal, owner directive). This assertion
  // replaces them: it fails if any USD/Stripe checkout is reintroduced on the
  // service, which is the regression that matters now.
  it('exposes no Stripe/USD checkout path (Razorpay + INR only)', () => {
    const surface = [
      ...Object.getOwnPropertyNames(Object.getPrototypeOf(service)),
      ...Object.keys(service),
    ];
    expect(surface.filter((k) => /stripe/i.test(k))).toEqual([]);
  });

  it('isPremium returns true when ENTERPRISE active', async () => {
    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue({
      id: 'sub-1', plan: 'ENTERPRISE', status: 'ACTIVE', userId: 'u',
      endDate: new Date(Date.now() + 86400000),
    });
    expect(await service.isPremium('u')).toBe(true);
  });

  it('isPremium returns false when no premium sub', async () => {
    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue(null);
    expect(await service.isPremium('u')).toBe(false);
  });
});

describe('SubscriptionService.cancel', () => {
  it('returns cancelled:false when no active subscription', async () => {
    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue(null);
    const out = await service.cancel('user-1');
    expect(out).toEqual({ message: 'No active subscription found', cancelled: false });
  });

  it('marks subscription CANCELLED', async () => {
    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue({ id: 'sub-1' });
    prismaMock.marketplaceSubscription.update.mockResolvedValue({});

    const out = await service.cancel('user-1');

    expect(out.cancelled).toBe(true);
    expect(prismaMock.marketplaceSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sub-1' }, data: { status: 'CANCELLED' } })
    );
  });
});
