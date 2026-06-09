#!/usr/bin/env node
// scripts/agents/roadmap/_bulk-create.mjs
// Reads CSV → creates per-item .md files under docs/roadmap/items/{quarter}/{category}/
// CSV cols: id,quarter,category,owner_role,month_target,priority,title,kpi_metric,kpi_target,kpi_unit,kpi_source,revenue_inr,est_hours,depends_on,blocks,tags,founder_blocker
// Usage: node scripts/agents/roadmap/_bulk-create.mjs <path-to-csv>
// Exit codes: 0 = success (always; skip-existing is non-fatal)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const CSV = process.argv[2] || 'docs/roadmap/_bulk-input.csv';
const NOW = new Date().toISOString();

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(',').map(h => h.trim());
  return lines.map(line => {
    const cols = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; }
      else cur += ch;
    }
    cols.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h, (cols[i] || '').trim()]));
  });
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

function itemMd(row) {
  const depends = row.depends_on ? row.depends_on.split(';').map(s => s.trim()).filter(Boolean) : [];
  const blocks = row.blocks ? row.blocks.split(';').map(s => s.trim()).filter(Boolean) : [];
  const tags = row.tags ? row.tags.split(';').map(s => s.trim()).filter(Boolean) : [];
  const founderBlocker = row.founder_blocker && row.founder_blocker !== '' ? `'${row.founder_blocker}'` : 'null';
  return `---
id: ${row.id}
title: ${row.title}
category: ${row.category}
owner_role: ${row.owner_role}
quarter: ${row.quarter}
month_target: ${row.month_target}
priority: ${row.priority}
status: planned
agent_assignable: true
founder_blocker: ${founderBlocker}
depends_on: ${JSON.stringify(depends)}
blocks: ${JSON.stringify(blocks)}

kpi:
  metric: ${row.kpi_metric}
  current: 0
  target: ${row.kpi_target}
  unit: ${row.kpi_unit}
  source: ${row.kpi_source}
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: ${row.revenue_inr}
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: ${row.est_hours}
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  ${NOW.slice(0, 10)}: bulk-imported from year-1 content sprint.

tags: ${JSON.stringify(tags)}
created_at: ${NOW}
updated_at: ${NOW}
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
`;
}

const rows = parseCsv(readFileSync(CSV, 'utf8'));
let created = 0, skipped = 0;
for (const row of rows) {
  if (!row.id || !row.quarter || !row.category) { skipped++; continue; }
  const dir = `docs/roadmap/items/${row.quarter}/${row.category}`;
  mkdirSync(dir, { recursive: true });
  const seq = row.id.match(/-(\d{3})$/)?.[1] || '000';
  const path = join(dir, `${seq}-${slugify(row.title)}.md`);
  if (existsSync(path)) { skipped++; continue; }
  writeFileSync(path, itemMd(row));
  created++;
}
console.log(`Created ${created}, skipped ${skipped}.`);
