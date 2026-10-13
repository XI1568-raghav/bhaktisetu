import { createHash } from 'node:crypto';
import { prisma } from './prisma.js';
import { sendEmail } from './email.js';

/**
 * Email outbox: a failed receipt / booking email is retried instead of lost.
 *
 * Design (fits the free tier: no queue service, no stored PDFs, one tiny table):
 *   1. `deliverOrQueue` sends INLINE with a short timeout. Success, or "email is
 *      not configured" (no RESEND_API_KEY), ends there.
 *   2. Any other outcome (Resend down, 429, 500, timeout) records ONE row in
 *      `email_outbox` and returns normally - the caller's request still succeeds.
 *   3. `processEmailOutbox` (a step of the daily-ops tick, see jobs/master-cron.ts,
 *      and runnable on its own) claims due rows, REGENERATES the mail from
 *      (kind, ref_id) - the PDF is never stored - and sends it again with
 *      exponential backoff, up to MAX_ATTEMPTS, then marks the row `dead`.
 *
 * Never sends twice:
 *   - `dedupe_key` is UNIQUE, so a double enqueue for the same mail is one row.
 *   - a row is CLAIMED with a single conditional UPDATE (pending -> sending), so
 *     two overlapping job runs cannot both send it.
 *   - every send, inline and retry, carries the same Resend `Idempotency-Key`, so
 *     an inline attempt that timed out client-side but was in fact delivered is
 *     answered with the original response by Resend, not mailed again.
 *
 * The table is created lazily (CREATE TABLE IF NOT EXISTS) and by migration
 * 20261013010000_donee_tax_and_email_outbox; every function here tolerates it
 * being absent (the mail is then simply not retried, exactly the old behaviour).
 */

export type OutboxKind = 'donation_receipt' | 'puja_invoice' | 'store_invoice' | 'booking_confirmation';

export interface OutboxMail {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer | string }[];
}

export interface OutboxSpec {
  kind: OutboxKind;
  /** donation id / booking id / store order id: enough to regenerate the mail. */
  refId: string;
}

/** Total tries including the inline one. */
export const MAX_ATTEMPTS = 8;
export const INLINE_TIMEOUT_MS = Number(process.env.EMAIL_INLINE_TIMEOUT_MS ?? 8000);
/** Delay before retry n (1-based count of attempts already made). */
const BACKOFF_MINUTES = [1, 5, 15, 60, 180, 360, 720];
/** A row stuck in `sending` this long belonged to a crashed run. */
const STALE_SENDING_MINUTES = 10;

export function backoffMinutes(attemptsMade: number): number {
  return BACKOFF_MINUTES[Math.min(Math.max(attemptsMade, 1), BACKOFF_MINUTES.length) - 1]!;
}

let tableReady = false;

async function ensureTable(): Promise<void> {
  if (tableReady) return;
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "email_outbox" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "dedupe_key" TEXT NOT NULL,
      "kind" TEXT NOT NULL,
      "ref_id" TEXT NOT NULL,
      "to_email" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "next_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "last_error" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "sent_at" TIMESTAMPTZ,
      CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
    )`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "email_outbox_dedupe_key_key" ON "email_outbox" ("dedupe_key")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "email_outbox_status_next_attempt_at_idx" ON "email_outbox" ("status","next_attempt_at")`,
  );
  tableReady = true;
}

/** Same logical mail => same key, so a webhook + verify double fire is one send. */
export function dedupeKeyFor(spec: OutboxSpec, mail: Pick<OutboxMail, 'to' | 'subject' | 'html'>): string {
  const h = createHash('sha1').update(`${mail.to}\n${mail.subject}\n${mail.html}`).digest('hex').slice(0, 16);
  return `${spec.kind}:${spec.refId}:${h}`;
}

