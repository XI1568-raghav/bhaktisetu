import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { SubscriptionService } from './subscription.service.js';
import {
  NRI_PREMIUM_BENEFITS,
  advertisedFeaturesFor,
  enforcedBenefits,
  nriPremiumEntitlementKeys,
  nriPremiumFeatures,
  nriPremiumIsSellable,
  NRI_PREMIUM_PLAN_ID,
  NRI_PREMIUM_WITHDRAWN_DETAIL,
  NRI_PREMIUM_WITHDRAWN_MESSAGE,
} from './subscription-entitlements.js';

/**
 * TC-04 / PM-05 (F057) — "NRI Premium sells benefits that do not exist."
 *
 * MEASURED BEFORE (this branch, 2026-08-20):
 * `PLANS.nri_premium_yearly` advertised six benefits at Rs 5,000/year. Zero of
 * the six were enforced anywhere against the plan:
 *
 *   1. "No ads anywhere on Darshya" — apps/web/components/AdSlot.tsx gates on
 *      apps/web/components/useIsPremium.ts, which matches
 *      user.subscriptionTier against ['pro','premium','bhakti_pass',
 *      'annual_ratna'] or a user.isNriPremium flag. Nothing in apps/api ever
 *      writes either: subscribe() creates a MarketplaceSubscription row and
 *      never touches User.subscriptionTier, and `isNriPremium` appears in
 *      exactly one file in the whole repo — the hook that reads it. So the
 *      ad gate can never fire for this plan.
 *   2. "No NRI surcharge on bookings" — no surcharge waiver exists; grepping
 *      apps/api for `surcharge` returns only this feature string.
 *   3. "Priority booking 7 days early" — same: only the feature string.
 *   4. "Weekly 1:1 call with priest (Jitsi)" — consultation.ts is paid
 *      per-session with no premium waiver.
 *   5. "Free 80G receipt PDF for any donation" — receipt issuance is not
 *      conditioned on the plan (and 80G itself is owner-gated, COM-02/F024).
 *   6. "Unlimited AI astro chat" — apps/api/src/lib/ai-usage.ts getActivePlan()
 *      recognises only BASIC (session) and PRO (monthly) and returns null for
 *      anything else. `nri_premium_yearly` maps to ENTERPRISE, so a subscriber
 *      who paid Rs 5,000 falls through to FREE_MONTHLY_LIMIT = 5 messages a
 *      month. This one is not merely ungated — it is actively contradicted.
 *
 * The only reader of the plan tier at all is
 * subscriptionService.isPremium(), whose sole caller is
 * GET /subscriptions/is-premium, whose sole web consumer
 * (apps/web/lib/use-premium.ts) has zero call sites.
 *
 * CHOSEN REMEDY: stop selling it. Gating the six benefits means editing
 * ai-usage.ts, AdSlot.tsx, the booking surcharge calculation, the priority
 * booking window, the consultation rail and the donation-receipt path — six
 * files in other agents' lanes. Refusing the sale is entirely inside this
 * lane, is the honest half, and follows the doctrine already written into
 * createRazorpaySubscription for the Razorpay-plan-id gap: a plan we cannot
 * charge for is a plan we must refuse to sell, loudly. The same holds one
 * layer up — a plan whose benefits we cannot deliver is a plan we must refuse
 * to sell.
 *
 * The registry is the switch. Give a benefit a real `enforcedBy` site and it
 * is advertised again and the plan becomes sellable, benefit by benefit,
 * selling exactly what is delivered and never more.
 */

const API_ROOT = path.resolve(__dirname, '..', '..');

let service: SubscriptionService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new SubscriptionService();
});

