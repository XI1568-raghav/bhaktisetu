import { randomUUID } from 'node:crypto';
import { prisma } from './prisma.js';

/**
 * audit-money.ts — OPS-05: the durable, append-only record of what happened to
 * a payment.
 *
 * THE DEFECT THIS EXISTS TO CLOSE
 *
 * schema.prisma carried 66 models and not one audit log. Every money model
 * stores only its CURRENT state — `Payment.status`, `Commission.status`,
 * `PayoutRequest.status` — and the few historical breadcrumbs that exist are
 * smeared into `Payment.metadata` by whichever code path remembered
 * (`refundId`, `refundFailureReason`, `refundInitiatedBy`, `refundedAt`), where
 * the next write overwrites them. So for a disputed booking nobody could
 * answer, from anything the product stores:
 *
 *   - who initiated the refund, and when, and on whose authority;
 *   - whether the capture arrived through POST /payments/verify or the webhook;
 *   - what the status was BEFORE the write that changed it;
 *   - which Razorpay ids were in play at each step;
 *   - whether the pandit's earning was minted before or after the refund.
 *
 * The only surviving trace was the Render log stream: days of retention on the
 * free plan, not queryable per booking, and gone entirely once a service is
 * suspended — which is exactly the state this platform was in when the finding
 * was written. For a product holding bookings, payments and 80G donation
 * records that is both a support problem and a legal one.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * THREE CONTRACTS THIS MODULE MUST NEVER BREAK
 *
 * 1. IT NEVER THROWS. `recordMoneyEvent` resolves with `{ ok: false }` on any
 *    failure — a dead database, a missing table, malformed input, anything. A
 *    money transaction must never be rolled back because the log of it failed.
 *    That is not defensiveness for its own sake: the alternative is an audit
 *    trail that can refuse payments.
 *
 * 2. IT NEVER JOINS THE CALLER'S TRANSACTION. There is deliberately no `tx`
 *    parameter. Writing through the caller's `tx` would make a failed INSERT
 *    poison the surrounding transaction (Postgres aborts the whole tx on any
 *    statement error), so a logging bug would roll back real captures and real
 *    refunds. The write goes through the module-level client, always, and
 *    callers inside a `$transaction` should record AFTER it commits — the
 *    event being logged is "this happened", and it has not happened until the
 *    transaction commits.
 *
 * 3. IT IS APPEND-ONLY. This module exports no update and no delete, and the
 *    migration installs a BEFORE UPDATE OR DELETE trigger that raises, so the
 *    guarantee survives psql and any future code path. A log that can be
 *    quietly edited is not evidence.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * WHY RAW SQL RATHER THAN `prisma.moneyAuditEvent.create`
 *
 * The model IS declared in schema.prisma and the table IS created by a real
 * migration (20260820120000_ops05_money_audit_events) — this is not a
 * runtime-DDL table like `notification_log`. Raw parameterised SQL is used for
 * the write path only so that adding audit calls to a service does not require
 * every one of that service's existing tests to grow a new delegate on the
 * shared Prisma mock; `$executeRawUnsafe` and `$queryRawUnsafe` are already on
 * it. Every value is bound as a parameter — nothing is interpolated into the
 * statement except the LIMIT, which is clamped to an integer first.
 */

/** The money lifecycle, named. Dotted so a prefix filter selects a stage. */
export const MONEY_EVENTS = {
  /** A booking row exists and owes money. */
  BOOKING_CREATED: 'booking.created',
  /** A gateway order was opened for it. */
  PAYMENT_INITIATED: 'payment.initiated',
  /** The devotee's browser returned a signed result and it verified. */
  PAYMENT_VERIFIED: 'payment.verified',
  /** Funds captured — whichever rail got there first. */
  PAYMENT_CAPTURED: 'payment.captured',
  PAYMENT_FAILED: 'payment.failed',
  REFUND_INITIATED: 'refund.initiated',
  REFUND_COMPLETED: 'refund.completed',
  REFUND_FAILED: 'refund.failed',
  /** The provider's earning was written to the unified ledger. */
  COMMISSION_MINTED: 'commission.minted',
  /** ...and unwound, e.g. by a refund or a reschedule. */
  COMMISSION_REVERSED: 'commission.reversed',
  /** The legacy pandit-only rail. */
  PRIEST_PAYOUT_CREATED: 'payout.priest_created',
  PAYOUT_REQUESTED: 'payout.requested',
  PAYOUT_PROCESSED: 'payout.processed',
  PAYOUT_REJECTED: 'payout.rejected',
  PAYOUT_FAILED: 'payout.failed',
  /** A donation receipt-bearing transfer. */
  DONATION_RECEIVED: 'donation.received',
} as const;

