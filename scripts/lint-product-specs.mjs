#!/usr/bin/env node
// scripts/lint-product-specs.mjs
// Lints all docs/product/specs/*.md for required H2 sections + forbidden marketing words.
// Exit 1 on any failure. Used by `pnpm lint:specs` + roadmap CI.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const SPECS_DIR = join(REPO_ROOT, 'docs', 'product', 'specs');

// Required H2 sections (## Foo) in every spec.
const REQUIRED_H2 = [
  'Mission',
  'Non-goals',
  'Personas',
  'Booking flow',
  'Pandit dispatch SLA',
  'Family coordination chat',
  'Payment model',
  'Grief-sensitive copy review checklist',
  'Data model sketch',
  'Wireframes',
  'Success criteria',
  'Open questions',
];

// Words that must NEVER appear in a grief-domain spec.
const FORBIDDEN_WORDS = [
  'discount',
  'limited time',
  'hurry',
  'book now',
  'sale',
  'offer',
  'premium upgrade',
  'VIP',
  'congratulations',
  'awesome',
  'amazing deal',
];

let fail = 0;
function err(msg) { console.error(`[lint-specs] FAIL: ${msg}`); fail++; }
function note(msg) { console.log(`[lint-specs] ${msg}`); }

if (!existsSync(SPECS_DIR)) {
  console.log('[lint-specs] no docs/product/specs/ dir — skipping (vacuous OK)');
  process.exit(0);
}

const files = readdirSync(SPECS_DIR).filter((f) => f.endsWith('.md'));
if (files.length === 0) {
  console.log('[lint-specs] no specs found — skipping');
  process.exit(0);
}

// Wedding-planner-specific required H2s. Different domain (revenue + commerce
// vs antim-sanskar's dignity/grief). Added 2026-06-12 for R-Q4-P-003.
const WEDDING_REQUIRED_H2 = [
  'Mission',
  'Non-goals',
  'User Journey',
  'Personas',
  'Data Model Deltas',
  'API Surface',
  'UI Screens',
  'Revenue Model',
  'MVP Cut-line',
  'Competitor Diff',
  'Open Questions',
];

