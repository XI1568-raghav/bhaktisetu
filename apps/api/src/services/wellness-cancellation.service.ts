import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';
import { esc } from '../lib/html-escape.js';
import { MONEY_EVENTS, recordMoneyEvent } from '../lib/audit-money.js';
import { appendRefundId, callRazorpayRefund } from './refund.service.js';
import {
  DEFAULT_CANCEL_POLICY,
  DEVOTEE_CANCEL_CUTOFF_HOURS,
} from './cancellation.service.js';

/**
 * Wellness enrolment cancellation (QA 2026-10-13, slice G).
 *
 * Before this a devotee could not cancel an enrolment at all, and an instructor
 * who PATCHed a session to CANCELLED left every PAID enrolment paid, every
 * instructor commission PENDING and withdrawable, and nobody told.
 *
 * Refund execution (slice L): verify/webhook now link a captured Payment row to the
 * enrolment (lib/wellness-payment.ts), so the refund goes to the gateway through the same
 * callRazorpayRefund the bookings use. Enrolments paid before that have no payment id and
 * fall back to a RECORDED INTENT (REFUND_INITIATED, execution 'manual-intent'): ops pays
 * those from the Razorpay dashboard.
 *
 * Ledger rules (TASKS.md invariants): Commission.amount is the PROVIDER's earning.
 * Only unclaimed rows (PENDING, not inside a PayoutRequest) are touched; a row
 * that already left is flagged for manual review, never clawed back silently.
 * Full refund -> REVERSED. Partial refund of fraction f -> the instructor keeps
 * the share of what the platform retained: amount * (1 - f).
 */

export type WellnessCancelActor = 'devotee' | 'admin' | 'provider';