export type MoneyEventType = (typeof MONEY_EVENTS)[keyof typeof MONEY_EVENTS];

/**
 * 'gateway' means Razorpay acted (a webhook), which is a different fact from
 * 'system' (our own cron) and from 'admin' (a human with authority). Folding
 * them together is what makes a refund trail unusable in a dispute.
 */
export type MoneyActorType = 'devotee' | 'provider' | 'admin' | 'system' | 'gateway';

export type MoneySubjectType =
  | 'booking'
  | 'payment'
  | 'commission'
  | 'payout'
  | 'donation'
  | 'store_order'
  | 'consultation'
  | 'wellness_enrollment';

/** Anything a money amount arrives as: Prisma.Decimal, number, or string. */
export type AmountLike = number | string | { toString(): string };

export interface MoneyEventInput {
  eventType: MoneyEventType;
  /** Defaults to now(). Pass only when replaying a known-past event. */
  occurredAt?: Date | null;

  actorType?: MoneyActorType;
  /** Acting User.id where a human acted; null for cron and webhooks. */
  actorId?: string | null;

  subjectType: MoneySubjectType;
  subjectId: string;

  bookingId?: string | null;
  paymentId?: string | null;
  commissionId?: string | null;
  payoutId?: string | null;

  amount?: AmountLike | null;
  currency?: string | null;

  gateway?: string | null;
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  gatewayRefundId?: string | null;

  statusBefore?: string | null;
  statusAfter?: string | null;

  /**
   * Stable key for an at-least-once source. Razorpay retries a webhook for up
   * to 24 hours; with a key the trail keeps one row per real event instead of
   * one per retry.
   */
  idempotencyKey?: string | null;

  requestId?: string | null;
  ip?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type MoneyAuditResult =
  | { ok: true; wrote: true; id: string }
  | { ok: true; wrote: false; reason: 'duplicate' }
  | { ok: false; wrote: false; reason: string };

/** Column widths. Generous, but a runaway gateway payload must not own a row. */
const MAX_ID = 200;
const MAX_STATUS = 64;
const MAX_NOTE = 1000;
const MAX_METADATA_CHARS = 4096;
const MAX_METADATA_DEPTH = 4;

/**
 * Keys whose VALUE must never land in the audit log. Razorpay webhook bodies
 * and verify payloads carry `razorpay_signature`; config objects carry
 * `key_secret`. An audit trail that quietly persists a signing secret turns a
 * support tool into a credential store.
 */
const SECRET_KEY_PATTERN =
  /(signature|secret|password|passwd|token|authorization|api[-_]?key|private[-_]?key)/i;

/** `-1234.50`, `1234`, `0.05` — anything Postgres will accept as DECIMAL(10,2). */
const DECIMAL_PATTERN = /^-?\d{1,12}(\.\d+)?$/;

function clip(value: unknown, max: number): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value);
  if (s.length === 0) return null;
  return s.length > max ? s.slice(0, max) : s;
}

