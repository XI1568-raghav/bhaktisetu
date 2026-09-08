#!/usr/bin/env node
/**
 * Merge the agent shards into one ranked list, and flag what needs adversarial
 * verification before anything is reported as real.
 *
 * Dedupe is by (kind, target) rather than by text: two agents hitting the same
 * endpoint from different roles describe the same defect in different words, and
 * counting that twice is how a findings list inflates.
 *
 *   node merge-agents.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };

const shards = readdirSync(HERE).filter((f) => /^agent-.*\.json$/.test(f));
if (!shards.length) {
  console.log('no agent shards yet');
  process.exit(0);
}

const all = [];
const checkedCounts = {};
const blocked = [];
const broken = [];

for (const f of shards) {
  let j;
  try {
    j = JSON.parse(readFileSync(resolve(HERE, f), 'utf-8'));
  } catch (e) {
    broken.push({ file: f, error: e.message });
    continue;
  }
  const name = j.agent || f.replace(/^agent-|\.json$/g, '');
  checkedCounts[name] = Array.isArray(j.checked) ? j.checked.length : 0;
  for (const b of j.blocked || []) blocked.push({ agent: name, ...b });
  for (const fi of j.findings || []) all.push({ agent: name, ...fi });
}

const byKey = new Map();
for (const f of all) {
  const key = `${f.kind || 'UNKNOWN'}::${f.target || ''}`;
  if (!byKey.has(key)) byKey.set(key, { ...f, reportedBy: [f.agent] });
  else {
    const cur = byKey.get(key);
    cur.reportedBy.push(f.agent);
    // Keep the most severe framing when two agents disagree on severity.
    if ((RANK[f.severity] ?? 9) < (RANK[cur.severity] ?? 9)) {
      Object.assign(cur, f, { reportedBy: cur.reportedBy });
    }
  }
}

const merged = [...byKey.values()].sort(
  (a, b) => (RANK[a.severity] ?? 9) - (RANK[b.severity] ?? 9),
);

// Anything that moves money, loses data, or crosses a role boundary does not get
// reported on one agent's say-so.
const needsVerify = merged.filter(
  (f) => f.severity === 'P0' || f.severity === 'P1' || f.confidence === 'suspected',
);

const out = {
  generatedAt: new Date().toISOString(),
  shards: shards.length,
  checkedByAgent: checkedCounts,
  totalChecked: Object.values(checkedCounts).reduce((a, b) => a + b, 0),
  rawFindings: all.length,
  afterDedupe: merged.length,
  bySeverity: merged.reduce((a, f) => ((a[f.severity] = (a[f.severity] || 0) + 1), a), {}),
  needsVerification: needsVerify.length,
  unparseableShards: broken,
  findings: merged,
  blocked,
};

writeFileSync(resolve(HERE, 'MERGED.json'), JSON.stringify(out, null, 2));

console.log(`shards: ${shards.length}  checks: ${out.totalChecked}`);
if (broken.length) console.log('UNPARSEABLE:', broken.map((b) => b.file).join(', '));
console.log(`findings: ${all.length} raw -> ${merged.length} deduped`, JSON.stringify(out.bySeverity));
console.log(`needing adversarial verification: ${needsVerify.length}`);
console.log(`blocked steps: ${blocked.length}`);
console.log('');
for (const f of merged) {
  console.log(`  ${f.severity} ${f.kind} ${f.target}  [${f.reportedBy.join('+')}]`);
  console.log(`      observed: ${String(f.observed || '').slice(0, 110)}`);
}
