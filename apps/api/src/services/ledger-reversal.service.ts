import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

type TxClient = Prisma.TransactionClient | typeof prisma;

export interface LedgerReversalResult {
  reversedCommissions: number;
  reversedTemplePayouts: number;
  /** Rows that could NOT be reversed because the money has left or is mid-transfer. */
  alreadySettled: number;
}

/**
 * Unwind the provider and temple ledger for a fully-refunded booking.
 *
 * WHY THIS IS A SHARED LEAF MODULE.
 *
 * There are TWO refund rails and only one of them reversed the ledger:
 *
 *   refund.service.processAutoRefunds  — reversed correctly (RV-02)
 *   payment.service.processRefund      — refunded the devotee and left the
 *                                        provider's earning PENDING and fully
 *                                        withdrawable
 *
 * Driven end to end on 2026-08-12: booking BS-20260812-J3M76 was refunded
 * ₹1,151 through the admin rail, and a ₹770 payout request was then raised
 * successfully against that same refunded booking. The platform pays the
 * devotee back AND pays the pandit — roughly 172% of the booking value out the
 * door, with no alert, no reconciliation flag, and nothing on any dashboard.
 * You would find out from your bank balance.
 *
 * The logic was written once in refund.service and never backported. Rather
 * than copy it a second time, it lives here: a leaf module with no service
 * imports, so both rails can call it without a cycle (the same reason
 * temple-payout.service was extracted).
 *
 * Scope is deliberately FULL refunds only — see `reverseBookingLedger`'s caller
 * notes. Partial refunds remain an open owner decision, documented at both
 * call sites.
 */
export async function reverseBookingLedger(
  tx: TxClient,
  bookingId: string,
  reason: string,
): Promise<LedgerReversalResult> {
  // Only unclaimed rows may be reversed. A commission that is already PAID, or
  // sitting inside a PayoutRequest, represents money that has left the building
  // or is mid-transfer — clawing that back is a finance decision, not something
  // a refund handler should do silently.
  const reversed = await tx.commission.updateMany({
    where: { bookingId, status: 'PENDING', payoutRequestId: null },
    data: { status: 'REVERSED' },
  });

  const alreadySettled = await tx.commission.count({
    where: { bookingId, OR: [{ status: 'PAID' }, { payoutRequestId: { not: null } }] },
  });

  if (alreadySettled > 0) {
    // Flag it on the booking so an operator can reconcile by hand. Truncated to
    // the column width; the marker is what the ops query greps for.
    //
    // AW-06 (2026-08-12): best-effort. `Commission.bookingId` is NOT an FK — it
    // also carries astrologer-consultation ids (routes/consultation.ts) and, on
    // other rows, a store order. For those the PujaBooking lookup raises P2025
    // and would abort the caller's whole transaction, losing the REVERSED write
    // above — i.e. the flag for a hand-reconcile would destroy the reversal it
    // was meant to annotate. `alreadySettled` is returned to the caller either
    // way, so the signal is never lost: log/persist it there.
    try {
      await tx.pujaBooking.update({
        where: { id: bookingId },
        data: {
          cancellationReason:
            `[refunded][ledger-manual-review ${alreadySettled}] ${reason}`.slice(0, 500),
        },
      });
    } catch {
      // Not a puja booking (or already gone) — the caller still gets
      // `alreadySettled` and is responsible for surfacing it.
    }
  }

  let reversedTemplePayouts = 0;
  try {
    const t = await tx.templePayout.updateMany({
      where: { bookingId, status: 'pending' },
      data: { status: 'reversed' },
    });
    reversedTemplePayouts = t.count;
  } catch {
    // TemplePayout may not carry a 'reversed' status in older deployments.
    // Never let ledger bookkeeping fail a refund Razorpay has already made —
    // the money is gone either way; a stuck exception would only also lose the
    // Payment/Booking writes in the same transaction.
  }

  return { reversedCommissions: reversed.count, reversedTemplePayouts, alreadySettled };
}

export interface PartialLedgerResult {
  /** Commission rows whose amount was scaled down. */
  scaledCommissions: number;
  /** Temple payout rows whose amount was scaled down. */
  scaledTemplePayouts: number;
  /**
   * PriestPayout sidecar rows scaled down. On the temple booking path this is
   * the ONLY provider rail — no Commission is ever minted there (DI-05).
   */
  scaledPriestPayouts: number;
  /**
   * True when `PujaBooking.priestPayout` / `platformCommission` were rewritten.
   * That pair is what GET /admin/bookings/payouts/pending settles from, so a
   * false here on a puja booking means the admin queue is still quoting the
   * pre-refund figure.
   */
  scaledBookingSplit: boolean;
  /** Total rupees removed from provider earnings, as a 2dp string. */
  clawedBackInr: string;
  /** Rows that could NOT be reduced because the money has left or is mid-transfer. */
  alreadySettled: number;
}

