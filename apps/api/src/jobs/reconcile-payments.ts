import { prisma } from '../lib/prisma.js';
import { paymentService } from '../services/payment.service.js';

/**
 * PAY-06 (2026-08-20, P1): the money reconciliation sweep.
 *
 * Before this file, NOTHING in the platform ever looked for a `Payment` stuck
 * at `initiated` with a real capture behind it, and nothing ever asked Razorpay
 * what actually settled. The entire confirmation design assumed the browser
 * survives long enough to call /verify, with the Razorpay webhook as the only
 * backstop — and the webhook is exactly what an unset `RAZORPAY_WEBHOOK_SECRET`
 * (both handlers then fail closed and return 400 to every event), an
 * unsubscribed event, or a multi-day outage takes away. In all three cases
 * money is captured with nothing behind it and no process notices, ever.
 *
 * This sweep closes the loop from our side: it asks Razorpay, per stuck order,
 * what happened, and then routes the answer through the SAME handlers the
 * webhook uses — `paymentService.applyCapturedPayment` for the Payment-backed
 * rails (puja + store), `finalizeConsultationPaymentFromWebhook` for
 * consultations, which write no Payment row at all.
 *
 * Design rules, all deliberate:
 *   - READ-ONLY against Razorpay. It never creates, captures or refunds.
 *   - It only ever writes on a SUCCESSFUL Razorpay answer. A network error or a
 *     non-200 increments `errors` and touches nothing — the alternative is
 *     cancelling a paid booking because Razorpay had a bad minute.
 *   - Recovery is immediate (a capture is a fact); abandonment waits
 *     `ABANDON_AFTER_HOURS` (a checkout the devotee might still complete is not
 *     abandoned, and Razorpay orders can be paid late).
 *   - Bounded per tick (`BATCH`) so a backlog cannot blow the free-tier budget
 *     or the daily-ops runtime. A backlog drains over successive ticks.
 *   - No new cron: it is one more step inside `runDailyOps`.
 */

/** A Payment younger than this is simply a checkout still in progress. */
const STUCK_AFTER_MINUTES = 20;
/** Only after this long with no capture is an order treated as abandoned. */
const ABANDON_AFTER_HOURS = 24;
/** Max rows of each kind per tick. */
const BATCH = 25;

const RAZORPAY_BASE = 'https://api.razorpay.com/v1';

export interface ReconcileResult {
  scannedPayments: number;
  recoveredPayments: number;
  failedPayments: number;
  scannedConsultations: number;
  recoveredConsultations: number;
  cancelledConsultations: number;
  /** PAY-08: captures applied to a slot that had already been resold. */
  slotOversoldPending: number;
  errors: number;
  skipped?: boolean;
  reason?: string;
}

function emptyResult(): ReconcileResult {
  return {
    scannedPayments: 0,
    recoveredPayments: 0,
    failedPayments: 0,
    scannedConsultations: 0,
    recoveredConsultations: 0,
    cancelledConsultations: 0,
    slotOversoldPending: 0,
    errors: 0,
  };
}

