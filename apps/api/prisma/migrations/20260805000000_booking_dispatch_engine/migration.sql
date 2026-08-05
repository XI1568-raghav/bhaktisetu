-- Booking dispatch engine (booking revamp 2026-08-04)
-- Adds the tiered dispatch model: Priest dispatch/geo fields, PujaBooking
-- dispatch fields, and the DispatchOffer table + its enums. Purely additive —
-- no existing column or table is altered destructively, so this is safe to
-- run on a populated database.

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE "PriestTier" AS ENUM ('instant_pool', 'verified', 'senior', 'standard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DispatchTier" AS ENUM ('instant', 'one_hour', 'senior', 'scheduled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "OfferState" AS ENUM ('sent', 'accepted', 'declined', 'expired', 'superseded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Priest dispatch + geo columns
ALTER TABLE "priests" ADD COLUMN IF NOT EXISTS "tier" "PriestTier" NOT NULL DEFAULT 'standard';
ALTER TABLE "priests" ADD COLUMN IF NOT EXISTS "is_on_duty" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "priests" ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMP(3);
ALTER TABLE "priests" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION;
ALTER TABLE "priests" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
ALTER TABLE "priests" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "priests" ADD COLUMN IF NOT EXISTS "service_radius_km" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "priests" ADD COLUMN IF NOT EXISTS "acceptance_rate" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
ALTER TABLE "priests" ADD COLUMN IF NOT EXISTS "response_sla_sec" INTEGER NOT NULL DEFAULT 60;

-- 3. PujaBooking dispatch columns
ALTER TABLE "puja_bookings" ADD COLUMN IF NOT EXISTS "dispatch_tier" "DispatchTier" NOT NULL DEFAULT 'scheduled';
ALTER TABLE "puja_bookings" ADD COLUMN IF NOT EXISTS "offer_expires_at" TIMESTAMP(3);
ALTER TABLE "puja_bookings" ADD COLUMN IF NOT EXISTS "assigned_via" TEXT;
ALTER TABLE "puja_bookings" ADD COLUMN IF NOT EXISTS "reschedule_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "puja_bookings" ADD COLUMN IF NOT EXISTS "cancel_policy_json" JSONB;

-- 4. DispatchOffer table
CREATE TABLE IF NOT EXISTS "dispatch_offers" (
  "id" UUID NOT NULL,
  "booking_id" UUID NOT NULL,
  "priest_id" UUID NOT NULL,
  "state" "OfferState" NOT NULL DEFAULT 'sent',
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responded_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dispatch_offers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "dispatch_offers_booking_id_state_idx" ON "dispatch_offers"("booking_id", "state");
CREATE INDEX IF NOT EXISTS "dispatch_offers_priest_id_state_idx" ON "dispatch_offers"("priest_id", "state");
CREATE INDEX IF NOT EXISTS "dispatch_offers_state_expires_at_idx" ON "dispatch_offers"("state", "expires_at");

DO $$ BEGIN
  ALTER TABLE "dispatch_offers" ADD CONSTRAINT "dispatch_offers_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "puja_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "dispatch_offers" ADD CONSTRAINT "dispatch_offers_priest_id_fkey"
    FOREIGN KEY ("priest_id") REFERENCES "priests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Index for the dispatch sweep query (unassigned confirmed bookings by tier)
CREATE INDEX IF NOT EXISTS "puja_bookings_dispatch_tier_status_idx" ON "puja_bookings"("dispatch_tier", "status");
