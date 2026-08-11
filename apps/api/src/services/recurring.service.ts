/**
 * recurring.service.ts — recurring devotional subscriptions (cross-cutting
 * Phase 2, 2026-08-06).
 *
 * Research basis: recurring donors retain 78-80%/yr (vs 32% one-time) with ~2x
 * LTV; UPI Autopay no-PIN cap is ₹15,000/txn (donations/wellness don't qualify
 * for the ₹1L enhanced tier). So every monthly plan is priced ≤₹15,000 and sold
 * as a UPI-Autopay-style recurring commitment.
 *
 * This model captures the INTENT + plan so the product flow works end-to-end
 * now (a devotee can subscribe to monthly gau-feeding / wellness batch / temple
 * seva), and an admin/system can activate it once the Razorpay mandate is set
 * up (Phase 2 wires the actual Razorpay Subscriptions API + webhooks).
 */

import { prisma } from '../lib/prisma.js';
import { razorpay, isDemoPayment } from './payment.service.js';

export type RecurringPlanKind = 'gau_seva' | 'wellness_batch' | 'temple_seva' | 'custom';

/** Ensure the recurring_subscriptions table exists (idempotent). Called lazily
 * so this works before the formal migration lands. */
let ensured = false;
async function ensureRecurringTable(): Promise<void> {
  if (ensured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS recurring_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      plan_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      amount_inr DECIMAL(10,2) NOT NULL,
      interval TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      gaushala_id TEXT,
      temple_id TEXT,
      metadata JSONB,
      razorpay_subscription_id TEXT,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS recurring_subscriptions_user_id_idx ON recurring_subscriptions (user_id)`,
  );
  ensured = true;
}

export interface RecurringPlan {
  id: string;
  kind: RecurringPlanKind;
  name: string;
  amountInr: number;
  interval: 'monthly' | 'yearly' | 'weekly' | 'daily';
  // UPI Autopay no-PIN cap is ₹15,000/txn for these categories.
  upiAutopayOk: boolean;
}

/** Catalog of recurring plans (all ≤ ₹15,000 so UPI Autopay no-PIN works). */
export const RECURRING_PLANS: RecurringPlan[] = [
  { id: 'gau_feed_daily', kind: 'gau_seva', name: 'Gau Seva — Daily Feeding', amountInr: 51, interval: 'daily', upiAutopayOk: true },
  { id: 'gau_palan_monthly', kind: 'gau_seva', name: 'Gau Palan — Monthly Care', amountInr: 3000, interval: 'monthly', upiAutopayOk: true },
  { id: 'wellness_batch_monthly', kind: 'wellness_batch', name: 'Wellness Batch — Monthly', amountInr: 299, interval: 'monthly', upiAutopayOk: true },
  { id: 'temple_seva_monthly', kind: 'temple_seva', name: 'Monthly Seva', amountInr: 501, interval: 'monthly', upiAutopayOk: true },
];

export function getRecurringPlan(planId: string): RecurringPlan | null {
  return RECURRING_PLANS.find((p) => p.id === planId) ?? null;
}

/** Map our plan interval to a Razorpay Subscriptions period. */
function toRazorpayPeriod(interval: RecurringPlan['interval']): { period: 'daily' | 'weekly' | 'monthly' | 'yearly'; interval: number } {
  switch (interval) {
    case 'daily': return { period: 'daily', interval: 1 };
    case 'weekly': return { period: 'weekly', interval: 1 };
    case 'yearly': return { period: 'yearly', interval: 1 };
    default: return { period: 'monthly', interval: 1 };
  }
}

/**
 * Create a recurring subscription: persist the intent row, then create a
 * Razorpay Subscription (UPI Autopay mandate) and store its id + return the
 * short_url the devotee opens to AUTHORISE the mandate. In demo mode (no live
 * Razorpay key) the mandate create is a no-op proxy and the row stays
 * 'pending' — the flow is exercised end-to-end without moving money.
 */
export async function createRecurringSubscription(opts: {
  userId: string;
  planId: string;
  gaushalaId?: string;
  templeId?: string;
  metadata?: Record<string, unknown>;
}) {
  const plan = getRecurringPlan(opts.planId);
  if (!plan) throw new Error('Unknown plan.');
  await ensureRecurringTable();

  // Razorpay Subscriptions requires a PRE-CREATED Plan (plan_id) — the node SDK
  // does not accept an inline `plan` object on subscriptions.create. We look up
  // the plan id from env (RAZORPAY_PLAN_RECURRING_<PLAN_ID>). If unset, fall
  // back to the raw REST API with an inline plan (the REST endpoint accepts an
  // inline plan; if it 404s, Subscriptions isn't enabled on the account).
  const { period, interval } = toRazorpayPeriod(plan.interval);
  const reference = `rec_${Date.now().toString(36)}`;
  const envKey = `RAZORPAY_PLAN_RECURRING_${plan.id.toUpperCase()}`;
  const rzpPlanId = process.env[envKey] || '';
  let rzpSubId: string | null = null;
  let mandateUrl: string | null = null;
  try {
    if (rzpPlanId) {
      // Preferred: pre-created plan (matches the proven subscription.service pattern).
      const sub = await (razorpay as any).subscriptions.create({
        plan_id: rzpPlanId,
        total_count: 120,
        quantity: 1,
        customer_notify: 1,
        notes: {
          reference,
          planId: plan.id,
          kind: plan.kind,
          userId: opts.userId,
          gaushalaId: opts.gaushalaId ?? '',
          templeId: opts.templeId ?? '',
        },
      });
      rzpSubId = sub?.id ?? null;
      mandateUrl = sub?.short_url ?? null;
    } else {
      // Fallback: raw REST with an inline plan object (SDK requires plan_id).
      const keyId = process.env.RAZORPAY_KEY_ID || '';
      const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
      const res = await fetch('https://api.razorpay.com/v1/subscriptions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
        },
        body: JSON.stringify({
          plan: { period, interval, item: { name: plan.name, amount: plan.amountInr * 100, currency: 'INR' } },
          total_count: 120,
          quantity: 1,
          customer_notify: 1,
          notes: { reference, planId: plan.id, kind: plan.kind, userId: opts.userId },
        }),
      });
      if (res.ok) {
        const sub = (await res.json()) as { id?: string; short_url?: string };
        rzpSubId = sub.id ?? null;
        mandateUrl = sub.short_url ?? null;
      } else if (!isDemoPayment) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Razorpay subscription create failed (${res.status}): ${txt.slice(0, 160)}`);
      }
    }
  } catch (err) {
    // Demo mode (no live key) or gateway hiccup: keep the intent row pending
    // and surface no mandate URL. Never block the intent capture on the gateway.
    if (!isDemoPayment) throw err;
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO recurring_subscriptions (id, user_id, plan_id, kind, amount_inr, interval, status, gaushala_id, temple_id, metadata, razorpay_subscription_id, created_at)
     VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, 'pending', $6, $7, $8::jsonb, $9, NOW())
     ON CONFLICT DO NOTHING`,
    opts.userId,
    plan.id,
    plan.kind,
    plan.amountInr,
    plan.interval,
    opts.gaushalaId ?? null,
    opts.templeId ?? null,
    JSON.stringify({ ...(opts.metadata ?? {}), reference }),
    rzpSubId,
  );
  return {
    planId: plan.id,
    status: 'pending',
    amountInr: plan.amountInr,
    razorpaySubscriptionId: rzpSubId,
    mandateUrl,
  };
}

/**
 * Razorpay subscription webhook lifecycle. Called from the payment webhook
 * dispatcher. Idempotent — each transition only fires on a status change.
 */
export async function handleSubscriptionEvent(
  event: string,
  entity: { id?: string; notes?: Record<string, string> } | undefined,
): Promise<void> {
  const subId = entity?.id;
  if (!subId) return;
  const map: Record<string, string> = {
    'subscription.authenticated': 'active',
    'subscription.activated': 'active',
    'subscription.charged': 'active',
    'subscription.pending': 'pending', // RBI ≥24h pre-debit notification window
    'subscription.halted': 'halted',   // dunning — payment failed, retry window
    'subscription.paused': 'paused',
    'subscription.cancelled': 'cancelled',
    'subscription.expired': 'expired',
  };
  const status = map[event];
  if (!status) return;
  await prisma.$executeRawUnsafe(
    `UPDATE recurring_subscriptions SET status = $1, updated_at = NOW() WHERE razorpay_subscription_id = $2`,
    status,
    subId,
  );
}

/** List a user's recurring subscriptions. */
export async function listMyRecurring(userId: string) {
  try {
    await ensureRecurringTable();
    return await prisma.$queryRawUnsafe(
      `SELECT id, plan_id, kind, amount_inr, interval, status, created_at FROM recurring_subscriptions WHERE user_id = $1::uuid ORDER BY created_at DESC LIMIT 100`,
      userId,
    );
  } catch {
    return []; // table may not exist pre-migration
  }
}