describe('TC-04 — the NRI Premium benefit registry', () => {
  it('names all six advertised benefits', () => {
    expect(NRI_PREMIUM_BENEFITS).toHaveLength(6);
    const keys = NRI_PREMIUM_BENEFITS.map((b) => b.key);
    expect(new Set(keys).size).toBe(6);
  });

  it('every benefit either points at an enforcement file that exists, or is explicitly unenforced', () => {
    // A benefit cannot be marked enforced by naming a file that is not there.
    // This is the cheapest check that stops the registry drifting back into
    // the thing it replaced: a list of promises with nothing behind it.
    for (const benefit of NRI_PREMIUM_BENEFITS) {
      if (benefit.enforcedBy === null) continue;
      const abs = path.join(API_ROOT, '..', '..', benefit.enforcedBy.file);
      expect(
        existsSync(abs),
        `${benefit.key} claims enforcement in ${benefit.enforcedBy.file}, which does not exist`,
      ).toBe(true);
    }
  });

  it('every benefit that is NOT enforced records exactly what would make it true', () => {
    for (const benefit of NRI_PREMIUM_BENEFITS) {
      if (benefit.enforcedBy !== null) continue;
      expect(benefit.blockedBy.length, `${benefit.key} has no remediation note`).toBeGreaterThan(20);
    }
  });
});

describe('TC-04 — the plan advertises only what it delivers', () => {
  // These two assertions previously read getPlanDefinition().features and so
  // failed against the module they were written for. getPlanDefinition() is the
  // RAW table row and deliberately still carries the original six-line claim
  // literal, because apps/web/__tests__/legal-content-p1.test.ts (LEG-08) scans
  // subscription.service.ts for a literal `features: [` block and cross-checks
  // it against the published FAQ answer. The guarantee this finding is about
  // belongs one step later: on the BUYER-FACING projection. Asserting there is
  // both correct and stricter — it is the value a devotee can actually be shown.
  it('the buyer-facing feature list is exactly the enforced benefit set', () => {
    const declared = service.getPlanDefinition('nri_premium_yearly');
    expect(declared).toBeDefined();
    expect(advertisedFeaturesFor('nri_premium_yearly', declared!.features)).toEqual(
      enforcedBenefits().map((b) => b.label),
    );
  });

  it('today that set is empty — no benefit is enforced, so nothing is advertised', () => {
    // If this ever fails because someone WIRED a benefit, that is the good
    // outcome: update the number, do not delete the assertion.
    expect(enforcedBenefits()).toHaveLength(0);
    expect(nriPremiumFeatures()).toEqual([]);
    expect(nriPremiumEntitlementKeys()).toEqual([]);
    const declared = service.getPlanDefinition('nri_premium_yearly')!.features;
    expect(advertisedFeaturesFor('nri_premium_yearly', declared)).toEqual([]);
  });

  it('the raw definition still carries the claim literal LEG-08 cross-checks', () => {
    // Not an endorsement of the claim — a statement of where it now lives. If
    // someone deletes the literal to "fix" TC-04, LEG-08 breaks in another
    // lane; if someone reads the literal and calls it the offer, this file's
    // other assertions break. Both directions are now guarded.
    expect(service.getPlanDefinition('nri_premium_yearly')!.features).toHaveLength(6);
  });

  it('projection is identity for every other plan', () => {
    for (const plan of service.getPlans()) {
      if (plan.id === 'nri_premium_yearly') continue;
      const declared = service.getPlanDefinition(plan.id)!.features;
      expect(advertisedFeaturesFor(plan.id, declared)).toBe(declared);
    }
  });
});

describe('TC-04 — a plan that delivers nothing is not offered for sale', () => {
  it('nriPremiumIsSellable() is false while zero benefits are enforced', () => {
    expect(nriPremiumIsSellable()).toBe(false);
  });

  it('GET /plans does not offer nri_premium_yearly to devotees', () => {
    const plans = service.getPlans('DEVOTEE');
    expect(plans.find((p) => p.id === 'nri_premium_yearly')).toBeUndefined();
  });

  it('the unfiltered plan list does not offer it either', () => {
    expect(service.getPlans().find((p) => p.id === 'nri_premium_yearly')).toBeUndefined();
  });

  it('the paid rail refuses to open a Razorpay subscription for it', async () => {
    await expect(
      service.createRazorpaySubscription({ userId: 'u1', planId: 'nri_premium_yearly', role: 'DEVOTEE' }),
    ).rejects.toThrow(/not currently sold|cannot be sold|benefit/i);
  });

  it('subscribe() refuses to mint a new row for it', async () => {
    await expect(service.subscribe('u1', 'nri_premium_yearly', 'DEVOTEE')).rejects.toThrow(
      /not currently sold|cannot be sold|benefit|payment/i,
    );
    expect(prismaMock.marketplaceSubscription.create).not.toHaveBeenCalled();
  });

  it('the plan DEFINITION survives, so re-enabling is a registry flip, not a rewrite', () => {
    const plan = service.getPlanDefinition('nri_premium_yearly');
    expect(plan).toBeDefined();
    expect(plan!.price).toBe(5000);
    expect(plan!.priceUsd).toBe(60);
    expect(plan!.interval).toBe('year');
    expect(plan!.durationDays).toBe(365);
    expect(plan!.plan).toBe('ENTERPRISE');
  });
});

