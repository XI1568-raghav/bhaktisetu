// scripts/agents/roadmap/cxo/sales.mjs
import { loadItems, loadKpiCache, loadDeptDoc, writeAdvisory, filterItemsByOwner, statusCounts, topNByRevenueHourRatio, kpisForMetrics, isoWeek } from './_cxo-lib.mjs';

const ROLE = 'sales';
const DEPT_DOC = '05-sales.md';
const RELEVANT_KPI_METRICS = ["verified_pandits_count","verified_temples_count","verified_astrologers_count","iskcon_loi_status"];

function buildAdvisory() {
  const items = loadItems();
  const kpiCache = loadKpiCache();
  const dept = loadDeptDoc(DEPT_DOC);

  const myItems = filterItemsByOwner(items, ROLE);
  const status = statusCounts(myItems);
  const ready = topNByRevenueHourRatio(myItems, 5);
  const blocked = myItems.filter(i => i.founder_blocker).map(i => ({ id: i.id, blocker: i.founder_blocker, title: i.title }));
  const kpis = kpisForMetrics(kpiCache, RELEVANT_KPI_METRICS);

  return `# SALES Advisory — ${isoWeek()}

> Auto-generated weekly. Decision Agent reads this. Founder override OK.

## Owned items snapshot
- Total: ${myItems.length}
- Planned: ${status.planned || 0}
- In progress: ${status.in_progress || 0}
- Shipped: ${status.shipped || 0}
- Verified: ${status.verified || 0}
- Blocked: ${status.blocked || 0}

## Top 5 ready-to-ship (revenue/hour desc)
${ready.length === 0 ? '_None ready (DAG blocked or all in progress)_' : ready.map(i => `- **${i.id}** ${i.title} — ₹${(i.revenue_impact?.amount_inr || 0).toLocaleString('en-IN')} / ${i.est_hours}h (P${i.priority?.slice(1) || '?'})`).join('\n')}

## Founder-blocked
${blocked.length === 0 ? '_None_' : blocked.map(b => `- ${b.id} blocked by ${b.blocker}: ${b.title}`).join('\n')}

## Live KPIs (this role)
${kpis.length === 0 ? '_No matching KPIs cached yet — run orchestrator first cycle_' : kpis.map(k => `- ${k.key}: ${k.value}${k.stale ? ' (STALE)' : ''}`).join('\n')}

## Dept doctrine (top 30 lines of ${DEPT_DOC})
\`\`\`
${dept.split('\n').slice(0, 30).join('\n')}
\`\`\`

## Recommended next-cycle prompts for Decision Agent
${ready.length === 0 ? '_Defer to founder — all SALES items either in flight or blocked_' : ready.slice(0, 3).map(i => `1. Spawn sales-agent on ${i.id} (${i.title}) — ${i.kpi?.metric || '?'} ${i.kpi?.current || 0}/${i.kpi?.target || '?'} ${i.kpi?.unit || ''}`).join('\n')}
`;
}

const out = writeAdvisory(ROLE, buildAdvisory());
console.log(`[cxo:${ROLE}] wrote ${out}`);
