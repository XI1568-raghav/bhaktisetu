-- TD8: Composite indexes for hot query paths.
--
-- All indexes use CREATE INDEX CONCURRENTLY IF NOT EXISTS so:
--   1. No table-level ACCESS EXCLUSIVE lock on production (CONCURRENTLY)
--   2. Re-runs are safe (IF NOT EXISTS)
--
-- Apply on Render via:
--   pnpm prisma migrate deploy
--
-- Reversibility: each statement has a matching DROP INDEX commented at the
-- bottom of this file. To roll back, run those DROPs (also CONCURRENTLY).
--
-- Postgres caveat: CONCURRENTLY cannot run inside a transaction block.
-- prisma migrate deploy executes each statement separately, which is fine.
-- If running by hand via psql, use \i and ensure no BEGIN wrapping.
--
-- Index value only materializes once table stats grow past the planner's
-- seq-scan threshold. Run ANALYZE after applying; re-check pg_stat_user_indexes
-- after ~1 week of production traffic to confirm idx_scan > 0.

-- ─── PujaBooking (puja_bookings) ────────────────────────────────────────────
-- "List my bookings" page: WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS "puja_bookings_user_id_status_created_at_idx"
  ON "puja_bookings" ("user_id", "status", "created_at" DESC);

-- Temple-side bookings calendar: WHERE temple_id = $1 AND scheduled_date BETWEEN ... AND status = $2
-- Schema already has an @@index([templeId, scheduledDate, status]); this is a
-- defensive re-declare so the migration is self-contained.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "puja_bookings_temple_id_scheduled_date_status_idx"
  ON "puja_bookings" ("temple_id", "scheduled_date", "status");

-- ─── Lead (leads) ───────────────────────────────────────────────────────────
-- Outreach scheduler picks "next leads to email" by role + status, ordering by
-- last_contacted_at ASC NULLS FIRST. Schema field is `last_contacted_at`
-- (not `last_emailed_at` — confirmed against schema.prisma 2026-05-03).
CREATE INDEX CONCURRENTLY IF NOT EXISTS "leads_role_status_last_contacted_at_idx"
  ON "leads" ("role", "status", "last_contacted_at");

-- ─── OutreachLog (outreach_logs) ────────────────────────────────────────────
-- Lead detail page: history per lead, filtered by channel, newest first.
-- Schema field is `channel` (the OutreachChannel enum) — task spec said `type`
-- which does not exist on this model.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "outreach_logs_lead_id_channel_sent_at_idx"
  ON "outreach_logs" ("lead_id", "channel", "sent_at" DESC);

-- ─── DailyPanchang (daily_panchang) ─────────────────────────────────────────
-- Already covered by @@index([date, locationCity]) and the phase2 migration.
-- Re-declared here for completeness; IF NOT EXISTS makes it a no-op.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "daily_panchang_date_location_city_perf_idx"
  ON "daily_panchang" ("date", "location_city");

-- ─── Temple (temples) ───────────────────────────────────────────────────────
-- Search filter: WHERE city = $1 AND state = $2 AND status = 'active'.
-- Already covered by phase2 migration; idempotent re-declare.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "temples_city_state_status_perf_idx"
  ON "temples" ("city", "state", "status");

-- ─── PujaType (puja_types) ──────────────────────────────────────────────────
-- Catalog filter: WHERE is_active = true AND category = $1.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "puja_types_is_active_category_idx"
  ON "puja_types" ("is_active", "category");

-- ─── ContentItem (content_items) ────────────────────────────────────────────
-- Public content listings: WHERE type = $1 AND status = 'published'.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "content_items_type_status_idx"
  ON "content_items" ("type", "status");

-- ─── Donation (donations) ───────────────────────────────────────────────────
-- Gaushala dashboard: WHERE gaushala_id = $1 AND status = 'paid' ORDER BY created_at DESC.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "donations_gaushala_id_status_created_at_idx"
  ON "donations" ("gaushala_id", "status", "created_at" DESC);

-- ─── ServiceRating (service_ratings) ────────────────────────────────────────
-- Provider profile: ratings for a provider. The TD8 spec mentioned an
-- `is_hidden` column for moderation, but the current schema has no such
-- column on service_ratings (only `stars`, `body`, `createdAt`). We index
-- (provider_id, created_at DESC) instead — already present in schema as
-- @@index([providerId, createdAt]); idempotent re-declare for documentation.
-- TODO: when a moderation/hide flag is added to ServiceRating, add a partial
-- index "WHERE is_hidden = false" in a follow-up migration.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "service_ratings_provider_id_created_at_perf_idx"
  ON "service_ratings" ("provider_id", "created_at" DESC);

-- ─── ROLLBACK (run by hand if needed) ───────────────────────────────────────
-- DROP INDEX CONCURRENTLY IF EXISTS "puja_bookings_user_id_status_created_at_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS "puja_bookings_temple_id_scheduled_date_status_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS "leads_role_status_last_contacted_at_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS "outreach_logs_lead_id_channel_sent_at_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS "daily_panchang_date_location_city_perf_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS "temples_city_state_status_perf_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS "puja_types_is_active_category_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS "content_items_type_status_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS "donations_gaushala_id_status_created_at_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS "service_ratings_provider_id_created_at_perf_idx";
