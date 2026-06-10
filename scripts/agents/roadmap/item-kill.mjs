#!/usr/bin/env node
// scripts/agents/roadmap/item-kill.mjs
// Marks a roadmap item as killed, logs to _alerts/, lists downstream blocked.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const itemId = process.argv[2];
const reason = process.argv.slice(3).join(' ') || 'no reason given';
if (!itemId) { console.error('usage: item-kill <itemId> <reason>'); process.exit(1); }

const ITEMS_ROOT = 'docs/roadmap/items';
function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (e.endsWith('.md')) out.push(p);
  }
  return out;
}

const files = walk(ITEMS_ROOT);
let killed = null;
const blockedDownstream = [];

for (const f of files) {
  const content = readFileSync(f, 'utf8');
  const m = content.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) continue;
  try {
    const fm = yaml.load(m[1]);
    if (fm.id === itemId) {
      fm.status = 'killed';
      fm.killed_at = new Date().toISOString();
      fm.killed_reason = reason;
      fm.updated_at = new Date().toISOString();
      writeFileSync(f, `---\n${yaml.dump(fm)}---\n${m[2]}`);
      killed = { file: f, fm };
    } else if (Array.isArray(fm.depends_on) && fm.depends_on.includes(itemId)) {
      blockedDownstream.push({ file: f, id: fm.id });
    }
  } catch {}
}

if (!killed) { console.error(`item ${itemId} not found`); process.exit(1); }

mkdirSync('docs/roadmap/_alerts', { recursive: true });
writeFileSync(`docs/roadmap/_alerts/item-killed-${itemId}.md`,
  `# Item killed\n\nID: ${itemId}\nFile: ${killed.file}\nReason: ${reason}\nKilled at: ${killed.fm.killed_at}\n\nDownstream blocked (${blockedDownstream.length}):\n${blockedDownstream.map(b => `- ${b.id} (${b.file})`).join('\n')}\n`);

console.log(`Killed ${itemId} (${killed.file})`);
console.log(`Downstream blocked: ${blockedDownstream.length}`);
for (const b of blockedDownstream) console.log(`  - ${b.id}`);