/** Recursively blank secret-shaped values; caps depth so a cycle cannot hang. */
function redactMetadata(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth >= MAX_METADATA_DEPTH) return '[depth-limited]';
  if (Array.isArray(value)) return value.map((v) => redactMetadata(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY_PATTERN.test(k) ? '[redacted]' : redactMetadata(v, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * Normalises an amount to a DECIMAL(10,2)-safe string.
 *
 * Returns `{ value: null, raw: '...' }` for anything unparseable rather than
 * letting it reach `$n::decimal`, where it would abort the INSERT. The rejected
 * text is handed back so the caller can preserve it in metadata — dropping a
 * disputed amount silently is the one thing worse than storing it oddly.
 */
export function normalizeAmount(input: AmountLike | null | undefined): {
  value: string | null;
  raw: string | null;
} {
  if (input === null || input === undefined) return { value: null, raw: null };
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return { value: null, raw: String(input) };
    return { value: input.toFixed(2), raw: null };
  }
  const text = String(input).trim();
  if (!DECIMAL_PATTERN.test(text)) return { value: null, raw: text || null };
  return { value: text, raw: null };
}

const INSERT_SQL = `INSERT INTO "money_audit_events" (
  "id","event_type","occurred_at","actor_type","actor_id","subject_type","subject_id",
  "booking_id","payment_id","commission_id","payout_id",
  "amount","currency","gateway","gateway_order_id","gateway_payment_id","gateway_refund_id",
  "status_before","status_after","idempotency_key","request_id","ip","note","metadata"
) VALUES (
  $1::uuid,$2,$3::timestamp,$4,$5,$6,$7,
  $8,$9,$10,$11,
  $12::decimal,$13,$14,$15,$16,$17,
  $18,$19,$20,$21,$22,$23,$24::jsonb
) ON CONFLICT ("idempotency_key") DO NOTHING`;

/** Set once so a missing table produces one loud line, not one per event. */
let warnedMissingTable = false;

function isMissingTable(err: unknown): boolean {
  const code = (err as { code?: unknown })?.code;
  if (code === '42P01') return true;
  const message = err instanceof Error ? err.message : String(err);
  return /money_audit_events(.*)does not exist/i.test(message);
}

/**
 * Append one money event. NEVER throws, NEVER joins a caller's transaction.
 *
 * Safe to `void` at a call site. Awaiting it is also safe and is preferable in
 * a request handler, where the extra millisecond buys the guarantee that the
 * row is down before the response goes out.
 */
export async function recordMoneyEvent(input: MoneyEventInput): Promise<MoneyAuditResult> {
  try {
    if (!input || !input.eventType) return { ok: false, wrote: false, reason: 'missing-event-type' };
    const subjectId = clip(input.subjectId, MAX_ID);
    if (!subjectId) return { ok: false, wrote: false, reason: 'missing-subject-id' };
    const subjectType = clip(input.subjectType, MAX_STATUS);
    if (!subjectType) return { ok: false, wrote: false, reason: 'missing-subject-type' };

    const id = randomUUID();
    const when =
      input.occurredAt instanceof Date && !Number.isNaN(input.occurredAt.getTime())
        ? input.occurredAt
        : new Date();
    // TIMESTAMP(3) without time zone; bind UTC explicitly rather than relying
    // on the session TimeZone, so a trail read on another host still orders.
    const occurredAt = when.toISOString().replace('T', ' ').replace('Z', '');

    const { value: amount, raw: amountRaw } = normalizeAmount(input.amount);

    let metadata = input.metadata
      ? (redactMetadata(input.metadata) as Record<string, unknown>)
      : null;
    if (amountRaw !== null) metadata = { ...(metadata ?? {}), unparseableAmount: amountRaw };
    let metadataJson: string | null = null;
    if (metadata !== null) {
      try {
        const encoded = JSON.stringify(metadata);
        metadataJson =
          encoded !== undefined && encoded.length <= MAX_METADATA_CHARS
            ? encoded
            : JSON.stringify({ _truncated: true, _originalChars: encoded?.length ?? 0 });
      } catch {
        // Cycles, BigInt, anything else JSON refuses. Losing context is
        // acceptable; losing the event is not.
        metadataJson = JSON.stringify({ _unserializable: true });
      }
    }

    const rows = await prisma.$executeRawUnsafe(
      INSERT_SQL,
      id,
      clip(input.eventType, MAX_STATUS),
      occurredAt,
      clip(input.actorType, MAX_STATUS) ?? 'system',
      clip(input.actorId, MAX_ID),
      subjectType,
      subjectId,
      clip(input.bookingId, MAX_ID),
      clip(input.paymentId, MAX_ID),
      clip(input.commissionId, MAX_ID),
      clip(input.payoutId, MAX_ID),
      amount,
      clip(input.currency, 8) ?? 'INR',
      clip(input.gateway, MAX_STATUS),
      clip(input.gatewayOrderId, MAX_ID),
      clip(input.gatewayPaymentId, MAX_ID),
      clip(input.gatewayRefundId, MAX_ID),
      clip(input.statusBefore, MAX_STATUS),
      clip(input.statusAfter, MAX_STATUS),
      clip(input.idempotencyKey, MAX_ID),
      clip(input.requestId, MAX_ID),
      clip(input.ip, MAX_ID),
      clip(input.note, MAX_NOTE),
      metadataJson,
    );

    // ON CONFLICT DO NOTHING reports 0 rows for a retry of an event already
    // logged. That is a SUCCESS for an idempotent trail, and a different fact
    // from a failed write, so it gets its own outcome rather than `ok:false`.
    if (Number(rows) > 0) return { ok: true, wrote: true, id };
    if (input.idempotencyKey) return { ok: true, wrote: false, reason: 'duplicate' };
    // No key, no rows: the driver did not report a count (a mock, or a client
    // that returns undefined). Report the row as written — refusing to would
    // claim a failure that did not happen.
    return { ok: true, wrote: true, id };
  } catch (err) {
    if (isMissingTable(err)) {
      if (!warnedMissingTable) {
        warnedMissingTable = true;
        console.error(
          '[audit-money] money_audit_events is missing — migration ' +
            '20260820120000_ops05_money_audit_events has not been applied. ' +
            'Money events are NOT being recorded and disputes cannot be reconstructed.',
        );
      }
      return { ok: false, wrote: false, reason: 'table-missing' };
    }
    console.warn(
      '[audit-money] failed to record',
      input?.eventType,
      err instanceof Error ? err.message : String(err),
    );
    return { ok: false, wrote: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fire-and-forget form for call sites that must not add latency to a payment.
 *
 * Exists so the "do not await this inside your transaction" rule is visible in
 * the call site itself. `recordMoneyEvent` never rejects, so nothing here can
 * surface as an unhandled rejection.
 */
export function recordMoneyEventDetached(input: MoneyEventInput): void {
  void recordMoneyEvent(input).catch(() => undefined);
}

/**
 * Render a stored `occurred_at` as an unambiguous ISO instant.
 *
 * The column is `timestamp without time zone` and `recordMoneyEvent` always
 * binds UTC into it, so the stored value IS UTC. But when a driver hands the
 * value back as text rather than a Date — `2026-08-03 09:00:00.000` —
 * `new Date(...)` parses a space-separated, offset-less string as LOCAL time.
 * On this repo's own IST workstation that silently rewrote every audit
 * timestamp by 5h30m, which for a log whose entire value is "when, and in what
 * order" is a correctness bug, not a formatting one. Caught by the end-to-end
 * reconstruction test.
 */
function toIsoInstant(value: Date | string): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? String(value) : value.toISOString();
  }
  const text = String(value).trim();
  const bare = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2}(?:\.\d+)?)$/.exec(text);
  const parsed = new Date(bare ? `${bare[1]}T${bare[2]}Z` : text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString();
}

export interface MoneyAuditRow {
  id: string;
  eventType: string;
  occurredAt: string;
  actorType: string;
  actorId: string | null;
  subjectType: string;
  subjectId: string;
  bookingId: string | null;
  paymentId: string | null;
  commissionId: string | null;
  payoutId: string | null;
  amount: string | null;
  currency: string;
  gateway: string | null;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  gatewayRefundId: string | null;
  statusBefore: string | null;
  statusAfter: string | null;
  requestId: string | null;
  ip: string | null;
  note: string | null;
  metadata: unknown;
}

interface RawTrailRow {
  id: string;
  event_type: string;
  occurred_at: Date | string;
  actor_type: string;
  actor_id: string | null;
  subject_type: string;
  subject_id: string;
  booking_id: string | null;
  payment_id: string | null;
  commission_id: string | null;
  payout_id: string | null;
  amount: unknown;
  currency: string;
  gateway: string | null;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  gateway_refund_id: string | null;
  status_before: string | null;
  status_after: string | null;
  request_id: string | null;
  ip: string | null;
  note: string | null;
  metadata: unknown;
}

const TRAIL_SQL = `SELECT "id","event_type","occurred_at","actor_type","actor_id","subject_type","subject_id",
       "booking_id","payment_id","commission_id","payout_id","amount","currency",
       "gateway","gateway_order_id","gateway_payment_id","gateway_refund_id",
       "status_before","status_after","request_id","ip","note","metadata"
  FROM "money_audit_events"
 WHERE ($1::text IS NULL OR "booking_id" = $1)
   AND ($2::text IS NULL OR "payment_id" = $2)
   AND ($3::text IS NULL OR "commission_id" = $3)
   AND ($4::text IS NULL OR "payout_id" = $4)
 ORDER BY "occurred_at" ASC, "id" ASC
 LIMIT `;

export interface MoneyTrailQuery {
  bookingId?: string | null;
  paymentId?: string | null;
  commissionId?: string | null;
  payoutId?: string | null;
  limit?: number;
}

/**
 * "What happened to this payment", oldest first — the read a dispute is
 * answered from.
 *
 * `available:false` means the log could not be READ, which is a different fact
 * from "nothing happened" and must never be rendered as one. Requires at least
 * one filter: an unfiltered dump of every money event in the system is not a
 * support query, it is an export.
 */
export async function getMoneyTrail(
  query: MoneyTrailQuery,
): Promise<{ events: MoneyAuditRow[]; available: boolean; reason?: string }> {
  const bookingId = clip(query?.bookingId, MAX_ID);
  const paymentId = clip(query?.paymentId, MAX_ID);
  const commissionId = clip(query?.commissionId, MAX_ID);
  const payoutId = clip(query?.payoutId, MAX_ID);
  if (!bookingId && !paymentId && !commissionId && !payoutId) {
    return { events: [], available: false, reason: 'no-filter' };
  }
  const limit = Math.min(Math.max(Math.trunc(Number(query?.limit) || 200), 1), 1000);
  try {
    const rows = await prisma.$queryRawUnsafe<RawTrailRow[]>(
      `${TRAIL_SQL}${limit}`,
      bookingId,
      paymentId,
      commissionId,
      payoutId,
    );
    return {
      events: (rows ?? []).map((r) => ({
        id: r.id,
        eventType: r.event_type,
        occurredAt: toIsoInstant(r.occurred_at),
        actorType: r.actor_type,
        actorId: r.actor_id,
        subjectType: r.subject_type,
        subjectId: r.subject_id,
        bookingId: r.booking_id,
        paymentId: r.payment_id,
        commissionId: r.commission_id,
        payoutId: r.payout_id,
        amount: r.amount === null || r.amount === undefined ? null : String(r.amount),
        currency: r.currency,
        gateway: r.gateway,
        gatewayOrderId: r.gateway_order_id,
        gatewayPaymentId: r.gateway_payment_id,
        gatewayRefundId: r.gateway_refund_id,
        statusBefore: r.status_before,
        statusAfter: r.status_after,
        requestId: r.request_id,
        ip: r.ip,
        note: r.note,
        metadata: r.metadata ?? null,
      })),
      available: true,
    };
  } catch (err) {
    console.warn(
      '[audit-money] trail read failed:',
      err instanceof Error ? err.message : String(err),
    );
    return { events: [], available: false, reason: 'read-failed' };
  }
}

/** Test seam — clears the one-shot missing-table warning latch. */
export function __resetAuditMoneyForTests(): void {
  warnedMissingTable = false;
}
