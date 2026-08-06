-- Provider payout requests (cross-cutting Phase 2, 2026-08-06)
-- Unified payout model across all roles (priest, astrologer, wellness, store
-- owner, temple manager, gaushala). Purely additive — safe on a populated DB.

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE "PayoutRequestStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ProviderRole" AS ENUM ('PANDIT', 'ASTROLOGER', 'WELLNESS_INSTRUCTOR', 'STORE_OWNER', 'TEMPLE_MANAGER', 'GAUSHALA_MANAGER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. PayoutRequest table
CREATE TABLE IF NOT EXISTS "payout_requests" (
  "id" UUID NOT NULL,
  "provider_id" UUID NOT NULL,
  "role" "ProviderRole" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "status" "PayoutRequestStatus" NOT NULL DEFAULT 'pending',
  "method" TEXT NOT NULL DEFAULT 'upi',
  "reference" TEXT,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "processed_by" UUID,
  "failure_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "payout_requests_provider_id_status_idx" ON "payout_requests"("provider_id", "status");
CREATE INDEX IF NOT EXISTS "payout_requests_status_idx" ON "payout_requests"("status");

-- 3. Link Commission rows to the PayoutRequest that settled them
ALTER TABLE "commissions" ADD COLUMN IF NOT EXISTS "payout_request_id" UUID;

CREATE INDEX IF NOT EXISTS "commissions_payout_request_id_idx" ON "commissions"("payout_request_id");

DO $$ BEGIN
  ALTER TABLE "commissions" ADD CONSTRAINT "commissions_payout_request_id_fkey"
    FOREIGN KEY ("payout_request_id") REFERENCES "payout_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
