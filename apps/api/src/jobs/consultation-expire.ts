import { prisma } from '../lib/prisma.js';

// Stale pending_payment consultations should free the astrologer's slot
// instead of lingering forever. Razorpay checkout windows are short; after
// 30 minutes the order is effectively dead — Razorpay itself expires the
// order at 15 min for most plans. We pad to 30 min to absorb client clock
// skew + retry races.
//
// Cancelled rows remain queryable (for support refund forensics) but no
// longer block the per-astrologer per-slot uniqueness future-rules will
// want to add.
//
// Idempotent: only flips rows still in pending_payment.
//
// ─── PAY-01 (2026-08-20, P0) ────────────────────────────────────────────────
//
// This job used to run ONE unconditional statement — every pending_payment row
// older than 30 minutes became `cancelled`, with no check whatsoever on whether
// money had been captured against it. Paired with the webhook's structural
// blindness to consultations (they write no prisma.payment row, so
// payment.findFirst and findDonationByOrderId could never resolve one), that is
// the whole P0: a devotee pays, the browser dies before /verify-payment, and
// half an hour later the record says the consultation was never ordered. Money
// taken, nothing to refund against, nobody told.
//
// "30 minutes old and still pending" does NOT mean "unpaid". Only Razorpay
// knows whether an order was captured, so the cron must not decide with money
// on the line. The rows split three ways:
//
//   1. PROVABLY unpaid — no Razorpay order was ever created (order creation
//      returned 502 and the row was written anyway), or the order is a
//      synthetic `order_demo_*` id that can never hold real money. These are
//      safe to cancel, and cancelling them is what frees the slot.
//   2. AMBIGUOUS — a real Razorpay order id. Routed to `payment_review`, an
//      admin queue, never destroyed. jobs/reconcile-payments.ts asks Razorpay
//      what actually settled and either confirms (via the same webhook
//      backstop) or cancels with an audit trail.
//   3. Already confirmed/cancelled — untouched, as before.
//
// `payment_review` is still resumable by the devotee: POST /verify-payment
// gates only on `status === 'confirmed'`, and the webhook backstop
// (finalizeConsultationPaymentFromWebhook) explicitly claims
// pending_payment / payment_review / cancelled rows.

const STALE_AFTER_MINUTES = 30;

/**
 * A Razorpay order id that cannot possibly hold real money. `_` is a LIKE
 * wildcard, so both underscores are escaped — `order\_demo\_%` matches the
 * literal prefix the demo path mints and nothing else.
 */
const DEMO_ORDER_LIKE = String.raw`'order\_demo\_%'`;

export interface ConsultationExpireResult {
  /** Rows cancelled — provably no capture behind them. */
  expired: number;
  /** PAY-01: rows that may hold a capture, parked for admin/reconciliation. */
  queuedForReview?: number;
  skipped?: boolean;
  reason?: string;
}

export async function tickConsultationExpire(): Promise<ConsultationExpireResult> {
  try {
    const cutoffIso = new Date(Date.now() - STALE_AFTER_MINUTES * 60 * 1000).toISOString();

    // 1. Provably unpaid — safe to cancel.
    const cancelled = await prisma.$executeRawUnsafe(
      `UPDATE astrologer_consultations
       SET status = 'cancelled'
       WHERE status = 'pending_payment'
         AND created_at < $1::timestamptz
         AND (razorpay_order_id IS NULL OR razorpay_order_id LIKE ${DEMO_ORDER_LIKE});`,
      cutoffIso,
    );

    // 2. Ambiguous — a real Razorpay order. NEVER cancelled on a timer.
    const queuedForReview = await prisma.$executeRawUnsafe(
      `UPDATE astrologer_consultations
       SET status = 'payment_review'
       WHERE status = 'pending_payment'
         AND created_at < $1::timestamptz
         AND razorpay_order_id IS NOT NULL
         AND razorpay_order_id NOT LIKE ${DEMO_ORDER_LIKE};`,
      cutoffIso,
    );

    return {
      expired: Number(cancelled ?? 0),
      queuedForReview: Number(queuedForReview ?? 0),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/relation .* does not exist|astrologer_consultations/i.test(msg)) {
      return { expired: 0, skipped: true, reason: 'table-missing' };
    }
    return { expired: 0, skipped: true, reason: msg };
  }
}
