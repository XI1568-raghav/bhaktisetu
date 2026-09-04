-- DI-06 / DI-07 (completion) -- `payments`, the money table both earlier
-- migrations left out.
--
-- WHY A THIRD MIGRATION EXISTS
--
-- 20260824000000_di0607_money_key_indexes closed four keys on `commissions`
-- and `temple_payouts`. 20260902000000_di06_priest_payout_booking_key closed a
-- fifth on `priest_payouts`, having found that "four" was the wrong
-- denominator. Re-enumerating on 2026-09-02 against HEAD turned up the same
-- omission one table over, and it is the table every rupee enters through:
--
--   `payments.gateway_order_id`   -- NO index of any kind, and NO uniqueness.
--   `payments.booking_id`         -- NO index (Postgres does not index the
--                                    referencing side of a foreign key; only
--                                    the referenced side gets one, from its PK).
--   `payments.gateway_payment_id` -- indexed since the baseline, NOT unique.
--
-- schema.prisma model Payment declared exactly four @@index entries
-- (gatewayPaymentId, userId, status, [status, createdAt desc]) and zero
-- @@unique -- so `gateway_order_id`, the natural key of a Razorpay order, was
-- neither fast nor unique.
--
-- DI-07 (the index half). These are not cold columns:
--
--   services/payment.service.ts:875    verifyPayment -- findFirst({ gatewayOrderId })
--                                      runs on EVERY successful checkout
--   services/payment.service.ts:1239   store-order verify -- same lookup
--   services/payment.service.ts:1411   `payment.captured` webhook
--   services/payment.service.ts:1731   `payment.failed` webhook
--   jobs/reconcile-payments.ts:159/241 the daily stuck-payment sweep
--   services/payment.service.ts:770    createOrder idempotency guard --
--                                      findFirst({ bookingId, status IN (...) })
--   routes/admin-bookings.ts:634       the refund rail's capture lookup --
--                                      findFirst({ bookingId, status IN (...) })
--
-- Every one of those was a sequential scan of the whole payments table, and the
-- first and last run inside a money transaction.
--
-- DI-06 (the uniqueness half). One Payment row per Razorpay order and one per
-- Razorpay payment is asserted in application code and nowhere else. Both
-- `prisma.payment.create` call sites (payment.service.ts:806 and :1157) mint a
-- FRESH Razorpay order immediately before inserting, so the key is 1:1 by
-- construction -- which is precisely why a constraint costs nothing here, and
-- why its absence is the kind of thing nobody notices until the day it matters.
-- The lookups above are all `findFirst`: with a duplicate they pick an
-- arbitrary row, so a refund webhook would settle against one Payment while the
-- capture lived on the other.
--
-- NULLs are permitted and stay permitted: both columns are nullable, a Payment
-- row exists before the gateway ids are known, and Postgres treats NULLs as
-- distinct in a unique index by default (NULLS DISTINCT). No partial predicate
-- is needed, and the non-partial form is the one expressible as a Prisma
-- `@@unique` when these are promoted.
--
-- REPO INVARIANTS RESPECTED (the same set both earlier migrations list)
--   * PLAIN `CREATE INDEX`, never CONCURRENTLY. `prisma migrate deploy` wraps
--     each migration in a transaction; CONCURRENTLY inside one fails with
--     25001 and then blocks every later migration. This repo lost two months to
--     exactly that.
--   * Each UNIQUE index is created only after this same transaction proves the
--     key clean, and the CREATE is additionally wrapped in its own exception
--     block that RAISEs a WARNING instead of aborting. Two guards, because
--     either alone still has a hole: the pre-check can be raced by a writer
--     committing between the count and the index taking its lock, and a bare
--     handler with no pre-check would swallow genuine errors on a known-dirty
--     table. Either way the migration COMMITS and the API boots -- migrations
--     auto-apply on boot (render.yaml -> `prisma migrate deploy && node
--     dist/server.js`), so an aborting migration is an outage.
--   * ADDITIVE ONLY. No column retyped, no row deleted or rewritten, and no
--     de-duplication: choosing which of two payment rows is the real one is a
--     human decision with the gateway dashboard open, never a boot script's.
--   * Every statement is IF NOT EXISTS, so a partially applied run re-runs.
--   * The two plain indexes ARE declared in schema.prisma (they are
--     unconditional); the UNIQUE indexes are NOT, because they are conditional
--     and schema.prisma must describe what is guaranteed rather than what is
--     hoped for. Index names follow Prisma's own conventions, so promoting them
--     later is a schema-only edit with no further SQL.
--
-- To see what landed:  node apps/api/scripts/check-money-key-duplicates.mjs

