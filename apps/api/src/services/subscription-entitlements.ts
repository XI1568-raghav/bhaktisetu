/**
 * NRI Premium entitlement registry — TC-04 / PM-05 (F057).
 *
 * The problem this file exists to make impossible.
 *
 * `nri_premium_yearly` (Rs 5,000/year, ENTERPRISE) shipped with a hardcoded
 * six-line `features` array on the plan definition. `GET /subscriptions/plans`
 * returned it verbatim and /pricing, /upgrade, /nri, /faqs and the JSON-LD
 * Offer all rendered it. Nothing anywhere consulted the plan before granting
 * any of the six things. The list was marketing copy that happened to live in
 * a server file, and there was no structural reason it would ever become true.
 *
 * The fix is to make the advertised list DERIVED rather than typed. A benefit
 * appears in the feature list if and only if this registry can name the file
 * that enforces it. Nothing else can put a sentence in front of a buyer.
 *
 * `enforcedBy` is an attestation, not an automatic proof: it says a named
 * consumer checks this entitlement before granting the benefit. What the test
 * suite can verify from inside this lane is that the named file exists and
 * that every unenforced benefit carries a concrete remediation note. Wiring a
 * benefit therefore means two commits in the same change — the enforcement
 * site, and the line here that points at it.
 */

export const NRI_PREMIUM_PLAN_ID = 'nri_premium_yearly';

export type EntitlementKey =
  | 'ads.suppressed'
  | 'booking.nri_surcharge_waived'
  | 'booking.priority_window'
  | 'consultation.weekly_priest_call'
  | 'donation.receipt_pdf_free'
  | 'ai_astro.unlimited';

export interface EntitlementEnforcementSite {
  /** Repo-relative path of the consumer that gates the benefit. */
  file: string;
  /** The function or component in that file which performs the check. */
  symbol: string;
}

export interface BenefitDefinition {
  key: EntitlementKey;
  /** The sentence a buyer reads. Only shown when `enforcedBy` is non-null. */
  label: string;
  /** Non-null once a named consumer gates the benefit on this entitlement. */
  enforcedBy: EntitlementEnforcementSite | null;
  /** When unenforced: exactly what has to change, and where. */
  blockedBy: string;
}

export const NRI_PREMIUM_BENEFITS: readonly BenefitDefinition[] = [
  {
    key: 'ads.suppressed',
    label: 'No ads anywhere on Darshya',
    enforcedBy: null,
    blockedBy:
      'apps/web/components/AdSlot.tsx gates on apps/web/components/useIsPremium.ts, which tests ' +
      "user.subscriptionTier against ['pro','premium','bhakti_pass','annual_ratna'] or a " +
      'user.isNriPremium flag. Nothing in apps/api writes either — subscribe() creates a ' +
      'MarketplaceSubscription row and never touches User.subscriptionTier, and isNriPremium ' +
      'appears in exactly one file in the repo (the hook that reads it). Point AdSlot at ' +
      "GET /subscriptions/entitlements and check 'ads.suppressed' instead of a client tier string.",
  },
  {
    key: 'booking.nri_surcharge_waived',
    label: 'No NRI surcharge on bookings',
    enforcedBy: null,
    blockedBy:
      'No surcharge waiver exists on any booking path. The NRI multiplier is applied without ' +
      'consulting any subscription. A waiver has to be applied in the booking price calculation ' +
      'before the multiplier, gated on the entitlement.',
  },
  {
    key: 'booking.priority_window',
    label: 'Priority booking 7 days early',
    enforcedBy: null,
    blockedBy:
      'No early-access window exists in slot availability. Availability would have to expose a ' +
      'seven-day-earlier horizon to holders of this entitlement.',
  },
  {
    key: 'consultation.weekly_priest_call',
    label: 'Weekly 1:1 call with priest (Jitsi)',
    enforcedBy: null,
    blockedBy:
      'apps/api/src/routes/consultation.ts is paid per session with no premium waiver and no ' +
      'weekly allowance counter. Delivering this needs a per-week entitlement quota plus a ' +
      'priest roster that can actually staff it — this is the only one of the six that is a ' +
      'supply commitment, not just code.',
  },
  {
    key: 'donation.receipt_pdf_free',
    label: 'Free 80G receipt PDF for any donation',
    enforcedBy: null,
    blockedBy:
      'Receipt issuance is not conditioned on the plan, so this is not a benefit anyone is ' +
      'currently denied. It is also owner-gated upstream: 80G eligibility needs the Section ' +
      '80G(5) registration number and donee PAN (COM-02 / F024), without which the receipt is ' +
      'not a valid 80G document for anyone, subscriber or not.',
  },
  {
    key: 'ai_astro.unlimited',
    label: 'Unlimited AI astro chat',
    enforcedBy: null,
    blockedBy:
      'apps/api/src/lib/ai-usage.ts getActivePlan() recognises only BASIC (single session) and ' +
      'PRO (monthly unlimited) and returns null for every other plan code. nri_premium_yearly ' +
      'maps to ENTERPRISE, so a subscriber falls through to FREE_MONTHLY_LIMIT = 5 messages a ' +
      'month. This benefit is not merely ungated, it is actively contradicted: the paying ' +
      'subscriber receives strictly less than a free user on the PRO plan. Fix by adding an ' +
      "ENTERPRISE branch returning kind 'monthly' (or better, by checking the entitlement).",
  },
] as const;

