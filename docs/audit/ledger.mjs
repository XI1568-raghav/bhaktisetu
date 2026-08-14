// Progress ledger for the 388-finding sweep. Single source of truth for
// "how many of 388 are closed" — survives context loss and session restarts.
//   node ledger.mjs                      → summary + next open items
//   node ledger.mjs set <key> <state> [commit] [note]
//   node ledger.mjs md                   → regenerate LEDGER.md
import fs from 'node:fs';
const P = new URL('./LEDGER.json', import.meta.url);
const L = JSON.parse(fs.readFileSync(P, 'utf8'));
const save = () => fs.writeFileSync(P, JSON.stringify(L, null, 1));
const STATES = ['fixed', 'partial', 'open', 'owner', 'wontfix'];
const count = (f) => L.filter(f).length;

const summary = () => {
  const rows = ['P0', 'P1', 'P2', 'P3'].map((s) => {
    const t = count((o) => o.sev === s);
    return { sev: s, total: t, fixed: count((o) => o.sev === s && o.state === 'fixed'),
      partial: count((o) => o.sev === s && o.state === 'partial'),
      owner: count((o) => o.sev === s && o.state === 'owner'),
      open: count((o) => o.sev === s && o.state === 'open') };
  });
  const tot = { total: L.length, fixed: count((o) => o.state === 'fixed'),
    partial: count((o) => o.state === 'partial'), owner: count((o) => o.state === 'owner'),
    open: count((o) => o.state === 'open') };
  return { rows, tot };
};

const cmd = process.argv[2];
if (cmd === 'set') {
  const [, , , key, state, commit, ...note] = process.argv;
  if (!STATES.includes(state)) { console.error(`state must be one of ${STATES}`); process.exit(1); }
  const r = L.find((o) => o.key === key || o.id === key);
  if (!r) { console.error(`no finding ${key}`); process.exit(1); }
  r.state = state; if (commit && commit !== '-') r.commit = commit;
  if (note.length) r.note = note.join(' ');
  save();
  console.log(`${r.key} ${r.id} → ${state}`);
} else if (cmd === 'md') {
  const { rows, tot } = summary();
  const pct = (n) => ((n / tot.total) * 100).toFixed(1);
  let md = `# Sweep remediation ledger\n\n`;
  md += `Source: \`prod-sweep-raw-2026-08-12.md\` — 388 findings, 32 agents, 4 workflows.\n`;
  md += `Update with \`node docs/audit/ledger.mjs set <key> <state> <commit> <note>\`.\n\n`;
  md += `## Closed: ${tot.fixed} of ${tot.total} (${pct(tot.fixed)}%)\n\n`;
  md += `| Severity | Total | Fixed | Partial | Owner | Open |\n|---|---:|---:|---:|---:|---:|\n`;
  for (const r of rows) md += `| ${r.sev} | ${r.total} | ${r.fixed} | ${r.partial} | ${r.owner} | ${r.open} |\n`;
  md += `| **All** | **${tot.total}** | **${tot.fixed}** | **${tot.partial}** | **${tot.owner}** | **${tot.open}** |\n\n`;
  md += `## Closed and partial\n\n| Key | Sev | ID | Area | State | Commit | Note |\n|---|---|---|---|---|---|---|\n`;
  for (const o of L.filter((x) => x.state !== 'open'))
    md += `| ${o.key} | ${o.sev} | ${o.id} | ${o.area} | ${o.state} | ${o.commit || '—'} | ${o.note || ''} |\n`;
  fs.writeFileSync(new URL('./LEDGER.md', import.meta.url), md);
  console.log(`LEDGER.md written — ${tot.fixed}/${tot.total} closed`);
} else {
  const { rows, tot } = summary();
  for (const r of rows) console.log(`  ${r.sev}  ${String(r.total).padStart(3)} total  ${String(r.fixed).padStart(3)} fixed  ${String(r.partial).padStart(2)} partial  ${String(r.owner).padStart(2)} owner  ${String(r.open).padStart(3)} open`);
  console.log(`  ALL ${String(tot.total).padStart(3)} total  ${String(tot.fixed).padStart(3)} fixed  ${String(tot.partial).padStart(2)} partial  ${String(tot.owner).padStart(2)} owner  ${String(tot.open).padStart(3)} open`);
}
