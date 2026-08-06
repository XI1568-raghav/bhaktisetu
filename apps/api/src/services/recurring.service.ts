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

/** Create a recurring subscription intent (pending until mandate is set up). */
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
  // stored as a raw row — the Prisma model is added by migration; using raw SQL
  // keeps this resilient if the client is mid-generate.
  await prisma.$executeRawUnsafe(
    `INSERT INTO recurring_subscriptions (id, user_id, plan_id, kind, amount_inr, interval, status, gaushala_id, temple_id, metadata, created_at)
     VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4, $5, 'pending', $6, $7, $8::jsonb, NOW())
     ON CONFLICT DO NOTHING`,
    opts.userId,
    plan.id,
    plan.kind,
    plan.amountInr,
    plan.interval,
    opts.gaushalaId ?? null,
    opts.templeId ?? null,
    JSON.stringify(opts.metadata ?? {}),
  );
  return { planId: plan.id, status: 'pending', amountInr: plan.amountInr };
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
