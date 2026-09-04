/**
 * TC-03 (P0, trust) — whether /nri is allowed to behave like a shop.
 *
 * `nri_premium_yearly` is WITHDRAWN FROM SALE on the server and has been since
 * TC-04/PM-05 landed. Every one of its six advertised benefits carries
 * `enforcedBy: null` in apps/api/src/services/subscription-entitlements.ts, so:
 *
 *   - `nriPremiumIsSellable()` returns false (it is `enforcedBenefits().length > 0`);
 *   - `SubscriptionService.getPlans()` filters the plan out of GET /subscriptions/plans;
 *   - BOTH activation rails (`subscribe` and the Razorpay subscription rail)
 *     throw NRI_PREMIUM_WITHDRAWN_MESSAGE, which the routes return as a 400.
 *
 * /nri never consulted any of that. It is a hardcoded landing page: it sold the
 * plan at ₹5,000/yr, listed all six unenforced benefits as "What you get", and
 * pointed "Go Premium" at /upgrade, where the buy click answers 400 with the
 * withdrawal message. A refund policy for a purchase that cannot complete is
 * the TC-03 defect one layer up: the page describes a transaction the product
 * refuses to perform.
 *
 * apps/web cannot import from apps/api, so this mirrors the server fact the
 * same way `lib/cancellation-policy.ts` mirrors DEFAULT_CANCEL_POLICY: a
 * constant here plus a drift test (`__tests__/tc03-nri-plan-availability.test.tsx`)
 * that re-reads the API source and fails the moment the two disagree.
 *
 * TO RE-OPEN THE SALE: give at least one benefit in
 * apps/api/src/services/subscription-entitlements.ts a non-null `enforcedBy`,
 * then flip this to true in the same change. The page turns back into a shop on
 * its own — every buy affordance below is gated on this one constant.
 */
export const NRI_PREMIUM_IS_SELLABLE = false;

/**
 * The refusal a devotee actually reads when they try to buy.
 *
 * Quoted verbatim from NRI_PREMIUM_WITHDRAWN_MESSAGE in
 * apps/api/src/services/subscription-entitlements.ts rather than paraphrased,
 * so the landing page and the 400 body cannot say two different things. The
 * drift test compares the two strings character for character.
 */
export const NRI_PREMIUM_WITHDRAWN_NOTICE =
  'NRI Premium is not currently sold. We withdrew it because we could not yet deliver every ' +
  'benefit it advertised, and we will not charge for benefits we cannot honour. Nothing has ' +
  'been billed. Existing subscriptions are unaffected and keep running to their end date.';

/**
 * What cancelling actually does, in one sentence.
 *
 * TC-03's previous remediation replaced an unbacked "14-day no-questions-asked
 * refund" with an equally unbacked "your access runs to the end of the year you
 * have already paid for" — and the guard it shipped hard-required that new
 * sentence. It is false. `SubscriptionService.cancel()` does exactly one write,
 * `marketplaceSubscription.update({ data: { status: 'CANCELLED' } })`, and
 * every consumer of the entitlement filters on `status: 'ACTIVE'`:
 * `isPremium()` (subscription.service.ts) and `getActivePlan()` (lib/ai-usage.ts)
 * both require it. MarketplaceSubscription has no `cancelAtPeriodEnd`, no
 * grace field and no scheduled job that flips it later — the schema is
 * id/userId/plan/role/startDate/endDate/amount/status/timestamps. So access
 * stops at the moment of cancellation, not at period end.
 */
export const NRI_CANCELLATION_SENTENCE =
  'Cancelling stops the next renewal, but it does not hold your access open to the end of the ' +
  'year you have already paid for — the subscription is marked cancelled immediately and the ' +
  'premium benefits stop at that moment. Cancel when you are finished with it, not in advance.';
