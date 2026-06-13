#!/usr/bin/env node
// Build batch JSON for 40-item ship loop.
// Reads docs/roadmap/_dryrun/queue/*.md, dedups by roadmap ID, tops up from
// docs/roadmap/items/**/*.md status:in_progress sorted by priority + est_hours,
// writes docs/roadmap/_ship-batch-2026-06-13.json.

import fs from 'node:fs';
import path from 'node:path';

const REPO = process.cwd();
const QUEUE_DIR = path.join(REPO, 'docs/roadmap/_dryrun/queue');
const ITEMS_DIR = path.join(REPO, 'docs/roadmap/items');
const OUT = path.join(REPO, 'docs/roadmap/_ship-batch-2026-06-13.json');
const EXCLUDE_IDS = new Set(['R-Q1-IT-001', 'R-Q4-P-007']); // in-flight / shipped
const TARGET = 40;

const ID_RE = /(R-Q[1-4]-[A-Z]+-\d+|SIDE-FIX-[A-Z0-9-]+|META-[A-Z-]+)/;

function extractId(fileName) {
  const m = fileName.match(ID_RE);
  return m ? m[1] : null;
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) {
      let val = kv[2].trim();
      val = val.replace(/^["']|["']$/g, '');
      if (val === 'null') val = null;
      out[kv[1]] = val;
    }
  }
  return out;
}

function parseEstHours(text) {
  const m = text.match(/^est_hours:\s*(\d+(?:\.\d+)?)/m);
  return m ? parseFloat(m[1]) : 999;
}

function parseStatus(text) {
  const m = text.match(/^status:\s*(\w+)/m);
  return m ? m[1] : 'unknown';
}

function parsePriority(text) {
  const m = text.match(/^priority:\s*(P\d|[A-Z]+)/m);
  return m ? m[1] : 'P3';
}

function parseCategory(text, fallback) {
  const m = text.match(/^category:\s*(\w+)/m);
  return m ? m[1] : fallback || 'misc';
}

function priorityRank(p) {
  if (p === 'P0') return 0;
  if (p === 'P1') return 1;
  if (p === 'P2') return 2;
  return 3;
}

// 1. Walk queue, dedup by ID keeping latest timestamp
const queueFiles = fs.readdirSync(QUEUE_DIR).filter(f => f.endsWith('.md'));
const byId = new Map();
for (const f of queueFiles) {
  const id = extractId(f);
  if (!id) continue;
  if (EXCLUDE_IDS.has(id)) continue;
  // file name starts with ISO timestamp — string sort works
  const prev = byId.get(id);
  if (!prev || prev.file < f) {
    byId.set(id, { id, file: f, source: 'queue' });
  }
}

// Enrich queue items w/ category from filename (e.g. ...-cmo-..., ...-cto-...)
for (const item of byId.values()) {
  const m = item.file.match(/Z-([a-z-]+?)-R-Q/) || item.file.match(/Z-([a-z-]+?)-SIDE/) || item.file.match(/Z-([a-z-]+?)-META/);
  item.category = m ? m[1] : 'misc';
  item.queueFile = path.join('docs/roadmap/_dryrun/queue', item.file);
  // Read est_hours + priority from queue spec if present (most won't have YAML)
  const txt = fs.readFileSync(path.join(QUEUE_DIR, item.file), 'utf8');
  item.estHours = parseEstHours(txt);
  item.priority = parsePriority(txt);
  // Try to locate source item md
  const idParts = item.id.match(/R-(Q[1-4])-([A-Z]+)-(\d+)/);
  if (idParts) {
    const [, quarter, cat, num] = idParts;
    const catDir = path.join(ITEMS_DIR, quarter, cat.toLowerCase() === 'h' ? 'talent' : cat.toLowerCase() === 'l' ? 'legal' : cat.toLowerCase() === 's' ? 'sales' : cat.toLowerCase() === 'e' ? 'engineering' : cat.toLowerCase() === 'm' ? 'marketing' : cat.toLowerCase() === 'p' ? 'product' : cat.toLowerCase() === 'it' ? 'it' : cat.toLowerCase() === 'cs' ? 'cs' : cat.toLowerCase() === 'f' ? 'finance' : cat.toLowerCase());
    if (fs.existsSync(catDir)) {
      const candidates = fs.readdirSync(catDir).filter(f => f.startsWith(num.padStart(3, '0') + '-'));
      if (candidates.length) {
        const srcPath = path.join('docs/roadmap/items', quarter, path.basename(catDir), candidates[0]);
        item.itemPath = srcPath;
        const srcTxt = fs.readFileSync(path.join(REPO, srcPath), 'utf8');
        item.sourceStatus = parseStatus(srcTxt);
        if (item.priority === 'P3') item.priority = parsePriority(srcTxt);
        if (item.estHours === 999) item.estHours = parseEstHours(srcTxt);
      }
    }
  }
}

let batch = Array.from(byId.values()).filter(i => i.sourceStatus !== 'shipped');

// 2. Sort: priority asc, estHours asc, category round-robin for diversity
batch.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.estHours - b.estHours);

// Category round-robin to avoid 10 sales back-to-back
function roundRobin(items) {
  const buckets = new Map();
  for (const it of items) {
    if (!buckets.has(it.category)) buckets.set(it.category, []);
    buckets.get(it.category).push(it);
  }
  const out = [];
  let drained = false;
  while (!drained) {
    drained = true;
    for (const arr of buckets.values()) {
      if (arr.length) { out.push(arr.shift()); drained = false; }
    }
  }
  return out;
}
batch = roundRobin(batch);

// 3. Top up from items/ in_progress if < TARGET
if (batch.length < TARGET) {
  const seen = new Set(batch.map(i => i.id));
  const topUp = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!e.name.endsWith('.md')) continue;
      const txt = fs.readFileSync(full, 'utf8');
      const status = parseStatus(txt);
      if (status !== 'in_progress') continue;
      const idM = txt.match(/^id:\s*(R-Q\d-[A-Z]+-\d+)/m);
      if (!idM) continue;
      const id = idM[1];
      if (seen.has(id)) continue;
      if (EXCLUDE_IDS.has(id)) continue;
      const rel = path.relative(REPO, full).replaceAll('\\', '/');
      const catM = rel.match(/items\/(Q\d)\/([^/]+)\//);
      topUp.push({
        id,
        file: null,
        queueFile: null,
        itemPath: rel,
        category: catM ? catM[2] : 'misc',
        priority: parsePriority(txt),
        estHours: parseEstHours(txt),
        sourceStatus: status,
        source: 'items',
      });
      seen.add(id);
    }
  }
  walk(ITEMS_DIR);
  topUp.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.estHours - b.estHours);
  const need = TARGET - batch.length;
  batch = batch.concat(roundRobin(topUp).slice(0, need));
}

batch = batch.slice(0, TARGET);

fs.writeFileSync(OUT, JSON.stringify(batch, null, 2));
console.log(`Wrote ${batch.length} items to ${OUT}`);
console.log(`Categories: ${Object.entries(batch.reduce((a, i) => (a[i.category] = (a[i.category] || 0) + 1, a), {})).map(([k, v]) => `${k}:${v}`).join(' ')}`);
console.log(`Priorities: ${Object.entries(batch.reduce((a, i) => (a[i.priority] = (a[i.priority] || 0) + 1, a), {})).map(([k, v]) => `${k}:${v}`).join(' ')}`);
console.log(`Queue source: ${batch.filter(i => i.source === 'queue').length}, items source: ${batch.filter(i => i.source === 'items').length}`);
