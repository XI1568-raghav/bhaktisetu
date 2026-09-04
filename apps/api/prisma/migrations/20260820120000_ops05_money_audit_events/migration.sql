-- OPS-05 (P1) — there is no durable audit trail for money events.
--
-- 66 models in schema.prisma before this one, none of them an audit log. The
-- money state machine stored only its CURRENT state (Payment.status,
-- Commission.status, PayoutRequest.status) plus ad-hoc breadcrumbs smeared into
-- Payment.metadata (refundId, refundFailureReason, refundInitiatedBy) which the
-- next write overwrites. A disputed booking or refund therefore could not be
-- reconstructed from anything the product stores: not who refunded, not which
-- rail captured, not what the status was BEFORE the write. The only trace was
-- the Render log stream — days of retention on the free plan, not queryable per
-- booking, and gone entirely once a service is suspended.
--
-- This migration is ADDITIVE ONLY and safe to run unattended against a live
-- database (invariant: migrations auto-apply on API boot via
-- `prisma migrate deploy && node dist/server.js`):
--   * one new table, no existing table altered, no column dropped, no type
--     changed, no data rewritten;
--   * no foreign keys, so no lock is taken on payments / puja_bookings /
--     commissions and no cascade path is created into or out of the log;
--   * every statement is IF NOT EXISTS / OR REPLACE, so a partially applied
--     run is re-runnable;
--   * PLAIN `CREATE INDEX`, never CONCURRENTLY. `prisma migrate deploy` wraps
--     each migration in a transaction and CONCURRENTLY inside a transaction
--     fails with 25001 and then blocks every subsequent migration — this repo
--     lost two months to exactly that. On an empty new table plain CREATE INDEX
--     is sub-millisecond.
--
-- The column list below is byte-for-byte what `prisma migrate diff` generates
-- for model MoneyAuditEvent, with IF NOT EXISTS added; keeping it identical is
-- what stops `prisma migrate dev` reporting drift later.

-- CreateTable
CREATE TABLE IF NOT EXISTS "money_audit_events" (
    "id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_type" TEXT NOT NULL DEFAULT 'system',
    "actor_id" TEXT,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "payment_id" TEXT,
    "commission_id" TEXT,
    "payout_id" TEXT,
    "amount" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "gateway" TEXT,
    "gateway_order_id" TEXT,
    "gateway_payment_id" TEXT,
    "gateway_refund_id" TEXT,
    "status_before" TEXT,
    "status_after" TEXT,
    "idempotency_key" TEXT,
    "request_id" TEXT,
    "ip" TEXT,
    "note" TEXT,
    "metadata" JSONB,

    CONSTRAINT "money_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- "everything that happened to this booking / this payment", in order — the
-- single query a support or dispute answer is made of.
CREATE INDEX IF NOT EXISTS "money_audit_events_booking_id_occurred_at_idx" ON "money_audit_events"("booking_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "money_audit_events_payment_id_occurred_at_idx" ON "money_audit_events"("payment_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "money_audit_events_commission_id_idx" ON "money_audit_events"("commission_id");
CREATE INDEX IF NOT EXISTS "money_audit_events_payout_id_idx" ON "money_audit_events"("payout_id");
CREATE INDEX IF NOT EXISTS "money_audit_events_actor_id_occurred_at_idx" ON "money_audit_events"("actor_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "money_audit_events_event_type_occurred_at_idx" ON "money_audit_events"("event_type", "occurred_at" DESC);
CREATE INDEX IF NOT EXISTS "money_audit_events_occurred_at_idx" ON "money_audit_events"("occurred_at" DESC);

-- One row per real event even though Razorpay retries a webhook for up to 24
-- hours. NULLs never collide in a Postgres unique index, so callers that cannot
-- name a stable key simply pass none.
CREATE UNIQUE INDEX IF NOT EXISTS "money_audit_events_idempotency_key_key" ON "money_audit_events"("idempotency_key");

-- APPEND-ONLY, ENFORCED BY THE DATABASE.
--
-- The writer in apps/api/src/lib/audit-money.ts exposes no update and no delete,
-- but an audit log whose only guarantee is "the application promises not to"
-- is not evidence in a dispute. This trigger makes UPDATE and DELETE on the log
-- fail loudly for every caller, including psql and any future code path.
--
-- Dollar-quoted plpgsql is already proven under this repo's `migrate deploy`
-- (see the DO $$ ... $$ blocks in 20260520010000_admin_p0_p1_bundle, applied in
-- production). ERRCODE 0A000 = feature_not_supported, which is the honest
-- classification: mutation of this table is not a supported operation.
CREATE OR REPLACE FUNCTION "money_audit_events_append_only"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'money_audit_events is append-only; % is not permitted', TG_OP
    USING ERRCODE = '0A000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "money_audit_events_no_mutate" ON "money_audit_events";
CREATE TRIGGER "money_audit_events_no_mutate"
  BEFORE UPDATE OR DELETE ON "money_audit_events"
  FOR EACH ROW EXECUTE FUNCTION "money_audit_events_append_only"();
