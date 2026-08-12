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
    await tx.pujaBooking.update({
      where: { id: bookingId },
      data: {
        cancellationReason:
          `[refunded][ledger-manual-review ${alreadySettled}] ${reason}`.slice(0, 500),
      },
    });
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
