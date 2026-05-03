# DB performance — composite indexes (TD8)

Migration: `apps/api/prisma/migrations/20260503_perf_indexes/migration.sql`

All indexes use `CREATE INDEX CONCURRENTLY IF NOT EXISTS`. CONCURRENTLY avoids
the `ACCESS EXCLUSIVE` lock that would otherwise stall every write to the
table during build; `IF NOT EXISTS` makes the migration idempotent.

## Deployment

On Render shell against the production database:

```bash
pnpm prisma migrate deploy
```

Then ANALYZE the touched tables so the planner picks up the new stats:

```sql
ANALYZE puja_bookings, leads, outreach_logs, daily_panchang,
        temples, puja_types, content_items, donations, service_ratings;
```

Re-check `pg_stat_user_indexes.idx_scan` after ~7 days of production
traffic to confirm each new index is actually being used. Drop any with
zero scans.

## Index list

| Table | Columns | Query it accelerates |
|---|---|---|
| `puja_bookings` | `(user_id, status, created_at DESC)` | "My bookings" list filtered by status, newest first |
| `puja_bookings` | `(temple_id, scheduled_date, status)` | Temple admin calendar (already on schema, idempotent re-declare) |
| `leads` | `(role, status, last_contacted_at)` | Outreach scheduler picks oldest-contacted leads per role |
| `outreach_logs` | `(lead_id, channel, sent_at DESC)` | Lead detail page outreach history per channel |
| `daily_panchang` | `(date, location_city)` | Panchang lookup by day + city (already on schema) |
| `temples` | `(city, state, status)` | Search filter by location + active status (already on schema) |
| `puja_types` | `(is_active, category)` | Catalog filter |
| `content_items` | `(type, status)` | Public content listings by type |
| `donations` | `(gaushala_id, status, created_at DESC)` | Gaushala dashboard "paid donations" |
| `service_ratings` | `(provider_id, created_at DESC)` | Provider profile ratings (already on schema; see note below) |

## Schema vs. spec deltas

The TD8 brief asked for two columns that don't exist on the current schema:

- **`Lead.lastEmailedAt`** — actual column is `last_contacted_at` (string in
  `outreachLogs.sentAt` is the per-send timestamp). Index built on
  `last_contacted_at`.
- **`ServiceRating.isHidden`** — no moderation/hide flag exists on
  `service_ratings` today. Index built on the existing `(provider_id, created_at DESC)`
  pair instead. When a hide flag is added, follow up with a partial index
  `WHERE is_hidden = false`.

`OutreachLog.type` was also a misnomer; the column is `channel` (the
`OutreachChannel` enum). Index built on `channel`.

## Expected EXPLAIN ANALYZE delta

The wins materialize once table size crosses the planner's seq-scan threshold.
At current pre-launch traffic (sub-thousand rows on most tables) `EXPLAIN`
will still pick `Seq Scan` and the indexes will look unused. That is correct.

For `puja_bookings` once row count crosses ~10K:

- Before: `Seq Scan on puja_bookings (cost=0..N rows=N)` + in-memory sort.
- After: `Index Scan using puja_bookings_user_id_status_created_at_idx`,
  rows pre-sorted by `created_at DESC`, sort step removed entirely.

For the outreach scheduler against `leads`:

- Before: `Seq Scan` filtered by `role` and `status`, then sort.
- After: `Index Scan` directly returns the oldest-contacted leads per
  `(role, status)` bucket — sort is the index walk itself.

## Rollback

The DROP statements are commented at the bottom of `migration.sql`. Run them
manually with `psql -c` (CONCURRENTLY cannot be wrapped in a transaction).

## Reversibility

Every statement is `CREATE INDEX CONCURRENTLY IF NOT EXISTS`. The matching
`DROP INDEX CONCURRENTLY IF EXISTS` is provided for each. There is no
schema-level data change — pure index DDL. Prisma's schema is unchanged
because Prisma already declares the equivalent `@@index` for the items that
overlap.
