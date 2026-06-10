// scripts/agents/roadmap/cxo/_cxo-lib.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { walk, parseFrontmatter, ITEMS_ROOT, ROADMAP_ROOT } from '../_lib.mjs';

export function isoWeek(d = new Date()) {
  const dt = new Date(d.getTime());
  dt.setUTCHours(0, 0, 0, 0);
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((dt - yearStart) / 86400000 + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function loadItems() {
  const items = [];
  for (const file of walk(ITEMS_ROOT)) {
    try { items.push({ ...parseFrontmatter(readFileSync(file, 'utf8')), _file: file.replaceAll('\\', '/') }); }
    catch {}
  }
  return items;
}

export function loadKpiCache() {
  const p = join(ROADMAP_ROOT, '_kpi-cache.json');
  if (!existsSync(p)) return { entries: {} };
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return { entries: {} }; }
}

export function loadDeptDoc(filename) {
  const p = join('docs/company', filename);
  if (!existsSync(p)) return '(dept doc missing)';
  return readFileSync(p, 'utf8');
}

export function writeAdvisory(role, body) {
  const week = isoWeek();
  const dir = join(ROADMAP_ROOT, 'advisory', week);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${role}.md`);
  writeFileSync(out, body);
  return out;
}

export function filterItemsByOwner(items, role) {
  return items.filter(i => i.owner_role === role);
}

export function statusCounts(items) {
  return items.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});
}

export function topNByRevenueHourRatio(items, n = 5) {
  return items
    .filter(i => i.status === 'planned' && i.agent_assignable && !i.founder_blocker)
    .filter(i => (i.depends_on || []).every(dep => items.find(x => x.id === dep)?.status === 'verified'))
    .sort((a, b) => (b.revenue_impact?.amount_inr || 0) / (b.est_hours || 1) - (a.revenue_impact?.amount_inr || 0) / (a.est_hours || 1))
    .slice(0, n);
}

export function kpisForMetrics(kpiCache, metricNames) {
  const out = [];
  for (const m of metricNames) {
    for (const [k, v] of Object.entries(kpiCache.entries || {})) {
      if (k.endsWith(':' + m)) {
        out.push({ key: k, ...v });
        break;
      }
    }
  }
  return out;
}