async function sendWithTimeout(mail: OutboxMail, idempotencyKey: string) {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<{ ok: false; error: string }>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, error: `inline send timed out after ${INLINE_TIMEOUT_MS}ms` }), INLINE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([sendEmail({ ...mail, idempotencyKey }), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface DeliverResult {
  sent: boolean;
  /** true when the first attempt failed and a retry row was recorded. */
  queued: boolean;
  skipped?: boolean;
  error?: string;
}

async function enqueue(spec: OutboxSpec, mail: OutboxMail, key: string, error: string): Promise<boolean> {
  const sql = `INSERT INTO email_outbox (dedupe_key, kind, ref_id, to_email, subject, attempts, next_attempt_at, last_error, status)
       VALUES ($1, $2, $3, $4, $5, 1, now() + ($6 || ' minutes')::interval, $7, 'pending')
       ON CONFLICT (dedupe_key) DO NOTHING`;
  const args = [key, spec.kind, spec.refId, mail.to, mail.subject, String(backoffMinutes(1)), error.slice(0, 500)];
  try {
    await prisma.$executeRawUnsafe(sql, ...args);
  } catch {
    await ensureTable();
    await prisma.$executeRawUnsafe(sql, ...args);
  }
  return true;
}

/**
 * Send now; on failure queue a retry. Never throws, so a caller's request is
 * unaffected by Resend being down.
 */
export async function deliverOrQueue(mail: OutboxMail, spec: OutboxSpec): Promise<DeliverResult> {
  const key = dedupeKeyFor(spec, mail);
  let res: { ok?: boolean; skipped?: boolean; error?: string } | undefined;
  try {
    res = await sendWithTimeout(mail, key);
  } catch (err) {
    res = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  // A bare mock (undefined) or an unconfigured transport: nothing to retry.
  if (!res || res.ok) return { sent: true, queued: false };
  if (res.skipped) return { sent: false, queued: false, skipped: true };
  try {
    await enqueue(spec, mail, key, res.error ?? 'send failed');
    return { sent: false, queued: true, error: res.error ?? 'send failed' };
  } catch (err) {
    console.warn('[email-outbox] could not record a failed send for retry:', err instanceof Error ? err.message : err);
    return { sent: false, queued: false, error: res.error ?? 'send failed' };
  }
}

export type OutboxBuilder = (refId: string) => Promise<OutboxMail | null>;

/** Lazy imports: the builders live in route/service modules that import this one. */
async function defaultBuilder(kind: string): Promise<OutboxBuilder | null> {
  switch (kind) {
    case 'donation_receipt':
      return (await import('../routes/donations.js')).buildDonationReceiptMail;
    case 'puja_invoice':
      return (await import('../services/payment.service.js')).composePujaBookingInvoiceMail;
    case 'store_invoice':
      return (await import('../services/payment.service.js')).composeStoreOrderInvoiceMail;
    case 'booking_confirmation':
      return (await import('../services/booking-notify.service.js')).composeBookingConfirmationMail;
    default:
      return null;
  }
}

export interface OutboxRunResult {
  scanned: number;
  sent: number;
  retried: number;
  dead: number;
  errors: number;
  skipped?: boolean;
  reason?: string;
}

interface OutboxRow {
  id: string;
  dedupe_key: string;
  kind: string;
  ref_id: string;
  to_email: string;
  subject: string;
  attempts: number;
}

/** Resend answers a replayed key with 409 idempotent errors: the mail already went. */
function alreadyDelivered(error: string | undefined): boolean {
  return !!error && /idempotent/i.test(error);
}

export async function processEmailOutbox(
  opts: { limit?: number; builder?: (kind: string) => Promise<OutboxBuilder | null> } = {},
): Promise<OutboxRunResult> {
  const out: OutboxRunResult = { scanned: 0, sent: 0, retried: 0, dead: 0, errors: 0 };
  const getBuilder = opts.builder ?? defaultBuilder;
  let due: OutboxRow[];
  try {
    due = await prisma.$queryRawUnsafe<OutboxRow[]>(
      `SELECT id::text AS id, dedupe_key, kind, ref_id, to_email, subject, attempts
         FROM email_outbox
        WHERE (status = 'pending' AND next_attempt_at <= now())
           OR (status = 'sending' AND updated_at < now() - ($2 || ' minutes')::interval)
        ORDER BY next_attempt_at ASC
        LIMIT $1`,
      opts.limit ?? 20,
      String(STALE_SENDING_MINUTES),
    );
  } catch {
    return { ...out, skipped: true, reason: 'email_outbox table not present' };
  }
  if (!Array.isArray(due)) return { ...out, skipped: true, reason: 'no rows' };

  for (const row of due) {
    out.scanned += 1;
    try {
      // Single-winner claim. Counts the attempt up front so a crash mid-send
      // still moves the row toward `dead` instead of retrying forever.
      const claimed = await prisma.$executeRawUnsafe(
        `UPDATE email_outbox
            SET status = 'sending', attempts = attempts + 1, updated_at = now()
          WHERE id = $1::uuid
            AND ((status = 'pending' AND next_attempt_at <= now())
              OR (status = 'sending' AND updated_at < now() - ($2 || ' minutes')::interval))`,
        row.id,
        String(STALE_SENDING_MINUTES),
      );
      if (Number(claimed) !== 1) continue;
      const attempts = row.attempts + 1;

      const builder = await getBuilder(row.kind);
      const mail = builder ? await builder(row.ref_id).catch((e: unknown) => {
        out.errors += 1;
        console.warn('[email-outbox] rebuild failed:', row.kind, row.ref_id, e instanceof Error ? e.message : e);
        return undefined;
      }) : null;
      if (mail === undefined) {
        // Transient rebuild failure (DB blip): treat as a failed attempt.
        await settle(row.id, attempts, 'rebuild failed', out);
        continue;
      }
      if (!mail) {
        await prisma.$executeRawUnsafe(
          `UPDATE email_outbox SET status = 'dead', last_error = $2, updated_at = now() WHERE id = $1::uuid`,
          row.id,
          'nothing to send (record gone, no recipient, or unknown kind)',
        );
        out.dead += 1;
        continue;
      }

      const res = await sendEmail({ ...mail, idempotencyKey: row.dedupe_key });
      if (res.skipped) {
        // Not configured right now: give the attempt back and try later.
        await prisma.$executeRawUnsafe(
          `UPDATE email_outbox SET status = 'pending', attempts = attempts - 1, updated_at = now() WHERE id = $1::uuid`,
          row.id,
        );
        continue;
      }
      if (res.ok || alreadyDelivered(res.error)) {
        await prisma.$executeRawUnsafe(
          `UPDATE email_outbox SET status = 'sent', sent_at = now(), last_error = NULL, updated_at = now() WHERE id = $1::uuid`,
          row.id,
        );
        out.sent += 1;
        continue;
      }
      await settle(row.id, attempts, res.error ?? 'send failed', out);
    } catch (err) {
      out.errors += 1;
      console.warn('[email-outbox] row failed:', row.id, err instanceof Error ? err.message : err);
    }
  }
  return out;
}

async function settle(id: string, attempts: number, error: string, out: OutboxRunResult): Promise<void> {
  if (attempts >= MAX_ATTEMPTS) {
    await prisma.$executeRawUnsafe(
      `UPDATE email_outbox SET status = 'dead', last_error = $2, updated_at = now() WHERE id = $1::uuid`,
      id,
      error.slice(0, 500),
    );
    out.dead += 1;
    return;
  }
  await prisma.$executeRawUnsafe(
    `UPDATE email_outbox
        SET status = 'pending', last_error = $2, updated_at = now(),
            next_attempt_at = now() + ($3 || ' minutes')::interval
      WHERE id = $1::uuid`,
    id,
    error.slice(0, 500),
    String(backoffMinutes(attempts)),
  );
  out.retried += 1;
}

export function __resetEmailOutboxForTests(): void {
  tableReady = false;
}

