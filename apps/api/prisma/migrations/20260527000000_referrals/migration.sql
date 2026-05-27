-- Referral system (added 2026-05-27).
-- Additive only — no FK or column changes on existing tables.
-- Apply to prod via:
--   pnpm --filter @poojly/api exec prisma db execute \
--     --schema=prisma/schema.prisma \
--     --file=prisma/migrations/20260527000000_referrals/migration.sql \
--     --url="$DIRECT_URL"
-- Idempotent: every CREATE uses IF NOT EXISTS.

-- ── Enum ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "ReferralClaimStatus" AS ENUM ('pending', 'signed_up', 'qualifying', 'rewarded', 'void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ReferralCode ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "referral_codes" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID NOT NULL,
  "code"       TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "referral_codes_user_id_key"  UNIQUE ("user_id"),
  CONSTRAINT "referral_codes_code_key"     UNIQUE ("code"),
  CONSTRAINT "referral_codes_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ── ReferralClaim ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "referral_claims" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code_id"        UUID NOT NULL,
  "referrer_id"    UUID NOT NULL,
  "referee_id"     UUID,
  "booking_id"     UUID,
  "status"         "ReferralClaimStatus" NOT NULL DEFAULT 'pending',
  "reward_amount"  DECIMAL(10,2),
  "reward_currency" TEXT,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "rewarded_at"    TIMESTAMPTZ,
  CONSTRAINT "referral_claims_code_id_fkey"     FOREIGN KEY ("code_id")
    REFERENCES "referral_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "referral_claims_referrer_id_fkey" FOREIGN KEY ("referrer_id")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "referral_claims_referee_id_fkey"  FOREIGN KEY ("referee_id")
    REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "referral_claims_referrer_id_status_idx"
  ON "referral_claims" ("referrer_id", "status");
CREATE INDEX IF NOT EXISTS "referral_claims_referee_id_idx"
  ON "referral_claims" ("referee_id");
