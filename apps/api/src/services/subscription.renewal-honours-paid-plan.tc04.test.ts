import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { SubscriptionService } from './subscription.service.js';
import {
  NRI_PREMIUM_PLAN_ID,
  NRI_PREMIUM_WITHDRAWN_MESSAGE,
  nriPremiumIsSellable,
} from './subscription-entitlements.js';

/**
 * TC-04, follow-on — WITHDRAWING THE SALE MUST NOT CANCEL THE RENEWALS.
 *
 * The TC-04 remediation made `nri_premium_yearly` unsellable and put the
 * refusal in `subscribe()`, with this comment on it
 * (subscription.service.ts:360):
 *
 *     // TC-04: refuse a withdrawn plan before any write. Note this guards the
 *     // SALE, not the honouring of one — an already-sold subscription is
 *     // untouched, and isPremium()/getMySubscription() keep working for it.
 *
 * The second sentence is false, and the TC-04 suite could not see it because
 * every "existing holder" assertion it makes is a READ (`isPremium`). The
 * write path is the one that breaks:
 *
 *     POST /subscriptions/webhook  (routes/subscriptions.ts:173)
 *       -> SubscriptionService.handleSubscriptionEvent('subscription.charged')
 *       -> this.subscribe(userId, planId, role, { source: 'razorpay_webhook' })
 *       -> isOfferable(nri_premium_yearly) === false  ->  THROW
 *
 * `subscription.charged` is the RENEWAL event. Razorpay emits it after it has
 * already debited the mandate. So for anyone who bought NRI Premium before the
 * withdrawal, the annual renewal now goes: Rs 5,000 leaves the devotee's
 * account, the webhook throws, and no row is written — their `endDate` is
 * never moved forward, so `isPremium()` flips to false on the old expiry while
 * the money is gone. `subscription.activated` (a mandate authenticated after
 * the withdrawal shipped) fails the same way, with the same result.
 *
 * Two things make it silent rather than loud:
 *
 *   1. The route CATCHES the throw and answers HTTP 200 with
 *      `{ received: true, handled: false, reason: 'handler error' }`
 *      (routes/subscriptions.ts:174-178), so Razorpay sees success and does
 *      not retry.
 *   2. The event id is written to the idempotency store BEFORE the handler
 *      runs (`checkAndRecord('razorpay', eventId)`, line 160), so even a
 *      manual replay of the same event is deduped away.
 *
 * The charge is therefore lost with no error surface anywhere except one
 * `server.log.error` line. This is the exact harm TC-04 exists to prevent —
 * money taken for a benefit not delivered — reintroduced by TC-04's own fix,
 * and it is strictly worse than the original finding because here the money
 * actually moves.
 *
 * THE RULE THIS FILE PINS. Refusing to SELL and refusing to HONOUR are
 * different decisions and must not share a gate:
 *
 *   - No new mandate may be opened for a withdrawn plan. `createRazorpay-
 *     Subscription` keeps refusing, which is what actually stops the sale.
 *   - Any activation carrying gateway evidence that the money was already
 *     collected must be honoured, withdrawn or not. Once Razorpay has debited
 *     the devotee, the only options are to provision or to refund, and
 *     throwing does neither.
 *   - Everything else still refuses. An unevidenced `subscribe()` and the
 *     `demo_mode` activation (no money moved, by definition) must both keep
 *     throwing NRI_PREMIUM_WITHDRAWN_MESSAGE, or this fix would quietly
 *     reopen the sale it is protecting.
 *
 * HOW THE FAILURE WAS PROVEN FIRST. Against the guard as originally written,
 * `npx vitest run src/services/subscription.renewal-honours-paid-plan.tc04.test.ts`
 * reported 5 failed / 7 passed (12). The five failures were exactly the five
 * cases in the "money already taken must be honoured" block — every one of
 * them threw NRI_PREMIUM_WITHDRAWN_MESSAGE out of `subscribe()`, and the two
 * webhook cases additionally showed `marketplaceSubscription.create` was never
 * called. The premise case and all six "nothing here reopens the sale" cases
 * passed before the fix and still pass after it, so the change is narrow: it
 * moves exactly one branch and weakens nothing.
 */

const WEBHOOK_SUB_ID = 'sub_rzp_existing_nri_holder';
const USER = 'u-existing-nri-holder';

function chargedEvent(subscriptionId: string) {
  return { payload: { subscription: { entity: { id: subscriptionId, status: 'active' } } } };
}

/** The Transaction row createRazorpaySubscription wrote when the mandate opened. */
function mandateTransaction(planId: string) {
  return {
    id: 'txn-1',
    userId: USER,
    type: 'SUBSCRIPTION',
    metadata: {
      kind: 'razorpay_subscription_create',
      razorpaySubscriptionId: WEBHOOK_SUB_ID,
      planId,
      role: 'DEVOTEE',
    },
  };
}

let service: SubscriptionService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new SubscriptionService();
  prismaMock.marketplaceSubscription.updateMany.mockResolvedValue({ count: 0 });
  prismaMock.marketplaceSubscription.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'sub-row-1',
      ...data,
    }),
  );
  prismaMock.transaction.create.mockResolvedValue({ id: 'txn-2' });
});

describe('TC-04 renewal — the premise: the plan really is withdrawn', () => {
  it('nri_premium_yearly is not sellable, so these cases are about honouring, not selling', () => {
    // If someone wires a benefit and the plan becomes sellable again, this
    // whole file stops testing anything interesting. Fail loudly rather than
    // pass vacuously.
    expect(nriPremiumIsSellable()).toBe(false);
    expect(service.getPlans().find((p) => p.id === NRI_PREMIUM_PLAN_ID)).toBeUndefined();
  });
});

