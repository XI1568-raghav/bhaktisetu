import { Prisma } from '@prisma/client';
import { settleBounded } from '../lib/background.js';
import { prisma } from '../lib/prisma.js';
import { sendEmail, orderCancelledEmail } from '../lib/email.js';
import { esc } from '../lib/html-escape.js';
import { MONEY_EVENTS, recordMoneyEvent } from '../lib/audit-money.js';
import { appendRefundId, callRazorpayRefund } from './refund.service.js';

/**
 * Store-order cancel + refund (QA 2026-10-13, slice G).
 *
 * Customer cancel (before the parcel ships) restocks, reverses the owner's PENDING
 * commission and, if the order was paid online, queues a refund request. The money
 * only moves when an ADMIN approves it (mirrors admin-bookings): the approval calls
 * the gateway through the same `callRazorpayRefund` the puja rail uses (a local
 * stand-in under demo keys), updates Payment cumulatively, flips the order to
 * REFUNDED and writes the money-audit rows. A double approval is a no-op.
 *
 * Only FULL refunds are supported for store orders. Partial refunds would need a
 * proportional owner-earning unwind (`reduceBookingLedgerForPartialRefund` is
 * booking-only) and are not offered rather than half-done.
 */

type Tx = Prisma.TransactionClient;

export const STORE_CUSTOMER_CANCELLABLE = ['PENDING', 'CONFIRMED', 'PROCESSING'] as const;
export const REFUND_REQUESTED_NOTE = '[refund-requested]';
export const REFUND_REJECTED_NOTE = '[refund-rejected]';

const round2 = (n: number) => Math.round(n * 100) / 100;

interface OrderLike {
  id: string;
  items: unknown;
}

/**
 * The shared effects of an order that will not be fulfilled: the owner's earning
 * stops being withdrawable and, for a CANCELLED order, the units go back on the
 * shelf. Used by PATCH /orders/:id/status and by the customer cancel below.
 * Returns how many unclaimed commission rows were reversed.
 */
export async function releaseOrderHolds(
  tx: Tx,
  order: OrderLike,
  toStatus: 'CANCELLED' | 'REFUNDED',
): Promise<number> {
  const rev = await tx.commission.updateMany({
    where: { storeOrderId: order.id, status: 'PENDING' },
    data: { status: 'REVERSED' },
  });
  if (toStatus === 'CANCELLED') {
    const lines = Array.isArray(order.items) ? (order.items as any[]) : [];
    const qtyByProduct = new Map<string, number>();
    for (const it of lines) {
      if (typeof it?.productId !== 'string') continue;
      qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) ?? 0) + Number(it.qty ?? 0));
    }
    for (const [productId, qty] of qtyByProduct) {
      if (qty > 0) {
        await tx.storeProduct.updateMany({
          where: { id: productId, deletedAt: null },
          data: { stock: { increment: qty } },
        });
      }
    }
  }
  return rev?.count ?? 0;
}

function historyOf(order: { statusHistory?: unknown }): Prisma.InputJsonValue[] {
  return Array.isArray(order.statusHistory) ? (order.statusHistory as Prisma.InputJsonValue[]) : [];
}

async function capturedPayment(paymentId: string | null | undefined) {
  if (!paymentId) return null;
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p) return null;
  return p.status === 'captured' || p.status === 'partially_refunded' ? p : null;
}

export interface StoreCancelResult {
  outcome: 'cancelled' | 'already' | 'blocked';
  status: string;
  paid: boolean;
  refundOwedInr: number;
  commissionReversed: number;
  blockedReason?: string;
}

