-- DI-06 / DI-07 — database-level key integrity for the two money ledgers.
--
-- DI-07 (unconditional, below): `commissions.booking_id` and
-- `temple_payouts.booking_id` had NO index. Both are read by an idempotency
-- guard on every payment confirm (payment.service.ts:266,
-- temple-payout.service.ts:76), so every confirm sequentially scanned the whole
-- ledger inside the payment transaction. These two CREATE INDEX statements use
-- the exact names Prisma generates for the matching `@@index([bookingId])`
-- entries added to schema.prisma in the same change, so `prisma migrate dev`
-- reports no drift later.
--
-- DI-06 (conditional, below): every idempotency guard in the product is
-- findFirst-then-create with nothing behind it at the database layer. Ten
-- writers rely on "at most one Commission per booking / per store order / per
-- wellness enrollment" and "at most one TemplePayout per booking", and not one
-- of those four rules was expressed as a constraint.
--
-- WHY THE UNIQUE INDEXES ARE CONDITIONAL, AND WHY THAT IS NOT TIMIDITY
--
-- Migrations auto-apply on API boot (render.yaml -> apps/api/package.json
-- `prisma migrate deploy && node dist/server.js`). A UNIQUE index created over
-- a table that ALREADY contains duplicates fails, aborts the migration, and the
-- API never starts. Production has been suspended since 2026-08-17, so the
-- current contents of these tables cannot be inspected — the duplicate count is
-- genuinely unknown, not merely unchecked. Creating the index unconditionally
-- would be betting the API's ability to boot on an unverifiable assumption
-- about a money table.
--
-- So each UNIQUE index is created only after this same transaction proves the
-- key currently holds no duplicates, and the CREATE is additionally wrapped in
-- its own exception block. Two guards, because either alone still has a hole:
-- the pre-check can be raced by a writer committing between the count and the
-- index's lock, and a bare handler with no pre-check would swallow genuine
-- errors on a table that is known-dirty. Whichever way it goes the migration
-- SUCCEEDS and the API boots; a skipped constraint is announced with RAISE
-- WARNING naming the key and the duplicate count, never swallowed silently.
--
-- To find out what actually landed, and to clean up so the skipped ones can be
-- promoted, run:  node apps/api/scripts/check-money-key-duplicates.mjs
--
-- OTHER REPO INVARIANTS RESPECTED
--   * PLAIN `CREATE INDEX`, never CONCURRENTLY. `prisma migrate deploy` wraps
--     each migration in a transaction and CONCURRENTLY inside a transaction
--     fails with 25001 and then blocks every subsequent migration — this repo
--     lost two months to exactly that. These tables are small; plain CREATE
--     INDEX takes a brief SHARE lock and returns in milliseconds.
--   * ADDITIVE ONLY. No table altered, no column dropped or retyped, no row
--     deleted or rewritten. In particular this migration does NOT clean up
--     duplicates itself: de-duplicating a commission ledger means deleting a
--     row that may be a real unpaid payable, which is a decision for a human
--     with the numbers in front of them, not for an unattended boot script.
--   * Every statement is IF NOT EXISTS, so a partially applied run re-runs.
--   * The UNIQUE indexes are NOT declared as `@@unique` in schema.prisma. They
--     are conditional, and schema.prisma must describe what is guaranteed, not
--     what is hoped for. Once the checker script reports all four keys clean
--     across environments, promote them there — the index names below are
--     already Prisma's `@@unique` naming convention, so that promotion is a
--     schema-only edit with no further SQL.
--   * Non-partial UNIQUE, not `... WHERE booking_id IS NOT NULL`. Postgres
--     treats NULLs as distinct in a unique index by default, so the plain form
--     already permits the many store-order and wellness rows whose booking_id
--     is NULL. It behaves identically to the partial form here and, unlike the
--     partial form, it is expressible as a Prisma `@@unique`.

-- ─── DI-07: the confirm-path lookup indexes (unconditional) ─────────────────

CREATE INDEX IF NOT EXISTS "commissions_booking_id_idx"
  ON "commissions" ("booking_id");

CREATE INDEX IF NOT EXISTS "temple_payouts_booking_id_idx"
  ON "temple_payouts" ("booking_id");

-- ─── DI-06: the uniqueness constraints (skipped, loudly, if already dirty) ──
--
-- Four explicit blocks rather than one loop over a VALUES list: this is a money
-- migration, and a reader auditing it should be able to grep the exact index
-- names and the exact tables without mentally executing PL/pgSQL.

-- At most one Commission per booking. Asserted today by findFirst guards in
-- payment.service.ts:266, consultation.ts:178, provider-earning-mint.ts:112 and
-- booking.service.ts:874 — four writers, one rule, zero constraints.
DO $di06$
DECLARE
  dupes bigint;
BEGIN
  -- NULLs are excluded: a unique index would not have collided on them anyway
  -- (NULLS DISTINCT is the Postgres default), so counting them would skip a
  -- constraint that would in fact have been created without incident.
  SELECT count(*) INTO dupes FROM (
    SELECT "booking_id" FROM "commissions"
    WHERE "booking_id" IS NOT NULL
    GROUP BY "booking_id" HAVING count(*) > 1
  ) d;

  IF dupes > 0 THEN
    RAISE WARNING 'DI-06: commissions.booking_id holds % duplicated key value(s); UNIQUE index commissions_booking_id_key SKIPPED so the API can still boot. Run apps/api/scripts/check-money-key-duplicates.mjs, resolve them, then create the index by hand.', dupes;
  ELSE
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS "commissions_booking_id_key" ON "commissions" ("booking_id");
    EXCEPTION WHEN OTHERS THEN
      -- Reached only if a concurrent writer committed a duplicate between the
      -- count above and this statement taking its lock. The subtransaction
      -- rolls back just this CREATE; the migration still commits, the API still
      -- boots, and the warning says the constraint is absent.
      RAISE WARNING 'DI-06: UNIQUE index commissions_booking_id_key on commissions.booking_id could not be created (%); SKIPPED so the API can still boot.', SQLERRM;
    END;
  END IF;
