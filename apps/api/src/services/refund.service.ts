import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';
import { esc } from '../lib/html-escape.js';
import { REFUND_REQUESTED_MARKER } from '../lib/refund-marker.js';
import {
  reverseBookingLedger,
  reduceBookingLedgerForPartialRefund,
  // OPS-05: the SHARED COMMISSION_REVERSED emitter. This rail used to hand-roll
  // its own `recordMoneyEvent` block — the fourth copy of the same money rule,
  // which is exactly the drift the unwind itself was extracted to end. Two of
  // its consequences were live: the event carried no `rail` tag, so a trail read
  // back could not tell the cron's unwind from the admin panel's, and it was
  // gated on `reversed > 0`, so the already-settled BLOCK — devotee refunded,
  // provider keeps the earning — was silent on the one rail that runs unattended.
  recordLedgerReversal,
  type LedgerReversalResult,
  type PartialLedgerResult,
} from './ledger-reversal.service.js';
import { cancellationService } from './cancellation.service.js';
import { REFUND_DAYS_LABEL, REFUND_INTERNATIONAL_CARD_LABEL } from '../lib/refund-timing.js';
// OPS-05: durable money trail. Never throws, never joins the caller's
// transaction — see lib/audit-money.ts. Refunds are the single most disputed
// money event on this platform and the one the product stored least about:
// who asked for it, on whose authority, and what the payment status was
// before, all lived in an overwritable `Payment.metadata` blob.
import { MONEY_EVENTS, recordMoneyEvent } from '../lib/audit-money.js';

// Refund automation against Razorpay's REST API.
//
// Why a thin REST wrapper instead of the Razorpay SDK: the SDK pulls in
// `request` (deprecated, security-flagged) and inflates the API bundle. We
// already use direct fetch elsewhere in admin-bookings.ts; this keeps the
// surface tiny and lets us no-op cleanly when RAZORPAY_KEY_ID/SECRET are
// missing.
//
// Schema gaps (logged + skipped, not enforced — see
// apps/api/prisma/schema.prisma BookingStatus enum):
//   • No REFUND_REQUESTED status. Devotee-initiated cancellations within
//     the >24h window are tagged via cancellationReason="[refund-requested]
//     <reason>" and status flips to 'cancelled'.
//   • No refundedAt / refundReason / refundFailureReason / refundRejected
//     Reason columns on PujaBooking. We mirror these into Payment.metadata
//     (refundedAt, refundReason, refundFailureReason) and into
//     PujaBooking.cancellationReason as a "[refund-…]" prefix marker.
//   • No partial-refund column either; refundAmount lives on Payment.
//
// processRefund is idempotent: a booking already in status 'refunded' (or
// whose Payment is already 'refunded' / 'partially_refunded') returns
// `{ skipped: true, reason: 'already-refunded' }` without re-hitting
// Razorpay.

export type RefundType = 'full' | 'partial';

export interface ProcessRefundParams {
  bookingId: string;
  reason: string;
  refundType: RefundType;
  /** Required when refundType === 'partial'. Amount to refund in INR. */
  amountInr?: number;
  /** Caller — admin user ID, 'cron', or 'devotee'. Stored in Payment metadata. */
  initiatedBy?: string;
}

export interface ProcessRefundResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  refundId?: string;
  paymentId?: string;
  bookingId: string;
  amountInr?: number;
  status?: 'refunded' | 'partially_refunded';
  error?: string;
}

interface RazorpayRefundResponse {
  id?: string;
  amount?: number;
  status?: string;
  error?: { description?: string; code?: string };
}

const RAZORPAY_BASE = 'https://api.razorpay.com/v1';

/** Money rounds to paise, never to a float artefact. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * PAY-03: the running list of Razorpay refund ids already applied to a
 * Payment, kept in `Payment.metadata.refundIds`.
 *
 * Both refund rails append to it, and the `refund.created`/`refund.processed`
 * webhook reads it before accumulating — without that the webhook would add a
 * refund the rail had already recorded and double-count the cumulative total.
 * Exported so payment.service's admin rail and the webhook share ONE
 * implementation instead of two copies that can drift, which is exactly how
 * this finding happened.
 */
