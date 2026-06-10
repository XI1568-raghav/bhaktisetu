// GitHub repo KPI scraper.
// item.kpi.query = shell command (gh + grep/wc/jq pipeline allowed via sh -c).
// 10s execFileSync timeout. Never throws to caller. Parses numeric tolerantly.
// Usage: scrapeGhRepo(items, { exec? }) → [{metric, value, stale, fetchedAt, error?}]
import { execSync } from 'node:child_process';

export async function scrapeGhRepo(items, { exec: providedExec } = {}) {
  const execFn = providedExec || ((cmd) => execSync(cmd, { timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] }));
  const out = [];
  for (const it of items) {
    const metric = it.kpi.metric;
    const cmd = it.kpi.query;
    try {
      const buf = execFn(cmd);
      const raw = String(buf).trim();
      const numeric = Number(raw);
      const value = Number.isFinite(numeric) && raw.length > 0 ? numeric : raw;
      out.push({ metric, value, stale: false, fetchedAt: new Date().toISOString() });
    } catch (e) {
      out.push({ metric, stale: true, error: e.message || String(e) });
    }
  }
  return out;
}
