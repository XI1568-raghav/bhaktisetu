-- ops/sql/commission-default-80.sql
--
-- Run through the prod-db-task workflow (single transaction, ON_ERROR_STOP,
-- dry-run ends in ROLLBACK). Do NOT add BEGIN/COMMIT here: the workflow owns the
-- transaction boundary.
--
-- Ledger PM-03 (F044): "the live default platform take is 30%". Doctrine is a
-- uniform 20% platform / 80% provider. The repo fix is migration
-- apps/api/prisma/migrations/20260812000000_priest_commission_rate_80, but
-- migrations do not apply on deploy (OPS-19), so production may still carry the
-- old default. This file is that migration's two statements plus a guard.
--
-- Audit of every other take-rate column in schema.prisma (2026-10-06):
--   priests.commission_rate        PROVIDER share, default 0.80 in schema; prod
--                                  may still be 0.70      -> handled below
--   store_profiles.commission      PLATFORM take, default 0.20 in schema and in
--                                  baseline/0_init.sql; no migration ever set 0.30
--                                  -> already correct, nothing to change
--   commissions.percentage         per-row HISTORICAL ledger value (platform
--                                  take at booking time). Financial record: never
--                                  rewritten here.
-- No other table has a rate column, so no further statements are needed.
--
-- Idempotent: the DEFAULT is set to a constant, and the UPDATE only touches rows
-- still equal to the stale 0.70, so a second run changes zero rows.

-- Guard: fail loudly (rolling the whole transaction back) if the table or column
-- is not what this file was written against, instead of half-applying.
DO $$
DECLARE
  col_type text;
  cur_default text;
  stale_rows bigint;
BEGIN
  SELECT data_type, column_default
    INTO col_type, cur_default
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'priests'
     AND column_name = 'commission_rate';

  IF col_type IS NULL THEN
    RAISE EXCEPTION 'priests.commission_rate does not exist - wrong database or schema drift; refusing to continue';
  END IF;
  IF col_type <> 'double precision' THEN
    RAISE EXCEPTION 'priests.commission_rate is %, expected double precision; refusing to continue', col_type;
  END IF;

  SELECT count(*) INTO stale_rows FROM "priests" WHERE "commission_rate" = 0.70;
  RAISE NOTICE 'before: column default = %, priests on stale 0.70 = %', cur_default, stale_rows;

  IF cur_default IS NOT NULL AND cur_default::numeric = 0.80 AND stale_rows = 0 THEN
    RAISE NOTICE 'already applied: default is 0.80 and no row sits on 0.70; the statements below are no-ops';
  END IF;
END $$;

-- 1. New pandits get the correct share (setting a constant default is idempotent).
ALTER TABLE "priests" ALTER COLUMN "commission_rate" SET DEFAULT 0.80;

-- 2. Existing rows sitting on the STALE DEFAULT are corrected. Scoped to exactly
--    0.70 so a pandit negotiated onto any other rate keeps it.
UPDATE "priests" SET "commission_rate" = 0.80 WHERE "commission_rate" = 0.70;

-- Post-condition, still inside the transaction: if anything is off, the whole
-- thing fails and rolls back.
DO $$
DECLARE
  cur_default text;
  stale_rows bigint;
BEGIN
  SELECT column_default INTO cur_default
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'priests' AND column_name = 'commission_rate';
  SELECT count(*) INTO stale_rows FROM "priests" WHERE "commission_rate" = 0.70;
  IF cur_default IS NULL OR cur_default::numeric <> 0.80 OR stale_rows <> 0 THEN
    RAISE EXCEPTION 'post-check failed: default=% stale_rows=%', cur_default, stale_rows;
  END IF;
  RAISE NOTICE 'after: column default = %, priests on 0.70 = %', cur_default, stale_rows;
END $$;
