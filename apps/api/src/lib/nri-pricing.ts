import { Prisma } from '@prisma/client';

/**
 * NRI pricing — API side. The web twin is apps/web/lib/nri-pricing.ts; a web
 * test asserts the two produce identical amounts, so edit both together.
 *
 * Owner decision (2026-10-05): an NRI devotee pays 2-3x the domestic puja
 * price; we use 2.5x. (Business rule 2 used to say 9-10x; that was retired.)
 *
 * MONEY RULES THAT KEEP THIS SAFE
 *  - Razorpay orders are INR only. An international card pays an INR order, so
 *    nothing downstream (commission, refund, payout, cancellation ladder)
 *    changes. The "$" figure on the site is a display conversion of the INR
 *    amount, nothing more.
 *  - The premium applies to the PUJA price only. The flat platform fee and the
 *    optional prasad-delivery fee are unchanged (they are not puja price).
 *  - The 80/20 split is computed on the NRI puja price actually charged, in the
 *    same code path as a domestic booking.
 *  - The premium is applied ONLY when the booking request carries the explicit
 *    `nriPricing` flag (the wizard sends it exactly when it is displaying the
 *    dollar price). It is never inferred from users.isNri, which is
 *    self-settable. Choosing NRI pricing can only raise the charge, so the flag
 *    is not an under-payment lever.
 */

/** 2.5x domestic. Owner: "2-3x will work". */
export const NRI_PREMIUM_MULTIPLIER = 2.5;

/**
 * INR per USD used ONLY to show a dollar figure next to the INR amount that is
 * actually charged. It is a display constant, not a live rate: review it
 * periodically. The customer's bank converts at its own rate.
 */
export const USD_INR_RATE = 85;

/** NRI puja prices are rounded to the nearest multiple of this many rupees. */
export const NRI_ROUND_STEP_INR = 10;

type DecimalLike = Prisma.Decimal | number | string;

/** Domestic puja price x 2.5, rounded half-up to the nearest NRI_ROUND_STEP_INR. */
export function nriPujaPriceInr(domesticPujaPrice: DecimalLike): Prisma.Decimal {
  const domestic = new Prisma.Decimal(domesticPujaPrice.toString());
  if (domestic.lte(0)) return new Prisma.Decimal(0);
  const step = new Prisma.Decimal(NRI_ROUND_STEP_INR);
  const nri = domestic
    .mul(new Prisma.Decimal(NRI_PREMIUM_MULTIPLIER.toString()))
    .div(step)
    .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
    .mul(step);
  return nri.lt(domestic) ? domestic : nri;
}

/** Whole-dollar display figure for an INR amount. */
export function usdDisplayFromInr(inr: number): number {
  return Math.round(inr / USD_INR_RATE);
}

/**
 * The puja price actually charged: the domestic price, or the NRI price when
 * the request carries the explicit `nriPricing` flag. Shared by every create
 * path (temple wizard, pandit-direct /from-offering) so shown === charged.
 */
export function chargedPujaPriceInr(domesticPujaPrice: DecimalLike, nriPricing: boolean): Prisma.Decimal {
  const domestic = new Prisma.Decimal(domesticPujaPrice.toString());
  return nriPricing ? nriPujaPriceInr(domestic) : domestic;
}
