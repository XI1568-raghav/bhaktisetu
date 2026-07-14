-- Supabase read-only role for Claude Code MCP + ARE KPI scraper.
-- Run ONCE on Supabase SQL editor as superuser/owner.
-- Then set the resulting connection string as env var SUPABASE_READONLY_URL
-- (and optionally GH Actions secret DATABASE_URL_READONLY).
--
-- Why: the darshya-mcp server's loadEnv() prefers DIRECT_URL from process.env,
-- falling back to the OWNER direct URL in apps/api/.env.production. Wiring
-- SUPABASE_READONLY_URL → .mcp.json env.DIRECT_URL makes the server use a
-- SELECT-only role, so even a guard bypass can't write. Defense-in-depth on top
-- of guard.ts. Role name `claude_readonly` matches docs/engineering/R-Q1-E-014
-- + docs/engineering/darshya-mcp-handoff.md.

-- 1. Create role w/ login + strong random password
--    Replace REPLACE_WITH_STRONG_RANDOM_PWD before running.
--    Generate via: openssl rand -base64 24
CREATE ROLE claude_readonly LOGIN PASSWORD 'REPLACE_WITH_STRONG_RANDOM_PWD';

-- 2. Grant connect to current DB
GRANT CONNECT ON DATABASE postgres TO claude_readonly;

-- 3. Grant usage on public schema
GRANT USAGE ON SCHEMA public TO claude_readonly;

-- 4. Grant SELECT on existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO claude_readonly;

-- 5. Grant SELECT on future tables (so role doesn't break when new tables added)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO claude_readonly;

-- 6. Verify role + grants
SELECT
  r.rolname,
  r.rolcanlogin,
  r.rolconnlimit,
  r.rolvaliduntil
FROM pg_roles r
WHERE r.rolname = 'claude_readonly';

-- 7. Verify SELECT grants
SELECT
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'claude_readonly'
LIMIT 5;

-- 8. Build connection string
-- Format: postgresql://claude_readonly:***REMOVED***@<host>:5432/postgres?sslmode=require
-- <host> = the same db.<ref>.supabase.co as SUPABASE_DIRECT_URL (Direct, NOT pooled).
-- Then set in your Claude Code environment:
--   $env:SUPABASE_READONLY_URL = "postgresql://claude_readonly:***REMOVED***@db.<ref>.supabase.co:5432/postgres?sslmode=require"
-- (.mcp.json maps this into the darshya server's DIRECT_URL via ${env:SUPABASE_READONLY_URL}.)
-- Optionally also: gh secret set DATABASE_URL_READONLY --body "postgresql://..."

-- 9. To revoke later if needed:
-- REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM claude_readonly;
-- REVOKE USAGE ON SCHEMA public FROM claude_readonly;
-- REVOKE CONNECT ON DATABASE postgres FROM claude_readonly;
-- DROP ROLE claude_readonly;
