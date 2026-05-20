-- E7 follow-ups: closes the W2/W4 TODOs that were unblocked by the
-- 20260520010000 admin bundle but couldn't go in then because the
-- bookings/from-offering, temple-portal/donations, store/reviews and
-- priest/pujas routes were still using JSON-marker / empty-array shims.
--
-- Idempotent (IF NOT EXISTS / DO $$ FK guards / ALTER ... DROP NOT NULL is
-- already a no-op when the column is already nullable) so the same script
-- can be replayed against Supabase without conflicting with
-- `prisma migrate deploy`.

-- ─── PujaBooking → PriestPujaOffering FK ────────────────────────────────────
-- Drops the W4 specialInstructions JSON marker hack: bookings/from-offering
-- can now persist offering.id on a real column and let the priest portal
-- read it back without parsing free-text.
ALTER TABLE "puja_bookings"
  ADD COLUMN IF NOT EXISTS "priest_puja_offering_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'puja_bookings_priest_puja_offering_id_fkey'
  ) THEN
    ALTER TABLE "puja_bookings"
      ADD CONSTRAINT "puja_bookings_priest_puja_offering_id_fkey"
      FOREIGN KEY ("priest_puja_offering_id") REFERENCES "priest_puja_offerings"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "puja_bookings_priest_puja_offering_id_idx"
  ON "puja_bookings"("priest_puja_offering_id");

-- ─── Review → StoreProduct FK (per-product reviews) ─────────────────────────
-- Until this column lands, store/reviews returns coarse provider-level
-- reviews keyed on the owner's User UUID. With productId we can scope to
-- per-SKU reviews and surface them on the product-detail page.
ALTER TABLE "reviews"
  ADD COLUMN IF NOT EXISTS "product_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'reviews_product_id_fkey'
  ) THEN
    ALTER TABLE "reviews"
      ADD CONSTRAINT "reviews_product_id_fkey"
      FOREIGN KEY ("product_id") REFERENCES "store_products"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "reviews_product_id_idx"
  ON "reviews"("product_id");

-- ─── Donation polymorphic: temples + gaushalas ──────────────────────────────
-- Adds temple_id alongside the existing gaushala_id so temple managers can
-- see real donations in temple-portal/donations instead of an empty array.
-- gaushala_id is loosened to nullable so a single Donation row carries
-- *either* a temple_id *or* a gaushala_id. App-level invariant: exactly one
-- of (temple_id, gaushala_id) is non-null per row; not enforced at the DB
-- because back-fill order matters and a CHECK would block the migration on
-- a partially-written row mid-flight.
ALTER TABLE "donations"
  ADD COLUMN IF NOT EXISTS "temple_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'donations_temple_id_fkey'
  ) THEN
    ALTER TABLE "donations"
      ADD CONSTRAINT "donations_temple_id_fkey"
      FOREIGN KEY ("temple_id") REFERENCES "temples"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

ALTER TABLE "donations" ALTER COLUMN "gaushala_id" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "donations_temple_id_idx"
  ON "donations"("temple_id");

-- ─── PriestPujaOffering slot capacity ───────────────────────────────────────
-- Mirrors TemplePujaOffering.maxBookingsPerSlot + availableSlots so the
-- pandit can define their own booking windows + per-slot cap. Defaulting
-- maxBookingsPerSlot to 1 keeps priest catalogs strict (one devotee per
-- slot) until the pandit configures otherwise from the portal.
ALTER TABLE "priest_puja_offerings"
  ADD COLUMN IF NOT EXISTS "max_bookings_per_slot" INT NOT NULL DEFAULT 1;
ALTER TABLE "priest_puja_offerings"
  ADD COLUMN IF NOT EXISTS "available_slots" JSONB;
