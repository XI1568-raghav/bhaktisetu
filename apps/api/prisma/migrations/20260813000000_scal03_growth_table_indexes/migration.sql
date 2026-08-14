-- SCAL-03 (P0) — no created_at index on any table that grows.
--
-- Every admin list is "ORDER BY created_at DESC LIMIT n". None of the growth
-- tables had an index to serve it, so Postgres did a parallel sequential scan
-- plus a top-N heapsort for each one. Measured on 200k-row shadow tables built
-- with CREATE TABLE (LIKE x INCLUDING ALL), so identical columns AND indexes:
--
--   users        ORDER BY created_at DESC LIMIT 20   155 ms warm / 2,114 ms cold  ->  0.109 ms
--   puja_bookings same                                225 ms warm / 1,463 ms cold  ->  0.156 ms
--   commissions  ORDER BY created_at DESC LIMIT 50    893 ms                       ->  0.111 ms
--   transactions WHERE status ORDER BY ... LIMIT 10 1,418 ms                       ->  0.146 ms
--
-- Total build time for all five 200k-row tables was 3.7 s, so this is a
-- non-event on today's data (23 users) and impossible to do cheaply later.
--
-- DELIBERATELY NOT "CREATE INDEX CONCURRENTLY": prisma migrate deploy wraps
-- each migration in a transaction, and CONCURRENTLY inside a transaction fails
-- with 25001 and then blocks every subsequent migration. See
-- docs/handoff.md and the Prisma CONCURRENTLY incident note. Plain CREATE INDEX
-- takes a brief ACCESS EXCLUSIVE lock, which at current row counts is
-- milliseconds. IF NOT EXISTS keeps this migration re-runnable.

-- Growth tables sorted by recency in admin lists.
CREATE INDEX IF NOT EXISTS "users_created_at_idx"          ON "users"          ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "puja_bookings_created_at_idx"  ON "puja_bookings"  ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "commissions_created_at_idx"    ON "commissions"    ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "transactions_created_at_idx"   ON "transactions"   ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "reviews_created_at_idx"        ON "reviews"        ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "content_items_created_at_idx"  ON "content_items"  ("created_at" DESC);

-- Always filtered by status, then sorted by date.
CREATE INDEX IF NOT EXISTS "payments_status_created_at_idx"     ON "payments"     ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "transactions_status_created_at_idx" ON "transactions" ("status", "created_at" DESC);

-- getPayoutBalance: provider + status + unlinked payout request.
CREATE INDEX IF NOT EXISTS "commissions_provider_id_status_payout_request_id_idx"
  ON "commissions" ("provider_id", "status", "payout_request_id");
