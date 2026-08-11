import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/**
 * RV-03 (2026-08-10) — the temple's 5% share of a confirmed puja.
 *
 * WHY THIS MODULE EXISTS. The writer originally lived inline in
 * `booking.service.updateBookingStatus`'s `confirmed` branch — but none of the
 * three REAL payment-confirm paths go through `updateBookingStatus`;
 * `payment.service` flips the status inline inside its own capture transaction.
 * So the only bookings that could ever mint a TemplePayout were UNPAID ones (a
 * PATCH straight from pending_payment to confirmed), and temples received
 * ₹0.00 on 100% of PAID bookings — a perfect inversion of the intent and a
 * direct breach of the MoU revenue-share promise.
 *
 * Hoisting it into `booking.service` as an exported function was not enough:
 * `booking.service` imports `payment.service`, so `payment.service` importing
 * it back would form a module cycle. It therefore lives here, in a leaf module
 * that depends on nothing but Prisma, and BOTH sides import it. That is what
 * actually closes RV-03 — an exported-but-uncalled writer left temples on ₹0.00.
 *
 * Takes an optional transaction client so the temple ledger row commits or rolls
 * back WITH the payment confirm that earned it (the P1-12 doctrine that governs
 * the sibling commission writer).
 */

/** Prisma client or an open interactive-transaction client. */
type TxClient = Prisma.TransactionClient | typeof prisma;

/** The temple trust's slice of a puja, separate from the 20/80 platform/provider split. */
export const DEFAULT_TEMPLE_SHARE_RATE = 0.05;

/**
 * Read TEMPLE_SHARE_RATE as an exact Decimal.
 *
 * A plain `Number(process.env.TEMPLE_SHARE_RATE ?? '0.05')` turns a typo'd env
 * var into NaN, which silently produces a NaN amount (and so either a rejected
 * write or a ₹0 share) with no signal at all. Anything that is not a fraction in
 * [0,1] falls back to the documented default and says so in the log.
 */
export function resolveTempleShareRate(): Prisma.Decimal {
  const raw = process.env.TEMPLE_SHARE_RATE;
  if (raw === undefined || raw.trim() === '') {
    return new Prisma.Decimal(DEFAULT_TEMPLE_SHARE_RATE);
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    console.warn(
      `[temple-payout] TEMPLE_SHARE_RATE="${raw}" is not a fraction in [0,1] — using ${DEFAULT_TEMPLE_SHARE_RATE}.`,
    );
    return new Prisma.Decimal(DEFAULT_TEMPLE_SHARE_RATE);
  }
  return new Prisma.Decimal(raw);
}

/**
 * Write the temple's share for a confirmed booking. Idempotent.
 *
 * The share is taken on the PUJA price (priestPayout + platformCommission), not
 * on priceAmount — priceAmount also carries the platform fee and the prasad
 * delivery fee, and the temple has no claim on either.
 */
export async function writeTemplePayoutOnConfirm(
  bookingId: string,
  tx: TxClient = prisma,
): Promise<void> {
  const booking = await tx.pujaBooking.findUnique({
    where: { id: bookingId },
    select: { id: true, templeId: true, platformCommission: true, priestPayout: true },
  });
  if (!booking) return;

  // Idempotency guard. NOTE: temple_payouts.booking_id has no UNIQUE index, so
  // this findFirst remains a TOCTOU under truly concurrent confirms — the index
  // is a schema change and is filed with the owner in AUDIT.md.
  const existing = await tx.templePayout.findFirst({
    where: { bookingId: booking.id },
    select: { id: true },
  });
  if (existing) return;

  const pujaPrice = new Prisma.Decimal(booking.priestPayout as Prisma.Decimal).add(
    new Prisma.Decimal(booking.platformCommission as Prisma.Decimal),
  );
  const amount = pujaPrice
    .mul(resolveTempleShareRate())
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  if (amount.lte(0)) return;

  await tx.templePayout.create({
    data: {
      templeId: booking.templeId,
      bookingId: booking.id,
      amount,
      status: 'pending',
    },
  });
}
