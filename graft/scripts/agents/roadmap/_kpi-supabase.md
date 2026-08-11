# scripts\agents\roadmap\_kpi-supabase.mjs

Read-only Supabase KPI scraper that only executes SELECT/WITH queries, treats unpopulated/manual sentinels as stale rather than errors, and never throws — always returning per-metric stale flags.

- isSelectOnly · function · L16-L22 — Security guard ensuring only SELECT/WITH queries reach the database by rejecting any statement containing a DML/DDL keyword anywhere, even after a semicolon or in a subquery.
- stripSqlComments · function · L26-L30 — Removes SQL line and block comments before keyword scanning so comment text like '/* CREATE INDEX later */' doesn't falsely trigger the DML/DDL rejection.
- classifyQuery · function · L37-L53 — Sorts a raw KPI query string into executable SQL, unpopulated sentinel, manual doc reference, or rejected non-SELECT so the dashboard can show appropriate status instead of alarming security errors.
- scrapeSupabase · function · L55-L85 — Executes each classified-safe KPI query against a read-only pool and coerces the first column to a number, marking metrics stale with the error message on any failure instead of throwing.
