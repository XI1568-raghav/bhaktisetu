-- DI-08 (F452) — create the two wallet tables the code has been querying
-- against a database that does not have them.
--
-- WHAT WAS MEASURED, NOT ASSUMED
--
-- Read-only query against production on 2026-09-08, for the four names the
-- reward rail is described in terms of:
--
--   tables present of (user_credits, credit_ledger_entries, referral_claims, wallets):
--     referral_claims        <- only this one
--   referral_claims rows: 0
--
-- `user_credits` and `credit_ledger_entries` are declared in schema.prisma
-- (models `UserCredit` and `CreditLedgerEntry`, added 2026-06-12 for
-- R-Q2-M-011) and NO migration in prisma/migrations/ has ever created them.
-- They were introduced by editing schema.prisma alone, so every generated
-- Prisma client believes in them and no database outside a freshly bootstrapped
-- one has them. `wallets` is a red herring: no such model and no such table has
-- ever been declared anywhere in this repo — the wallet IS these two tables.
--
-- WHY THIS IS NOT "ONLY THE REFERRAL RAIL"
--
-- `referral_claims` holding 0 rows says the reward path has probably never
-- fired, and the two routes that reach the wallet through it degrade rather
-- than crash:
--
--   routes/referrals.ts:238   POST /api/v1/referrals/reward -> creditUser
--                             -> 42P01, caught by isTableMissing (:42) ->
--                             HTTP 503 referral_tables_not_migrated.
--   services/payment.service.ts:537 fireAndForgetPostConfirmSideEffects
--                             -> tryRewardReferralForBooking (:102) ->
--                             creditUser -> 42P01, swallowed by its own
--                             try/catch (:154) -> console.warn only.
--
-- But the wallet is read by a SECOND, unrelated consumer that has no such
-- guard, and that one is not degrading — it is failing:
--
--   services/account-deletion.service.ts:488  checkEligibility ->
--     this.db.userCredit.findUnique  — no try/catch, no isTableMissing.
--     Reached by GET  /api/v1/account/deletion-eligibility (routes/account.ts:130),
--             POST /api/v1/account/deletion-request       (:178, via requestDeletion:537),
--             POST /api/v1/account/delete/confirm         (:287, via confirmDeletion:689),
--             DELETE /api/v1/account/                     (:291, same handler).
--     42P01 propagates: an unhandled 500 on every one of them.
--
--   services/account-deletion.service.ts:1252 anonymiseFinancialRows ->
--     tx.userCredit.findUnique — and this one runs INSIDE the purge
--     `$transaction` (:862 -> :867). That file's own comment at :303-307 states
--     the consequence exactly: "A failed statement inside a Postgres
--     transaction poisons the whole transaction — there is no catching your way
--     past 42P01 once it has fired". The entire account purge therefore rolls
--     back. That is the Apple 5.1.1(v) / Google Play in-app account deletion
--     requirement (routes/account.ts header, LC-DEL), and it cannot complete in
--     production today.
--
-- So the urgency is not the referral reward. It is that the account-deletion
-- rail — a store-compliance obligation — is broken by these two missing tables,
-- and the referral rail is merely the quiet one.
--
-- WHAT THIS MIGRATION CREATES
--
-- Exactly what schema.prisma declares for `UserCredit` (schema.prisma:2205) and
-- `CreditLedgerEntry` (:2227), byte-compatible with the DDL Prisma itself
-- generated into prisma/baseline/0_init.sql (:1309, :1321, :1937-1946,
-- :2186-2192), which is where a freshly bootstrapped database already gets
-- them. Including `credit_ledger_entries_user_id_idempotency_key_key`, the
-- UNIQUE that backs `@@unique([userId, idempotencyKey])` and that
-- services/wallet.service.ts:73 reads through
-- `findUnique({ where: { userId_idempotencyKey: ... } })` — without it the
-- reward rail has no idempotency at all and a webhook retry double-credits.
--
-- WHY EVERY STATEMENT IS CONDITIONAL
--
-- This runs on API boot (render.yaml -> apps/api/package.json,
-- `prisma migrate deploy && node dist/server.js`), so a migration that can fail
-- is an outage. It must be correct on THREE different starting states:
--
--   1. production, where neither table nor (possibly) the enum exists;
--   2. any database bootstrapped by scripts/bootstrap-fresh-db.mjs, where
--      prisma/baseline/0_init.sql ALREADY created both tables, all four
--      indexes, all three foreign keys AND the enum — so every statement here
--      must be a no-op rather than a duplicate-object error;
--   3. a database left half-built by an interrupted earlier run of this file.
--
-- `CREATE TYPE` and `ALTER TABLE ... ADD CONSTRAINT` have no IF NOT EXISTS in
-- PostgreSQL, so both are wrapped in catalogue lookups rather than exception
-- handlers — a lookup is cheap and, unlike a caught error, never leaves the
-- transaction in a doubtful state.
--
-- REPO INVARIANTS RESPECTED
--   * PLAIN `CREATE INDEX` / `CREATE UNIQUE INDEX`, never CONCURRENTLY.
--     `prisma migrate deploy` wraps each migration in a transaction and
--     CONCURRENTLY raises 25001 inside one — measured 2026-09-02 to raise it
--     even when the index already exists — and then blocks every LATER
--     migration. This project lost two months to exactly that. Both tables are
--     created empty by this same file on the only database that needs them, so
--     a plain CREATE takes a lock on nothing and returns immediately.
--   * ADDITIVE ONLY. Nothing is altered, retyped, deleted or rewritten. The
--     new tables start empty and no existing row is touched.
--   * Re-runnable. Every statement is a no-op on second application.
--   * The timestamp 20260908010000 sorts after 20260908000000 (the previous
--     newest) and collides with nothing — verified against prisma/migrations/,
--     where the only pre-existing collision is the 20260902000000 pair.

