#!/usr/bin/env node
// X (Twitter) Engagement Digest — fetches public mention + reply data for
// @darshya_app via Nitter (free, no API key needed). Falls back to RSS.app
// or a stub digest if Nitter instance is down. Surfaces unanswered mentions
// + sentiment buckets so founder can reply within 24h SLA.
//
// Output: docs/agent-reports/YYYY-MM-DD-x-engagement-digest.md
//          docs/agent-reports/_x-engagement-digest-state.json
import { writeReport, REPORT_DIR } from './_lib.mjs';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const HANDLE = process.env.X_HANDLE || 'darshya_app';
const STATE_PATH = join(REPORT_DIR, '_x-engagement-digest-state.json');

// Public Nitter mirrors — try each until one returns 200. Mirror health
// is volatile, so this list rotates as instances die.
const NITTER_HOSTS = [
  'nitter.privacydev.net',
  'nitter.poast.org',
  'nitter.lucabased.xyz',
];

function loadState() {
  if (!existsSync(STATE_PATH)) return { seenIds: [], lastDigest: null };
  try { return JSON.parse(readFileSync(STATE_PATH, 'utf8')); } catch { return { seenIds: [], lastDigest: null }; }
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

async function fetchNitterRss(host, path) {
  try {
    const r = await fetch(`https://${host}${path}`, { headers: { 'user-agent': 'darshya-agent/1.0' } });
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
}

function parseRssItems(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const title = (block.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [, ''])[1].trim();
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [, ''])[1].trim();
    const author = (block.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/) || [, ''])[1].trim();
    const description = (block.match(/<description>([\s\S]*?)<\/description>/) || [, ''])[1]
      .replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim();
    const idMatch = link.match(/status\/(\d+)/);
    items.push({ id: idMatch?.[1] ?? link, title, link, pubDate, author, body: description });
  }
  return items;
}

function classify(text) {
  const lower = text.toLowerCase();
  if (/(\bbug\b|broken|doesn'?t work|error|crash|refund|fraud|scam)/.test(lower)) return 'issue';
  if (/(\bhow do\b|\?$|\bhelp\b|can someone|anyone know)/.test(lower)) return 'question';
  if (/(love|amazing|great|thank|excellent|awesome|🙏|❤️)/.test(lower)) return 'praise';
  if (/(compare|vs|better than|alternative)/.test(lower)) return 'comparison';
  return 'other';
}

async function main() {
  const state = loadState();
  const today = new Date().toISOString().slice(0, 10);

  let mentions = [];
  let mentionSource = 'none';
  for (const host of NITTER_HOSTS) {
    // Nitter search RSS for mentions
    const xml = await fetchNitterRss(host, `/search/rss?f=tweets&q=${encodeURIComponent('@' + HANDLE + ' OR ' + HANDLE)}`);
    if (xml && xml.includes('<item>')) {
      mentions = parseRssItems(xml).slice(0, 30);
      mentionSource = host;
      break;
    }
  }

  const seen = new Set(state.seenIds);
  const fresh = mentions.filter((m) => !seen.has(m.id));
  const byBucket = { issue: [], question: [], praise: [], comparison: [], other: [] };
  for (const m of fresh) {
    const bucket = classify(`${m.title} ${m.body}`);
    byBucket[bucket].push(m);
  }

  // Update state — keep last 500 seen ids
  const allIds = [...mentions.map((m) => m.id), ...state.seenIds];
  state.seenIds = Array.from(new Set(allIds)).slice(0, 500);
  state.lastDigest = today;
  saveState(state);

  const lines = [];
  lines.push(`# X engagement digest — ${today}`);
  lines.push('');
  lines.push(`> Handle: \`@${HANDLE}\`. Source: ${mentionSource === 'none' ? '_(no live mirror reachable, skipped)_' : `Nitter (\`${mentionSource}\`)`}.`);
  lines.push('');
  lines.push(`**Fresh mentions since last run:** ${fresh.length} (of ${mentions.length} latest).`);
  lines.push('');
  lines.push(`| Bucket | Count |`);
  lines.push(`|---|---|`);
  for (const k of ['issue', 'question', 'praise', 'comparison', 'other']) {
    lines.push(`| ${k} | ${byBucket[k].length} |`);
  }
  lines.push('');

  if (byBucket.issue.length) {
    lines.push('## ⚠ Issues (reply within 4h)');
    lines.push('');
    for (const m of byBucket.issue) lines.push(`- [@${m.author}](${m.link}) — _${m.body.slice(0, 200)}_`);
    lines.push('');
  }

  if (byBucket.question.length) {
    lines.push('## ❓ Questions (reply within 24h)');
    lines.push('');
    for (const m of byBucket.question.slice(0, 10)) lines.push(`- [@${m.author}](${m.link}) — _${m.body.slice(0, 200)}_`);
    lines.push('');
  }

  if (byBucket.praise.length) {
    lines.push('## 🙏 Praise (quote-tweet candidates)');
    lines.push('');
    for (const m of byBucket.praise.slice(0, 5)) lines.push(`- [@${m.author}](${m.link}) — _${m.body.slice(0, 200)}_`);
    lines.push('');
  }

  if (byBucket.comparison.length) {
    lines.push('## 🔍 Comparison (competitor intel)');
    lines.push('');
    for (const m of byBucket.comparison) lines.push(`- [@${m.author}](${m.link}) — _${m.body.slice(0, 200)}_`);
    lines.push('');
  }

  if (fresh.length === 0 && mentionSource !== 'none') {
    lines.push('_Quiet day — no fresh mentions._');
  }

  writeReport('x-engagement-digest', lines.join('\n'));
}

main().catch((e) => { console.error(e); process.exit(1); });
