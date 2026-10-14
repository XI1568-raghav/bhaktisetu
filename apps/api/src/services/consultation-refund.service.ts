import { prisma } from '../lib/prisma.js';
import { MONEY_EVENTS, recordMoneyEvent } from '../lib/audit-money.js';
import { callRazorpayRefund } from './refund.service.js';

/**
 * Slice L: gateway refund for a cancelled, paid astrologer consultation.
 *
 * `astrologer_consultations` is a raw-SQL table with no Prisma model, so the refund state
 * lives in two additive nullable columns added by `ensureConsultationRefundColumns`:
 *   refund_status: NULL | 'sending' | 'failed' | 'refunded'
 *   refund_id:     the Razorpay refund id
 * 'sending' is a compare-and-set reservation taken BEFORE the gateway call, so two
 * concurrent cancels / admin retries cannot both send. A gateway failure sets 'failed'
 * (retryable). Rows paid before the columns exist, or with no payment id, fall back to
 * 'manual' (owed, ops pays it from the dashboard) exactly as before.
 *
 * Policy (unchanged, documented): a confirmed consultation is refunded in FULL if it is
 * cancelled at least 24h before its scheduled time (or, unscheduled, within 24h of paying);
 * after that nothing is owed. The caller decides eligibility; this only executes it.
 */

export type ConsultationRefundExecution = 'gateway' | 'retry' | 'manual' | 'none';

export interface ConsultationRefundRow {
  id: string;
  reference: string;
  amount_inr: string | number;
  currency?: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  paid_at: Date | null;
  refund_status?: string | null;
}

export async function ensureConsultationRefundColumns(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE astrologer_consultations ADD COLUMN IF NOT EXISTS refund_status TEXT, ADD COLUMN IF NOT EXISTS refund_id TEXT;`,
    );
  } catch {
    // tolerated: the refund then degrades to the manual fallback
  }
}

export async function refundConsultation(
  row: ConsultationRefundRow,
  actor: { type: 'devotee' | 'admin' | 'system'; id: string | null },
  note: string,
): Promise<{ execution: ConsultationRefundExecution; refundId?: string }> {
  // No money was taken (never paid) or no gateway payment id on file: nothing to send.
  if (!row.paid_at) return { execution: 'none' };
  if (!row.razorpay_payment_id) return { execution: 'manual' };
  const amount = Number(row.amount_inr);
  if (!(amount > 0)) return { execution: 'none' };
  if (row.refund_status === 'refunded') return { execution: 'gateway' };

  let reserved = 0;
  try {
    reserved = Number(
      await prisma.$executeRawUnsafe(
        `UPDATE astrologer_consultations SET refund_status = 'sending'
          WHERE id = $1::uuid AND (refund_status IS NULL OR refund_status = 'failed');`,
        row.id,
      ),
    );
  } catch {
    return { execution: 'manual' }; // columns not there yet
  }
  if (reserved !== 1) return { execution: 'gateway' }; // sent already, or another caller is sending it

  const refund = await callRazorpayRefund(row.razorpay_payment_id, Math.round(amount * 100), {
    consultationId: row.id,
    reference: row.reference,
    reason: note.slice(0, 250),
  });
  const base = {
    actorType: actor.type,
    actorId: actor.id,
    subjectType: 'consultation' as const,
    subjectId: row.id,
    amount,
    currency: row.currency ?? 'INR',
    gateway: 'razorpay',
    gatewayOrderId: row.razorpay_order_id,
    gatewayPaymentId: row.razorpay_payment_id,
  };
  if (refund.error || !refund.id) {
    await prisma
      .$executeRawUnsafe(
        `UPDATE astrologer_consultations SET refund_status = 'failed' WHERE id = $1::uuid;`,
        row.id,
      )
      .catch(() => undefined);
    await recordMoneyEvent({
      ...base,
      eventType: MONEY_EVENTS.REFUND_FAILED,
      note: refund.error?.description ?? 'gateway refused the refund',
      metadata: { rail: 'consultation-cancel', retryable: true },
    });
    return { execution: 'retry' };
  }
  await prisma
    .$executeRawUnsafe(
      `UPDATE astrologer_consultations SET refund_status = 'refunded', refund_id = $2 WHERE id = $1::uuid;`,
      row.id,
      refund.id,
    )
    .catch((err) => console.error('[consultation-refund] refund sent but row not updated', row.id, err));
  await recordMoneyEvent({
    ...base,
    eventType: MONEY_EVENTS.REFUND_COMPLETED,
    gatewayRefundId: refund.id,
    idempotencyKey: refund.id,
    note,
    metadata: { rail: 'consultation-cancel' },
  });
  return { execution: 'gateway', refundId: refund.id };
}
