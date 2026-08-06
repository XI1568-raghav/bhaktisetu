-- Cross-cutting Phase 2 part 2 (2026-08-06): TemplePayout + PushSubscription.
-- TemplePayout = the temple administration's share of a puja booking (closes the
-- "temple gets nothing / donation bypass" gap). PushSubscription = persisted
-- web-push subs (enables the daily panchang push; was in-memory, lost on restart).
-- Purely additive — safe on a populated DB.

-- 1. Enum
DO $$ BEGIN
  CREATE TYPE "ProviderPayoutStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TemplePayout table
CREATE TABLE IF NOT EXISTS "temple_payouts" (
  "id" UUID NOT NULL,
  "temple_id" UUID NOT NULL,
  "booking_id" UUID NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "status" "ProviderPayoutStatus" NOT NULL DEFAULT 'pending',
  "reference" TEXT,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "temple_payouts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "temple_payouts_temple_id_status_idx" ON "temple_payouts"("temple_id", "status");
CREATE INDEX IF NOT EXISTS "temple_payouts_status_idx" ON "temple_payouts"("status");

DO $$ BEGIN
  ALTER TABLE "temple_payouts" ADD CONSTRAINT "temple_payouts_temple_id_fkey"
    FOREIGN KEY ("temple_id") REFERENCES "temples"("id") ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "temple_payouts" ADD CONSTRAINT "temple_payouts_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "puja_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. PushSubscription table
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "panchang_opt_in" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint")
);

CREATE INDEX IF NOT EXISTS "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "push_subscriptions_panchang_opt_in_idx" ON "push_subscriptions"("panchang_opt_in");

DO $$ BEGIN
  ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
