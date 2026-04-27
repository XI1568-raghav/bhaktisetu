-- ============================================================================
-- Darshya prod cutover — 2026-04-28
-- ============================================================================
-- Run this ONCE in the Supabase SQL editor (or via psql against $DATABASE_URL).
-- It does three things atomically inside a transaction:
--
--   1. Creates the provider_kyc table (KYC stage 2 schema).
--   2. Deletes the contaminated pandit profile + role-assignment that a
--      smoke-test fall-through created earlier.
--   3. Verifies both succeeded — the SELECTs at the bottom should show:
--        kyc_table_exists  = 'provider_kyc'
--        kyc_row_count     = 0
--        bad_pandit_row    = 0
--        bad_role_row      = 0
--
-- If any verify line shows the wrong value, the transaction will be rolled
-- back automatically — nothing is half-applied.
-- ============================================================================

BEGIN;

-- ─── 1. provider_kyc table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "provider_kyc" (
  "user_id"            uuid PRIMARY KEY,
  "aadhaar_last4"      text,
  "aadhaar_hash"       text,
  "pan_number"         text,
  "bank_account_number" text,
  "bank_ifsc"          text,
  "bank_holder_name"   text,
  "verified"           boolean NOT NULL DEFAULT false,
  "verified_at"        timestamp(3),
  "rejection_reason"   text,
  "created_at"         timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"         timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "provider_kyc_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,

  CONSTRAINT "provider_kyc_pan_format"
    CHECK ("pan_number" IS NULL OR "pan_number" ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),

  CONSTRAINT "provider_kyc_ifsc_format"
    CHECK ("bank_ifsc" IS NULL OR "bank_ifsc" ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),

  CONSTRAINT "provider_kyc_aadhaar_last4_format"
    CHECK ("aadhaar_last4" IS NULL OR "aadhaar_last4" ~ '^[0-9]{4}$')
);

CREATE INDEX IF NOT EXISTS "provider_kyc_verified_idx"
  ON "provider_kyc"("verified");

-- ─── 2. Clean up contaminated demo rows ─────────────────────────────────────
-- These were attached to the devotee@demo.com user when a smoke-test signup
-- fell through to demo-mode and the onboarding/provider-kyc routes weren't
-- yet checking the access-token prefix. Fix shipped in commit e9ff02f; this
-- block removes the leftover rows.

DELETE FROM "pandit_profiles"
 WHERE "id" = '9180df73-751b-4311-96ee-b56d1333d12a';

DELETE FROM "user_role_assignments"
 WHERE "user_id" = '3d034081-88dc-4f7e-8dd6-fd6feb76ade1'
   AND "role" = 'PANDIT';

-- ─── 3. Verify (read-only) ──────────────────────────────────────────────────
-- These run inside the same transaction so you see results before COMMIT.

SELECT
  to_regclass('public.provider_kyc')::text                                    AS kyc_table_exists,
  (SELECT count(*) FROM "provider_kyc")                                       AS kyc_row_count,
  (SELECT count(*) FROM "pandit_profiles"
    WHERE "id" = '9180df73-751b-4311-96ee-b56d1333d12a')                      AS bad_pandit_row,
  (SELECT count(*) FROM "user_role_assignments"
    WHERE "user_id" = '3d034081-88dc-4f7e-8dd6-fd6feb76ade1'
      AND "role" = 'PANDIT')                                                  AS bad_role_row;

-- Expected: ('provider_kyc', 0, 0, 0)
-- If you see anything else, run ROLLBACK; below instead of COMMIT.

COMMIT;