function razorpayAuthHeader(): string | null {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  // The demo placeholder addresses no real account — polling it is meaningless.
  if (!key || !secret || key === 'rzp_test_demo') return null;
  return `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;
}

interface RazorpayPaymentEntity {
  id?: string;
  status?: string;
  method?: string | null;
}

/**
 * `GET /orders/:id/payments` — every payment attempt against one order.
 *
 * Returns `null` on ANY failure (network, non-200, unparseable). `null` means
 * "we do not know", and every caller treats not-knowing as "write nothing".
 */
async function fetchOrderPayments(
  orderId: string,
  auth: string,
): Promise<RazorpayPaymentEntity[] | null> {
  try {
    const res = await fetch(`${RAZORPAY_BASE}/orders/${encodeURIComponent(orderId)}/payments`, {
      method: 'GET',
      headers: { authorization: auth, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(Number(process.env.RAZORPAY_TIMEOUT_MS) || 15_000),
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as { items?: unknown } | null;
    if (!json || !Array.isArray(json.items)) return null;
    return json.items as RazorpayPaymentEntity[];
  } catch {
    return null;
  }
}

/** The one payment that actually took money, if any. */
function capturedOf(items: RazorpayPaymentEntity[]): RazorpayPaymentEntity | null {
  return items.find((p) => p?.status === 'captured' && !!p.id) ?? null;
}

export async function reconcilePayments(): Promise<ReconcileResult> {
  const auth = razorpayAuthHeader();
  if (!auth) {
    return { ...emptyResult(), skipped: true, reason: 'razorpay-credentials-missing' };
  }

  const result = emptyResult();
  const now = Date.now();
  const stuckCutoff = new Date(now - STUCK_AFTER_MINUTES * 60_000);
  const abandonBefore = now - ABANDON_AFTER_HOURS * 60 * 60_000;

  // ── 1. Payment-backed rails (puja bookings + store orders) ────────────────
  try {
    const stuck = await prisma.payment.findMany({
      where: {
        status: 'initiated',
        createdAt: { lt: stuckCutoff },
        gatewayOrderId: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      take: BATCH,
      select: { id: true, gatewayOrderId: true, createdAt: true },
    });
    result.scannedPayments = stuck.length;

    for (const row of stuck) {
      const orderId = row.gatewayOrderId;
      if (!orderId) continue;
      const items = await fetchOrderPayments(orderId, auth);
      if (items === null) {
        result.errors += 1;
        continue;
      }
      const captured = capturedOf(items);
      if (captured?.id) {
        // A capture is a fact — recover immediately, through the webhook's own
        // handler so puja / store / commission / invoice all behave identically.
        try {
          await paymentService.applyCapturedPayment(orderId, captured.id, captured.method ?? null);
          result.recoveredPayments += 1;
          console.warn(
            '[reconcile-payments][PAY-06] recovered_capture',
            JSON.stringify({
              event: 'recovered_capture',
              paymentId: row.id,
              gatewayOrderId: orderId,
              gatewayPaymentId: captured.id,
            }),
          );
        } catch (err) {
          result.errors += 1;
          console.error('[reconcile-payments] recovery failed for', row.id, err);
        }
        continue;
      }
      // No capture. Only an order old enough to be genuinely abandoned is
      // closed out; anything younger stays `initiated` and is re-checked next
      // tick, because Razorpay orders can still be paid.
      if (new Date(row.createdAt).getTime() < abandonBefore) {
        try {
          await prisma.payment.update({
            where: { id: row.id },
            data: {
              status: 'failed',
              metadata: {
                failureReason: 'abandoned-checkout (reconciliation: no capture at Razorpay)',
                reconciledAt: new Date().toISOString(),
              },
            },
          });
          result.failedPayments += 1;
        } catch {
          result.errors += 1;
        }
      }
    }
  } catch (err) {
    result.errors += 1;
    console.error('[reconcile-payments] payment sweep failed:', err);
  }

  // ── 2. Consultations (no Payment row exists — PAY-01) ─────────────────────
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        reference: string;
        status: string;
        razorpay_order_id: string | null;
        created_at: Date;
        [k: string]: unknown;
      }>
    >(
      `SELECT * FROM astrologer_consultations
        WHERE status IN ('payment_review', 'pending_payment')
          AND created_at < $1::timestamptz
          AND razorpay_order_id IS NOT NULL
          AND razorpay_order_id NOT LIKE 'order\\_demo\\_%'
        ORDER BY created_at ASC
        LIMIT ${BATCH};`,
      stuckCutoff.toISOString(),
    );
    result.scannedConsultations = Array.isArray(rows) ? rows.length : 0;

    for (const row of Array.isArray(rows) ? rows : []) {
      const orderId = row.razorpay_order_id;
      if (!orderId) continue;
      const items = await fetchOrderPayments(orderId, auth);
      if (items === null) {
        result.errors += 1;
        continue;
      }
      const captured = capturedOf(items);
      if (captured?.id) {
        try {
          const consult = await import('../routes/consultation.js');
          await consult.finalizeConsultationPaymentFromWebhook(
            row as never,
            captured.id,
          );
          result.recoveredConsultations += 1;
          console.warn(
            '[reconcile-payments][PAY-01] recovered_consultation',
            JSON.stringify({
              event: 'recovered_consultation',
              consultationId: row.id,
              reference: row.reference,
              gatewayOrderId: orderId,
            }),
          );
        } catch (err) {
          result.errors += 1;
          console.error('[reconcile-payments] consultation recovery failed:', err);
        }
        continue;
      }
      if (new Date(row.created_at).getTime() < abandonBefore) {
        // Razorpay has affirmatively told us nothing was captured against this
        // order, and it is a day old. NOW cancelling is a fact, not a guess —
        // which is the entire difference between this and the timer that
        // produced PAY-01.
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE astrologer_consultations
                SET status = 'cancelled'
              WHERE id = $1::uuid
                AND status IN ('payment_review', 'pending_payment');`,
            row.id,
          );
          result.cancelledConsultations += 1;
        } catch {
          result.errors += 1;
        }
      }
    }
  } catch (err) {
    result.errors += 1;
    console.error('[reconcile-payments] consultation sweep failed:', err);
  }

  // ── 3. PAY-08 backlog: captures applied to an already-resold slot ─────────
  try {
    result.slotOversoldPending = Number(
      (await prisma.payment.count({
        where: {
          metadata: { path: ['needsAdminReview'], equals: 'slot-capacity' },
        },
      })) ?? 0,
    );
    if (!Number.isFinite(result.slotOversoldPending)) result.slotOversoldPending = 0;
  } catch {
    result.slotOversoldPending = 0;
  }

  return result;
}
