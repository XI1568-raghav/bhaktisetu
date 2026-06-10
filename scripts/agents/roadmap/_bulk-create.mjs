// scripts/agents/roadmap/_bulk-create.mjs
// Reads CSV → creates per-item .md files under docs/roadmap/items/{quarter}/{category}/
// CSV cols: id,quarter,category,owner_role,month_target,priority,title,kpi_metric,kpi_target,kpi_unit,kpi_source,revenue_inr,est_hours,depends_on,blocks,tags,founder_blocker
// Usage: node scripts/agents/roadmap/_bulk-create.mjs <path-to-csv>
// Exit codes: 0 = success; 1 = validation failure (dup id, bad format, category mismatch, missing CSV)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ITEMS_ROOT } from './_lib.mjs';

const CSV = process.argv[2] || 'docs/roadmap/_bulk-input.csv';
const NOW = new Date().toISOString();

if (!existsSync(CSV)) {
  console.error(`${CSV} not found — pass path as argv[2]`);
  process.exit(1);
}

function parseCsv(text) {
  // Strip UTF-8 BOM if present (I1 fix)
  text = text.replace(/^﻿/, '');
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(',').map(h => h.trim());
  return lines.map(line => {
    const cols = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }  // RFC-4180 escaped quote
        else inQ = !inQ;                                       // toggle quote mode
      } else if (ch === ',' && !inQ) {
        cols.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur);
    return Object.fromEntries(headers.map((h, i) => [h, (cols[i] || '').trim()]));
  });
}

function yamlStr(s) {
  if (s === null || s === undefined) return 'null';
  // Always double-quote for safety; escape backslashes + double-quotes
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
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
title: ${yamlStr(row.title)}
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
  metric: ${yamlStr(row.kpi_metric)}
  current: 0
  target: ${row.kpi_target}
  unit: ${yamlStr(row.kpi_unit)}
  source: ${yamlStr(row.kpi_source)}
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

// Pre-scan: duplicate-id check (C2)
const seenIds = new Map();
for (const [idx, row] of rows.entries()) {
  if (!row.id) continue;
  if (seenIds.has(row.id)) {
    console.error(`Duplicate id ${row.id} at rows ${seenIds.get(row.id) + 2} and ${idx + 2} of ${CSV}`);
    process.exit(1);
  }
  seenIds.set(row.id, idx);
}

// Pre-scan: id-format check (C2)
const ID_RE = /^R-(Q[1-4]|Y\d-Q[1-4])-[A-Z]+-\d{3}$/;
for (const [idx, row] of rows.entries()) {
  if (row.id && !ID_RE.test(row.id)) {
    console.error(`Bad id format '${row.id}' at row ${idx + 2} of ${CSV} (expected R-Q[1-4]-[A-Z]+-NNN)`);
    process.exit(1);
  }
}

// Pre-scan: id-category letter cross-check (I2)
const CATEGORY_LETTERS = {
  engineering: 'E', marketing: 'M', supply: 'S', sales: 'SA',
  finance: 'F', legal: 'L', hr: 'H', cs: 'CS',
  it: 'IT', geo: 'G', product: 'P'
};
for (const [idx, row] of rows.entries()) {
  if (!row.id || !row.category) continue;
  const expected = CATEGORY_LETTERS[row.category];
  const actual = row.id.match(/-([A-Z]+)-\d{3}$/)?.[1];
  if (expected && actual && expected !== actual) {
    console.error(`Row ${idx + 2}: id ${row.id} category-letter '${actual}' does not match category '${row.category}' (expected '${expected}')`);
    process.exit(1);
  }
}

let created = 0, skipped = 0;
for (const row of rows) {
  if (!row.id || !row.quarter || !row.category) { skipped++; continue; }
  const dir = `${ITEMS_ROOT}/${row.quarter}/${row.category}`;
  mkdirSync(dir, { recursive: true });
  const seq = row.id.match(/-(\d{3})$/)?.[1] || '000';
  const path = join(dir, `${seq}-${slugify(row.title)}.md`);
  if (existsSync(path)) { skipped++; continue; }
  writeFileSync(path, itemMd(row));
  created++;
}
console.log(`Created ${created}, skipped ${skipped}.`);