/**
 * Unwind the ledger PROPORTIONALLY for a partially-refunded booking.
 *
 * DI-02 (2026-08-12). Both reversal paths were gated on a FULL refund —
 * `refund.service.ts:280` and the else branch at `payment.service.ts:1281` —
 * while the cancellation engine picks a tier off the 100/75/50/25/0 ladder, so
 * a devotee cancelling inside the window is refunded a FRACTION. That is the
 * designed common path and the marketing promise, not an edge case.
 *
 * The result: on a 75%-tier cancellation of a Rs 1,100 puja the devotee got
 * Rs 825 back while the pandit kept the whole Rs 770 commission and the temple
 * its Rs 55 — the platform collected Rs 275 and paid out Rs 825. Every
 * mid-ladder cancellation was loss-making, and nothing on any screen said so.
 *
 * WHY PROPORTIONAL IS NOT A BUSINESS GUESS. The take-rate doctrine is a uniform
 * 20% platform / 80% provider. Applying it to the revenue actually RETAINED is
 * the same rule, not a new one: the provider keeps 80% of what the platform
 * kept, exactly as they keep 80% of what it collects. Anything else would need
 * an owner decision; this does not.
 *
 * COMPOSABILITY. The scale factor is expressed against what was still
 * REFUNDABLE before this refund, not against the original price, so N
 * successive partials land on the same ledger as one combined refund:
 *
 *   target = current x (refundableBefore - refundAmount) / refundableBefore
 *
 * A row that is already PAID or linked to a PayoutRequest is left alone and
 * counted in `alreadySettled` — that money has left the building, and clawing
 * it back is a finance decision. The booking is flagged for manual review in
 * that case so the loss is visible instead of silent, mirroring
 * `reverseBookingLedger`.
 */
