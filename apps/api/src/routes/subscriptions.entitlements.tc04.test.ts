import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any) => {
    request.currentUser = { id: 'user-1', roles: ['DEVOTEE'] };
  },
}));

import Fastify from 'fastify';
import { subscriptionRoutes } from './subscriptions.js';
import {
  NRI_PREMIUM_PLAN_ID,
  NRI_PREMIUM_WITHDRAWN_DETAIL,
  nriPremiumEntitlementKeys,
} from '../services/subscription-entitlements.js';

/**
 * TC-04 — the HTTP half.
 *
 * At git HEAD there was no `/subscriptions/entitlements` route
 * (`git show HEAD:apps/api/src/routes/subscriptions.ts | grep entitlements`
 * returns nothing), so these tests could not have passed. `/is-premium`
 * answered a bare boolean that every consumer had to reinterpret into a
 * capability, and the one web consumer that shipped skipped the server
 * entirely and matched a client tier string against a hardcoded set.
 */

function makeApp() {
  const app = Fastify();
  void app.register(subscriptionRoutes, { prefix: '/api/v1/subscriptions' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /subscriptions/entitlements', () => {
  it('answers by capability for an active premium holder', async () => {
    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue({
      id: 'sub-1',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      userId: 'user-1',
      endDate: new Date(Date.now() + 86_400_000),
    });

    const res = await makeApp().inject({ method: 'GET', url: '/api/v1/subscriptions/entitlements' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ tier: 'ENTERPRISE', entitlements: nriPremiumEntitlementKeys() });
  });

  it('answers empty for a non-subscriber', async () => {
    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue(null);

    const res = await makeApp().inject({ method: 'GET', url: '/api/v1/subscriptions/entitlements' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ tier: null, entitlements: [] });
  });

  it('never reports an entitlement nothing enforces', async () => {
    // The whole point. `entitlements` is derived from the registry's enforced
    // set, so it cannot claim a capability that no consumer gates. If someone
    // adds a benefit label without an enforcement site, it does not appear
    // here and it does not appear on the pricing page either.
    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue({
      id: 'sub-1',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      userId: 'user-1',
      endDate: new Date(Date.now() + 86_400_000),
    });

    const res = await makeApp().inject({ method: 'GET', url: '/api/v1/subscriptions/entitlements' });

    const body = res.json() as { entitlements: string[] };
    expect(body.entitlements).toEqual(nriPremiumEntitlementKeys());
    expect(body.entitlements).not.toContain('ai_astro.unlimited');
    expect(body.entitlements).not.toContain('ads.suppressed');
  });
});

describe('GET /subscriptions/plans no longer offers a plan that delivers nothing', () => {
  it('omits nri_premium_yearly from the devotee plan list', async () => {
    const res = await makeApp().inject({
      method: 'GET',
      url: '/api/v1/subscriptions/plans?role=DEVOTEE',
    });

    expect(res.statusCode).toBe(200);
    const { plans } = res.json() as { plans: Array<{ id: string }> };
    expect(plans.find((p) => p.id === 'nri_premium_yearly')).toBeUndefined();
    // The plans that DO deliver what they sell are still listed.
    expect(plans.find((p) => p.id === 'astro_monthly')).toBeDefined();
  });
});

describe('TC-04 — the refusal a withdrawn plan returns over HTTP', () => {
  const INTERNALS = /apps\/|src\/|\.ts\b/;

  it('POST /subscribe answers 400 without leaking a repo path or the plan id', async () => {
    const res = await makeApp().inject({
      method: 'POST',
      url: '/api/v1/subscriptions/subscribe',
      payload: { planId: NRI_PREMIUM_PLAN_ID, role: 'DEVOTEE' },
    });

    expect(res.statusCode).toBe(400);
    const error = res.json().error as string;
    expect(error).toMatch(/not currently sold/i);
    expect(error).not.toMatch(INTERNALS);
    expect(error).not.toContain(NRI_PREMIUM_PLAN_ID);
  });

  it('POST /create answers 400 without leaking a repo path or the plan id', async () => {
    const res = await makeApp().inject({
      method: 'POST',
      url: '/api/v1/subscriptions/create',
      payload: { planId: NRI_PREMIUM_PLAN_ID, role: 'DEVOTEE' },
    });

    expect(res.statusCode).toBe(400);
    const error = res.json().error as string;
    expect(error).toMatch(/not currently sold/i);
    expect(error).not.toMatch(INTERNALS);
    expect(error).not.toContain(NRI_PREMIUM_PLAN_ID);
  });

  it('the operator detail reaches the log instead of the devotee', async () => {
    const app = makeApp();
    await app.ready();
    const warn = vi.spyOn(app.log, 'warn');

    await app.inject({
      method: 'POST',
      url: '/api/v1/subscriptions/create',
      payload: { planId: NRI_PREMIUM_PLAN_ID, role: 'DEVOTEE' },
    });

    expect(warn).toHaveBeenCalledWith(NRI_PREMIUM_WITHDRAWN_DETAIL);
  });
});
