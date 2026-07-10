// Merge + dedup + normalize severity case. Run: node _merge.js
const fs = require('fs');
const dir = 'docs/agent-reports/bug-audit-rerun/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
let all = [];
const perFile = {};
for (const f of files) {
  let d;
  try { d = JSON.parse(fs.readFileSync(dir + f, 'utf8')); }
  catch (e) {
    // fix lone backslashes (bad regex escapes in strings)
    const raw = fs.readFileSync(dir + f, 'utf8');
    const fixed = raw.replace(/\\(?!["\\\/bfnrtu])/g, '\\\\');
    try { d = JSON.parse(fixed); fs.writeFileSync(dir + f, JSON.stringify(d, null, 2)); console.log('  (auto-fixed escapes in ' + f + ')'); }
    catch (e2) { console.log('SKIP ' + f + ': ' + e2.message.slice(0, 80)); continue; }
  }
  const finds = d.findings || [];
  for (const b of finds) {
    b._domain = d.domain;
    if (b.severity) b.severity = String(b.severity).toLowerCase();
    all.push(b);
  }
  perFile[d.domain] = finds.length;
}
console.log('=== PER DOMAIN ===');
for (const k in perFile) console.log(k + ': ' + perFile[k]);
console.log('--- TOTAL: ' + all.length + ' ---');
const sev = { critical: [], high: [], medium: [], low: [], info: [] };
for (const b of all) (sev[b.severity] || sev.info).push(b);
console.log('critical=' + sev.critical.length + ' high=' + sev.high.length + ' medium=' + sev.medium.length + ' low=' + sev.low.length + ' info=' + sev.info.length);

// Dedup by normalized file+title
const seen = new Set();
const dedup = [];
for (const b of all) {
  const key = (b.file + '|' + b.title).toLowerCase().replace(/[^a-z0-9|]/g, '').slice(0, 140);
  if (seen.has(key)) continue;
  seen.add(key); dedup.push(b);
}
console.log('--- DEDUPED: ' + dedup.length + ' (removed ' + (all.length - dedup.length) + ' dups) ---');
const sd = { critical: [], high: [], medium: [], low: [], info: [] };
for (const b of dedup) (sd[b.severity] || sd.info).push(b);
console.log('AFTER DEDUP: critical=' + sd.critical.length + ' high=' + sd.high.length + ' medium=' + sd.medium.length + ' low=' + sd.low.length + ' info=' + sd.info.length);

console.log('\n=== ALL CRITICALS ===');
sd.critical.forEach((b, i) => console.log((i + 1) + '. [' + b._domain + '] ' + (b.file || '').split('(')[0].trim() + ' :: ' + (b.title || '').slice(0, 95)));
console.log('\n=== ALL HIGHS ===');
sd.high.forEach((b, i) => console.log((i + 1) + '. [' + b._domain + '] ' + (b.file || '').split('(')[0].trim() + ' :: ' + (b.title || '').slice(0, 80)));
console.log('\n=== MEDIUMS ===');
sd.medium.forEach((b, i) => console.log((i + 1) + '. [' + b._domain + '] ' + (b.title || '').slice(0, 75)));

fs.writeFileSync(dir + '_MERGED_ALL.json', JSON.stringify(dedup, null, 1));
console.log('\nMerged+deduped written: ' + dedup.length + ' findings');