describe('TC-04 — nothing already sold is broken by withdrawing the offer', () => {
  it('an existing ENTERPRISE holder is still premium', async () => {
    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue({
      id: 'sub-1',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      userId: 'u',
      endDate: new Date(Date.now() + 86_400_000),
    });
    expect(await service.isPremium('u')).toBe(true);
  });

  it('plans whose benefit IS enforced are still sold — astro_monthly is unaffected', () => {
    // ai-usage.ts getActivePlan() recognises PRO and grants unlimited chat, so
    // this plan does deliver what it sells and must keep selling.
    const plans = service.getPlans('DEVOTEE');
    expect(plans.find((p) => p.id === 'astro_monthly')).toBeDefined();
    expect(plans.find((p) => p.id === 'astro_session')).toBeDefined();
  });

  it('marketplace role plans are untouched', () => {
    expect(service.getPlans('PANDIT').length).toBeGreaterThan(0);
    expect(service.getPlans('TEMPLE_MANAGER').length).toBeGreaterThan(0);
  });
});

describe('TC-04 — entitlements are answered from the server, not from a client tier string', () => {
  it('getEntitlements() reports only enforced entitlements the holder actually has', async () => {
    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue({
      id: 'sub-1',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      userId: 'u',
      endDate: new Date(Date.now() + 86_400_000),
    });

    const result = await service.getEntitlements('u');

    expect(result.tier).toBe('ENTERPRISE');
    // Truthful, and the point of the endpoint: a consumer can never conclude
    // that an unenforced benefit is live.
    expect(result.entitlements).toEqual(enforcedBenefits().map((b) => b.key));
  });

  it('a non-subscriber has no entitlements and no tier', async () => {
    prismaMock.marketplaceSubscription.findFirst.mockResolvedValue(null);

    const result = await service.getEntitlements('u');

    expect(result.tier).toBeNull();
    expect(result.entitlements).toEqual([]);
  });
});

describe('TC-04 — the refusal a devotee reads is written for a devotee', () => {
  // POST /subscriptions/create answers 400 with this exact string as `error`,
  // and apps/web/app/upgrade/page.tsx renders `data.error` straight into the
  // page. So this constant is USER-FACING COPY, not a log line: it must not
  // hand a devotee an internal plan id or a path into the repository.
  it('leaks no repository path, file name or internal plan id', () => {
    expect(NRI_PREMIUM_WITHDRAWN_MESSAGE).not.toMatch(/apps\/|src\/|\.ts\b/);
    expect(NRI_PREMIUM_WITHDRAWN_MESSAGE).not.toContain(NRI_PREMIUM_PLAN_ID);
  });

  it('still refuses in plain terms rather than failing vaguely', () => {
    expect(NRI_PREMIUM_WITHDRAWN_MESSAGE).toMatch(/not currently sold/i);
    expect(NRI_PREMIUM_WITHDRAWN_MESSAGE.length).toBeGreaterThan(30);
  });

  it('keeps the operator detail — which does name the registry — separate', () => {
    // The engineering explanation is worth having; it just belongs in a
    // constant the API logs, not in the sentence a buyer reads.
    expect(NRI_PREMIUM_WITHDRAWN_DETAIL).toContain('subscription-entitlements.ts');
    expect(NRI_PREMIUM_WITHDRAWN_DETAIL).not.toBe(NRI_PREMIUM_WITHDRAWN_MESSAGE);
  });
});
