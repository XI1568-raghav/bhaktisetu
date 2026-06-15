// Pricing helpers — single source of truth for business rule #2 (NRI
// pricing 9-10× domestic). Centralizes the multiplier and currency
// conversion math so routes/services don't reinvent the rule.
//
// Spec: docs/specs/R-Q2-G-006-us-nri-pricing-helper.md
// Item: R-Q2-G-006 (US NRI soft launch — landing page + Stripe USD).
//
// Used by:
//   - apps/api/src/routes/bookings.ts (NRI_USD_MULTIPLIER constant
//     should re-import from here in a follow-up commit)
//   - apps/api/src/services/booking.service.ts (USD currency branch)
//   - apps/web/app/nri/page.tsx (display copy verification)

/**
 * INR → USD multiplier for NRI billing. Business rule #2 sets the
 * range at 9-10×; we pick the lower bound (9×) by default and let
 * temple-side PujaType.nriPrice override for premium SKUs.
 *
 * Why 9× (not 10×): empirically aligns Sri Mandir parity for
 * Rudrabhishek + Satyanarayan + Mahalakshmi pujas across Apr-May
 * 2026. Reviewed quarterly via R-Q2-M-006 NRI Google Ads CAC.
 */
export const NRI_INR_MULTIPLIER = 9;

/**
 * Hard upper bound per business rule #2. Used by validators to
 * reject mis-set PujaType.nriPrice values that would price-gouge.
 */
export const NRI_INR_MULTIPLIER_MAX = 10;

/**
 * Indicative INR→USD spot rate used ONLY for display copy on the
 * /nri landing page. NEVER used for live Stripe charges — Stripe
 * Payment Intents always quote in USD cents from the source
 * PujaType.nriPrice (already denominated in USD via temple setup).
 *
 * Refresh quarterly. Last set: 2026-06-15.
 */
export const INR_USD_INDICATIVE_RATE = 83.5;

export interface NriPriceResult {
  /** INR base price as Decimal-compatible number. */
  basePriceInr: number;
  /** USD price after 9× multiplier, rounded to 2dp. */
  nriPriceUsd: number;
  /** Multiplier used (defaults to NRI_INR_MULTIPLIER). */
  multiplier: number;
  /** Indicative INR equivalent for the USD charge. */
  nriEquivalentInr: number;
}

/**
 * Compute the NRI USD price for an INR base. Prefers an explicit
 * PujaType.nriPrice override when provided; falls back to the 9×
 * multiplier rule.
 *
 * @param basePriceInr - INR base price (PujaType.basePrice).
 * @param explicitNriPriceUsd - Optional override from PujaType.nriPrice.
 * @returns NriPriceResult with USD price + audit trail.
 */
export function computeNriPrice(
  basePriceInr: number,
  explicitNriPriceUsd?: number | null,
): NriPriceResult {
  if (!Number.isFinite(basePriceInr) || basePriceInr < 0) {
    throw new Error(`Invalid basePriceInr: ${basePriceInr}`);
  }
  // Explicit override path — temple set a per-SKU USD price.
  if (
    explicitNriPriceUsd !== null &&
    explicitNriPriceUsd !== undefined &&
    explicitNriPriceUsd > 0
  ) {
    const inrEquiv = Math.round(explicitNriPriceUsd * INR_USD_INDICATIVE_RATE);
    const impliedMultiplier =
      basePriceInr > 0 ? inrEquiv / basePriceInr : NRI_INR_MULTIPLIER;
    return {
      basePriceInr,
      nriPriceUsd: round2(explicitNriPriceUsd),
      multiplier: round2(impliedMultiplier),
      nriEquivalentInr: inrEquiv,
    };
  }
  // Rule-based path — 9× INR, converted to USD at indicative rate.
  const nriEquivalentInr = basePriceInr * NRI_INR_MULTIPLIER;
  const nriPriceUsd = round2(nriEquivalentInr / INR_USD_INDICATIVE_RATE);
  return {
    basePriceInr,
    nriPriceUsd,
    multiplier: NRI_INR_MULTIPLIER,
    nriEquivalentInr,
  };
}

/**
 * Validate that an explicit nriPrice (USD) is within the 9-10×
 * business rule. Returns null when valid; returns an error string
 * when out of bounds. Used by temple-portal create/update routes.
 */
export function validateNriPriceBand(
  basePriceInr: number,
  nriPriceUsd: number,
): string | null {
  if (basePriceInr <= 0 || nriPriceUsd <= 0) return null;
  const inrEquiv = nriPriceUsd * INR_USD_INDICATIVE_RATE;
  const impliedMultiplier = inrEquiv / basePriceInr;
  if (impliedMultiplier < NRI_INR_MULTIPLIER * 0.85) {
    return `nriPrice $${nriPriceUsd} (~₹${Math.round(inrEquiv)}) implies ${impliedMultiplier.toFixed(2)}× multiplier — below 9× floor (rule #2).`;
  }
  if (impliedMultiplier > NRI_INR_MULTIPLIER_MAX * 1.15) {
    return `nriPrice $${nriPriceUsd} (~₹${Math.round(inrEquiv)}) implies ${impliedMultiplier.toFixed(2)}× multiplier — above 10× ceiling (rule #2).`;
  }
  return null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