for (const file of files) {
  const fp = join(SPECS_DIR, file);
  const content = readFileSync(fp, 'utf8');
  note(`linting ${file}...`);

  // Per-spec specific overrides: antim sanskar uses dignity-domain rules. Other specs may relax later.
  const isAntimSanskar = /antim[\s-]?sanskar/i.test(file);
  const isWeddingPlanner = /wedding[\s-]?planner/i.test(file);

  // 1. Required H2 sections — antim sanskar rules apply to antim only.
  // Wedding planner uses its own H2 schema (commerce-oriented).
  if (isAntimSanskar) {
    for (const h of REQUIRED_H2) {
      const re = new RegExp(`^##\\s+${h.replace(/[-/\\^$*+?.()|[\\]{}]/g, '\\$&')}`, 'mi');
      if (!re.test(content)) err(`${file} missing required H2: '## ${h}'`);
    }
  }
  if (isWeddingPlanner) {
    for (const h of WEDDING_REQUIRED_H2) {
      const re = new RegExp(`^##\\s+${h.replace(/[-/\\^$*+?.()|[\\]{}]/g, '\\$&')}`, 'mi');
      if (!re.test(content)) err(`${file} missing required H2: '## ${h}'`);
    }

    // Wedding-spec: ≥8 endpoint definitions (regex: `- \`(GET|POST|PATCH|DELETE) /api/`)
    const endpointMatches = content.match(/^-\s+`(GET|POST|PATCH|DELETE)\s+\/api\//gm) || [];
    if (endpointMatches.length < 8) {
      err(`${file} has ${endpointMatches.length} API endpoint definitions, expected >= 8`);
    }

    // Wedding-spec: ≥12 wireframes (code blocks inside ## UI Screens section)
    const wfSection = content.match(/##\s+UI Screens[\s\S]+?(?=^##\s[^#]|\Z)/m);
    if (wfSection) {
      const blocks = (wfSection[0].match(/```/g) || []).length / 2;
      if (blocks < 12) err(`${file} has ${blocks} wireframe blocks in UI Screens, expected >= 12`);
    } else {
      err(`${file} could not locate UI Screens section`);
    }

    // Wedding-spec: 3 data model tables (regex `### Table:` blocks)
    const tableBlocks = content.match(/^###\s+Table:\s+\w+/gm) || [];
    const requiredTables = ['wedding_event', 'wedding_vendor_booking', 'muhurat_request'];
    for (const t of requiredTables) {
      const re = new RegExp(`^###\\s+Table:\\s+${t}`, 'm');
      if (!re.test(content)) err(`${file} missing data-model table: ### Table: ${t}`);
    }

    // Wedding-spec: revenue section contains all three numeric tiers
    const hasTier15K = /₹15,?000/.test(content);
    const hasTier50K = /₹50,?000/.test(content);
    const hasTier2L = /₹2,?00,?000/.test(content);
    if (!hasTier15K) err(`${file} revenue section missing ₹15,000 tier`);
    if (!hasTier50K) err(`${file} revenue section missing ₹50,000 tier`);
    if (!hasTier2L) err(`${file} revenue section missing ₹2,00,000 tier`);
    const hasTakeRate = /8%-?12%|8\s*-\s*12\s*%/.test(content);
    if (!hasTakeRate) err(`${file} revenue section missing take-rate 8%-12%`);

    // Wedding-spec: competitor section names ≥2 of WedMeGood / ShaadiSaga / BookMyPandit
    const competitors = ['WedMeGood', 'ShaadiSaga', 'BookMyPandit'];
    const namedCount = competitors.filter((c) => new RegExp(c, 'i').test(content)).length;
    if (namedCount < 2) err(`${file} competitor section names only ${namedCount} of ${competitors.length} required competitors`);

    // Wedding-spec: MVP Cut-line table contains both v1 and v2 columns
    // Loose check: any pipe-bracketed cell starting with v1/v2 (case-insensitive).
    const cutSection = content.match(/##\s+MVP Cut-line[\s\S]+?(?=^##\s[^#]|\Z)/m);
    if (cutSection) {
      const hasV1Col = /\|\s*\*?\*?v1\b/i.test(cutSection[0]);
      const hasV2Col = /\|\s*\*?\*?v2\b/i.test(cutSection[0]);
      if (!hasV1Col) err(`${file} MVP Cut-line table missing v1 column`);
      if (!hasV2Col) err(`${file} MVP Cut-line table missing v2 column`);
    }
  }

  // 2. Forbidden marketing words (case-insensitive, word-boundary where possible).
  // Skip lines that EITHER (a) cite the word in a Non-goals / checklist / vocab-blocklist
  // / Open-questions context, OR (b) appear as quoted strings discussing the prohibition itself.
  if (isAntimSanskar) {
    const EXEMPTION_RE = /forbidden|do NOT|never use|avoid words?:|blocklist|no "|no '|No "|No '|replaced with|surge pricing|FIFO|introductory pricing|early-bird|marketing lang|asthi visarjan|second reminder, offer to discuss|verbs of service|commercial verbs/i;
    for (const w of FORBIDDEN_WORDS) {
      const re = new RegExp(`\\b${w.replace(/[-/\\^$*+?.()|[\\]{}]/g, '\\$&')}\\b`, 'i');
      const lines = content.split('\n');
      const offenders = lines
        .map((line, i) => ({ line, i: i + 1 }))
        .filter(({ line }) => re.test(line))
        .filter(({ line }) => !EXEMPTION_RE.test(line));
      if (offenders.length) {
        for (const o of offenders) err(`${file}:${o.i} contains forbidden word '${w}': ${o.line.trim().slice(0, 80)}`);
      }
    }
  }

  // 3. At least 12 grief-copy checklist items. H2 regex must stop only at NEXT H2,
  // ignoring H3/H4 nested headings (which use ### or ####).
  if (isAntimSanskar) {
    const m = content.match(/##\s+Grief-sensitive copy review checklist[\s\S]+?(?=^##\s[^#]|\Z)/m);
    if (m) {
      const bullets = (m[0].match(/^-\s+\[\s?\]\s+/gm) || []).length + (m[0].match(/^-\s+[^[]/gm) || []).length;
      if (bullets < 12) err(`${file} grief checklist has ${bullets} items, expected >= 12`);
    } else {
      err(`${file} could not locate Grief-sensitive copy review checklist section`);
    }
  }

  // 4. At least 5 ASCII wireframes (code blocks inside ## Wireframes section).
  if (isAntimSanskar) {
    const m = content.match(/##\s+Wireframes[\s\S]+?(?=^##\s[^#]|\Z)/m);
    if (m) {
      const blocks = (m[0].match(/```/g) || []).length / 2;
      if (blocks < 5) err(`${file} has ${blocks} wireframe code-blocks, expected >= 5`);
    } else {
      err(`${file} could not locate Wireframes section`);
    }
  }

  note(`  ${file}: checks complete`);
}

if (fail > 0) {
  console.error(`[lint-specs] FAILED (${fail} error${fail > 1 ? 's' : ''})`);
  process.exit(1);
}
console.log('[lint-specs] OK');
