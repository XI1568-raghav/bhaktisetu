-- Phase 2.4 — composite/single indexes for hot query paths.
-- Applied directly via prisma db execute (not via migrate dev). The
-- schema diff also surfaces drift from pgvector + provider_kyc that we
-- do NOT want to apply; this file is the surgical subset.
--
-- Created with CREATE INDEX IF NOT EXISTS so re-runs are idempotent.

CREATE INDEX IF NOT EXISTS "content_items_status_idx"
  ON "content_items"("status");

CREATE INDEX IF NOT EXISTS "daily_panchang_date_location_city_idx"
  ON "daily_panchang"("date", "location_city");

CREATE INDEX IF NOT EXISTS "puja_types_is_active_idx"
  ON "puja_types"("is_active");

CREATE INDEX IF NOT EXISTS "temples_city_state_status_idx"
  ON "temples"("city", "state", "status");
