#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const CONTENT_ROOT = path.join(process.cwd(), 'content');
const OUT = path.join(process.cwd(), 'public', 'search-index.json');

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return {};
  const fm = {};
  let pendingKey = null;
  let pendingArr = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (pendingArr) {
      const item = line.match(/^\s*-\s+(.*)$/);
      if (item) { pendingArr.push(stripQ(item[1].trim())); continue; }
      fm[pendingKey] = pendingArr; pendingArr = null; pendingKey = null;
    }
    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    const v = kv[2].trim();
    if (!v) { pendingKey = kv[1]; pendingArr = []; continue; }
    fm[kv[1]] = stripQ(v);
  }
  if (pendingArr && pendingKey) fm[pendingKey] = pendingArr;
  return fm;
}
function stripQ(s) { return s.replace(/^['"](.*)['"]$/, '$1'); }

const entries = [];
for (const cat of ['sanskrit', 'ved', 'sanatan']) {
  const dir = path.join(CONTENT_ROOT, cat);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.mdx')) continue;
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const fm = parseFrontmatter(raw);
    if (!fm.slug || !fm.title) continue;
    entries.push({
      category: cat,
      slug: fm.slug,
      title: fm.title,
      summary: fm.summary ?? '',
      subTopic: fm.subTopic,
    });
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(entries));
console.log(`search-index: wrote ${entries.length} entries -> ${path.relative(process.cwd(), OUT)}`);