export interface WellnessCancelResult {
  outcome: 'cancelled' | 'already' | 'blocked';
  enrollmentId: string;
  status: string;
  refundOwedInr: number;
  refundFraction: number;
  tierLabel: string;
  commissionReversed: number;
  commissionReduced: number;
  ledgerManualReview: number;
  /**
   * How the refund was (or will be) paid: 'gateway' = sent to Razorpay now, 'retry' = the
   * gateway refused and the SAME cancel call can be repeated safely, 'manual' = no payment
   * id on file (old enrolment), ops pays it out, 'none' = nothing owed.
   */
  refundExecution?: 'gateway' | 'retry' | 'manual' | 'none';
  refundId?: string;
  blockedReason?: string;
  blockedCode?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Same ladder the puja bookings use (DEFAULT_CANCEL_POLICY), measured from the class start. */
export function wellnessRefundTier(hoursUntil: number): { fraction: number; label: string } {
  const tier =
    DEFAULT_CANCEL_POLICY.tiers.find((t) => hoursUntil >= t.minHoursBefore) ??
    DEFAULT_CANCEL_POLICY.tiers[DEFAULT_CANCEL_POLICY.tiers.length - 1]!;
  return { fraction: tier.refundFraction, label: tier.label };
}

interface EnrollmentRow {
  id: string;
  userId: string;
  status: string;
  razorpayOrderId: string | null;
  paymentId?: string | null;
  session: {
    id: string;
    title: string;
    scheduledAt: Date;
    priceInr: unknown;
    status: string;
    instructorId: string;
  };
  user: { fullName: string | null; email: string | null };
}

/** A reservation with no refund id older than this is treated as a crashed caller and re-sent. */
export const WELLNESS_REFUND_STALE_MS = 10 * 60_000;

/** The audit write must never strand or fail a refund that has already moved money. */
async function safeAudit(ev: Parameters<typeof recordMoneyEvent>[0]) {
  try {
    await recordMoneyEvent(ev);
  } catch (err) {
    console.error('[wellness-refund] audit write failed (refund flow continues)', err);
  }
}

type RefundExecution = NonNullable<WellnessCancelResult['refundExecution']>;

/**
 * Pay `owedInr` back through the gateway against the Payment linked to the enrolment.
 * Idempotent: `Payment.refundAmount` is the CUMULATIVE total refunded and is RESERVED with a
 * compare-and-set before the gateway call, so two concurrent callers cannot both send it, and
 * a repeat after success finds nothing left to refund. A gateway failure releases the
 * reservation and leaves `metadata.wellnessRefundOwedInr` so the cancel can be repeated.
 */
export async function executeWellnessRefund(opts: {
  enrollmentId: string;
  paymentId: string | null | undefined;
  owedInr: number;
  actorType: 'devotee' | 'admin' | 'provider' | 'system';
  actorId: string | null;
  note: string;
}): Promise<{ execution: RefundExecution; refundId?: string; refundedInr: number }> {
  if (!(opts.owedInr > 0)) return { execution: 'none', refundedInr: 0 };
  if (!opts.paymentId) return { execution: 'manual', refundedInr: 0 };
  let payment;
  try {
    payment = await prisma.payment.findUnique({ where: { id: opts.paymentId } });
  } catch {
    return { execution: 'manual', refundedInr: 0 };
  }
  if (!payment || !payment.gatewayPaymentId) return { execution: 'manual', refundedInr: 0 };

  const paid = Number(payment.amount);
  const prior = payment.refundAmount != null ? Number(payment.refundAmount) : null;
  const priorN = prior ?? 0;
  const meta = (payment.metadata as Record<string, unknown> | null) ?? {};
  // In-flight reservation marker: written in the SAME compare-and-set as the refundAmount bump, so a
  // crash between the reservation and the gateway call leaves evidence a later retry can act on.
  const inflight = meta.wellnessRefundInflight as { amount?: number; at?: string; refundId?: string } | null | undefined;
  const inflightAmt = inflight && Number(inflight.amount) > 0 ? round2(Number(inflight.amount)) : 0;
  let baseline = prior; // value refundAmount returns to if the gateway refuses
  let remaining: number;
  if (inflightAmt > 0) {
    const ageMs = Date.now() - (inflight?.at ? Date.parse(inflight.at) : 0);
    // Fresh reservation (another caller is mid-call) or one that already has a refund id: never re-send.
    if (inflight?.refundId || !(ageMs > WELLNESS_REFUND_STALE_MS)) return { execution: 'retry', refundedInr: 0 };
    baseline = round2(priorN - inflightAmt) > 0 ? round2(priorN - inflightAmt) : null;
    remaining = inflightAmt;
  } else {
    // What this enrolment's cancellation still has to send: the owed figure minus whatever the
    // gateway already returned, never more than the capture still holds.
    remaining = round2(Math.min(opts.owedInr - priorN, paid - priorN));
    if (remaining <= 0) return { execution: 'gateway', refundedInr: 0 };
  }
  const reservedTotal = inflightAmt > 0 ? priorN : round2(priorN + remaining);

  const reserved = await prisma.payment.updateMany({
    where: { id: payment.id, refundAmount: prior },
    data: {
      refundAmount: reservedTotal,
      metadata: {
        ...meta,
        wellnessRefundInflight: { amount: remaining, at: new Date().toISOString() },
      } as never,
    },
  });
  if (reserved.count !== 1) return { execution: 'gateway', refundedInr: 0 }; // another caller owns it

  const refund = await callRazorpayRefund(payment.gatewayPaymentId, Math.round(remaining * 100), {
    wellnessEnrollmentId: opts.enrollmentId,
    reason: opts.note.slice(0, 250),
  });
  if (refund.error || !refund.id) {
    await prisma.payment
      .updateMany({
        where: { id: payment.id, refundAmount: reservedTotal },
        data: {
          refundAmount: baseline,
          metadata: {
            ...meta,
            wellnessRefundInflight: null,
            wellnessRefundOwedInr: opts.owedInr,
            refundFailureReason: refund.error?.description ?? 'gateway refused the refund',
            refundFailedAt: new Date().toISOString(),
          } as never,
        },
      })
      .catch(() => undefined);
    await safeAudit({
      eventType: MONEY_EVENTS.REFUND_FAILED,
      actorType: opts.actorType === 'system' ? 'system' : opts.actorType,
      actorId: opts.actorId,
      subjectType: 'wellness_enrollment',
      subjectId: opts.enrollmentId,
      paymentId: payment.id,
      amount: remaining,
      currency: 'INR',
      gateway: 'razorpay',
      gatewayPaymentId: payment.gatewayPaymentId,
      note: refund.error?.description ?? 'gateway refused the refund',
      metadata: { rail: 'wellness-cancel', retryable: true },
    });
    return { execution: 'retry', refundedInr: 0 };
  }

  const total = reservedTotal;
  await prisma.payment
    .update({
      where: { id: payment.id },
      data: {
        status: total >= paid ? 'refunded' : 'partially_refunded',
        refundAmount: total,
        metadata: {
          ...meta,
          wellnessRefundOwedInr: null,
          wellnessRefundInflight: null,
          refundId: refund.id,
          refundIds: appendRefundId(meta, refund.id),
          refundedAt: new Date().toISOString(),
          refundReason: opts.note.slice(0, 250),
        } as never,
      },
    })
    .catch((err) => console.error('[wellness-refund] refund sent but payment row not updated', payment.id, err));
  await safeAudit({
    eventType: MONEY_EVENTS.REFUND_COMPLETED,
    actorType: opts.actorType,
    actorId: opts.actorId,
    subjectType: 'wellness_enrollment',
    subjectId: opts.enrollmentId,
    paymentId: payment.id,
    amount: remaining,
    currency: 'INR',
    gateway: 'razorpay',
    gatewayPaymentId: payment.gatewayPaymentId,
    gatewayRefundId: refund.id,
    idempotencyKey: refund.id,
    note: opts.note,
    metadata: { rail: 'wellness-cancel', cumulativeRefundedInr: total },
  });
  return { execution: 'gateway', refundId: refund.id, refundedInr: remaining };
}

/**
 * Retry a refund the gateway refused earlier (the enrolment is already CANCELLED). Safe to
 * call repeatedly; does nothing unless a failed refund left `wellnessRefundOwedInr` behind.
 */
async function retryPendingRefund(row: EnrollmentRow, actorType: WellnessCancelActor, actorId: string | null) {
  if (!row.paymentId) return null;
  const payment = await prisma.payment.findUnique({ where: { id: row.paymentId } }).catch(() => null);
  const pm = payment?.metadata as { wellnessRefundOwedInr?: unknown; wellnessRefundInflight?: { amount?: unknown } | null } | null;
  const owed = Number(pm?.wellnessRefundOwedInr ?? 0) || Number(pm?.wellnessRefundInflight?.amount ?? 0);
  if (!payment || !(owed > 0)) return null;
  return executeWellnessRefund({
    enrollmentId: row.id,
    paymentId: row.paymentId,
    owedInr: owed,
    actorType,
    actorId,
    note: 'wellness refund retry',
  });
}

async function loadEnrollment(enrollmentId: string): Promise<EnrollmentRow | null> {
  return (await prisma.wellnessEnrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      userId: true,
      status: true,
      razorpayOrderId: true,
      paymentId: true,
      session: {
        select: { id: true, title: true, scheduledAt: true, priceInr: true, status: true, instructorId: true },
      },
      user: { select: { fullName: true, email: true } },
    },
  })) as EnrollmentRow | null;
}

