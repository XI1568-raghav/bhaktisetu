#!/usr/bin/env node
// Competitor-watch — pulls public RSS/Atom feeds + new-release pages from
// the four named competitors (Sri Mandir, AppsForBharat, Utsav, AstroSage)
// and reports new items diff'd against the last run. Anything new is a
// signal — feature launch, blog post, press hit, pricing change.
//
// Zero auth, polite cadence (daily). Writes a state file to track seen
// items so reports only surface diffs.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fetchText, writeReport, upsertLog, TODAY } from './_lib.mjs';

const STATE_FILE = 'docs/agent-reports/_competitor-watch-state.json';

const FEEDS = [
  { name: 'Sri Mandir Blog', url: 'https://srimandir.com/blog/feed/' },
  { name: 'AppsForBharat Medium', url: 'https://medium.com/feed/@appsforbharat' },
  { name: 'AstroSage Blog', url: 'https://www.astrosage.com/blog/feed/' },
  { name: 'Utsav Blog', url: 'https://utsav-app.com/feed' },
];

function loadState() {
  if (!existsSync(STATE_FILE)) return { seen: {} };
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch { return { seen: {} }; }
}

function saveState(s) {
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2), 'utf8');
}

// Tiny RSS/Atom parser — extract <item><title>, <link>, <pubDate> tuples.
function parseItems(xml) {
  const items = [];
  const re = /<(item|entry)\b[\s\S]*?<\/\1>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[0];
    const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) || [])[1] || '';
    const link =
      (block.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] ||
      (block.match(/<link>([^<]+)<\/link>/i) || [])[1] ||
      '';
    const date = (block.match(/<(pubDate|updated|published)>([^<]+)</i) || [])[2] || '';
    if (title && link) items.push({ title: title.trim().slice(0, 200), link: link.trim(), date: date.trim().slice(0, 25) });
  }
  return items.slice(0, 20);
}

async function run() {
  const state = loadState();
  const seen = state.seen || {};
  const fresh = [];

  for (const feed of FEEDS) {
    const { status, text } = await fetchText(feed.url);
    if (status !== 200) {
      fresh.push({ feed: feed.name, error: `HTTP ${status}` });
      continue;
    }
    const items = parseItems(text);
    for (const it of items) {
      if (seen[it.link]) continue;
      seen[it.link] = TODAY;
      fresh.push({ feed: feed.name, ...it });
    }
  }

  state.seen = seen;
  saveState(state);

  const newOnly = fresh.filter((f) => !f.error);
  const errors = fresh.filter((f) => f.error);

  let md = `# Competitor-watch — ${TODAY}\n\n`;
  md += `${FEEDS.length} feeds scanned. **${newOnly.length} new item(s)** since last run.\n\n`;

  if (newOnly.length) {
    md += `## New since last run\n\n| When | Source | Title | Link |\n|---|---|---|---|\n`;
    for (const f of newOnly.slice(0, 40)) {
      const t = (f.title || '').replace(/\|/g, '/').slice(0, 90);
      md += `| ${(f.date || '').slice(0, 10)} | ${f.feed} | ${t} | ${f.link} |\n`;
    }
    md += '\n';
  } else {
    md += `_No new items. Competitors are quiet (or feeds did not change)._\n\n`;
  }

  if (errors.length) {
    md += `## Feed errors\n\n`;
    for (const e of errors) md += `- ${e.feed}: ${e.error}\n`;
  }

  writeReport('competitor-watch', md);
  upsertLog('competitor-watch', `new=${newOnly.length} errors=${errors.length}`);
}

run().catch((e) => {
  console.error('[competitor-watch] FATAL', e);
  process.exit(1);
});