export function appendRefundId(
  metadata: unknown,
  refundId: string | undefined | null,
): string[] {
  const prior = (metadata as { refundIds?: unknown } | null | undefined)?.refundIds;
  const list = Array.isArray(prior) ? prior.filter((v): v is string => typeof v === 'string') : [];
  if (refundId && !list.includes(refundId)) list.push(refundId);
  return list;
}

function razorpayAuthHeader(): string | null {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) return null;
  return `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;
}

/**
 * Demo/QA stacks have no real gateway. A refund is handled locally (no HTTP
 * call) only when NODE_ENV is NOT production AND either the key id is the demo
 * key or the payment id is a demo/QA id. Production can never match: the
 * NODE_ENV check comes first and is the only thing that matters there.
 */
function isDemoRefund(gatewayPaymentId: string): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.RAZORPAY_KEY_ID === 'rzp_test_demo') return true;
  return /^(pay_demo|order_demo|pay_qa)/.test(gatewayPaymentId);
}

/**
 * What the admin is told when the gateway call fails. Plain English only: the
 * upstream status, body and network error text stay in server logs and never
 * reach the API response (they can carry account detail and read as a crash).
 */
const GATEWAY_NOT_CONFIGURED =
  'The payment gateway is not set up on this server, so the refund could not be sent. Contact the platform operator.';
const GATEWAY_NOT_FOUND =
  'The payment gateway could not process this refund (payment not found there). Check the payment in the Razorpay dashboard before retrying.';
const GATEWAY_REJECTED =
  'The payment gateway rejected this refund. Check the payment in the Razorpay dashboard before retrying.';
const GATEWAY_AUTH =
  'The payment gateway did not accept our credentials, so the refund could not be sent. Contact the platform operator.';
const GATEWAY_UNAVAILABLE =
  'The payment gateway is temporarily unavailable. Please try again in a few minutes.';

function gatewayFailureMessage(status: number | null): string {
  if (status === null) return GATEWAY_UNAVAILABLE;
  if (status === 404) return GATEWAY_NOT_FOUND;
  if (status === 401 || status === 403) return GATEWAY_AUTH;
  if (status === 429 || status >= 500) return GATEWAY_UNAVAILABLE;
  return GATEWAY_REJECTED;
}

export async function callRazorpayRefund(
  paymentId: string,
  amountInPaise: number,
  notes: Record<string, string>
): Promise<RazorpayRefundResponse> {
  if (isDemoRefund(paymentId)) {
    return { id: `rfnd_demo_${Date.now().toString(36)}`, amount: amountInPaise, status: 'processed' };
  }
  const auth = razorpayAuthHeader();
  if (!auth) {
    console.error('[refund.service] razorpay env vars not configured');
    return { error: { description: GATEWAY_NOT_CONFIGURED } };
  }
  try {
    const res = await fetch(`${RAZORPAY_BASE}/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: { authorization: auth, 'content-type': 'application/json' },
      body: JSON.stringify({ amount: amountInPaise, notes }),
    });
    const json = (await res.json().catch(() => ({}))) as RazorpayRefundResponse;
    if (!res.ok) {
      console.error('[refund.service] gateway refund failed', {
        paymentId,
        status: res.status,
        code: json.error?.code,
        description: json.error?.description,
      });
      return { error: { description: gatewayFailureMessage(res.status) } };
    }
    return json;
  } catch (err) {
    console.error('[refund.service] gateway refund request errored', {
      paymentId,
      err: err instanceof Error ? err.message : String(err),
    });
    return { error: { description: gatewayFailureMessage(null) } };
  }
}