-- ─── 1. enum CreditLedgerReason ────────────────────────────────────────────
--
-- Labels and order are a character-for-character match for
-- schema.prisma:2218-2224 and baseline/0_init.sql:146. Order matters: it fixes
-- the enum's sort order, and a later ALTER TYPE ... ADD VALUE could not
-- reproduce a different one.
DO $di08$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE t.typname = 'CreditLedgerReason'
       AND n.nspname = current_schema()
  ) THEN
    CREATE TYPE "CreditLedgerReason" AS ENUM (
      'referral_reward', 'refund_to_credit', 'promo_grant', 'redemption_debit', 'adjustment'
    );
  END IF;
END;
$di08$;

-- ─── 2. user_credits ───────────────────────────────────────────────────────
--
-- One row per user. `balance_paise` is INTEGER and the storage convention is
-- PAISE, not rupees (schema.prisma:2199-2203) — the whole point of this table
-- is that the wallet never touches a Decimal or a float. The invariant
-- services/wallet.service.ts:137 verifies is
-- SUM(credit_ledger_entries.delta_paise) = user_credits.balance_paise.
CREATE TABLE IF NOT EXISTS "user_credits" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "balance_paise" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_credits_pkey" PRIMARY KEY ("id")
);

-- ─── 3. credit_ledger_entries ──────────────────────────────────────────────
--
-- Append-only. `delta_paise` is signed: positive credits, negative debits.
CREATE TABLE IF NOT EXISTS "credit_ledger_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "credit_id" UUID NOT NULL,
    "delta_paise" INTEGER NOT NULL,
    "reason" "CreditLedgerReason" NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- ─── 4. indexes ────────────────────────────────────────────────────────────
--
-- `user_credits_user_id_key` backs `@unique` on UserCredit.userId
-- (schema.prisma:2207) and is what makes `userCredit.upsert({ where: { userId } })`
-- at wallet.service.ts:87 a legal upsert rather than a Prisma validation error.
--
-- `credit_ledger_entries_user_id_idempotency_key_key` backs
-- `@@unique([userId, idempotencyKey])` (schema.prisma:2245). It is THE
-- constraint the reward rail's idempotency rests on: payment.service.ts:124 and
-- routes/referrals.ts:236 both key on `referral-reward-${claim.id}`, and
-- Razorpay retries a webhook for up to 24 hours, so without this index a retry
-- credits the referrer twice.
--
-- Both UNIQUE creations are guarded by a duplicate pre-count, the same shape
-- the four earlier DI-06/DI-07 migrations use. On the database this migration
-- exists FOR, the table was created empty three statements ago and the count is
-- necessarily 0; the guard earns its place on state (2) above, where the table
-- arrived from the baseline with rows already in it. A UNIQUE index over
-- existing duplicates aborts the migration, and an aborted migration on this
-- project is an outage, not a failed constraint — so a dirty key degrades to a
-- loud warning and a booting API rather than a dead one.
DO $di08$
DECLARE
  dupes bigint;
