-- W2 admin/P0/P1 bundle. Idempotent (ADD COLUMN IF NOT EXISTS, CREATE TABLE
-- IF NOT EXISTS, CREATE INDEX IF NOT EXISTS) so the same script can be run
-- manually against Supabase ahead of a Render redeploy without conflicting
-- with `prisma migrate deploy` afterwards.

-- ─── Admin 500 fix ─────────────────────────────────────────────────────────
-- The 20260511_user_blocked migration adds these three columns, but Render
-- prod has shown auth-time 500s suggesting the migration was skipped on at
-- least one Supabase instance. Re-asserting is a no-op when already applied
-- and back-fills the missing columns otherwise.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blocked" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blocked_reason" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blocked_at" TIMESTAMPTZ;

-- ─── Astrologer availability ───────────────────────────────────────────────
-- Free-form JSON so the portal can iterate on the slot shape without DB
-- changes. Example: { mon: ["09:00-12:00","14:00-17:00"], tue: [...], ... }.
ALTER TABLE "astrologer_profiles" ADD COLUMN IF NOT EXISTS "availability" JSONB;

-- ─── Temple puja offering enhancements ─────────────────────────────────────
-- nri_price: optional override for NRI pricing (9-10× domestic per business
-- rule #2). When null the portal falls back to PujaType.nriPrice * any
-- price_override ratio.
ALTER TABLE "temple_puja_offerings" ADD COLUMN IF NOT EXISTS "nri_price" DECIMAL(10,2);
ALTER TABLE "temple_puja_offerings" ADD COLUMN IF NOT EXISTS "assigned_priest_id" UUID;

-- FK added separately so the IF NOT EXISTS on the column is honoured even
-- when the column already exists from a partial earlier run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'temple_puja_offerings_assigned_priest_id_fkey'
  ) THEN
    ALTER TABLE "temple_puja_offerings"
      ADD CONSTRAINT "temple_puja_offerings_assigned_priest_id_fkey"
      FOREIGN KEY ("assigned_priest_id") REFERENCES "priests"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "temple_puja_offerings_assigned_priest_id_idx"
  ON "temple_puja_offerings"("assigned_priest_id");

-- ─── Live darshan stream enhancements ──────────────────────────────────────
-- Temple manager–authored fields. Title/description surface in the public
-- darshan list; camera_location is a free-form room hint (e.g. "Garbhagriha").
ALTER TABLE "live_darshan_streams" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "live_darshan_streams" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "live_darshan_streams" ADD COLUMN IF NOT EXISTS "camera_location" TEXT;

-- ─── Store products (new model) ────────────────────────────────────────────
-- One row per SKU owned by a StoreProfile. CASCADE on delete so removing a
-- StoreProfile (rare, but happens during account closure) doesn't leave
-- orphaned products.
CREATE TABLE IF NOT EXISTS "store_products" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "store_profile_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL(10,2) NOT NULL,
  "image_url" TEXT,
  "category" TEXT,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "sku" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "store_products_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'store_***REMOVED***'
  ) THEN
    ALTER TABLE "store_products"
      ADD CONSTRAINT "store_***REMOVED***"
      FOREIGN KEY ("store_profile_id") REFERENCES "store_profiles"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "store_***REMOVED***"
  ON "store_products"("store_profile_id");
CREATE INDEX IF NOT EXISTS "store_***REMOVED***"
  ON "store_products"("is_active");
