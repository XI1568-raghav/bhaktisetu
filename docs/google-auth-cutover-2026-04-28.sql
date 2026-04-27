-- ============================================================================
-- Darshya — Google Sign-In cutover  2026-04-28
-- ============================================================================
-- Run this ONCE in the Supabase SQL editor against the prod database.
-- It drops NOT NULL on users.phone so Google-signed-in users (who only have
-- an email) can be created. The @unique constraint on phone is preserved —
-- Postgres unique indexes allow multiple NULLs by default, so phone-by-OTP
-- users still get the same exclusivity guarantee.
--
-- After running, the verify SELECT should show:
--   phone_nullable = 'YES'
--
-- If it shows 'NO', the ALTER did not apply — run ROLLBACK; below.
-- ============================================================================

BEGIN;

ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;

-- Verify (read-only, runs inside the transaction so you see results before COMMIT)
SELECT
  is_nullable AS phone_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'users'
  AND column_name  = 'phone';

-- Expected: phone_nullable = 'YES'
-- If anything else, run ROLLBACK; below instead of COMMIT.

COMMIT;
