/**
 * Timezone-safe "now" for raw SQL.
 *
 * WHY: most of this schema's DateTime columns are `timestamp(3)` (WITHOUT time
 * zone) - Prisma's default mapping for `DateTime`. Prisma itself always writes
 * UTC wall-clock values into them. A raw `now()` / `NOW()` / `CURRENT_TIMESTAMP`
 * (or an omitted column that falls back to `DEFAULT CURRENT_TIMESTAMP`) is a
 * `timestamptz`, and Postgres converts it to the SESSION time zone when it is
 * stored into a `timestamp` column. On a database whose TimeZone is
 * `Asia/Kolkata` that stores IST wall-clock, 5.5 h ahead of what Prisma writes
 * (observed on `donations.created_at` / `paid_at`). Production (Supabase) runs
 * in UTC so it never showed there - this makes behaviour independent of it.
 *
 * Use `SQL_UTC_NOW` for any `timestamp` (without tz) column written by raw SQL.
 * `timestamptz` columns do not need it: plain `now()` is already correct there.
 */
export const SQL_UTC_NOW = `(now() AT TIME ZONE 'UTC')`;