/**
 * Cancel one enrolment. `instructorFault` (session cancelled by the instructor /
 * admin) forces a full refund and skips the devotee's 24h cutoff.
 */
export async function cancelWellnessEnrollment(opts: {
  enrollmentId: string;
  actorType: WellnessCancelActor;
  actorId: string | null;
  instructorFault?: boolean;
  reason?: string;
  now?: Date;
}): Promise<WellnessCancelResult | null> {
  const row = await loadEnrollment(opts.enrollmentId);
  if (!row) return null;
  const now = opts.now ?? new Date();
  const price = Number(row.session.priceInr);
  const base: WellnessCancelResult = {
    outcome: 'cancelled',
    enrollmentId: row.id,
    status: row.status,
    refundOwedInr: 0,
    refundFraction: 0,
    tierLabel: '',
    commissionReversed: 0,
    commissionReduced: 0,
    ledgerManualReview: 0,
  };

  if (row.status === 'CANCELLED' || row.status === 'REFUNDED') {
    const retried = await retryPendingRefund(row, opts.actorType, opts.actorId).catch(() => null);
    return {
      ...base,
      outcome: 'already',
      tierLabel: 'Already cancelled',
      ...(retried ? { refundExecution: retried.execution, refundId: retried.refundId } : {}),
    };
  }
  if (row.status === 'ATTENDED') {
    return {
      ...base,
      outcome: 'blocked',
      blockedCode: 'already_attended',
      blockedReason: 'This class has already been attended and can no longer be cancelled.',
    };
  }

  const wasPaid = row.status === 'PAID';
  const hoursUntil = (row.session.scheduledAt.getTime() - now.getTime()) / 3_600_000;
  let fraction = 0;
  let tierLabel = 'Nothing was charged, so there is nothing to refund';
  if (wasPaid && price > 0) {
    if (opts.instructorFault) {
      fraction = 1;
      tierLabel = 'Full refund (class cancelled by the instructor)';
    } else {
      // Business rule #5: devotee cancellation only up to 24h before the start.
      if (hoursUntil < DEVOTEE_CANCEL_CUTOFF_HOURS) {
        return {
          ...base,
          outcome: 'blocked',
          blockedCode: 'cancellation_window_closed',
          blockedReason: `Paid classes can be cancelled up to ${DEVOTEE_CANCEL_CUTOFF_HOURS} hours before they start.`,
        };
      }
      const t = wellnessRefundTier(hoursUntil);
      fraction = t.fraction;
      tierLabel = t.label;
    }
  }
  const refundOwedInr = wasPaid && price > 0 ? round2(price * fraction) : 0;
  const reason = (opts.reason ?? '').trim().slice(0, 200);
  const cause = opts.instructorFault ? 'class cancelled' : `cancelled by ${opts.actorType}`;
  const note = `wellness enrolment ${cause}${reason ? `: ${reason}` : ''}`;

  let reversed = 0;
  let reduced = 0;
  let settled = 0;
  const claimed = await prisma.$transaction(async (tx) => {
    // Single-winner claim: a double click / retry / racing session-cancel sweep
    // moves the row once and every later caller sees count 0.
    const c = await tx.wellnessEnrollment.updateMany({
      where: { id: row.id, status: row.status as 'PENDING_PAYMENT' | 'PAID' },
      data: { status: 'CANCELLED' },
    });
    if (c.count !== 1) return false;
    if (wasPaid) {
      const commissions = await tx.commission.findMany({
        where: { wellnessEnrollmentId: row.id },
        select: { id: true, amount: true, status: true, payoutRequestId: true },
        take: 10,
      });
      for (const c2 of commissions) {
        if (c2.status !== 'PENDING' || c2.payoutRequestId) {
          if (c2.status !== 'REVERSED') settled += 1;
          continue;
        }
        if (fraction >= 1) {
          await tx.commission.update({ where: { id: c2.id }, data: { status: 'REVERSED' } });
          reversed += 1;
        } else if (fraction > 0) {
          const kept = round2(Number(c2.amount) * (1 - fraction));
          await tx.commission.update({ where: { id: c2.id }, data: { amount: kept } });
          reduced += 1;
        }
      }
    }
    return true;
  });
  if (!claimed) {
    return { ...base, outcome: 'already', tierLabel: 'Already cancelled' };
  }

  // Audit AFTER commit (lib/audit-money contract). Neither call can throw. The key carries the
  // gateway order id because a cancelled enrolment re-uses its row when the devotee enrols
  // again, so the row id alone would swallow the second cancellation's trail.
  const auditKey = `${row.id}:${row.razorpayOrderId ?? 'noorder'}`;
  if (wasPaid && price > 0) {
    await recordMoneyEvent({
      eventType: MONEY_EVENTS.REFUND_INITIATED,
      actorType: opts.actorType === 'admin' ? 'admin' : opts.actorType === 'provider' ? 'provider' : 'devotee',
      actorId: opts.actorId,
      subjectType: 'wellness_enrollment',
      subjectId: row.id,
      amount: refundOwedInr,
      currency: 'INR',
      gateway: 'razorpay',
      gatewayOrderId: row.razorpayOrderId,
      statusBefore: row.status,
      statusAfter: 'CANCELLED',
      idempotencyKey: auditKey,
      note: `${note} - ${tierLabel}`,
      metadata: {
        rail: 'wellness-cancel',
        execution: row.paymentId ? 'gateway' : 'manual-intent',
        sessionId: row.session.id,
        fraction,
        priceInr: price,
        instructorFault: !!opts.instructorFault,
      },
    });
    if (reversed + reduced + settled > 0) {
      await recordMoneyEvent({
        eventType: MONEY_EVENTS.COMMISSION_REVERSED,
        actorType: 'system',
        actorId: opts.actorId,
        subjectType: 'wellness_enrollment',
        subjectId: row.id,
        amount: refundOwedInr,
        currency: 'INR',
        statusAfter: settled > 0 && reversed + reduced === 0 ? 'blocked' : fraction >= 1 ? 'reversed' : 'reduced',
        idempotencyKey: auditKey,
        note,
        metadata: {
          rail: 'wellness-cancel',
          reversed,
          reduced,
          alreadySettled: settled,
        },
      });
    }
    if (settled > 0) {
      console.error(
        JSON.stringify({
          event: 'wellness_ledger_manual_review',
          enrollmentId: row.id,
          alreadySettled: settled,
          refundOwedInr,
        }),
      );
    }
  }

  let refundExecution: RefundExecution = 'none';
  let refundId: string | undefined;
  if (wasPaid && price > 0 && refundOwedInr > 0) {
    try {
      const ex = await executeWellnessRefund({
        enrollmentId: row.id,
        paymentId: row.paymentId,
        owedInr: refundOwedInr,
        actorType: opts.actorType,
        actorId: opts.actorId,
        note: `${note} - ${tierLabel}`,
      });
      refundExecution = ex.execution;
      refundId = ex.refundId;
    } catch (err) {
      refundExecution = 'retry';
      console.error('[wellness-refund] unexpected failure', row.id, err);
    }
  }

  void notifyCancelled(row, refundOwedInr, tierLabel, !!opts.instructorFault).catch(() => undefined);

  return {
    outcome: 'cancelled',
    enrollmentId: row.id,
    status: 'CANCELLED',
    refundOwedInr,
    refundFraction: fraction,
    tierLabel,
    commissionReversed: reversed,
    commissionReduced: reduced,
    ledgerManualReview: settled,
    refundExecution,
    ...(refundId ? { refundId } : {}),
  };
}