export async function customerCancelStoreOrder(opts: {
  orderId: string;
  userId: string;
  reason?: string;
}): Promise<StoreCancelResult | null> {
  const order = await prisma.storeOrder.findUnique({ where: { id: opts.orderId } });
  if (!order) return null;
  const total = Number(order.totalAmountInr);
  const payment = await capturedPayment(order.paymentId);
  const paid = !!payment;

  if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
    return { outcome: 'already', status: order.status, paid, refundOwedInr: 0, commissionReversed: 0 };
  }
  if (!(STORE_CUSTOMER_CANCELLABLE as readonly string[]).includes(order.status)) {
    return {
      outcome: 'blocked',
      status: order.status,
      paid,
      refundOwedInr: 0,
      commissionReversed: 0,
      blockedReason:
        order.status === 'DELIVERED'
          ? 'This order has been delivered. Please contact support to arrange a return.'
          : 'This order has already shipped and can no longer be cancelled.',
    };
  }

  const reason = (opts.reason ?? '').trim().slice(0, 200);
  const entry = {
    status: 'CANCELLED',
    changedAt: new Date().toISOString(),
    changedBy: opts.userId,
    note: `Cancelled by customer${reason ? `: ${reason}` : ''}${paid ? ` ${REFUND_REQUESTED_NOTE}` : ''}`,
  };
  let reversed = 0;
  const won = await prisma.$transaction(async (tx) => {
    // Single-winner claim on the status the row had: a racing admin ship / second
    // cancel moves it once.
    const c = await tx.storeOrder.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: 'CANCELLED', statusHistory: [...historyOf(order), entry] as Prisma.InputJsonValue[] },
    });
    if (c.count !== 1) return false;
    reversed = await releaseOrderHolds(tx, order, 'CANCELLED');
    return true;
  });
  if (!won) {
    const fresh = await prisma.storeOrder.findUnique({ where: { id: order.id }, select: { status: true } });
    if (fresh?.status === 'CANCELLED' || fresh?.status === 'REFUNDED') {
      return { outcome: 'already', status: fresh.status, paid, refundOwedInr: 0, commissionReversed: 0 };
    }
    return {
      outcome: 'blocked',
      status: fresh?.status ?? order.status,
      paid,
      refundOwedInr: 0,
      commissionReversed: 0,
      blockedReason: 'This order has already shipped and can no longer be cancelled.',
    };
  }

  if (paid) {
    await recordMoneyEvent({
      eventType: MONEY_EVENTS.REFUND_INITIATED,
      actorType: 'devotee',
      actorId: opts.userId,
      subjectType: 'store_order',
      subjectId: order.id,
      paymentId: payment!.id,
      amount: total,
      currency: payment!.currency,
      gateway: 'razorpay',
      gatewayPaymentId: payment!.gatewayPaymentId,
      statusBefore: order.status,
      statusAfter: 'CANCELLED',
      idempotencyKey: `cancel:${order.id}`,
      note: `store order ${order.orderNumber} cancelled by customer before shipping; refund awaits admin approval`,
      metadata: { rail: 'store-cancel', execution: 'pending-admin-approval' },
    }).catch(() => undefined);
  }
  if (reversed > 0) {
    await recordMoneyEvent({
      eventType: MONEY_EVENTS.COMMISSION_REVERSED,
      actorType: 'devotee',
      actorId: opts.userId,
      subjectType: 'store_order',
      subjectId: order.id,
      amount: total,
      currency: 'INR',
      statusAfter: 'reversed',
      idempotencyKey: `cancel:${order.id}`,
      note: `owner earning reversed (store order ${order.orderNumber} cancelled)`,
      metadata: { rail: 'store-cancel', reversed },
    }).catch(() => undefined);
  }
  // Slice L: tell the customer (best effort, html-escaped template, no internal ids).
  await settleBounded((async () => {
    const u = await prisma.user.findUnique({
      where: { id: order.userId },
      select: { email: true, fullName: true },
    });
    if (!u?.email) return;
    await sendEmail({
      to: u.email,
      ...orderCancelledEmail({
        customerName: u.fullName ?? 'Devotee',
        orderNumber: order.orderNumber,
        refundOwedInr: paid ? total : 0,
      }),
    });
  })(), 'store-cancel-email');
  return {
    outcome: 'cancelled',
    status: 'CANCELLED',
    paid,
    refundOwedInr: paid ? total : 0,
    commissionReversed: reversed,
  };
}

export interface StoreRefundResult {
  ok: boolean;
  httpStatus: number;
  skipped?: boolean;
  code?: string;
  error?: string;
  refundId?: string;
  amountInr?: number;
  status?: string;
  commissionReversed?: number;
  ledgerManualReview?: number;
}

/**
 * Admin approval of a refund for a PAID store order.
 * mode 'policy' (the default): owes the full price only when the order was cancelled
 * before shipping; any other state needs the admin to say `full` explicitly.
 */
