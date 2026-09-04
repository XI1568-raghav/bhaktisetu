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

  // PM-04: a priced plan now needs activation evidence (see
  // subscriptions.paid-gate.test.ts). This case previously called subscribe()
  // with no evidence and asserted an ACTIVE row came back — i.e. it pinned the
  // ₹0-provisioning hole in place. It now exercises the same write through the
  // one caller allowed to reach it, the verified Razorpay webhook.
  it('creates subscription + transaction for paid plan when payment is evidenced', async () => {
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

    const out = await service.subscribe('user-1', 'plan-pandit-basic', 'PANDIT', {
      paymentReference: 'sub_rzp_test',
      source: 'razorpay_webhook',
    });

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
  // TC-04 (2026-08-20) changed this contract deliberately. The plan sold six
  // benefits and enforced none of them, so it is withdrawn from the OFFER
  // while `enforcedBenefits()` is empty — see subscription-entitlements.ts and
  // subscription-entitlements.tc04.test.ts. Every price/tier assertion below
  // is unchanged and now reads the surviving DEFINITION; the new assertion
  // that it is not offered is added on top, so this test is strictly stronger
  // than the version it replaces.
  it('keeps the nri_premium_yearly definition, priced in INR with a USD display price', () => {
    const nri = service.getPlanDefinition('nri_premium_yearly');
    expect(nri).toBeDefined();
    expect(nri!.price).toBe(5000);
    expect(nri!.priceUsd).toBe(60);
    expect(nri!.interval).toBe('year');
    expect(nri!.durationDays).toBe(365);
    expect(nri!.plan).toBe('ENTERPRISE');
  });

  it('does not OFFER nri_premium_yearly while none of its benefits is enforced', () => {
    const plans = service.getPlans('DEVOTEE');
    expect(plans.find((p) => p.id === 'nri_premium_yearly')).toBeUndefined();
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