export async function reduceBookingLedgerForPartialRefund(
  tx: TxClient,
  bookingId: string,
  opts: { refundAmount: Prisma.Decimal; refundableBefore: Prisma.Decimal; reason: string },
): Promise<PartialLedgerResult> {
  const result: PartialLedgerResult = {
    scaledCommissions: 0,
    scaledTemplePayouts: 0,
    scaledPriestPayouts: 0,
    scaledBookingSplit: false,
    clawedBackInr: '0.00',
    alreadySettled: 0,
  };

  const { refundAmount, refundableBefore } = opts;
  // Nothing refunded, or nothing was refundable — either way there is no
  // fraction to apply and pretending otherwise would corrupt the ledger.
  if (refundAmount.lte(0) || refundableBefore.lte(0)) return result;

  // Clamped: a refund larger than what remained refundable retains nothing, and
  // must never produce a NEGATIVE earning.
  let retain = refundableBefore.sub(refundAmount).div(refundableBefore);
  if (retain.lt(0)) retain = new Prisma.Decimal(0);
  if (retain.gt(1)) retain = new Prisma.Decimal(1);

  let clawedBack = new Prisma.Decimal(0);

  const claimable = await tx.commission.findMany({
    where: { bookingId, status: 'PENDING', payoutRequestId: null },
    select: { id: true, amount: true },
  });
  for (const row of claimable) {
    const before = new Prisma.Decimal(row.amount as Prisma.Decimal);
    const after = before.mul(retain).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    if (after.equals(before)) continue;
    await tx.commission.update({ where: { id: row.id }, data: { amount: after } });
    clawedBack = clawedBack.add(before.sub(after));
    result.scaledCommissions += 1;
  }
  // NOTE: `clawedBackInr` is stamped ONCE, at the end of this function. It used
  // to be set here, before the temple and priest rails ran, so it reported the
  // commission delta alone — and on a temple-anchored booking, which mints no
  // Commission at all (DI-05), that is `0.00` beside real money removed from the
  // temple's share and the pandit's sidecar. An operator reconciling the refund
  // reads "the ledger was not touched" and adjusts by hand: a second claw-back
  // on money already reversed.

  result.alreadySettled = await tx.commission.count({
    where: { bookingId, OR: [{ status: 'PAID' }, { payoutRequestId: { not: null } }] },
  });
  if (result.alreadySettled > 0) {
    // Same best-effort flag as the full-refund path: `Commission.bookingId` is
    // not an FK and also carries consultation ids, so a PujaBooking lookup can
    // raise P2025 and would abort the caller's transaction — losing the scaling
    // writes above along with it. The caller still receives `alreadySettled`.
    try {
      await tx.pujaBooking.update({
        where: { id: bookingId },
        data: {
          cancellationReason:
            `[partially-refunded ${refundAmount.toFixed(2)}][ledger-manual-review ${result.alreadySettled}] ${opts.reason}`.slice(
              0,
              500,
            ),
        },
      });
    } catch {
      // Not a puja booking (or already gone) — the caller surfaces the signal.
    }
  }

  try {
    const temple = await tx.templePayout.findMany({
      where: { bookingId, status: 'pending' },
      select: { id: true, amount: true },
    });
    for (const row of temple) {
      const before = new Prisma.Decimal(row.amount as Prisma.Decimal);
      const after = before.mul(retain).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      if (after.equals(before)) continue;
      await tx.templePayout.update({ where: { id: row.id }, data: { amount: after } });
      clawedBack = clawedBack.add(before.sub(after));
      result.scaledTemplePayouts += 1;
    }
  } catch {
    // Never let temple bookkeeping fail a refund Razorpay has already made —
    // a stuck exception would also lose the Payment/Booking writes.
  }

  // ── DI-02, second half (2026-08-14): THE SCREEN THE MONEY LEAVES FROM ──────
  //
  // Scaling the Commission ledger is not enough, because a partial refund
  // deliberately does NOT flip the booking out of a paid status (payment.service
  // RV-12: "a partial does NOT flip the booking to 'refunded'" — it must not, or
  // the auto-refund cron would refund it a second time). The booking therefore
  // stays `completed`/`video_uploaded`/`delivered`, and
  // GET /admin/bookings/payouts/pending sums `PujaBooking.priestPayout` as the
  // authoritative, fee-exclusive split that must be settled (DI-03,
  // routes/admin-bookings.ts:152-156 and :250). Settlement there is a MANUAL
  // bank/UPI transfer, so the pre-refund figure is what an admin actually pays.
  //
  // On the finding's own case that reads: ledger Rs 192.50, settlement queue
  // Rs 770.00, same pandit, same booking — and the queue wins.
  //
  // It also closes "either rail" literally. A booking made through the TEMPLE
  // path never mints a Commission at all (DI-05), so the loop above finds zero
  // rows and, before this, a partial refund on that path reversed nothing
  // whatsoever. `PriestPayout` is the only provider rail it has.
  //
  // Scaled by the SAME retain factor as everything else, so `priestPayout +
  // platformCommission` keeps summing to the retained puja base and no reader
  // has to reconcile two different definitions of the split.
  try {
    const booking = await tx.pujaBooking.findUnique({
      where: { id: bookingId },
      select: { priestPayout: true, platformCommission: true },
    });
    if (booking) {
      const scale = (v: Prisma.Decimal | null | undefined): Prisma.Decimal =>
        new Prisma.Decimal((v ?? 0) as Prisma.Decimal)
          .mul(retain)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      await tx.pujaBooking.update({
        where: { id: bookingId },
        data: {
          priestPayout: scale(booking.priestPayout),
          platformCommission: scale(booking.platformCommission),
        },
      });
      result.scaledBookingSplit = true;
    }
  } catch {
    // Not a puja booking (Commission.bookingId also carries consultation ids —
    // AW-06), or the row is gone. Never abort the caller's transaction over it:
    // that would lose the ledger scaling that already landed above.
  }

  try {
    const sidecar = await tx.priestPayout.findMany({
      where: { bookingId, status: 'pending' },
      select: { id: true, amount: true },
    });
    for (const row of sidecar) {
      const before = new Prisma.Decimal(row.amount as Prisma.Decimal);
      const after = before.mul(retain).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      if (after.equals(before)) continue;
      await tx.priestPayout.update({ where: { id: row.id }, data: { amount: after } });
      clawedBack = clawedBack.add(before.sub(after));
      result.scaledPriestPayouts += 1;
    }
  } catch {
    // Same contract as the temple leg: a bookkeeping failure must never fail a
    // refund the gateway has already made.
  }

  // Every rail this function reduced, in one figure. Stamped last on purpose —
  // see the note by the commission loop.
  result.clawedBackInr = clawedBack.toFixed(2);

  return result;
}
