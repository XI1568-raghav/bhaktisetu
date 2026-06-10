-- Supabase read-only role for ARE KPI scraper
-- Run ONCE on Supabase SQL editor as superuser/owner.
-- Then add resulting connection string as GH Actions secret DATABASE_URL_READONLY.
--
-- Why: scraper uses SELECT-only regex guard already, but defense-in-depth.
-- Service-role key has full write — bad if scraper logic ever has a bug.
-- Read-only role = even if scraper compromised, can only read.

-- 1. Create role w/ login + strong random password
--    Replace REPLACE_WITH_STRONG_RANDOM_PWD before running.
--    Generate via: openssl rand -base64 24
CREATE ROLE roadmap_kpi_reader LOGIN PASSWORD 'REPLACE_WITH_STRONG_RANDOM_PWD';

-- 2. Grant connect to current DB
GRANT CONNECT ON DATABASE postgres TO roadmap_kpi_reader;

-- 3. Grant usage on public schema
GRANT USAGE ON SCHEMA public TO roadmap_kpi_reader;

-- 4. Grant SELECT on existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO roadmap_kpi_reader;

-- 5. Grant SELECT on future tables (so role doesn't break when new tables added)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO roadmap_kpi_reader;

-- 6. Verify role + grants
SELECT
  r.rolname,
  r.rolcanlogin,
  r.rolconnlimit,
  r.rolvaliduntil
FROM pg_roles r
WHERE r.rolname = 'roadmap_kpi_reader';

-- 7. Verify SELECT grants
SELECT
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'roadmap_kpi_reader'
LIMIT 5;

-- 8. Build connection string
-- Format: postgresql://roadmap_kpi_reader:***REMOVED***@<host>:<port>/postgres?sslmode=require
-- Get <host> + <port> from Supabase Dashboard → Project Settings → Database → Connection string (Direct connection, NOT pooled)
-- Paste full string as GH Actions secret: gh secret set DATABASE_URL_READONLY --body "postgresql://..."

-- 9. To revoke later if needed:
-- REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM roadmap_kpi_reader;
-- REVOKE USAGE ON SCHEMA public FROM roadmap_kpi_reader;
-- REVOKE CONNECT ON DATABASE postgres FROM roadmap_kpi_reader;
-- DROP ROLE roadmap_kpi_reader;
