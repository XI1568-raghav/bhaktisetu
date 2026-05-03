-- Layer AT: Antim sanskar (death rites) bookings.
-- High-AOV (15K-50K), no upfront online payment — collect on-site to avoid
-- distress. Coordinator must call within 30 min; severity is treated as
-- effectively critical regardless of time of day.

CREATE TABLE IF NOT EXISTS "antim_sanskar_bookings" (
  "id"                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "booking_number"       TEXT NOT NULL UNIQUE,
  "deceased_name"        TEXT NOT NULL,
  "contact_name"         TEXT NOT NULL,
  "contact_phone"        TEXT NOT NULL,
  "contact_relation"     TEXT,
  "city"                 TEXT NOT NULL,
  "preferred_ghat"       TEXT,
  "preferred_date"       DATE NOT NULL,
  "package_tier"         TEXT NOT NULL,
  "package_price_inr"    INTEGER NOT NULL,
  "asthi_visarjan_river" TEXT,
  "notes"                TEXT,
  "user_id"              UUID,
  "status"               TEXT NOT NULL DEFAULT 'pending_coordinator',
  "assigned_pandit_id"   UUID,
  "created_at"           TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "updated_at"           TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "antim_sanskar_bookings_city_idx"
  ON "antim_sanskar_bookings" ("city");

CREATE INDEX IF NOT EXISTS "antim_sanskar_bookings_preferred_date_idx"
  ON "antim_sanskar_bookings" ("preferred_date");

CREATE INDEX IF NOT EXISTS "antim_sanskar_bookings_status_idx"
  ON "antim_sanskar_bookings" ("status");

-- Pandit pool flag — match by city; antyeshti pandits commit to faster
-- response (within 1 hour) and accept higher emotional load.
ALTER TABLE "pandit_profiles"
  ADD COLUMN IF NOT EXISTS "available_for_antyeshti" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "pandit_profiles_available_for_antyeshti_idx"
  ON "pandit_profiles" ("available_for_antyeshti");
