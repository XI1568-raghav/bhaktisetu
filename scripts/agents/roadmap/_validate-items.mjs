#!/usr/bin/env node
// Validates all docs/roadmap/items/**/*.md frontmatter against schema.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const ROOT = 'docs/roadmap/items';
const REQUIRED = ['id','title','category','owner_role','quarter','month_target','priority','status','agent_assignable','depends_on','blocks','kpi','revenue_impact','est_hours','est_cost_inr','success_criteria','agent_brief','tags','created_at','updated_at'];
const CATEGORIES = ['engineering','marketing','supply','sales','finance','legal','hr','cs','it','geo','product'];
const ROLES = ['cto','cfo','cmo','cpo','sales','talent','cs','legal','it','hr','founder'];
const PRIORITIES = ['P0','P1','P2','P3'];
const STATUSES = ['planned','in_progress','blocked','shipped','verified','killed'];

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (e.endsWith('.md')) out.push(p);
  }
  return out;
}

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]+?)\n---/);
  if (!m) throw new Error('no frontmatter');
  return yaml.load(m[1]);
}

let errors = 0;
for (const file of walk(ROOT)) {
  try {
    const fm = parseFrontmatter(readFileSync(file, 'utf8'));
    for (const k of REQUIRED) if (fm[k] === undefined) { console.error(`${file}: missing ${k}`); errors++; }
    if (!CATEGORIES.includes(fm.category)) { console.error(`${file}: bad category ${fm.category}`); errors++; }
    if (!ROLES.includes(fm.owner_role)) { console.error(`${file}: bad owner_role ${fm.owner_role}`); errors++; }
    if (!PRIORITIES.includes(fm.priority)) { console.error(`${file}: bad priority ${fm.priority}`); errors++; }
    if (!STATUSES.includes(fm.status)) { console.error(`${file}: bad status ${fm.status}`); errors++; }
    if (!/^R-(Q[1-4]|Y\d-Q[1-4])-[A-Z]+-\d{3}$/.test(fm.id)) { console.error(`${file}: bad id format ${fm.id}`); errors++; }
  } catch (e) {
    console.error(`${file}: ${e.message}`); errors++;
  }
}
console.log(`Validated ${walk(ROOT).length} items, ${errors} errors.`);
process.exit(errors > 0 ? 1 : 0);
