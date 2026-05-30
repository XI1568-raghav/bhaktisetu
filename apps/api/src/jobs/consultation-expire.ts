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

const STALE_AFTER_MINUTES = 30;

export interface ConsultationExpireResult {
  expired: number;
  skipped?: boolean;
  reason?: string;
}

export async function tickConsultationExpire(): Promise<ConsultationExpireResult> {
  try {
    const cutoffIso = new Date(Date.now() - STALE_AFTER_MINUTES * 60 * 1000).toISOString();
    const updated = await prisma.$executeRawUnsafe(
      `UPDATE astrologer_consultations
       SET status = 'cancelled'
       WHERE status = 'pending_payment'
         AND created_at < $1::timestamptz;`,
      cutoffIso,
    );
    return { expired: Number(updated ?? 0) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/relation .* does not exist|astrologer_consultations/i.test(msg)) {
      return { expired: 0, skipped: true, reason: 'table-missing' };
    }
    return { expired: 0, skipped: true, reason: msg };
  }
}