async function notifyCancelled(
  row: EnrollmentRow,
  refundOwedInr: number,
  tierLabel: string,
  instructorFault: boolean,
): Promise<void> {
  try {
    const { notifyUser } = await import('../routes/notifications.js');
    await notifyUser(
      row.userId,
      {
        title: instructorFault ? 'Class cancelled' : 'Enrolment cancelled',
        body: refundOwedInr > 0
          ? `${row.session.title}: Rs ${refundOwedInr} will be refunded to your original payment method.`
          : `${row.session.title}: your enrolment is cancelled.`,
        url: '/wellness/my-classes',
      },
      { event: 'wellness_cancelled' },
    );
  } catch {
    // best effort
  }
  if (!row.user.email) return;
  try {
    const refundLine = refundOwedInr > 0
      ? `A refund of Rs ${refundOwedInr} (${tierLabel}) will reach your original payment method in 5-7 business days.`
      : 'Nothing was charged for this enrolment.';
    const lead = instructorFault
      ? `The class <strong>${esc(row.session.title)}</strong> has been cancelled by the instructor.`
      : `Your enrolment in <strong>${esc(row.session.title)}</strong> has been cancelled.`;
    await sendEmail({
      to: row.user.email,
      subject: `${instructorFault ? 'Class cancelled' : 'Enrolment cancelled'}: ${row.session.title}`,
      html: `<p>Namaste ${esc(row.user.fullName ?? 'Devotee')},</p><p>${lead}</p><p>${esc(refundLine)}</p>`,
      text: `${instructorFault ? 'The class' : 'Your enrolment in'} ${row.session.title} has been cancelled. ${refundLine}`,
    });
  } catch {
    // best effort
  }
}

