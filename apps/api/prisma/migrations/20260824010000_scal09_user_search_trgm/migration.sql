-- SCAL-09 — the admin user search is a leading-wildcard ILIKE with no index.
--
-- `admin.service.getUsers` searches three columns and both of its code paths
-- render the same shape:
--
--   Prisma path : { fullName: { contains: s, mode: 'insensitive' } }  -> ILIKE '%s%'
--                 { email:    { contains: s, mode: 'insensitive' } }  -> ILIKE '%s%'
--                 { phone:    { contains: s } }                       -> LIKE  '%s%'
--   JOIN path   : u."full_name" ILIKE $n OR u."email" ILIKE $n OR u."phone" LIKE $n
--
-- A pattern that begins with `%` cannot use a btree index — not even a
-- `text_pattern_ops` one, which only serves anchored prefixes. So every search
-- an operator types is a sequential scan of `users`, and it is the one read on
-- that screen that grows with the whole user base. The SCAL-09 audit measured
-- 711.818 ms on a 200,000-row shadow table (Parallel Seq Scan, ~100,000 rows
-- removed by filter). That figure is from the audit, not from this migration:
-- production has been suspended since 2026-08-17 and could not be re-measured.
--
-- A GIN trigram index is the only index type Postgres has that serves
-- `ILIKE '%x%'`, which is why the extension is worth the trouble. It also
-- serves the `LIKE` on `phone` — all three columns are indexed deliberately,
-- because the predicate is an OR: leaving one column unindexed forces the
-- planner back to a sequential scan for the whole disjunction, and the index on
-- the other two buys nothing.
--
-- HONEST LIMIT: trigram indexes need at least three non-wildcard characters.
-- One- and two-character searches still scan. That is the correct trade — an
-- operator searching "jo" wants a list, not a lookup.
--
-- NOT "CREATE INDEX CONCURRENTLY", for the reason the whole repo knows:
-- `prisma migrate deploy` wraps each migration in a transaction, CONCURRENTLY
-- inside one fails with 25001, and the failed migration then blocks every
-- migration after it. This repo lost two months to exactly that. Plain
-- CREATE INDEX takes a brief ACCESS EXCLUSIVE lock; at current row counts that
-- is milliseconds. IF NOT EXISTS keeps the whole file re-runnable.
--
-- WHY `CREATE EXTENSION` IS GUARDED, AND WHY THAT IS NOT TIMIDITY
--
-- Migrations auto-apply on API boot (apps/api/package.json:
-- `prisma migrate deploy && node dist/server.js`). If a statement in here
-- fails, `&&` never runs the server: the API does not start. `pg_trgm` is on
-- Supabase's supported-extension list and the role `prisma migrate deploy`
-- connects as can normally create it — but "normally" is an assumption about a
-- database that cannot currently be inspected, and the cost of being wrong is
-- a total outage rather than a slow admin screen. This is the same reasoning,
-- and the same shape, as the conditional unique indexes in
-- 20260824000000_di0607_money_key_indexes.
--
-- So: whichever way the extension goes, the migration SUCCEEDS and the API
-- boots. A skipped index is announced with RAISE WARNING naming the SQLSTATE,
-- never swallowed silently, and the file can simply be re-run (via
-- `prisma migrate resolve --rolled-back` + redeploy, or by hand) once the
-- extension is enabled.
--
-- The index DDL is built with `format('%I.gin_trgm_ops', <schema>)` rather than
-- a bare `gin_trgm_ops`, because Supabase installs extensions into the
-- `extensions` schema by default while a plain `CREATE EXTENSION` here lands in
-- whatever comes first on the connection's search_path. Naming the opclass by
-- the schema the extension actually occupies makes this correct either way.
--
-- PRISMA DRIFT: these three indexes are NOT declared in schema.prisma. A GIN
-- trigram index is expressible there —
--   @@index([fullName(ops: raw("gin_trgm_ops"))], type: Gin)
-- and the same for `email` and `phone` on `model User` — but schema.prisma was
-- owned by another change in flight when this landed. Until those three lines
-- are added, `prisma migrate dev` will see the indexes as drift and offer to
-- drop them. `prisma migrate deploy`, which is what production runs, is
-- unaffected.

DO $$
DECLARE
  ext_schema text;
BEGIN
  BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_trgm';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING
      'SCAL-09: CREATE EXTENSION pg_trgm failed (%: %). Continuing so the API can still boot.',
      SQLSTATE, SQLERRM;
  END;

  SELECT n.nspname
    INTO ext_schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
   WHERE e.extname = 'pg_trgm';

  IF ext_schema IS NULL THEN
    RAISE WARNING
      'SCAL-09: pg_trgm is not installed, so users_full_name_trgm_idx / users_email_trgm_idx / users_phone_trgm_idx were SKIPPED. Admin user search stays on a sequential scan. Enable the extension and re-run this migration.';
    RETURN;
  END IF;

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS "users_full_name_trgm_idx" ON "users" USING gin ("full_name" %I.gin_trgm_ops)',
    ext_schema);

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS "users_email_trgm_idx" ON "users" USING gin ("email" %I.gin_trgm_ops)',
    ext_schema);

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS "users_phone_trgm_idx" ON "users" USING gin ("phone" %I.gin_trgm_ops)',
    ext_schema);
END $$;
