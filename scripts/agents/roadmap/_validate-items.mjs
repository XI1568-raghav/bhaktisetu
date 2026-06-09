#!/usr/bin/env node
// Validates all docs/roadmap/items/**/*.md frontmatter against schema.
// Category-letter codes used in item id (R-Q1-X-NNN):
//   E = engineering        L = legal
//   M = marketing          H = hr
//   S = supply             CS = cs
//   SA = sales             IT = it
//   F = finance            G = geo
//                          P = product
// (One-letter codes preferred where unambiguous; two-letter when collisions exist.)
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { walk, parseFrontmatter, ITEMS_ROOT } from './_lib.mjs';

if (!existsSync(ITEMS_ROOT)) {
  console.error(`${ITEMS_ROOT} missing — run from repo root or after Task 0.1`);
  process.exit(1);
}

const REQUIRED = ['id','title','category','owner_role','quarter','month_target','priority','status','agent_assignable','depends_on','blocks','kpi','revenue_impact','est_hours','est_cost_inr','success_criteria','agent_brief','tags','created_at','updated_at'];
const NULLABLE = ['founder_blocker','shipped_at','verified_at','killed_at','killed_reason'];
const CATEGORIES = ['engineering','marketing','supply','sales','finance','legal','hr','cs','it','geo','product'];
const ROLES = ['cto','cfo','cmo','cpo','sales','talent','cs','legal','it','hr','founder'];
const PRIORITIES = ['P0','P1','P2','P3'];
const STATUSES = ['planned','in_progress','blocked','shipped','verified','killed'];

let errors = 0;
const files = walk(ITEMS_ROOT);
for (const file of files) {
  try {
    const fm = parseFrontmatter(readFileSync(file, 'utf8'));
    for (const k of REQUIRED) {
      if (fm[k] === undefined || (fm[k] === null && !NULLABLE.includes(k))) {
        console.error(`${file}: missing or null ${k}`); errors++;
      }
    }
    if (fm.kpi && (typeof fm.kpi !== 'object' || !fm.kpi.metric || !fm.kpi.target || !fm.kpi.source || !fm.kpi.query)) {
      console.error(`${file}: kpi missing required sub-keys (metric/target/source/query)`); errors++;
    }
    if (fm.category && !CATEGORIES.includes(fm.category)) { console.error(`${file}: bad category ${fm.category}`); errors++; }
    if (fm.owner_role && !ROLES.includes(fm.owner_role)) { console.error(`${file}: bad owner_role ${fm.owner_role}`); errors++; }
    if (fm.priority && !PRIORITIES.includes(fm.priority)) { console.error(`${file}: bad priority ${fm.priority}`); errors++; }
    if (fm.status && !STATUSES.includes(fm.status)) { console.error(`${file}: bad status ${fm.status}`); errors++; }
    if (fm.id && !/^R-(Q[1-4]|Y\d-Q[1-4])-[A-Z]+-\d{3}$/.test(fm.id)) { console.error(`${file}: bad id format ${fm.id}`); errors++; }
  } catch (e) {
    console.error(`${file}: ${e.message}`); errors++;
  }
}

// Global id-uniqueness check
const idCounts = new Map();
for (const file of files) {
  try {
    const fm = parseFrontmatter(readFileSync(file, 'utf8'));
    if (fm.id) {
      if (!idCounts.has(fm.id)) idCounts.set(fm.id, []);
      idCounts.get(fm.id).push(file);
    }
  } catch {}
}
for (const [id, paths] of idCounts) {
  if (paths.length > 1) {
    console.error(`ID COLLISION: ${id} appears in ${paths.length} files:`);
    for (const p of paths) console.error(`  - ${p}`);
    errors++;
  }
}

console.log(`Validated ${files.length} items, ${errors} errors.`);
process.exit(errors > 0 ? 1 : 0);