function refundSuccessEmail(params: {
  devoteeName: string;
  pujaName: string;
  templeName: string;
  bookingNumber: string;
  amount: string;
  refundId: string;
  refundType: RefundType;
}): { subject: string; html: string; text: string } {
  const { devoteeName, pujaName, templeName, bookingNumber, amount, refundId, refundType } = params;
  const label = refundType === 'partial' ? 'Partial refund' : 'Refund';
  return {
    subject: `${label} processed for booking ${bookingNumber}`,
    html: `<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#fbf7f1;padding:24px;">
<div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:12px;">
<h2 style="color:#ea580c;margin:0 0 16px;">Darshya</h2>
<h3>Namaste ${esc(devoteeName)}, your ${label.toLowerCase()} is on the way</h3>
<p>${label} of <strong>${amount}</strong> for your <strong>${esc(pujaName)}</strong> booking at <strong>${esc(templeName)}</strong> has been processed.</p>
<p><strong>Booking #:</strong> ${bookingNumber}<br>
<strong>Refund reference:</strong> ${refundId}</p>
<p>The amount will appear on your original payment method in ${REFUND_DAYS_LABEL}. International cards can take ${REFUND_INTERNATIONAL_CARD_LABEL}, which is set by your card issuer and not by Darshya. If you don't see it after that, please reply to this email.</p>
<p style="font-size:11px;color:#999;margin-top:24px;">Darshya · darshya.online</p>
</div></body></html>`,
    text: `Namaste ${devoteeName},\n\n${label} of ${amount} for booking ${bookingNumber} (${pujaName} at ${templeName}) has been processed.\nRefund reference: ${refundId}\n\nThe amount will appear on your original payment method in ${REFUND_DAYS_LABEL}. International cards can take ${REFUND_INTERNATIONAL_CARD_LABEL}, which is set by your card issuer and not by Darshya.`,
  };
}

