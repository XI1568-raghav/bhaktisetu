import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';
import { esc } from '../lib/html-escape.js';
import { MONEY_EVENTS, recordMoneyEvent } from '../lib/audit-money.js';
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
 * Refund execution is a RECORDED INTENT, not a gateway call: a wellness
 * enrolment stores only its Razorpay ORDER id (no payment id, no Payment row),
 * so there is nothing to POST a refund against. The obligation is written to the
 * money audit trail (REFUND_INITIATED) and the response, exactly like the
 * astrologer-consultation cancel; ops pays it out from the Razorpay dashboard.
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

async function loadEnrollment(enrollmentId: string): Promise<EnrollmentRow | null> {
  return (await prisma.wellnessEnrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true,
      userId: true,
      status: true,
      razorpayOrderId: true,
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
    return { ...base, outcome: 'already', tierLabel: 'Already cancelled' };
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
        execution: 'manual-intent',
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