describe('TC-04 renewal — money already taken must be honoured', () => {
  it('subscribe() accepts a razorpay_webhook activation for the withdrawn plan', async () => {
    const result = await service.subscribe(USER, NRI_PREMIUM_PLAN_ID, 'DEVOTEE', {
      paymentReference: WEBHOOK_SUB_ID,
      source: 'razorpay_webhook',
    });

    expect(result.plan).toBe('ENTERPRISE');
    expect(result.status).toBe('ACTIVE');
    expect(prismaMock.marketplaceSubscription.create).toHaveBeenCalledTimes(1);
  });

  it('the renewed row runs a full year forward from now, not from the old expiry', async () => {
    const before = Date.now();
    const result = await service.subscribe(USER, NRI_PREMIUM_PLAN_ID, 'DEVOTEE', {
      paymentReference: WEBHOOK_SUB_ID,
      source: 'razorpay_webhook',
    });

    const end = new Date(result.endDate).getTime();
    // A year is 365 or 366 days; assert the band rather than an exact value.
    expect(end).toBeGreaterThan(before + 364 * 86_400_000);
    expect(end).toBeLessThan(before + 367 * 86_400_000);
  });

  it("subscription.charged — the RENEWAL event — provisions instead of throwing", async () => {
    prismaMock.transaction.findMany.mockResolvedValue([mandateTransaction(NRI_PREMIUM_PLAN_ID)]);

    const r = await service.handleSubscriptionEvent(
      'subscription.charged',
      chargedEvent(WEBHOOK_SUB_ID),
    );

    expect(r.handled).toBe(true);
    // The assertion that actually catches the money loss: a charged renewal
    // that writes no row has taken Rs 5,000 and delivered nothing.
    expect(prismaMock.marketplaceSubscription.create).toHaveBeenCalledTimes(1);
  });

  it('subscription.activated on a mandate opened before the withdrawal also provisions', async () => {
    prismaMock.transaction.findMany.mockResolvedValue([mandateTransaction(NRI_PREMIUM_PLAN_ID)]);

    const r = await service.handleSubscriptionEvent(
      'subscription.activated',
      chargedEvent(WEBHOOK_SUB_ID),
    );

    expect(r.handled).toBe(true);
    expect(prismaMock.marketplaceSubscription.create).toHaveBeenCalledTimes(1);
  });

  it('the honoured activation records the gateway reference that justifies it', async () => {
    await service.subscribe(USER, NRI_PREMIUM_PLAN_ID, 'DEVOTEE', {
      paymentReference: WEBHOOK_SUB_ID,
      source: 'razorpay_webhook',
    });

    const txn = prismaMock.transaction.create.mock.calls[0]?.[0] as
      | { data: { status: string; metadata: Record<string, unknown> } }
      | undefined;
    expect(txn?.data.status).toBe('COMPLETED');
    expect(txn?.data.metadata.paymentReference).toBe(WEBHOOK_SUB_ID);
    expect(txn?.data.metadata.activationSource).toBe('razorpay_webhook');
  });
});

describe('TC-04 renewal — nothing here reopens the sale', () => {
  it('an unevidenced subscribe() still refuses', async () => {
    await expect(service.subscribe(USER, NRI_PREMIUM_PLAN_ID, 'DEVOTEE')).rejects.toThrow(
      NRI_PREMIUM_WITHDRAWN_MESSAGE,
    );
    expect(prismaMock.marketplaceSubscription.create).not.toHaveBeenCalled();
  });

  it('a demo_mode activation still refuses — no money moved, so nothing is owed', async () => {
    await expect(
      service.subscribe(USER, NRI_PREMIUM_PLAN_ID, 'DEVOTEE', {
        paymentReference: 'sub_demo_123',
        source: 'demo_mode',
      }),
    ).rejects.toThrow(NRI_PREMIUM_WITHDRAWN_MESSAGE);
    expect(prismaMock.marketplaceSubscription.create).not.toHaveBeenCalled();
  });

  it('no new Razorpay mandate can be opened for the withdrawn plan', async () => {
    await expect(
      service.createRazorpaySubscription({
        userId: USER,
        planId: NRI_PREMIUM_PLAN_ID,
        role: 'DEVOTEE',
      }),
    ).rejects.toThrow(NRI_PREMIUM_WITHDRAWN_MESSAGE);
  });

  it('the plan is still absent from every buying surface', () => {
    expect(service.getPlans('DEVOTEE').find((p) => p.id === NRI_PREMIUM_PLAN_ID)).toBeUndefined();
  });

  it('a webhook naming a plan that does not exist is still rejected', async () => {
    prismaMock.transaction.findMany.mockResolvedValue([mandateTransaction('no_such_plan')]);

    // The handler propagates; the route turns it into `handled: false`. What
    // matters here is that the honouring branch did not invent a subscription.
    await expect(
      service.handleSubscriptionEvent('subscription.charged', chargedEvent(WEBHOOK_SUB_ID)),
    ).rejects.toThrow(/Plan not found/);
    expect(prismaMock.marketplaceSubscription.create).not.toHaveBeenCalled();
  });

  it('a still-sellable plan is unaffected by the honouring branch', async () => {
    prismaMock.transaction.findMany.mockResolvedValue([mandateTransaction('astro_monthly')]);

    const r = await service.handleSubscriptionEvent(
      'subscription.charged',
      chargedEvent(WEBHOOK_SUB_ID),
    );

    expect(r.handled).toBe(true);
    expect(prismaMock.marketplaceSubscription.create).toHaveBeenCalledTimes(1);
  });
});
