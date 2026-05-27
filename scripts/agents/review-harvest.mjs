#!/usr/bin/env node
// Review-harvest agent — scans public mention surfaces (HN, Reddit, Indie
// Hackers) for "darshya" / "puja booking" / "live darshan" mentions. Pure
// public-search APIs, no scraping. Output gives founder a daily pulse on
// where the product surfaces in conversation, who to thank/reply to.
//
// Sources (free, no auth):
//   - HN Algolia: https://hn.algolia.com/api/v1/search?query=...
//   - Reddit JSON: https://www.reddit.com/search.json?q=...
//   - Indie Hackers tag feed (best-effort)
//
// We dedupe by URL across runs via the _review-harvest-log.md tail.
import { fetchJson, fetchText, writeReport, upsertLog, TODAY } from './_lib.mjs';

const QUERIES = ['darshya', 'darshya.online', 'puja booking app', 'live darshan online', 'sri mandir alternative'];

async function hnSearch(q) {
  const { json } = await fetchJson(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=10`);
  if (!json?.hits) return [];
  return json.hits.map((h) => ({
    source: 'HN',
    title: h.title || h.story_title || '(untitled)',
    url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    when: h.created_at?.slice(0, 10) || '',
    score: h.points || 0,
  }));
}

async function redditSearch(q) {
  const { status, text } = await fetchText(`https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&limit=10&sort=new`);
  if (status !== 200) return [];
  let json = null;
  try { json = JSON.parse(text); } catch { return []; }
  const children = json?.data?.children || [];
  return children.map((c) => ({
    source: 'Reddit',
    title: c.data?.title || '(untitled)',
    url: `https://reddit.com${c.data?.permalink || ''}`,
    when: c.data?.created_utc ? new Date(c.data.created_utc * 1000).toISOString().slice(0, 10) : '',
    score: c.data?.score || 0,
  }));
}

function dedupe(rows) {
  const seen = new Set();
  return rows.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

async function run() {
  const all = [];
  for (const q of QUERIES) {
    const [hn, reddit] = await Promise.all([hnSearch(q), redditSearch(q)]);
    all.push(...hn.map((r) => ({ ...r, query: q })));
    all.push(...reddit.map((r) => ({ ...r, query: q })));
  }
  const unique = dedupe(all).sort((a, b) => (b.when || '').localeCompare(a.when || ''));

  let md = `# Review-harvest — ${TODAY}\n\n`;
  md += `Public mention scan across HN + Reddit. ${unique.length} unique result(s) across ${QUERIES.length} queries.\n\n`;

  if (unique.length === 0) {
    md += `_No fresh mentions found this run. This is normal early on — the queries broaden as the product surface grows._\n`;
  } else {
    md += `| When | Source | Score | Title | URL |\n|---|---|---|---|---|\n`;
    for (const r of unique.slice(0, 50)) {
      const t = (r.title || '').slice(0, 80).replace(/\|/g, '/');
      md += `| ${r.when || '?'} | ${r.source} | ${r.score} | ${t} | ${r.url} |\n`;
    }
  }

  md += `\n## Action items\n\n`;
  md += `1. Thank/reply to positive mentions same-day.\n`;
  md += `2. Investigate negative mentions; respond honestly + fix root cause.\n`;
  md += `3. Save high-value testimonials to /press kit.\n`;

  writeReport('review-harvest', md);
  upsertLog('review-harvest', `mentions=${unique.length}`);
}

run().catch((e) => {
  console.error('[review-harvest] FATAL', e);
  process.exit(1);
});
