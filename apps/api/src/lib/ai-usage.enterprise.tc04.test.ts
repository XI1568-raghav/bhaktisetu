import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from './__mocks__/prisma.js';

vi.mock('./prisma.js', () => ({ prisma: prismaMock }));

import { canSendMessage } from './ai-usage.js';

/**
 * TC-04 — an NRI Premium holder got FEWER AI messages than a ₹499 subscriber.
 *
 * `nri_premium_yearly` maps to `MarketplacePlan.ENTERPRISE` (see
 * subscription-entitlements.tc04.test.ts:45). `getActivePlan()` in ai-usage.ts
 * branched on BASIC -> session and PRO -> monthly and then `return null`, so
 * ENTERPRISE fell through to the anonymous/free path: FREE_MONTHLY_LIMIT = 5
 * messages a month.
 *
 * "Unlimited AI Pandit" is one of the six benefits the ₹5,000/yr tier
 * advertised, and the tier is a strict superset of PRO in price. So the holder
 * of the most expensive plan in the product received one sixth of what a ₹499
 * PRO subscriber received, on the exact benefit the plan was sold on.
 *
 * The plan is withdrawn from sale (TC-03), but that is precisely why this still
 * matters: `NRI_PREMIUM_WITHDRAWN_NOTICE` promises "Existing subscriptions are
 * unaffected and keep running to their end date", and existing holders are the
 * only people who can hit this path.
 *
 * Confirmed RED before the fix: an ACTIVE ENTERPRISE row produced
 * `{ plan: 'free', limit: 5 }`.
 */

const USER = 'b4a1c2d3-1111-4222-8333-444455556666';

function activeSub(plan: 'BASIC' | 'PRO' | 'ENTERPRISE' | 'FREE') {
  return {
    id: `sub-${plan.toLowerCase()}`,
    userId: USER,
    plan,
    role: 'DEVOTEE',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2099-01-01'),
    amount: 5000,
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TC-04 — an ENTERPRISE (NRI Premium) subscriber is not throttled to the free tier', () => {
  it('grants the unmetered tier, the same one PRO gets', async () => {
    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue(
      activeSub('ENTERPRISE') as never,
    );
    const decision = await canSendMessage(USER);
    expect(decision.allowed).toBe(true);
    expect(decision.plan).toBe('monthly');
    if (decision.allowed) {
      expect(decision.limit).toBeNull();
      expect(decision.remaining).toBeNull();
    }
  });

  it('is never worse than the cheaper PRO plan it sits above', async () => {
    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue(activeSub('PRO') as never);
    const pro = await canSendMessage(USER);

    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue(
      activeSub('ENTERPRISE') as never,
    );
    const enterprise = await canSendMessage(USER);

    expect(enterprise).toEqual(pro);
  });

  it('still meters a free user, so the branch above is a grant and not a hole', async () => {
    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue(null);
    const decision = await canSendMessage(`${USER.slice(0, -1)}7`);
    expect(decision.plan).toBe('free');
    if (decision.allowed) expect(decision.limit).toBe(5);
  });

  it('still meters BASIC as a capped session, unchanged', async () => {
    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue(activeSub('BASIC') as never);
    const decision = await canSendMessage(USER);
    expect(decision.plan).toBe('session');
    if (decision.allowed) expect(decision.limit).toBe(30);
  });
});