export async function refundStoreOrder(opts: {
  orderId: string;
  adminId: string;
  mode: 'policy' | 'full';
  reason?: string;
}): Promise<StoreRefundResult | null> {
  const order = await prisma.storeOrder.findUnique({
    where: { id: opts.orderId },
    include: { user: { select: { fullName: true, email: true } } },
  });
  if (!order) return null;

  if (order.status === 'REFUNDED') {
    return { ok: true, httpStatus: 200, skipped: true, code: 'already_refunded', status: 'REFUNDED' };
  }
  if (opts.mode === 'policy' && order.status !== 'CANCELLED') {
    return {
      ok: false,
      httpStatus: 409,
      code: 'order_not_cancelled',
      error:
        'This order was not cancelled, so the policy owes no refund. Choose refundType "full" to refund it explicitly.',
    };
  }
  const payment = await capturedPayment(order.paymentId);
  if (!payment) {
    return {
      ok: false,
      httpStatus: 409,
      code: 'no_captured_payment',
      error: 'No captured online payment is linked to this order, so there is nothing to refund through the gateway.',
    };
  }
  if (!payment.gatewayPaymentId) {
    return { ok: false, httpStatus: 409, code: 'payment_missing_gateway_id', error: 'Captured payment is missing its gateway payment id.' };
  }
  const paidInr = Number(payment.amount);
  const alreadyInr = payment.refundAmount != null ? Number(payment.refundAmount) : 0;
  const refundableInr = round2(Math.max(0, paidInr - alreadyInr));
  if (refundableInr <= 0) {
    return { ok: true, httpStatus: 200, skipped: true, code: 'payment_already_refunded', status: order.status };
  }
  const reason = (opts.reason ?? 'Admin-approved store refund').slice(0, 250);

  const refund = await callRazorpayRefund(payment.gatewayPaymentId, Math.round(refundableInr * 100), {
    storeOrderId: order.id,
    orderNumber: order.orderNumber,
    reason,
    initiatedBy: opts.adminId.slice(0, 80),
  });
  if (refund.error || !refund.id) {
    const failure = refund.error?.description ?? 'The payment gateway rejected this refund.';
    try {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          metadata: {
            ...((payment.metadata as Record<string, unknown>) ?? {}),
            refundFailureReason: failure,
            refundFailedAt: new Date().toISOString(),
          },
        },
      });
    } catch {
      // best effort
    }
    await recordMoneyEvent({
      eventType: MONEY_EVENTS.REFUND_FAILED,
      actorType: 'admin',
      actorId: opts.adminId,
      subjectType: 'store_order',
      subjectId: order.id,
      paymentId: payment.id,
      amount: refundableInr,
      currency: payment.currency,
      gateway: 'razorpay',
      gatewayPaymentId: payment.gatewayPaymentId,
      statusBefore: payment.status,
      statusAfter: payment.status,
      note: failure,
      metadata: { rail: 'store-refund' },
    }).catch(() => undefined);
    return { ok: false, httpStatus: 502, code: 'gateway_failed', error: failure };
  }

  const entry = {
    status: 'REFUNDED',
    changedAt: new Date().toISOString(),
    changedBy: opts.adminId,
    note: `Refunded Rs ${refundableInr}: ${reason}`.slice(0, 500),
  };
  let reversed = 0;
  let settled = 0;
  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'refunded',
        refundAmount: round2(alreadyInr + refundableInr),
        metadata: {
          ...((payment.metadata as Record<string, unknown>) ?? {}),
          refundIds: appendRefundId(payment.metadata, refund.id),
          refundedAt: new Date().toISOString(),
          refundReason: reason,
          refundInitiatedBy: opts.adminId,
        },
      },
    });
    await tx.storeOrder.update({
      where: { id: order.id },
      data: { status: 'REFUNDED', statusHistory: [...historyOf(order), entry] as Prisma.InputJsonValue[] },
    });
    // Only unclaimed rows; a commission already paid out / in a payout request is
    // flagged, never clawed back silently. (Stock was returned at cancel time for a
    // cancelled order; a shipped/delivered order's goods come back by hand.)
    reversed = await releaseOrderHolds(tx, order, 'REFUNDED');
    settled = await tx.commission.count({
      where: { storeOrderId: order.id, OR: [{ status: 'PAID' }, { payoutRequestId: { not: null } }] },
    });
  });

  await recordMoneyEvent({
    eventType: MONEY_EVENTS.REFUND_COMPLETED,
    actorType: 'admin',
    actorId: opts.adminId,
    subjectType: 'store_order',
    subjectId: order.id,
    paymentId: payment.id,
    amount: refundableInr,
    currency: payment.currency,
    gateway: 'razorpay',
    gatewayPaymentId: payment.gatewayPaymentId,
    gatewayRefundId: refund.id,
    statusBefore: payment.status,
    statusAfter: 'refunded',
    idempotencyKey: refund.id,
    note: reason,
    metadata: { rail: 'store-refund', mode: opts.mode, orderStatusBefore: order.status },
  }).catch(() => undefined);
  if (reversed > 0 || settled > 0) {
    await recordMoneyEvent({
      eventType: MONEY_EVENTS.COMMISSION_REVERSED,
      actorType: 'admin',
      actorId: opts.adminId,
      subjectType: 'store_order',
      subjectId: order.id,
      paymentId: payment.id,
      amount: refundableInr,
      currency: payment.currency,
      statusAfter: reversed > 0 ? 'reversed' : 'blocked',
      idempotencyKey: refund.id,
      note: 'owner earning reversed by store refund',
      metadata: { rail: 'store-refund', reversed, alreadySettled: settled },
    }).catch(() => undefined);
  }
  if (settled > 0) {
    console.error(JSON.stringify({ event: 'store_ledger_manual_review', storeOrderId: order.id, alreadySettled: settled }));
  }

  if (order.user?.email) {
    await settleBounded(sendEmail({
      to: order.user.email,
      subject: `Refund processed for order ${order.orderNumber}`,
      html: `<p>Namaste ${esc(order.user.fullName ?? 'Devotee')},</p><p>A refund of <strong>Rs ${refundableInr}</strong> for order <strong>${esc(order.orderNumber)}</strong> has been processed to your original payment method (5-7 business days). Reference: ${esc(refund.id)}.</p>`,
      text: `A refund of Rs ${refundableInr} for order ${order.orderNumber} has been processed (5-7 business days). Reference: ${refund.id}.`,
    }), 'store-refund-email');
  }

  return {
    ok: true,
    httpStatus: 200,
    refundId: refund.id,
    amountInr: refundableInr,
    status: 'REFUNDED',
    commissionReversed: reversed,
    ledgerManualReview: settled,
  };
}