END;
$di06$;

-- At most one Commission per store order (store-commission.service.ts:27).
DO $di06$
DECLARE
  dupes bigint;
BEGIN
  -- NULLs are excluded: a unique index would not have collided on them anyway
  -- (NULLS DISTINCT is the Postgres default), so counting them would skip a
  -- constraint that would in fact have been created without incident.
  SELECT count(*) INTO dupes FROM (
    SELECT "store_order_id" FROM "commissions"
    WHERE "store_order_id" IS NOT NULL
    GROUP BY "store_order_id" HAVING count(*) > 1
  ) d;

  IF dupes > 0 THEN
    RAISE WARNING 'DI-06: commissions.store_order_id holds % duplicated key value(s); UNIQUE index commissions_store_order_id_key SKIPPED so the API can still boot. Run apps/api/scripts/check-money-key-duplicates.mjs, resolve them, then create the index by hand.', dupes;
  ELSE
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS "commissions_store_order_id_key" ON "commissions" ("store_order_id");
    EXCEPTION WHEN OTHERS THEN
      -- Reached only if a concurrent writer committed a duplicate between the
      -- count above and this statement taking its lock. The subtransaction
      -- rolls back just this CREATE; the migration still commits, the API still
      -- boots, and the warning says the constraint is absent.
      RAISE WARNING 'DI-06: UNIQUE index commissions_store_order_id_key on commissions.store_order_id could not be created (%); SKIPPED so the API can still boot.', SQLERRM;
    END;
  END IF;
END;
$di06$;

-- At most one Commission per wellness enrollment (wellness-sessions.ts:84).
DO $di06$
DECLARE
  dupes bigint;
BEGIN
  -- NULLs are excluded: a unique index would not have collided on them anyway
  -- (NULLS DISTINCT is the Postgres default), so counting them would skip a
  -- constraint that would in fact have been created without incident.
  SELECT count(*) INTO dupes FROM (
    SELECT "wellness_enrollment_id" FROM "commissions"
    WHERE "wellness_enrollment_id" IS NOT NULL
    GROUP BY "wellness_enrollment_id" HAVING count(*) > 1
  ) d;

  IF dupes > 0 THEN
    RAISE WARNING 'DI-06: commissions.wellness_enrollment_id holds % duplicated key value(s); UNIQUE index commissions_wellness_enrollment_id_key SKIPPED so the API can still boot. Run apps/api/scripts/check-money-key-duplicates.mjs, resolve them, then create the index by hand.', dupes;
  ELSE
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS "commissions_wellness_enrollment_id_key" ON "commissions" ("wellness_enrollment_id");
    EXCEPTION WHEN OTHERS THEN
      -- Reached only if a concurrent writer committed a duplicate between the
      -- count above and this statement taking its lock. The subtransaction
      -- rolls back just this CREATE; the migration still commits, the API still
      -- boots, and the warning says the constraint is absent.
      RAISE WARNING 'DI-06: UNIQUE index commissions_wellness_enrollment_id_key on commissions.wellness_enrollment_id could not be created (%); SKIPPED so the API can still boot.', SQLERRM;
    END;
  END IF;
END;
$di06$;

-- At most one TemplePayout per booking (temple-payout.service.ts:76). That
-- guard even carries a comment admitting the missing UNIQUE index makes it a
-- TOCTOU and filing the schema change with the owner; this is that change.
DO $di06$
DECLARE
  dupes bigint;
BEGIN
  -- NULLs are excluded: a unique index would not have collided on them anyway
  -- (NULLS DISTINCT is the Postgres default), so counting them would skip a
  -- constraint that would in fact have been created without incident.
  SELECT count(*) INTO dupes FROM (
    SELECT "booking_id" FROM "temple_payouts"
    WHERE "booking_id" IS NOT NULL
    GROUP BY "booking_id" HAVING count(*) > 1
  ) d;

  IF dupes > 0 THEN
    RAISE WARNING 'DI-06: temple_payouts.booking_id holds % duplicated key value(s); UNIQUE index temple_payouts_booking_id_key SKIPPED so the API can still boot. Run apps/api/scripts/check-money-key-duplicates.mjs, resolve them, then create the index by hand.', dupes;
  ELSE
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS "temple_payouts_booking_id_key" ON "temple_payouts" ("booking_id");
    EXCEPTION WHEN OTHERS THEN
      -- Reached only if a concurrent writer committed a duplicate between the
      -- count above and this statement taking its lock. The subtransaction
      -- rolls back just this CREATE; the migration still commits, the API still
      -- boots, and the warning says the constraint is absent.
      RAISE WARNING 'DI-06: UNIQUE index temple_payouts_booking_id_key on temple_payouts.booking_id could not be created (%); SKIPPED so the API can still boot.', SQLERRM;
    END;
  END IF;
END;
$di06$;
