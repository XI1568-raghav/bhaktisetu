import { prisma } from './prisma.js';

// Webhook idempotency guard for Razorpay + Stripe (TD16).
//
// Both providers retry the same event 2-3 times under normal conditions
// (network blip, slow response, ack lost). Without an idempotency check
// we'd double-credit subscriptions, double-confirm bookings, double-refund.
// This module records every (provider, event_id) pair we've processed and
// reports whether a given pair has been seen already.
//
// Failure mode: if the DB is unavailable, the lookup throws — callers wrap
// in try/catch and fall through to processing. Better to double-process
// than to silently drop a webhook.
//
// Storage is a raw SQL table (no Prisma migration) so this layer is
// self-contained and can be deployed without a schema bump.

export type WebhookProvider = 'razorpay' | 'stripe';

let tableEnsured = false;

async function ensureTable(): Promise<void> {
  if (tableEnsured) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS webhook_replay (
      id BIGSERIAL PRIMARY KEY,
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT webhook_replay_provider_event_id_key UNIQUE (provider, event_id)
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS webhook_replay_processed_at_idx
      ON webhook_replay (processed_at);
  `).catch(() => undefined);
  tableEnsured = true;
}

// For tests — reset module-level cache between cases that re-run setup.
export function _resetTableEnsuredForTests(): void {
  tableEnsured = false;
}

export interface IdempotencyResult {
  alreadyProcessed: boolean;
}

/**
 * Look up (provider, eventId) in webhook_replay. If found, return
 * alreadyProcessed=true. Otherwise insert the row and return false.
 *
 * INSERT ... ON CONFLICT DO NOTHING + RETURNING gives us atomic
 * check-and-record without a race window between SELECT and INSERT.
 * If RETURNING yields zero rows, the row already existed -> duplicate.
 */
export async function checkAndRecord(
  provider: WebhookProvider,
  eventId: string,
): Promise<IdempotencyResult> {
  if (!eventId) {
    // Empty event id is meaningless for idempotency — fall through to
    // processing. Caller should have generated a stable hash already.
    return { alreadyProcessed: false };
  }
  await ensureTable();
  const inserted = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    `INSERT INTO webhook_replay (provider, event_id)
     VALUES ($1, $2)
     ON CONFLICT (provider, event_id) DO NOTHING
     RETURNING id`,
    provider,
    eventId,
  );
  return { alreadyProcessed: inserted.length === 0 };
}

export interface SweepResult {
  deleted: number;
  skipped?: boolean;
  reason?: string;
}

/**
 * Delete webhook_replay rows older than 30 days. Cron-driven; safe to run
 * even if the table doesn't exist yet (creates it then no-ops the delete).
 */
export async function sweepOldRows(): Promise<SweepResult> {
  try {
    await ensureTable();
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM webhook_replay WHERE processed_at < now() - interval '30 days'`,
    );
    // $executeRawUnsafe returns affected row count (number).
    const deleted = typeof result === 'number' ? result : 0;
    return { deleted };
  } catch (err) {
    return {
      deleted: 0,
      skipped: true,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
