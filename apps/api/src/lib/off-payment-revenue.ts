import type { PrismaClient } from '@prisma/client';

/**
 * Money collected on rails that never write a `Payment` row.
 *
 * Puja bookings, donations and store orders create a captured `Payment`, and
 * `REVENUE_PAYMENT_WHERE` sums those. Astrologer consultations (the lazily
 * created raw-SQL `astrologer_consultations` table) and wellness enrolments
 * keep their own paid state, so a Rs 300 consultation and a Rs 500 wellness
 * class were invisible to every admin revenue number (role pass 2026-10-07:
 * 1651 shown where 2451 was collected).
 *
 * FORMULA (admin revenue / GMV):
 *
 *   revenue = SUM(Payment.amount where REVENUE_PAYMENT_WHERE)
 *           + SUM(astrologer_consultations.amount_inr
 *                 where status IN ('confirmed','completed') and paid_at is set
 *                 and no Payment row carries its razorpay order/payment id)
 *           + SUM(wellness_sessions.price_inr over wellness_enrollments
 *                 where status IN ('PAID','ATTENDED') and payment_id IS NULL
 *                 and no Payment row carries its razorpay order id)
 *
 * Why this cannot double count: each added row is excluded when a `Payment`
 * row exists for it (by `payment_id` link or by matching Razorpay ids), so a
 * rail that starts writing Payment rows moves from the second/third term into
 * the first without changing the total.
 *
 * Refunds stay out: a cancelled consultation (`status = 'cancelled'`) and a
 * CANCELLED / REFUNDED / PENDING_PAYMENT enrolment never match. A consultation
 * cancelled outside the refund window is also excluded; the table does not
 * record whether a refund was actually issued, so the conservative reading is
 * "not revenue".
 *
 * The consultations table is created on first use, so it is probed with
 * `to_regclass` first (a failed statement must not be the way we find out) and
 * any failure degrades that term to 0 instead of failing the dashboard.
 *
 * `since` filters on the paid timestamp (`paid_at`) for consultations and on
 * `enrolled_at` for wellness (the enrolment row has no separate paid time).
 */

type Db = Pick<PrismaClient, '$queryRawUnsafe'>;

export interface OffPaymentRevenue {
  consultationsInr: number;
  wellnessInr: number;
  totalInr: number;
}

function toNumber(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function sumOffPaymentRevenue(
  db: Db,
  opts: { since?: Date } = {},
): Promise<OffPaymentRevenue> {
  const since = opts.since ?? null;

  let consultationsInr = 0;
  try {
    const probe = await db.$queryRawUnsafe<Array<{ present?: unknown }>>(
      `SELECT to_regclass('public.astrologer_consultations') IS NOT NULL AS present`,
    );
    if (Array.isArray(probe) && probe[0] && probe[0].present === true) {
      const rows = await db.$queryRawUnsafe<Array<{ total?: unknown }>>(
        `SELECT COALESCE(SUM(a.amount_inr), 0)::float8 AS total
           FROM astrologer_consultations a
          WHERE a.status IN ('confirmed', 'completed')
            AND a.paid_at IS NOT NULL
            AND ($1::timestamptz IS NULL OR a.paid_at >= $1::timestamptz)
            AND NOT EXISTS (
              SELECT 1 FROM payments p
               WHERE (a.razorpay_payment_id IS NOT NULL AND p.gateway_payment_id = a.razorpay_payment_id)
                  OR (a.razorpay_order_id IS NOT NULL AND p.gateway_order_id = a.razorpay_order_id)
            )`,
        since,
      );
      consultationsInr = toNumber(Array.isArray(rows) ? rows[0]?.total : 0);
    }
  } catch {
    consultationsInr = 0;
  }

  let wellnessInr = 0;
  try {
    const rows = await db.$queryRawUnsafe<Array<{ total?: unknown }>>(
      `SELECT COALESCE(SUM(s.price_inr), 0)::float8 AS total
         FROM wellness_enrollments e
         JOIN wellness_sessions s ON s.id = e.session_id
        WHERE e.status::text IN ('PAID', 'ATTENDED')
          AND e.payment_id IS NULL
          AND ($1::timestamptz IS NULL OR e.enrolled_at >= $1::timestamptz)
          AND NOT EXISTS (
            SELECT 1 FROM payments p
             WHERE e.razorpay_order_id IS NOT NULL AND p.gateway_order_id = e.razorpay_order_id
          )`,
      since,
    );
    wellnessInr = toNumber(Array.isArray(rows) ? rows[0]?.total : 0);
  } catch {
    wellnessInr = 0;
  }

  return { consultationsInr, wellnessInr, totalInr: consultationsInr + wellnessInr };
}
