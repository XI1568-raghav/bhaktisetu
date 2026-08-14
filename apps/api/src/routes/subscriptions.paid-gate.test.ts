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
import { SubscriptionService } from '../services/subscription.service.js';

/**
 * PM-04 (prod sweep 2026-08-12, P1/money) — the SERVER half.
 *
 * POST /subscriptions/subscribe validated the body and then called
 * subscriptionService.subscribe(), which wrote an ACTIVE
 * MarketplaceSubscription plus a COMPLETED Transaction for `plan.price` with
 * no Razorpay order, no signature check and no paid gate anywhere between the
 * request and the row. The entitlement is real (ai-usage.ts reads
 * marketplaceSubscription to grant AI Pandit quota; admin.service counts
 * ACTIVE subscriptions into revenue reporting), so any signed-in devotee could
 * grant themselves "Astro Monthly Unlimited" (₹499/mo) — and the dashboards
 * reported the ₹499 as earned.
 *
 * The web half (PR: subscription-checkout-contract.test.tsx) rewired
 * SubscriptionPanel onto POST /create, the rail that makes a real Razorpay
 * subscription. This pins the server side of that contract:
 *
 *   1. subscribe() refuses to mint an ACTIVE row for a priced plan unless the
 *      caller can evidence a verified payment. Free plans are untouched.
 *   2. POST /subscribe answers 402 for a priced plan and never touches the DB.
 *   3. The paid rail still works: the Razorpay webhook (subscription.activated
 *      / .charged) activates, because THAT caller has the evidence.
 *   4. No fabricated success. A DB failure used to be swallowed and answered
 *      with a synthetic `sub-<timestamp>` row carrying status ACTIVE; it must
 *      surface as an error instead.
 */

const PAID_PLAN_ID = 'plan-pandit-basic';
const FREE_PLAN_ID = 'plan-pandit-free';

function makeApp() {
  const app = Fastify();
  void app.register(subscriptionRoutes, { prefix: '/api/v1/subscriptions' });
  return app;
}

let service: SubscriptionService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new SubscriptionService();
  prismaMock.marketplaceSubscription.updateMany.mockResolvedValue({ count: 0 });
  prismaMock.transaction.create.mockResolvedValue({});
});

function activeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub-1',
    userId: 'user-1',
    plan: 'BASIC',
    role: 'PANDIT',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-02-01'),
    amount: 999,
    status: 'ACTIVE',
    ...overrides,
  };
}

describe('PM-04 — a priced subscription cannot be provisioned without payment', () => {
  it('subscribe() refuses a priced plan when no payment is evidenced', async () => {
    prismaMock.marketplaceSubscription.create.mockResolvedValue(activeRow());

    await expect(service.subscribe('user-1', PAID_PLAN_ID, 'PANDIT')).rejects.toThrow(
      /payment/i,
    );

    // The refusal must happen BEFORE any write: no cancellation of the
    // previous plan, no ACTIVE row, no revenue-bearing Transaction.
    expect(prismaMock.marketplaceSubscription.create).not.toHaveBeenCalled();
    expect(prismaMock.marketplaceSubscription.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it('free plans are unaffected — they still activate', async () => {
    prismaMock.marketplaceSubscription.create.mockResolvedValue(
      activeRow({ id: 'sub-free', plan: 'FREE', amount: 0 }),
    );

    const out = await service.subscribe('user-1', FREE_PLAN_ID, 'PANDIT');

    expect(out.status).toBe('ACTIVE');
    expect(prismaMock.marketplaceSubscription.create).toHaveBeenCalled();
    expect(prismaMock.transaction.create).not.toHaveBeenCalled();
  });

  it('the verified-payment caller (Razorpay webhook) still activates a priced plan', async () => {
    prismaMock.marketplaceSubscription.create.mockResolvedValue(activeRow());
    prismaMock.transaction.findMany.mockResolvedValue([
      {
        id: 't-1',
        userId: 'user-1',
        type: 'SUBSCRIPTION',
        metadata: {
          razorpaySubscriptionId: 'sub_rzp_1',
          planId: PAID_PLAN_ID,
          role: 'PANDIT',
        },
      },
    ]);

    const r = await service.handleSubscriptionEvent('subscription.activated', {
      payload: { subscription: { entity: { id: 'sub_rzp_1', status: 'active' } } },
    });

    expect(r.handled).toBe(true);
    expect(prismaMock.marketplaceSubscription.create).toHaveBeenCalled();
  });

  it('POST /subscribe answers 402 for a priced plan and writes nothing', async () => {
    prismaMock.marketplaceSubscription.create.mockResolvedValue(activeRow());
    const app = makeApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/subscriptions/subscribe',
      payload: { planId: PAID_PLAN_ID, role: 'PANDIT' },
    });

    expect(res.statusCode).toBe(402);
    expect(prismaMock.marketplaceSubscription.create).not.toHaveBeenCalled();
    const body = res.json() as { error?: string };
    expect(String(body.error)).toMatch(/payment/i);
  });

  it('POST /subscribe still provisions a free plan', async () => {
    prismaMock.marketplaceSubscription.create.mockResolvedValue(
      activeRow({ id: 'sub-free', plan: 'FREE', amount: 0 }),
    );
    const app = makeApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/subscriptions/subscribe',
      payload: { planId: FREE_PLAN_ID, role: 'PANDIT' },
    });

    expect(res.statusCode).toBe(200);
    expect(prismaMock.marketplaceSubscription.create).toHaveBeenCalled();
  });

  it('a database failure surfaces as an error instead of a fabricated ACTIVE row', async () => {
    prismaMock.marketplaceSubscription.create.mockRejectedValue(new Error('db down'));

    await expect(service.subscribe('user-1', FREE_PLAN_ID, 'PANDIT')).rejects.toThrow();
  });

  /**
   * The paid rail's own free-grant escape.
   *
   * createRazorpaySubscription computed
   * `isDemo = !keyId || keyId === 'rzp_test_demo' || !rzpPlanId`, and the demo
   * branch activates the plan outright. assertNotProductionDemo() only fires on
   * the CREDENTIALS. So a production deploy holding real Razorpay keys but no
   * RAZORPAY_PLAN_* mapping for the plan being sold — which is the live state
   * of `astro_session` (₹99) and `nri_premium_yearly` (₹5,000), neither of
   * which appears in mapToRazorpayPlanId's env map — took the demo branch and
   * granted the plan for ₹0, with a `sub_demo_<timestamp>` id finance can never
   * reconcile. An unsellable plan must fail loudly, not fall back to free.
   */
  it('refuses to sell a plan that has no Razorpay plan id when credentials are real', async () => {
    const prevKey = process.env.RAZORPAY_KEY_ID;
    const prevSecret = process.env.RAZORPAY_KEY_SECRET;
    process.env.RAZORPAY_KEY_ID = 'rzp_live_realkey';
    process.env.RAZORPAY_KEY_SECRET = 'realsecret';
    try {
      await expect(
        service.createRazorpaySubscription({
          userId: 'user-1',
          planId: 'astro_session',
          role: 'DEVOTEE',
        }),
      ).rejects.toThrow(/plan/i);
      expect(prismaMock.marketplaceSubscription.create).not.toHaveBeenCalled();
    } finally {
      if (prevKey === undefined) delete process.env.RAZORPAY_KEY_ID;
      else process.env.RAZORPAY_KEY_ID = prevKey;
      if (prevSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
      else process.env.RAZORPAY_KEY_SECRET = prevSecret;
    }
  });
});