-- --- DI-07: the money-path lookup indexes (unconditional) ------------------

CREATE INDEX IF NOT EXISTS "payments_gateway_order_id_idx"
  ON "payments" ("gateway_order_id");

CREATE INDEX IF NOT EXISTS "payments_booking_id_idx"
  ON "payments" ("booking_id");

-- --- DI-06: the uniqueness constraints (skipped, loudly, if already dirty) --

-- At most one Payment per Razorpay ORDER. Read by verifyPayment
-- (payment.service.ts:875), the store-order verify (:1239), the
-- `payment.captured` (:1411) and `payment.failed` (:1731) webhook branches, and
-- the reconciliation sweep -- all `findFirst`, all assuming exactly one row.
DO $di06$
DECLARE
  dupes bigint;
BEGIN
  -- NULLs excluded: a unique index would not have collided on them anyway
  -- (NULLS DISTINCT is the Postgres default), so counting them would skip a
  -- constraint that would in fact have been created without incident. A
  -- Payment row legitimately carries a NULL gateway id before the order is
  -- opened, and keeps it if the gateway call fails.
  SELECT count(*) INTO dupes FROM (
    SELECT "gateway_order_id" FROM "payments"
    WHERE "gateway_order_id" IS NOT NULL
    GROUP BY "gateway_order_id" HAVING count(*) > 1
  ) d;

  IF dupes > 0 THEN
    RAISE WARNING 'DI-06: payments.gateway_order_id holds % duplicated key value(s); UNIQUE index payments_gateway_order_id_key SKIPPED so the API can still boot. Run apps/api/scripts/check-money-key-duplicates.mjs, resolve them, then create the index by hand.', dupes;
  ELSE
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS "payments_gateway_order_id_key" ON "payments" ("gateway_order_id");
    EXCEPTION WHEN OTHERS THEN
      -- Reached only if a concurrent writer committed a duplicate between the
      -- count above and this statement taking its lock. The subtransaction
      -- rolls back just this CREATE; the migration still commits, the API still
      -- boots, and the warning says the constraint is absent.
      RAISE WARNING 'DI-06: UNIQUE index payments_gateway_order_id_key on payments.gateway_order_id could not be created (%); SKIPPED so the API can still boot.', SQLERRM;
    END;
  END IF;
END;
$di06$;

-- At most one Payment per Razorpay PAYMENT id. Read by the `refund.created` /
-- `refund.processed` webhook branch (payment.service.ts:1789), which is the
-- branch that unwinds the provider ledger -- so an arbitrary pick there refunds
-- against one row and leaves the other's earning fully withdrawable.
DO $di06$
DECLARE
  dupes bigint;
BEGIN
  -- NULLs excluded, same reason as above: the id does not exist until the
  -- devotee actually pays.
  SELECT count(*) INTO dupes FROM (
    SELECT "gateway_payment_id" FROM "payments"
    WHERE "gateway_payment_id" IS NOT NULL
    GROUP BY "gateway_payment_id" HAVING count(*) > 1
  ) d;

  IF dupes > 0 THEN
    RAISE WARNING 'DI-06: payments.gateway_payment_id holds % duplicated key value(s); UNIQUE index payments_gateway_payment_id_key SKIPPED so the API can still boot. Run apps/api/scripts/check-money-key-duplicates.mjs, resolve them, then create the index by hand.', dupes;
  ELSE
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS "payments_gateway_payment_id_key" ON "payments" ("gateway_payment_id");
    EXCEPTION WHEN OTHERS THEN
      -- Reached only if a concurrent writer committed a duplicate between the
      -- count above and this statement taking its lock. The subtransaction
      -- rolls back just this CREATE; the migration still commits, the API still
      -- boots, and the warning says the constraint is absent.
      RAISE WARNING 'DI-06: UNIQUE index payments_gateway_payment_id_key on payments.gateway_payment_id could not be created (%); SKIPPED so the API can still boot.', SQLERRM;
    END;
  END IF;
END;
$di06$;
