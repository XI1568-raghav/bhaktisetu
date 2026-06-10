// scripts/agents/roadmap/queue-list.mjs
// Lists top 10 unconsumed queue items in a table.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const QUEUE_DIR = 'docs/roadmap/queue';
if (!existsSync(QUEUE_DIR)) { console.log('queue dir missing'); process.exit(0); }

const files = readdirSync(QUEUE_DIR).filter(f => f.endsWith('.md')).sort();
const rows = [];
for (const f of files) {
  const content = readFileSync(join(QUEUE_DIR, f), 'utf8');
  const m = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
  if (!m) continue;
  try {
    const fm = yaml.load(m[1]);
    if (fm.consumedAt) continue;
    rows.push(fm);
  } catch {}
}

console.log(`Queue depth: ${rows.length} unconsumed`);
console.log('');
console.log('queueId           role     P    min   itemId          title');
console.log('-'.repeat(110));
for (const r of rows.slice(0, 10)) {
  const qid = (r.queueId || '?').padEnd(18);
  const role = (r.role || '?').padEnd(8);
  const pri = String(r.priority || '?').padEnd(4);
  const min = String(r.estMinutes || '?').padEnd(5);
  const iid = (r.itemId || '?').padEnd(15);
  const title = (r.itemTitle || '').slice(0, 50);
  console.log(`${qid} ${role} ${pri} ${min} ${iid} ${title}`);
}
