// Supabase KPI scraper.
// SELECT/WITH only — rejects any DML/DDL keyword regardless of position.
// 5s per-query timeout. Returns stale=true on any error (never throws to caller).
// Usage: scrapeSupabase(items, { pool? }) → [{metric, value, stale, fetchedAt, error?}]
import pg from 'pg';

const DML_DDL_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|COMMENT|VACUUM|REINDEX|REFRESH)\b/i;

// Recognised "not yet populated" sentinels — emit specific error code,
// not security-tone "rejected: not SELECT-only" which spooks dashboard.
// NOTE: "MANUAL" capitalised matches the sentinel ("MANUAL: count WA threads");
// lower-case "manual:docs/..." is a different convention (humans track separately)
// and is matched explicitly in classifyQuery BEFORE this regex runs.
const UNPOPULATED_RE = /^(TBD|TODO|MANUAL|PLACEHOLDER|FIXME|XXX)[-:_ ]/;

export function isSelectOnly(sql) {
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) return false;
  // caveman: bad word anywhere = kill query. catches DROP after ;, DELETE in subquery.
  if (DML_DDL_KEYWORDS.test(sql)) return false;
  return true;
}

// Strip SQL line comments + block comments before scanning, so keywords inside
// /* CREATE INDEX after launch */ don't false-positive.
export function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')   // /* ... */
    .replace(/--[^\n]*/g, ' ');          // -- to end-of-line
}

// Classify query string. Returns one of:
//   { kind: 'sql' }                                 — real SELECT/WITH, send to pg
//   { kind: 'unpopulated', error }                  — TBD/MANUAL sentinel
//   { kind: 'manual_ref', error }                   — manual:docs/... reference (humans track)
//   { kind: 'rejected', error }                     — looks like SQL but not SELECT or has DML
export function classifyQuery(rawQ) {
  if (typeof rawQ !== 'string' || rawQ.trim() === '') {
    return { kind: 'unpopulated', error: 'kpi.query empty' };
  }
  const q = rawQ.trim();
  if (UNPOPULATED_RE.test(q)) {
    return { kind: 'unpopulated', error: 'kpi.query unpopulated (sentinel)' };
  }
  if (/^manual:/i.test(q)) {
    return { kind: 'manual_ref', error: 'manual KPI — see referenced doc' };
  }
  const stripped = stripSqlComments(q);
  if (!isSelectOnly(stripped)) {
    return { kind: 'rejected', error: 'query rejected: not SELECT-only' };
  }
  return { kind: 'sql' };
}

export async function scrapeSupabase(items, { pool: providedPool } = {}) {
  const pool = providedPool || new pg.Pool({
    connectionString: process.env.DATABASE_URL_READONLY || process.env.SUPABASE_DIRECT_URL,
    max: 3,
    statement_timeout: 5000,
  });
  const out = [];
  for (const it of items) {
    const q = it.kpi.query;
    const classified = classifyQuery(q);
    if (classified.kind !== 'sql') {
      out.push({ metric: it.kpi.metric, stale: true, error: classified.error });
      continue;
    }
    try {
      const r = await pool.query(q);
      const value = r.rows[0] ? Object.values(r.rows[0])[0] : null;
      const numeric = Number(value);
      out.push({
        metric: it.kpi.metric,
        value: Number.isFinite(numeric) ? numeric : value,
        stale: false,
        fetchedAt: new Date().toISOString(),
      });
    } catch (e) {
      out.push({ metric: it.kpi.metric, stale: true, error: e.message });
    }
  }
  if (!providedPool) await pool.end();
  return out;
}
