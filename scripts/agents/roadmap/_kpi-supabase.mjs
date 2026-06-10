// Supabase KPI scraper.
// SELECT/WITH only — rejects any DML/DDL keyword regardless of position.
// 5s per-query timeout. Returns stale=true on any error (never throws to caller).
// Usage: scrapeSupabase(items, { pool? }) → [{metric, value, stale, fetchedAt, error?}]
import pg from 'pg';

const DML_DDL_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|COMMENT|VACUUM|REINDEX|REFRESH)\b/i;

export function isSelectOnly(sql) {
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) return false;
  // caveman: bad word anywhere = kill query. catches DROP after ;, DELETE in subquery.
  if (DML_DDL_KEYWORDS.test(sql)) return false;
  return true;
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
    if (!isSelectOnly(q)) {
      out.push({ metric: it.kpi.metric, stale: true, error: 'query rejected: not SELECT-only' });
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