export async function rejectStoreOrderRefund(opts: {
  orderId: string;
  adminId: string;
  reason: string;
}): Promise<{ httpStatus: number; error?: string; code?: string; ok?: boolean } | null> {
  const order = await prisma.storeOrder.findUnique({ where: { id: opts.orderId } });
  if (!order) return null;
  if (order.status === 'REFUNDED') {
    return { httpStatus: 409, code: 'already_refunded', error: 'This order has already been refunded.' };
  }
  const payment = await capturedPayment(order.paymentId);
  if (!payment) {
    return { httpStatus: 409, code: 'no_captured_payment', error: 'There is no captured payment to refuse a refund on.' };
  }
  const entry = {
    status: order.status,
    changedAt: new Date().toISOString(),
    changedBy: opts.adminId,
    note: `${REFUND_REJECTED_NOTE} ${opts.reason}`.slice(0, 500),
  };
  await prisma.storeOrder.update({
    where: { id: order.id },
    data: { statusHistory: [...historyOf(order), entry] as Prisma.InputJsonValue[] },
  });
  try {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        metadata: {
          ...((payment.metadata as Record<string, unknown>) ?? {}),
          refundRejectedReason: opts.reason,
          refundRejectedAt: new Date().toISOString(),
          refundRejectedBy: opts.adminId,
        },
      },
    });
  } catch {
    // best effort
  }
  return { httpStatus: 200, ok: true };
}

/** Cancelled store orders with a captured, not-yet-refunded payment, minus rejected ones. */
export async function listPendingStoreRefunds() {
  const rows = await prisma.storeOrder.findMany({
    where: { status: 'CANCELLED', payment: { status: { in: ['captured', 'partially_refunded'] } } },
    orderBy: { updatedAt: 'desc' },
    take: 200,
    include: {
      user: { select: { fullName: true, phone: true } },
      payment: { select: { id: true, status: true, amount: true, refundAmount: true } },
    },
  });
  return rows.filter((o) => {
    const h = historyOf(o) as Array<{ note?: unknown }>;
    const last = h[h.length - 1];
    return !(typeof last?.note === 'string' && last.note.startsWith(REFUND_REJECTED_NOTE));
  });
}
