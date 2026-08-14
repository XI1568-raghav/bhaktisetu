/**
 * Server-authoritative yatra package pricing.
 *
 * COM-05 (prod sweep 2026-08-12): POST /yatra-inquiry/create-order derived the
 * Razorpay amount from the request body (`totalInr`, floor ₹500). Because the
 * HMAC in /verify-payment is checked against the order the server itself
 * created, an order minted at the caller's own amount verifies cleanly — so a
 * ₹2,98,000 Char Dham premium booking could be paid at ₹500 and flip to
 * `confirmed`. Prices must come from here, never from the client.
 *
 * These are the same per-person tier prices the consumer catalogue quotes
 * (apps/web/lib/yatra-data.ts → `yatras[].packages[].price`). The drift guard
 * in yatra-pricing.parity.test.ts reads that file and fails if the two ever
 * disagree — the catalogue and the till must charge the same number.
 */

export type YatraTier = 'economy' | 'standard' | 'premium';

export const YATRA_TIER_PRICE_INR: Record<string, Record<YatraTier, number>> = {
  'char-dham': { economy: 38500, standard: 68500, premium: 149000 },
  'do-dham': { economy: 24500, standard: 44500, premium: 92000 },
  'jyotirlinga-yatra': { economy: 72500, standard: 135000, premium: 265000 },
  'four-dhams-india': { economy: 58000, standard: 115000, premium: 225000 },
  amarnath: { economy: 32000, standard: 62000, premium: 125000 },
  'vaishno-devi': { economy: 8500, standard: 18500, premium: 38500 },
  'shirdi-sai': { economy: 15500, standard: 28500, premium: 55000 },
  'tirupati-south': { economy: 38500, standard: 72500, premium: 155000 },
  'ayodhya-kashi': { economy: 22500, standard: 42500, premium: 85000 },
};

export type YatraPriceResult =
  | { ok: true; perPersonInr: number; travelersCount: number; totalInr: number }
  | { ok: false; reason: 'unknown_package' | 'invalid_travellers' };

/**
 * Derive the amount to charge for a packaged yatra.
 *
 * The create-order payload carries no add-ons (helicopter, companion, special
 * puja are collected on the inquiry route), so the total is fully determined
 * by slug + tier + head count. Anything the client claims is ignored.
 */
export function computeYatraTotalInr(
  yatraSlug: string,
  packageTier: YatraTier,
  travelersCount: number,
): YatraPriceResult {
  const tiers = YATRA_TIER_PRICE_INR[yatraSlug];
  if (!tiers) return { ok: false, reason: 'unknown_package' };
  const perPersonInr = tiers[packageTier];
  if (!Number.isFinite(perPersonInr) || perPersonInr <= 0) {
    return { ok: false, reason: 'unknown_package' };
  }
  if (!Number.isInteger(travelersCount) || travelersCount < 1) {
    return { ok: false, reason: 'invalid_travellers' };
  }
  return {
    ok: true,
    perPersonInr,
    travelersCount,
    totalInr: perPersonInr * travelersCount,
  };
}