BEGIN
  SELECT count(*) INTO dupes FROM (
    SELECT "user_id" FROM "user_credits" GROUP BY "user_id" HAVING count(*) > 1
  ) d;

  IF dupes > 0 THEN
    RAISE WARNING 'DI-08: user_credits holds % duplicated user_id value(s); UNIQUE index user_credits_user_id_key SKIPPED so the API can still boot. Resolve them by hand, then create the index.', dupes;
  ELSE
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS "user_credits_user_id_key"
        ON "user_credits" ("user_id");
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'DI-08: UNIQUE index user_credits_user_id_key could not be created (%); SKIPPED so the API can still boot.', SQLERRM;
    END;
  END IF;
END;
$di08$;

DO $di08$
DECLARE
  dupes bigint;
BEGIN
  SELECT count(*) INTO dupes FROM (
    SELECT "user_id", "idempotency_key" FROM "credit_ledger_entries"
    GROUP BY "user_id", "idempotency_key" HAVING count(*) > 1
  ) d;

  IF dupes > 0 THEN
    RAISE WARNING 'DI-08: credit_ledger_entries holds % duplicated (user_id, idempotency_key) pair(s); UNIQUE index credit_ledger_entries_user_id_idempotency_key_key SKIPPED so the API can still boot. THE WALLET HAS NO IDEMPOTENCY UNTIL THIS IS RESOLVED — a webhook retry will double-credit. Resolve them by hand, then create the index.', dupes;
  ELSE
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS "credit_ledger_entries_user_id_idempotency_key_key"
        ON "credit_ledger_entries" ("user_id", "idempotency_key");
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'DI-08: UNIQUE index credit_ledger_entries_user_id_idempotency_key_key could not be created (%); SKIPPED so the API can still boot.', SQLERRM;
    END;
  END IF;
END;
$di08$;

-- Non-unique, so nothing can make them fail: the per-user history read
-- (`@@index([userId, createdAt])`, schema.prisma:2246) and the reason filter
-- (`@@index([reason])`, :2247).
CREATE INDEX IF NOT EXISTS "credit_ledger_entries_user_id_created_at_idx"
  ON "credit_ledger_entries" ("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "credit_ledger_entries_reason_idx"
  ON "credit_ledger_entries" ("reason");

-- ─── 5. foreign keys ───────────────────────────────────────────────────────
--
-- All three mirror schema.prisma's `onDelete: Cascade` relations exactly
-- (:2213, :2242, :2243). The cascade from `users` is load-bearing for the
-- account purge: account-deletion.service.ts zeroes the balance with a matching
-- ledger entry (:1258) and then the user row goes, taking both wallet rows with
-- it.
--
-- `ADD CONSTRAINT` has no IF NOT EXISTS, so each is guarded on pg_constraint by
-- name. Checking the NAME rather than the shape is deliberate: these names are
-- Prisma's own convention and are what the baseline creates, so a name match is
-- a shape match on every database this can meet.
DO $di08$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_credits_user_id_fkey'
      AND conrelid = '"user_credits"'::regclass
  ) THEN
    ALTER TABLE "user_credits"
      ADD CONSTRAINT "user_credits_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credit_ledger_entries_user_id_fkey'
      AND conrelid = '"credit_ledger_entries"'::regclass
  ) THEN
    ALTER TABLE "credit_ledger_entries"
      ADD CONSTRAINT "credit_ledger_entries_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credit_ledger_entries_credit_id_fkey'
      AND conrelid = '"credit_ledger_entries"'::regclass
  ) THEN
    ALTER TABLE "credit_ledger_entries"
      ADD CONSTRAINT "credit_ledger_entries_credit_id_fkey"
      FOREIGN KEY ("credit_id") REFERENCES "user_credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END;
$di08$;
