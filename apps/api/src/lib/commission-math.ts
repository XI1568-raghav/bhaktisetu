import { Prisma } from '@prisma/client';

/**
 * The `Commission` ledger's column conventions, in one place.
 *
 * This module exists because an adversarial review on 2026-08-11 found the two
 * columns carrying THREE different meanings across five writers, with readers
 * back-solving gross revenue from whichever pair they assumed. The puja writers
 * said `amount` was the platform's cut, the wellness and store writers said it
 * was the provider's, and `percentage` was written as the provider's share in
 * one place and the platform's rate in three others. Every dashboard built on
 * top was therefore wrong by a different factor.
 *
 * The convention, chosen to match what the payout engine already does rather
 * than what any single writer said:
 *
 *   amount     — the PROVIDER's earning. This is the authoritative one: it is
 *                literally what `payout.service.getPayoutBalance` sums into a
 *                provider's withdrawable balance, so any other meaning is a
 *                mispayment, not a display bug.
 *   percentage — the PLATFORM's take rate, as a fraction (Decimal(5,4), so
 *                0.2000 means 20%). Never the provider's share.
 *
 * Everything else is derived here so no reader re-invents the arithmetic:
 *
 *   gross       = amount / (1 - percentage)
 *   platformCut = gross - amount
 *
 * All Decimal — money is never JS float in this codebase.
 */

type DecimalLike = Prisma.Decimal | number | string;

const ONE = new Prisma.Decimal(1);
const ZERO = new Prisma.Decimal(0);

/**
 * Gross transaction value a commission row was split from.
 *
 * Returns 0 for a degenerate rate (>= 100% or negative) rather than dividing by
 * zero or returning a negative gross — a bad rate is a data problem, and a
 * dashboard reporting ₹0 is recoverable in a way that reporting ∞ is not.
 */
export function commissionGross(amount: DecimalLike, percentage: DecimalLike): Prisma.Decimal {
  const net = new Prisma.Decimal(amount);
  const rate = new Prisma.Decimal(percentage);
  if (rate.gte(ONE) || rate.lt(ZERO)) return ZERO;
  return net.div(ONE.sub(rate)).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** The platform's share of the same transaction. */
export function commissionPlatformCut(
  amount: DecimalLike,
  percentage: DecimalLike,
): Prisma.Decimal {
  const net = new Prisma.Decimal(amount);
  const gross = commissionGross(net, percentage);
  if (gross.lte(ZERO)) return ZERO;
  return gross.sub(net).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/**
 * The platform's take rate to persist alongside a provider's earning.
 * `platformCut` and `gross` are the two figures every caller already has.
 */
export function platformRateOf(platformCut: DecimalLike, gross: DecimalLike): Prisma.Decimal {
  const cut = new Prisma.Decimal(platformCut);
  const total = new Prisma.Decimal(gross);
  if (total.lte(ZERO)) return ZERO;
  return cut.div(total);
}