export async function processRefund(params: ProcessRefundParams): Promise<ProcessRefundResult> {
  const { bookingId, reason, refundType, amountInr, initiatedBy = 'system' } = params;

  if (refundType === 'partial' && (!amountInr || amountInr <= 0)) {
    return { ok: false, bookingId, error: 'amountInr is required for partial refunds' };
  }

  const booking = await prisma.pujaBooking.findUnique({
    where: { id: bookingId },
    include: {
      user: { select: { fullName: true, email: true } },
      temple: { select: { name: true } },
      pujaType: { select: { name: true } },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!booking) {
    return { ok: false, bookingId, error: 'Booking not found' };
  }

  // Idempotency guard — already refunded.
  if (booking.status === 'refunded') {
    return {
      ok: true,
      skipped: true,
      reason: 'already-refunded',
      bookingId,
      status: 'refunded',
    };
  }

  // We treat any non-pending_payment booking as "paid" for refund purposes
  // (BookingStatus has no `paid` value — see schema.prisma:71). The captured
  // payment is the source of truth.
  const captured = booking.payments.find(
    (p) => p.status === 'captured' || p.status === 'partially_refunded'
  );
  if (!captured) {
    return { ok: false, bookingId, error: 'No captured payment found for this booking' };
  }

  if (captured.status === 'refunded') {
    return {
      ok: true,
      skipped: true,
      reason: 'payment-already-refunded',
      bookingId,
      paymentId: captured.id,
    };
  }

  if (!captured.gatewayPaymentId) {
    return { ok: false, bookingId, error: 'Captured payment missing gatewayPaymentId' };
  }

  // PAY-03 (2026-08-20): `Payment.refundAmount` is the CUMULATIVE total
  // refunded against this capture, not the last refund. payment.service's
  // admin rail has always read it that way — it computes what is still
  // refundable as `paid - alreadyRefunded` and stores
  // `alreadyRefunded + refundAmount`. This rail overwrote it with the last
  // refund and passed the FULL `paidInr` as `refundableBefore` to the
  // proportional ledger unwind, so the two rails disagreed at the seam:
  //
  //   Rs 1,100 captured, Rs 550 already refunded, second partial of Rs 275
  //     - stored refundAmount became 275, not 825, so the next refund believed
  //       Rs 825 was still refundable when only Rs 275 was — the devotee could
  //       be handed back more than was ever taken;
  //     - the unwind scaled by (1100-275)/1100 = 0.75 instead of
  //       (550-275)/550 = 0.50, leaving the pandit Rs 330 of a Rs 440 pending
  //       commission where Rs 220 is correct. The platform keeps paying the
  //       provider on revenue it has already refunded.
  //
  // This is the DI-01/DI-02 failure class living in the SEAM between the two
  // rails rather than inside either, which is why the shared
  // ledger-reversal.service module did not prevent it. Do not re-introduce a
  // non-accumulating write here: cumulative is the contract.
  const paidInr = Number(captured.amount);
  const alreadyRefundedInr =
    captured.refundAmount != null ? Number(captured.refundAmount) : 0;
  const refundableInr = round2(Math.max(0, paidInr - alreadyRefundedInr));

  if (refundableInr <= 0) {
    return {
      ok: true,
      skipped: true,
      reason: 'payment-already-refunded',
      bookingId,
      paymentId: captured.id,
      status: 'refunded',
    };
  }

  // Whatever is asked for is clamped to what is STILL refundable, so no path
  // can return more money than was taken (same rule as payment.service).
  const refundInr =
    refundType === 'partial' ? Math.min(amountInr!, refundableInr) : refundableInr;
  const refundInPaise = Math.round(refundInr * 100);

  const refund = await callRazorpayRefund(captured.gatewayPaymentId, refundInPaise, {
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    reason: reason.slice(0, 250),
    initiatedBy: initiatedBy.slice(0, 80),
  });

  if (refund.error || !refund.id) {
    const failureReason = refund.error?.description ?? GATEWAY_REJECTED;
    // Store failure reason in Payment.metadata for audit; leave booking
    // status as-is (typically 'cancelled' or post-paid) so admin can retry.
    try {
      await prisma.payment.update({
        where: { id: captured.id },
        data: {
          metadata: {
            ...((captured.metadata as Record<string, unknown>) ?? {}),
            refundFailureReason: failureReason,
            refundFailedAt: new Date().toISOString(),
            refundFailureInitiatedBy: initiatedBy,
          },
        },
      });
    } catch {
      // best effort
    }
    // OPS-05 — a refund the gateway REFUSED. Previously this survived only as
    // `metadata.refundFailureReason`, which the next refund attempt overwrites,
    // so a devotee chasing money that never arrived left no trace of the
    // attempts made on their behalf.
    void recordMoneyEvent({
      eventType: MONEY_EVENTS.REFUND_FAILED,
      actorType: initiatedBy === 'system' || initiatedBy === 'cron' ? 'system' : 'admin',
      subjectType: 'payment',
      subjectId: captured.id,
      bookingId,
      paymentId: captured.id,
      amount: refundInr,
      currency: captured.currency,
      gateway: 'razorpay',
      gatewayPaymentId: captured.gatewayPaymentId,
      statusBefore: captured.status,
      statusAfter: captured.status,
      note: failureReason,
      metadata: { refundType, initiatedBy, reason },
    });
    return {
      ok: false,
      bookingId,
      paymentId: captured.id,
      error: failureReason,
    };
  }

  // OPS-05 — the gateway accepted the refund. Recorded here, before the local
  // transaction, because the money has ALREADY left at this point: if the
  // transaction below fails, the devotee has still been refunded and that is
  // precisely the state an audit trail must be able to show. No local write
  // precedes this one, so there is nothing to record "after".
  void recordMoneyEvent({
    eventType: MONEY_EVENTS.REFUND_INITIATED,
    actorType: initiatedBy === 'system' || initiatedBy === 'cron' ? 'system' : 'admin',
    subjectType: 'payment',
    subjectId: captured.id,
    bookingId,
    paymentId: captured.id,
    amount: refundInr,
    currency: captured.currency,
    gateway: 'razorpay',
    gatewayPaymentId: captured.gatewayPaymentId,
    gatewayRefundId: refund.id,
    statusBefore: captured.status,
    idempotencyKey: refund.id,
    note: reason,
    metadata: { refundType, initiatedBy, refundableBeforeInr: refundableInr },
  });

  // PAY-03: status and the ledger branch key off the CUMULATIVE total, not off
  // the caller's `refundType`. A partial that happens to clear the remaining
  // balance IS a full refund — before this, the last Rs 550 of a Rs 1,100
  // capture left the payment `partially_refunded` forever and reversed the
  // provider ledger only proportionally, so a fully-refunded booking still
  // paid its pandit.
  const newRefundTotalInr = round2(alreadyRefundedInr + refundInr);
  const isFullyRefunded = newRefundTotalInr >= paidInr;
  const newPaymentStatus = isFullyRefunded ? 'refunded' : 'partially_refunded';

  // Booking only flips to 'refunded' once the whole capture is back. For a
  // partial, keep status as-is (likely cancelled) and let cancellationReason
  // carry the marker.
  const bookingDataPatch: Record<string, unknown> =
    isFullyRefunded
      ? {
          status: 'refunded',
          cancelledAt: booking.cancelledAt ?? new Date(),
          cancellationReason: `[refunded] ${reason}`.slice(0, 500),
        }
      : {
          cancellationReason: `[partially-refunded ${refundInr}] ${reason}`.slice(0, 500),
        };

  // Atomic: Razorpay already debited; if Payment update lands but Booking
  // update fails the customer is refunded yet booking still looks active.
  // Wrap both writes so they commit together.
  let reversedCommissions = 0;
  let reversedTemplePayouts = 0;
  // OPS-05: the unwind's OWN result, kept whole rather than flattened to two
  // counters, so the shared emitter can see `alreadySettled` and the partial
  // path's claw-back figure. Captured out of the transaction and recorded after
  // it commits.
  let fullReversal: LedgerReversalResult | null = null;
  let partialReversal: PartialLedgerResult | null = null;
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: captured.id },
      data: {
        status: newPaymentStatus,
        // PAY-03: CUMULATIVE, never the last refund alone.
        refundAmount: newRefundTotalInr,
        metadata: {
          ...((captured.metadata as Record<string, unknown>) ?? {}),
          refundId: refund.id,
          // PAY-03: every Razorpay refund id ever applied to this capture, so
          // the refund webhook can tell "already recorded by the rail" from
          // "a refund raised directly in the Razorpay dashboard".
          refundIds: appendRefundId(captured.metadata, refund.id),
          refundedAt: new Date().toISOString(),
          refundReason: reason,
          refundType,
          refundInitiatedBy: initiatedBy,
        },
      },
    });
    await tx.pujaBooking.update({
      where: { id: bookingId },
      data: bookingDataPatch,
    });

    // RV-02 (2026-08-10): UNWIND THE PROVIDER LEDGER.
    //
    // Commission rows are minted at CONFIRM time — strictly before any refund is
    // possible — and nothing downgraded, deleted or reversed them. So a refunded
    // booking left the provider's earning PENDING and fully withdrawable, and the
    // temple's 5% share pending too: on a Rs 5,000 booking refunded in full the
    // devotee got Rs 5,000 back while Rs 1,000 stayed withdrawable to the priest
    // and Rs 250 to the temple — ~Rs 6,250 out on a booking that earned Rs 0.
    // Once an admin marked the payout complete the money was simply gone; the
    // CommissionStatus enum had no reversal state at all (migration
    // 20260810000000 adds REVERSED).
    //
    // Only PENDING rows are reversed. A row already linked to a settled payout
    // (PAID, or carrying a payoutRequestId) is deliberately left alone — that
    // money has left the building and clawing it back is a manual finance
    // decision, not something a refund handler should do silently. Those surface
    // in the reconciliation warning below.
    //
    // DI-02 (2026-08-12): partial refunds now unwind PROPORTIONALLY.
    //
    // This block used to be full-refund-only "because splitting a provider's
    // earning mid-flight needs a policy decision". It does not: the take-rate
    // doctrine is a uniform 20/80, and applying it to the revenue actually
    // RETAINED is the same rule, not a new one. Meanwhile the cancellation
    // ladder (100/75/50/25/0) makes a fractional refund the NORMAL path — on a
    // 75%-tier cancellation of a Rs 1,100 puja the devotee got Rs 825 back
    // while the pandit kept the whole Rs 770 and the temple its Rs 55, so the
    // platform collected Rs 275 and paid out Rs 825. Every mid-ladder
    // cancellation was loss-making, silently.
    //
    // PAY-03 (2026-08-20): the branch key is the CUMULATIVE outcome, not the
    // caller's `refundType`. A partial that clears the remaining balance must
    // take the FULL reversal path, and successive partials must each scale
    // against what was still refundable at their own moment.
    if (isFullyRefunded) {
      // This logic used to live inline here, and payment.service's admin rail
      // never got a copy — which is how a fully refunded booking still paid the
      // pandit (~172% of booking value out the door, DI-01). It was extracted to
      // ledger-reversal.service so both rails share ONE implementation, but only
      // payment.service was switched over; this call site kept its duplicate
      // until 2026-08-13. Two copies of a money-reversal rule is precisely the
      // drift that module exists to prevent — do not re-inline it.
      const reversal = await reverseBookingLedger(tx, bookingId, reason);
      fullReversal = reversal;
      reversedCommissions = reversal.reversedCommissions;
      reversedTemplePayouts = reversal.reversedTemplePayouts;
    } else {
      // PAY-03: `refundableInr` — what was still refundable BEFORE this call
      // (paid minus everything already refunded) — is what makes successive
      // partials compose to the same ledger as one combined refund. Passing
      // the gross `paidInr` here under-reversed every refund after the first.
      const scaled = await reduceBookingLedgerForPartialRefund(tx, bookingId, {
        refundAmount: new Prisma.Decimal(refundInr.toFixed(2)),
        refundableBefore: new Prisma.Decimal(refundableInr.toFixed(2)),
        reason,
      });
      partialReversal = scaled;
      reversedCommissions = scaled.scaledCommissions;
      reversedTemplePayouts = scaled.scaledTemplePayouts;
    }
  });

  // OPS-05 — recorded AFTER the transaction commits, never inside it: the
  // event is "this happened", and it has not happened until the transaction
  // commits. `statusBefore` is the pre-image read at the top of this function.
  void recordMoneyEvent({
    eventType: MONEY_EVENTS.REFUND_COMPLETED,
    actorType: initiatedBy === 'system' || initiatedBy === 'cron' ? 'system' : 'admin',
    subjectType: 'payment',
    subjectId: captured.id,
    bookingId,
    paymentId: captured.id,
    amount: refundInr,
    currency: captured.currency,
    gateway: 'razorpay',
    gatewayPaymentId: captured.gatewayPaymentId,
    gatewayRefundId: refund.id,
    statusBefore: captured.status,
    statusAfter: newPaymentStatus,
    idempotencyKey: refund.id,
    note: reason,
    metadata: {
      refundType,
      initiatedBy,
      refundedTotalInr: newRefundTotalInr,
      fullyRefunded: isFullyRefunded,
    },
  });

  // OPS-05 — and the ledger unwind that rode along with it. "Was the pandit's
  // earning minted before or after the refund" is one of the questions this
  // module was written to answer, and the reversal itself leaves no other
  // durable evidence of how many rows it touched.
  //
  // Through the SHARED emitter now, not a hand-rolled block. The two things
  // that copy got wrong were both real: no `rail` tag (so the trail could not
  // distinguish the unattended cron from the admin panel), and a
  // `reversed > 0` gate that made the already-settled BLOCK — money refunded,
  // provider keeps the earning — invisible on the one rail nobody is watching.
  // Awaited rather than `void`ed: the emitter re-reads committed rows to prove
  // the reversal survived. It never throws.
  await recordLedgerReversal({
    bookingId,
    rail: 'auto-refund',
    reason,
    actorType: initiatedBy === 'system' || initiatedBy === 'cron' ? 'system' : 'admin',
    paymentId: captured.id,
    // Full path keeps the historical figure (rupees returned); the partial path
    // falls through to the emitter's default, which is the claw-back — on a
    // partial those differ and the claw-back is what this event is about.
    amount: isFullyRefunded ? refundInr : undefined,
    currency: captured.currency,
    gatewayRefundId: refund.id,
    idempotencyKey: refund.id,
    full: fullReversal,
    partial: partialReversal,
  });

  // Best-effort success email — never block on send failure.
  let emailAlreadySent = false;
  if (booking.user.email) {
    try {
      const { subject, html, text } = refundSuccessEmail({
        devoteeName: booking.user.fullName ?? 'Devotee',
        pujaName: booking.pujaType.name,
        templeName: booking.temple.name,
        bookingNumber: booking.bookingNumber,
        amount: `₹${refundInr.toLocaleString('en-IN')}`,
        refundId: refund.id,
        refundType,
      });
      // Only a REAL send suppresses the notifier's own email leg. sendEmail
      // returns {ok:false, skipped:true} when RESEND_API_KEY is unset — which
      // is the current production state (NOTIF-03, owner-gated) — so trusting
      // "we called sendEmail" here would suppress the fallback AND report a
      // delivery that never happened. That conflation of skipped-with-sent is
      // the root of this whole finding; do not reintroduce it.
      const res = await sendEmail({ to: booking.user.email, subject, html, text });
      emailAlreadySent = res.ok === true;
    } catch {
      // swallow — email failure must not undo refund
    }
  }

  // NOTIF-04 (2026-08-12): ANNOUNCE THE REFUND ON THE NON-EMAIL CHANNELS.
  //
  // The email above is gated twice — on the nullable User.email, then on
  // RESEND_API_KEY inside sendEmail — so a phone-OTP devotee (the exact cohort
  // the WhatsApp-first GTM targets) was told NOTHING on any channel when their
  // money went back. Worst here on the cron path: processAutoRefunds calls this
  // an hour after cancellation with no user-initiated trigger at all, so the
  // first the devotee knows of it is their bank statement. The predictable next
  // step is a chargeback on a refund that was already paid, which costs the
  // platform the disputed amount plus the fee.
  //
  // notifyRefundProcessed was written for exactly this gap and had ZERO call
  // sites. Fired AFTER the transaction commits — never inside it, a rolled-back
  // refund must not have been announced — and awaited only so a throw cannot
  // escape as an unhandled rejection. `emailAlreadySent` suppresses its email
  // leg so this rail cannot double-email.
  //
  // Dynamic import for the same reason payment.service uses one: it keeps
  // routes/notifications (and its web-push/FCM deps) out of this module's
  // static graph.
  try {
    const { notifyRefundProcessed } = await import('./booking-notify.service.js');
    await notifyRefundProcessed({ bookingId, amountInr: refundInr, emailAlreadySent });
  } catch (err) {
    // A notification must NEVER undo a refund Razorpay has already made.
    console.warn('[refund.service] refund notification failed:', err);
  }

  return {
    ok: true,
    refundId: refund.id,
    paymentId: captured.id,
    bookingId,
    amountInr: refundInr,
    status: newPaymentStatus as 'refunded' | 'partially_refunded',
  };
}

