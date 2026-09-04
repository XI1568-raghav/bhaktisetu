'use client';

import { useEntitlement } from '../lib/entitlement';

/**
 * TC-04 / PM-05 (F057) — ad suppression, asked of the server.
 *
 * What this file used to be:
 *
 *   const PREMIUM_TIERS = new Set(['pro', 'premium', 'bhakti_pass', 'annual_ratna']);
 *   export function useIsPremium(): boolean {
 *     const { user } = useAuth();
 *     if (!user) return false;
 *     if (PREMIUM_TIERS.has(user.subscriptionTier)) return true;
 *     return (user as { isNriPremium?: unknown }).isNriPremium === true;
 *   }
 *
 * It was the ONLY call site of any premium gate in apps/web, and it could not
 * fire for the plan that sold the benefit. `nri_premium_yearly` is created as
 * an ENTERPRISE `MarketplaceSubscription`; ENTERPRISE is not in that set, and
 * no route in apps/api writes `User.subscriptionTier` at all — I searched
 * apps/api/src for a prisma write of it and found only reads (auth middleware,
 * /auth responses, /users profile, admin listings) plus the schema default
 * `free` and seed fixtures. `isNriPremium` appeared in exactly one file in the
 * repository: the hook that read it. So the gate answered `false` for every
 * real user, including a paying one, and the sibling hook that DID ask the
 * server (`lib/use-premium.ts`) had zero call sites and has been deleted.
 *
 * It now asks `GET /subscriptions/entitlements` through lib/entitlement.ts,
 * which fails CLOSED on error, timeout, 5xx or signed-out. The server returns
 * a capability only when apps/api/src/services/subscription-entitlements.ts
 * can name the file that enforces it, so this reports "suppress ads" if and
 * only if that is genuinely true — today it is not, because `ads.suppressed`
 * still carries `enforcedBy: null`, and showing the ad is the correct answer
 * while nobody is being charged for its absence (the tier is withdrawn from
 * sale, TC-03).
 *
 * Deliberately unchanged: the boolean shape. AdSlot.tsx treats a `false` from
 * a still-loading fetch as "show the ad", which is the fail-open-to-ADS,
 * fail-closed-to-BENEFIT direction a gate must take.
 */
export function useIsPremium(): boolean {
  const { granted } = useEntitlement('ads.suppressed');
  return granted;
}
