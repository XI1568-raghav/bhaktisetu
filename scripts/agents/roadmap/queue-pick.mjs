#!/usr/bin/env node
// scripts/agents/roadmap/queue-pick.mjs
// Picks a queue item by queueId, itemId, `next`, or `next-<role>`.
// Marks it consumed in-place (mirrors queue-pop.ps1) and echoes the body.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const QUEUE_DIR = 'docs/roadmap/queue';
const arg = process.argv[2] || 'next';

if (!existsSync(QUEUE_DIR)) { console.log('<!-- queue dir missing -->'); process.exit(0); }

const files = readdirSync(QUEUE_DIR).filter(f => f.endsWith('.md')).sort();

function readFile(f) {
  const content = readFileSync(join(QUEUE_DIR, f), 'utf8');
  const m = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  try { return { file: f, fm: yaml.load(m[1]), body: m[2], fmText: m[1] }; }
  catch { return null; }
}

let target = null;

if (arg === 'next') {
  for (const f of files) {
    const p = readFile(f);
    if (p && (p.fm.consumedAt === null || p.fm.consumedAt === undefined)) { target = p; break; }
  }
} else if (arg.startsWith('next-')) {
  const role = arg.slice(5);
  for (const f of files) {
    const p = readFile(f);
    if (p && (p.fm.consumedAt === null || p.fm.consumedAt === undefined) && p.fm.role === role) { target = p; break; }
  }
} else {
  // queueId or itemId match
  for (const f of files) {
    const p = readFile(f);
    if (p && (p.fm.queueId === arg || p.fm.itemId === arg)) { target = p; break; }
  }
}

if (!target) { console.log(`<!-- no match for "${arg}" -->`); process.exit(0); }

// Mark consumed in-place
const now = new Date().toISOString();
const sessionId = process.env.CLAUDE_SESSION_ID || 'unknown-session';
target.fm.consumedAt = now;
target.fm.consumedBy = 'claude-code';
target.fm.consumedInSessionId = sessionId;
writeFileSync(join(QUEUE_DIR, target.file), `---\n${yaml.dump(target.fm)}---\n${target.body}`);

console.log(`<!-- ROADMAP QUEUE ITEM: ${target.file} -->`);
console.log('');
console.log(target.body);
console.log('');
console.log(`<!-- On commit: include trailer 'Closes: ${target.fm.queueId}' -->`);
