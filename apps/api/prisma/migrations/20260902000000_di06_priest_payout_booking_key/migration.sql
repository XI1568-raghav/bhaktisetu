-- DI-06 (completion) — the FIFTH money-table idempotency key.
--
-- WHY THIS EXISTS AS A SEPARATE MIGRATION
--
-- 20260824000000_di0607_money_key_indexes closed four keys and its own report
-- script announces "All four UNIQUE constraints are present". Four was the
-- wrong denominator. Re-enumerating every findFirst-then-create guard over a
-- money table on 2026-09-02 turned up a fifth with the identical shape and no
-- constraint behind it:
--
--   payment.service.ts createPriestPayout
--     const existingPayout = await prisma.priestPayout.findFirst({
--       where: { bookingId }, ...
--     });
--     if (existingPayout) throw new Error('A payout already exists ...');
--
-- That is "at most one PriestPayout per booking", asserted in application code
-- and nowhere else. `priest_payouts` is rail B, the LEGACY pandit-only payout
-- rail, and it is the rail that actually moves money to a pandit on the temple
-- booking path — so a duplicate row there is a duplicate real bank transfer,
-- not a bookkeeping smudge.
--
-- Measured against production on 2026-09-02 (the database was suspended when
-- the August migration was written, which is why it could not check):
--   priest_payouts rows                 : 0
--   priest_payouts duplicate booking_id : 0
--   pg_constraint contype IN ('u','x') across puja_bookings, commissions,
--     temple_payouts, payout_requests, payments, store_orders, priest_payouts,
--     donations, wellness_enrollments : EMPTY, exactly as the finding reported
-- Both statements below will therefore succeed on production as written.
--
-- WHY IT IS A NEW FILE RATHER THAN AN EDIT TO THE AUGUST MIGRATION
-- `_prisma_migrations` stores a checksum per migration. Editing a migration
-- that any environment has already applied makes `prisma migrate deploy` abort
-- with a checksum mismatch on that environment — and migrations auto-apply on
-- API boot here, so that abort is an outage. Additive, never retroactive.
--
-- REPO INVARIANTS RESPECTED (same set the August migration lists)
--   * PLAIN `CREATE INDEX`, never CONCURRENTLY. `prisma migrate deploy` wraps
--     each migration in a transaction; CONCURRENTLY inside one fails with
--     25001 and then blocks every later migration. This repo lost two months
--     to precisely that.
--   * The UNIQUE index is created only after this same transaction proves the
--     key clean, and the CREATE is additionally wrapped in its own exception
--     block that RAISEs a WARNING instead of aborting. Two guards, because
--     either alone still has a hole: the pre-check can be raced by a writer
--     committing between the count and the index taking its lock, and a bare
--     handler with no pre-check would swallow genuine errors on a known-dirty
--     table. Either way the migration COMMITS and the API boots.
--   * ADDITIVE ONLY. No column retyped, no row deleted or rewritten, and no
--     de-duplication: choosing which of two payout rows is the real payable is
--     a human decision with the amounts in front of them, never an unattended
--     boot script's.
--   * Every statement is IF NOT EXISTS, so a partially applied run re-runs.
--   * The UNIQUE index is NOT declared `@@unique` in schema.prisma. It is
--     conditional, and schema.prisma must describe what is guaranteed rather
--     than what is hoped for. The plain `@@index([bookingId])` IS declared,
--     because that one is unconditional. Index names follow Prisma's own
--     conventions, so promoting the unique later is a schema-only edit.
--
-- To see what landed:  node apps/api/scripts/check-money-key-duplicates.mjs

-- ─── The lookup index (unconditional) ──────────────────────────────────────
--
-- Postgres does NOT index the referencing side of a foreign key — only the
-- referenced side gets one, from its primary key. `PriestPayout.booking`
-- therefore bought this table nothing on the read path, and the guard above
-- scanned the whole payout ledger on every payout attempt. Same omission, same
-- reason, as temple_payouts and commissions in the August migration.
CREATE INDEX IF NOT EXISTS "priest_payouts_booking_id_idx"
  ON "priest_payouts" ("booking_id");

-- ─── The uniqueness constraint (skipped, loudly, if already dirty) ─────────
DO $di06$
DECLARE
  dupes bigint;
BEGIN
  -- `priest_payouts.booking_id` is NOT NULL (schema.prisma: `bookingId String
  -- @map("booking_id") @db.Uuid`, no `?`), so unlike the commissions keys there
  -- is no NULLS-DISTINCT subtlety here — every row participates.
  SELECT count(*) INTO dupes FROM (
    SELECT "booking_id" FROM "priest_payouts"
    GROUP BY "booking_id" HAVING count(*) > 1
  ) d;

  IF dupes > 0 THEN
    RAISE WARNING 'DI-06: priest_payouts.booking_id holds % duplicated key value(s); UNIQUE index priest_payouts_booking_id_key SKIPPED so the API can still boot. Run apps/api/scripts/check-money-key-duplicates.mjs, resolve them, then create the index by hand.', dupes;
  ELSE
    BEGIN
      CREATE UNIQUE INDEX IF NOT EXISTS "priest_payouts_booking_id_key" ON "priest_payouts" ("booking_id");
    EXCEPTION WHEN OTHERS THEN
      -- Reached only if a concurrent writer committed a duplicate between the
      -- count above and this statement taking its lock. The subtransaction
      -- rolls back just this CREATE; the migration still commits, the API still
      -- boots, and the warning says the constraint is absent.
      RAISE WARNING 'DI-06: UNIQUE index priest_payouts_booking_id_key on priest_payouts.booking_id could not be created (%); SKIPPED so the API can still boot.', SQLERRM;
    END;
  END IF;
END;
$di06$;
