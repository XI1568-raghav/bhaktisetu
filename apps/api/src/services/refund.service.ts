import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';

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

function razorpayAuthHeader(): string | null {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) return null;
  return `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;
}

async function callRazorpayRefund(
  paymentId: string,
  amountInPaise: number,
  notes: Record<string, string>
): Promise<RazorpayRefundResponse> {
  const auth = razorpayAuthHeader();
  if (!auth) {
    return { error: { description: 'razorpay env vars not configured' } };
  }
  try {
    const res = await fetch(`${RAZORPAY_BASE}/payments/${paymentId}/refund`, {
      method: 'POST',
      headers: { authorization: auth, 'content-type': 'application/json' },
      body: JSON.stringify({ amount: amountInPaise, notes }),
    });
    const json = (await res.json().catch(() => ({}))) as RazorpayRefundResponse;
    if (!res.ok) {
      return { error: { description: json.error?.description ?? `HTTP ${res.status}` } };
    }
    return json;
  } catch (err) {
    return { error: { description: err instanceof Error ? err.message : String(err) } };
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
<h3>Namaste ${devoteeName}, your ${label.toLowerCase()} is on the way</h3>
<p>${label} of <strong>${amount}</strong> for your <strong>${pujaName}</strong> booking at <strong>${templeName}</strong> has been processed.</p>
<p><strong>Booking #:</strong> ${bookingNumber}<br>
<strong>Refund reference:</strong> ${refundId}</p>
<p>The amount will appear on your original payment method within 5-7 business days. If you don't see it, please reply to this email.</p>
<p style="font-size:11px;color:#999;margin-top:24px;">Darshya · darshya.online</p>
</div></body></html>`,
    text: `Namaste ${devoteeName},\n\n${label} of ${amount} for booking ${bookingNumber} (${pujaName} at ${templeName}) has been processed.\nRefund reference: ${refundId}\n\nThe amount will appear on your original payment method within 5-7 business days.`,
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

  const paidInr = Number(captured.amount);
  const refundInr = refundType === 'partial' ? Math.min(amountInr!, paidInr) : paidInr;
  const refundInPaise = Math.round(refundInr * 100);

  const refund = await callRazorpayRefund(captured.gatewayPaymentId, refundInPaise, {
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    reason: reason.slice(0, 250),
    initiatedBy: initiatedBy.slice(0, 80),
  });

  if (refund.error || !refund.id) {
    const failureReason = refund.error?.description ?? 'unknown razorpay error';
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
    return {
      ok: false,
      bookingId,
      paymentId: captured.id,
      error: failureReason,
    };
  }

  const newPaymentStatus =
    refundType === 'partial' && refundInr < paidInr ? 'partially_refunded' : 'refunded';

  await prisma.payment.update({
    where: { id: captured.id },
    data: {
      status: newPaymentStatus,
      refundAmount: refundInr,
      metadata: {
        ...((captured.metadata as Record<string, unknown>) ?? {}),
        refundId: refund.id,
        refundedAt: new Date().toISOString(),
        refundReason: reason,
        refundType,
        refundInitiatedBy: initiatedBy,
      },
    },
  });

  // Booking only flips to 'refunded' on full refund. For partial, keep
  // status as-is (likely cancelled) and let cancellationReason carry the
  // marker.
  const bookingDataPatch: Record<string, unknown> =
    refundType === 'full'
      ? {
          status: 'refunded',
          cancelledAt: booking.cancelledAt ?? new Date(),
          cancellationReason: `[refunded] ${reason}`.slice(0, 500),
        }
      : {
          cancellationReason: `[partially-refunded ${refundInr}] ${reason}`.slice(0, 500),
        };

  await prisma.pujaBooking.update({
    where: { id: bookingId },
    data: bookingDataPatch,
  });

  // Best-effort success email — never block on send failure.
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
      await sendEmail({ to: booking.user.email, subject, html, text });
    } catch {
      // swallow — email failure must not undo refund
    }
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
const REFUND_REQUESTED_MARKER = '[refund-requested]';

/**
 * Auto-process REFUND_REQUESTED bookings older than 1 hour. Wired into
 * runDailyOps in jobs/master-cron.ts. Idempotent — picks only bookings
 * still in 'cancelled' (status would already be 'refunded' if a prior tick
 * succeeded).
 */
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
  let candidates: Array<{ id: string; cancellationReason: string | null }>;
  try {
    candidates = await prisma.pujaBooking.findMany({
      where: {
        status: 'cancelled',
        cancellationReason: { startsWith: REFUND_REQUESTED_MARKER },
        cancelledAt: { lt: cutoff },
      },
      select: { id: true, cancellationReason: true },
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
      const r = await processRefund({
        bookingId: c.id,
        reason,
        refundType: 'full',
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
  REFUND_REQUESTED_MARKER,
};
