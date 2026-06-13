// Schema tests for R-Q1-S-014 warm-network reachout artifacts.
// Run: node --test scripts/sales/warm-network/__tests__/tracker-schema.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const TRACKER = join(REPO_ROOT, 'data', 'sales', 'warm-network-tracker.csv');
const SEED = join(REPO_ROOT, 'data', 'sales', 'warm-network-contacts-seed.csv');
const SCRIPTS_DIR = join(REPO_ROOT, 'scripts', 'sales', 'warm-network');

const EXPECTED_HEADER = [
  'contact_name',
  'relationship',
  'channel',
  'city',
  'ask_type',
  'script_variant',
  'language',
  'sent_at',
  'replied_at',
  'referral_received',
  'supply_lead_id',
  'notes',
];

test('tracker CSV header matches 12-column spec', () => {
  const raw = readFileSync(TRACKER, 'utf8');
  const firstLine = raw.split(/\r?\n/)[0];
  const cols = firstLine.split(',');
  assert.equal(cols.length, 12, `expected 12 cols, got ${cols.length}: ${firstLine}`);
  assert.deepEqual(cols, EXPECTED_HEADER);
});

test('seed CSV has 50 pre-segmented contact rows', () => {
  const raw = readFileSync(SEED, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  // 1 header + 50 data rows
  assert.equal(lines.length, 51, `expected 51 lines (1 header + 50), got ${lines.length}`);
  // First line must match tracker schema (same 12 columns)
  assert.deepEqual(lines[0].split(','), EXPECTED_HEADER);
  // Each data row must have 12 columns (CSV-comma-count, no quoted commas in template)
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    assert.equal(cols.length, 12, `row ${i} has ${cols.length} cols, want 12: ${lines[i]}`);
  }
});

test('seed CSV has correct ask_type distribution per spec', () => {
  const raw = readFileSync(SEED, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(1);
  const counts = {};
  for (const line of lines) {
    const askType = line.split(',')[4];
    counts[askType] = (counts[askType] || 0) + 1;
  }
  assert.equal(counts['temple'], 15, `temple count: ${counts['temple']}`);
  assert.equal(counts['pandit'], 15, `pandit count: ${counts['pandit']}`);
  assert.equal(counts['gaushala'], 10, `gaushala count: ${counts['gaushala']}`);
  assert.equal(counts['donor'], 5, `donor count: ${counts['donor']}`);
  assert.equal(counts['diaspora'], 5, `diaspora count: ${counts['diaspora']}`);
});

const WA_SCRIPTS = ['wa-script-temple.md', 'wa-script-pandit.md', 'wa-script-gaushala.md'];

for (const file of WA_SCRIPTS) {
  test(`${file} has Hindi + English headings and {first_name} placeholder`, () => {
    const raw = readFileSync(join(SCRIPTS_DIR, file), 'utf8');
    assert.match(raw, /## Hindi/, `${file} missing ## Hindi heading`);
    assert.match(raw, /## English/, `${file} missing ## English heading`);
    assert.match(raw, /\{first_name\}/, `${file} missing {first_name} placeholder`);
  });

  test(`${file} Hindi + English bodies each under 350 chars (WA-friendly)`, () => {
    const raw = readFileSync(join(SCRIPTS_DIR, file), 'utf8');
    // Body = text between ## Hindi heading and next ## heading, and ## English heading and next ## heading.
    const hindiMatch = raw.match(/## Hindi\s*\n([\s\S]*?)(?=\n## |\n# |$)/);
    const englishMatch = raw.match(/## English\s*\n([\s\S]*?)(?=\n## |\n# |$)/);
    assert.ok(hindiMatch, `${file} ## Hindi body not extractable`);
    assert.ok(englishMatch, `${file} ## English body not extractable`);
    const hindiLen = hindiMatch[1].trim().length;
    const englishLen = englishMatch[1].trim().length;
    assert.ok(hindiLen < 350, `${file} Hindi body ${hindiLen} chars (>= 350)`);
    assert.ok(englishLen < 350, `${file} English body ${englishLen} chars (>= 350)`);
  });
}

test('scripts dir has ≥6 .md files (5 scripts + README)', () => {
  const files = readdirSync(SCRIPTS_DIR).filter((f) => f.endsWith('.md'));
  assert.ok(files.length >= 6, `expected ≥6 .md files, got ${files.length}: ${files.join(',')}`);
  // Must include the 5 named scripts + README
  const required = [
    'wa-script-temple.md',
    'wa-script-pandit.md',
    'wa-script-gaushala.md',
    'email-script-formal.md',
    'followup-script-day7.md',
    'README.md',
  ];
  for (const r of required) {
    assert.ok(files.includes(r), `missing required file ${r}`);
  }
});