// Marker prefix used by request-refund and consumed by processAutoRefunds.
// Shared with the producer (booking.service.cancelBooking) — see lib/refund-marker.ts.
// Re-exported below on `refundService` for existing callers.

/**
 * Auto-process REFUND_REQUESTED bookings older than 1 hour. Wired into
 * runDailyOps in jobs/master-cron.ts. Idempotent — picks only bookings
 * still in 'cancelled' (status would already be 'refunded' if a prior tick
 * succeeded).
 */
export interface PolicyRefundQuote {
  refundAmountInr: number;
  feeAmountInr: number;
  refundFraction: number;
  tierLabel: string;
}

/**
 * What the cancellation policy owes this booking, measured from the moment the
 * devotee cancelled (not now). One function for the cron and the admin screen so
 * the amount an admin approves is the amount the devotee was quoted.
 */
export async function computePolicyRefund(booking: {
  id: string;
  scheduledDate: Date;
  scheduledTimeSlot: string | null;
  priceAmount: Prisma.Decimal | string | number;
  cancelledAt: Date | null;
}): Promise<PolicyRefundQuote> {
  const policy = await cancellationService.getPolicy(booking.id);
  const price = Number(booking.priceAmount);
  const q = cancellationService.computeDevoteeRefund({
    policy,
    scheduledDate: booking.scheduledDate,
    scheduledTimeSlot: booking.scheduledTimeSlot,
    pujaPriceInr: price,
    totalPaidInr: price,
    now: booking.cancelledAt ?? undefined,
  });
  return {
    refundAmountInr: q.refundAmountInr,
    feeAmountInr: q.feeAmountInr,
    refundFraction: q.refundFraction,
    tierLabel: q.tierLabel,
  };
}