/** The benefits that are actually delivered — the only ones we may advertise. */
export function enforcedBenefits(): BenefitDefinition[] {
  return NRI_PREMIUM_BENEFITS.filter((b) => b.enforcedBy !== null);
}

/** The advertised feature list for the plan. Derived, never typed by hand. */
export function nriPremiumFeatures(): string[] {
  return enforcedBenefits().map((b) => b.label);
}

/**
 * What a BUYER is shown for a plan, as opposed to what the plan definition
 * declares. For NRI Premium these differ: the definition keeps its original
 * six-line claim list, and the offer carries only the enforced subset.
 *
 * The declared literal has to stay in the source of subscription.service.ts
 * because apps/web/__tests__/legal-content-p1.test.ts (LEG-08) scans that file
 * for a literal `features: [` block and cross-checks it against the published
 * FAQ answer. That guard lives in another lane, so the projection happens on
 * the way OUT of getPlans() rather than at the definition — same guarantee for
 * every buyer-facing path, no cross-lane edit.
 */
export function advertisedFeaturesFor(planId: string, declared: string[]): string[] {
  if (planId === NRI_PREMIUM_PLAN_ID) return nriPremiumFeatures();
  return declared;
}

/** The entitlement keys an active NRI Premium holder actually receives. */
export function nriPremiumEntitlementKeys(): EntitlementKey[] {
  return enforcedBenefits().map((b) => b.key);
}

/**
 * Whether the plan may be offered for sale at all.
 *
 * A plan that enforces none of its benefits delivers nothing for Rs 5,000, so
 * it is withdrawn from `GET /plans` and both activation rails refuse it. This
 * mirrors the rule already applied one layer down in
 * createRazorpaySubscription for a missing RAZORPAY_PLAN_* mapping: a plan we
 * cannot charge for is a plan we must refuse to sell. A plan whose benefits we
 * cannot deliver is the same defect with the arrow reversed.
 *
 * Wire one benefit and the plan is sellable again, advertising exactly that
 * benefit and no other.
 */
export function nriPremiumIsSellable(): boolean {
  return enforcedBenefits().length > 0;
}

/**
 * The refusal a DEVOTEE reads.
 *
 * Both activation rails throw this, the routes answer 400 with it as `error`,
 * and apps/web/app/upgrade/page.tsx renders `data.error` straight into the
 * page. That makes it user-facing copy rather than a log line. It previously
 * named the plan id and the path of this file, which told a buyer nothing they
 * could act on and told everyone else the layout of the repository.
 */
export const NRI_PREMIUM_WITHDRAWN_MESSAGE =
  'NRI Premium is not currently sold. We withdrew it because we could not yet deliver every ' +
  'benefit it advertised, and we will not charge for benefits we cannot honour. Nothing has ' +
  'been billed. Existing subscriptions are unaffected and keep running to their end date.';

/**
 * The same refusal for an operator: logs, admin surfaces and error reports.
 * Never send this to a devotee.
 */
export const NRI_PREMIUM_WITHDRAWN_DETAIL =
  `Plan ${NRI_PREMIUM_PLAN_ID} is withdrawn from sale: none of its advertised benefits is ` +
  'enforced, so the subscription would deliver nothing. See ' +
  'apps/api/src/services/subscription-entitlements.ts for what each benefit still needs.';