/**
 * The session was cancelled: every unpaid enrolment is released and every paid one
 * is fully refunded (intent) with the instructor's earning reversed. Safe to call
 * repeatedly - settled enrolments are skipped.
 */
export async function cancelWellnessSessionEnrollments(opts: {
  sessionId: string;
  actorType: WellnessCancelActor;
  actorId: string | null;
}): Promise<{ released: number; refunded: number; refundOwedInr: number; ledgerManualReview: number }> {
  const rows = await prisma.wellnessEnrollment.findMany({
    where: { sessionId: opts.sessionId, status: { in: ['PENDING_PAYMENT', 'PAID'] } },
    select: { id: true, status: true },
    take: 5000,
  });
  let released = 0;
  let refunded = 0;
  let refundOwedInr = 0;
  let ledgerManualReview = 0;
  for (const r of rows ?? []) {
    try {
      const res = await cancelWellnessEnrollment({
        enrollmentId: r.id,
        actorType: opts.actorType,
        actorId: opts.actorId,
        instructorFault: true,
        reason: 'session cancelled',
      });
      if (!res || res.outcome !== 'cancelled') continue;
      if (r.status === 'PAID') {
        refunded += 1;
        refundOwedInr = round2(refundOwedInr + res.refundOwedInr);
      } else {
        released += 1;
      }
      ledgerManualReview += res.ledgerManualReview;
    } catch (err) {
      console.error('[wellness-cancel] enrolment sweep failed', r.id, err);
    }
  }
  return { released, refunded, refundOwedInr, ledgerManualReview };
}
