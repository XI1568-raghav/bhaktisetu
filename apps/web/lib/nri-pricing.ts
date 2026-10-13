/**
 * NRI pricing — web side. The API twin is apps/api/src/lib/nri-pricing.ts and
 * `__tests__/nri-pricing.test.ts` asserts the two give identical amounts and
 * that the constants match, so edit both together.
 *
 * Owner decision (2026-10-05): NRI devotees pay 2.5x the domestic puja price.
 *
 * WHAT IS REALLY CHARGED. Razorpay orders are INR only (foreign cards are not
 * enabled on this account; PayPal needs a dollar order that is not built yet). So the NRI amount is an INR amount (domestic puja price x
 * 2.5, rounded to NRI_ROUND_STEP_INR, plus the same flat platform and prasad
 * fees as everyone). The dollar figure is only a DISPLAY conversion of that INR
 * amount at USD_INR_RATE. The wizard tells
 * the server it is showing the NRI price with `nriPricing: true`, and the
 * server computes the same INR amount (apps/api createBooking), so the amount
 * shown equals the amount charged.
 */
import { PLATFORM_FEE_INR, PRASAD_DELIVERY_FEE_INR, formatInr } from './puja-pricing';

/** 2.5x domestic. Owner: "2-3x will work". */
export const NRI_PREMIUM_MULTIPLIER = 2.5;

/**
 * INR per USD, used ONLY to display a dollar figure next to the INR amount that
 * is actually charged. A display constant, not a live rate — review it
 * periodically.
 */
export const USD_INR_RATE = 85;

/** NRI puja prices are rounded to the nearest multiple of this many rupees. */
export const NRI_ROUND_STEP_INR = 10;

/** Domestic puja price (INR) -> NRI puja price (INR). 0 stays 0. */
export function nriPujaPriceInr(domesticPujaInr: number): number {
  if (!domesticPujaInr || domesticPujaInr <= 0) return 0;
  const nri =
    Math.round((domesticPujaInr * NRI_PREMIUM_MULTIPLIER) / NRI_ROUND_STEP_INR) * NRI_ROUND_STEP_INR;
  return Math.max(nri, domesticPujaInr);
}

/** What an NRI devotee is charged, in INR: NRI puja price + the flat fees. */
export function nriTotalInr(domesticPujaInr: number, wantsPrasad: boolean): number {
  const puja = nriPujaPriceInr(domesticPujaInr);
  if (puja <= 0) return 0;
  return puja + PLATFORM_FEE_INR + (wantsPrasad ? PRASAD_DELIVERY_FEE_INR : 0);
}

/** Whole-dollar display figure for an INR amount. */
export function usdFromInr(inr: number): number {
  return Math.round(inr / USD_INR_RATE);
}

export function formatUsd(usd: number): string {
  return `$${usd.toLocaleString('en-US')}`;
}

/**
 * "$33 (charged as ₹2,801; the dollar figure is for reference)". The INR figure
 * in the parentheses is the exact amount the order is created for.
 */
export function usdPriceLine(chargedInr: number): string {
  return `${formatUsd(usdFromInr(chargedInr))} (charged as ₹${formatInr(chargedInr)}; the dollar figure is for reference)`;
}

// ─── Which currency to show ────────────────────────────────────────────────

export type DisplayCurrency = 'INR' | 'USD';

export const DISPLAY_CURRENCY_STORAGE_KEY = 'darshya.displayCurrency';

const INDIA_TIME_ZONES = new Set(['Asia/Kolkata', 'Asia/Calcutta']);

export function isIndiaTimeZone(timeZone: string | null | undefined): boolean {
  return !!timeZone && INDIA_TIME_ZONES.has(timeZone);
}

/**
 * The currency to show. Order: the devotee's own remembered choice, then a
 * signed-in `isNri` profile, then the browser timezone (USD when it is not
 * India). An unknown timezone falls back to INR — never guess a premium price.
 */
export function resolveDisplayCurrency(opts: {
  stored?: string | null;
  timeZone?: string | null;
  isNri?: boolean | null;
}): DisplayCurrency {
  if (opts.stored === 'INR' || opts.stored === 'USD') return opts.stored;
  if (opts.isNri) return 'USD';
  if (opts.timeZone && !isIndiaTimeZone(opts.timeZone)) return 'USD';
  return 'INR';
}

export function readStoredCurrency(): DisplayCurrency | null {
  try {
    const v = window.localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY);
    return v === 'INR' || v === 'USD' ? v : null;
  } catch {
    return null;
  }
}

export function storeCurrency(currency: DisplayCurrency): void {
  try {
    window.localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, currency);
  } catch {
    /* private mode / blocked storage: the choice just is not remembered */
  }
}

export function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
