/**
 * TC-03 / TC-04 (P0/P1, trust) — whether the mobile app may behave like a shop
 * for `nri_premium_yearly`.
 *
 * The web surfaces (/nri, /upgrade, /launch, /account/subscriptions) were gated
 * on `apps/web/app/nri/plan-availability.ts` in an earlier pass. The MOBILE
 * upgrade screen was not, and it is the loudest shopfront the plan has: a
 * ₹5,000/yr hero price, six benefit rows, and an "Upgrade — ₹5,000/yr" button
 * that fires `POST /api/v1/subscriptions/subscribe`.
 *
 * The server refuses that request. All six benefits in
 * apps/api/src/services/subscription-entitlements.ts carry `enforcedBy: null`,
 * so `nriPremiumIsSellable()` — which is `enforcedBenefits().length > 0` — is
 * false, `SubscriptionService.getPlans()` filters the plan out of
 * `GET /subscriptions/plans`, and BOTH activation rails throw
 * `NRI_PREMIUM_WITHDRAWN_MESSAGE`, which the routes return as a 400. So the
 * screen advertised six benefits nothing grants and offered a purchase the API
 * answers with an error the devotee only sees after tapping.
 *
 * apps/mobile cannot import from apps/api or apps/web, so this mirrors the
 * server fact the way apps/web/app/nri/plan-availability.ts does, and
 * lib/__tests__/nri-premium-availability.test.ts re-reads the API source and
 * fails the moment the two disagree.
 *
 * TO RE-OPEN THE SALE: give at least one benefit a non-null `enforcedBy` in
 * apps/api/src/services/subscription-entitlements.ts, then flip this to true in
 * the same change. The screen turns back into a shop on its own.
 */
export const NRI_PREMIUM_IS_SELLABLE = false;

/**
 * The refusal the devotee reads, quoted verbatim from
 * NRI_PREMIUM_WITHDRAWN_MESSAGE in
 * apps/api/src/services/subscription-entitlements.ts so the screen and the 400
 * body cannot say two different things. Character-for-character drift-tested.
 */
export const NRI_PREMIUM_WITHDRAWN_NOTICE =
  'NRI Premium is not currently sold. We withdrew it because we could not yet deliver every ' +
  'benefit it advertised, and we will not charge for benefits we cannot honour. Nothing has ' +
  'been billed. Existing subscriptions are unaffected and keep running to their end date.';