export async function processAutoRefunds(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  skipped?: boolean;
  reason?: string;
}> {
  if (!razorpayAuthHeader()) {
    return { processed: 0, succeeded: 0, failed: 0, skipped: true, reason: 'razorpay env unset' };
  }
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  let candidates: Array<{
    id: string;
    cancellationReason: string | null;
    scheduledDate: Date;
    scheduledTimeSlot: string | null;
    priceAmount: Prisma.Decimal;
    cancelledAt: Date | null;
  }>;
  try {
    candidates = await prisma.pujaBooking.findMany({
      where: {
        status: 'cancelled',
        cancellationReason: { startsWith: REFUND_REQUESTED_MARKER },
        cancelledAt: { lt: cutoff },
      },
      // S2C-14: the ladder needs the slot + price + when the devotee cancelled.
      select: {
        id: true,
        cancellationReason: true,
        scheduledDate: true,
        scheduledTimeSlot: true,
        priceAmount: true,
        cancelledAt: true,
      },
      take: 50,
    });
  } catch {
    return { processed: 0, succeeded: 0, failed: 0, skipped: true, reason: 'query failed' };
  }
  let succeeded = 0;
  let failed = 0;
  for (const c of candidates) {
    const reason = (c.cancellationReason ?? '').replace(REFUND_REQUESTED_MARKER, '').trim() || 'Auto refund (cancellation request)';
    try {
      // S2C-14 (2026-08-10): this used to hardcode `refundType: 'full'`, so EVERY
      // auto-processed refund paid 100% while the 100/75/50/25/0 ladder was
      // computed for display only. A devotee cancelling 30h out is owed 75% and
      // was refunded 100% — Rs 275 over-refunded per Rs 1,100 booking,
      // automatically, with no admin in the loop.
      //
      // The tier is measured at the moment the devotee CANCELLED (cancelledAt),
      // not now — this cron runs at least an hour later, and billing them for
      // our own queue latency would push them down a tier.
      const quote = await computePolicyRefund(c);
      const isFull = quote.refundFraction >= 1;
      const r = await processRefund({
        bookingId: c.id,
        reason: `${reason} [${quote.tierLabel}]`.slice(0, 250),
        refundType: isFull ? 'full' : 'partial',
        ...(isFull ? {} : { amountInr: quote.refundAmountInr }),
        initiatedBy: 'cron',
      });
      if (r.ok) succeeded += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { processed: candidates.length, succeeded, failed };
}

export const refundService = {
  processRefund,
  processAutoRefunds,
  computePolicyRefund,
  REFUND_REQUESTED_MARKER,
};
