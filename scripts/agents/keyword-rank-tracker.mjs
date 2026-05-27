#!/usr/bin/env node
// Keyword Rank Tracker — checks if darshya.online ranks in top 30 Google
// results for high-value seed keywords. Uses public DuckDuckGo HTML SERP
// as a free fallback (no API key) since GSC API is OAuth-gated and Google
// SERP scraping needs a paid provider. Trend file logs daily ranks per kw.
//
// Output: docs/agent-reports/YYYY-MM-DD-keyword-rank-tracker.md
//          docs/agent-reports/_keyword-rank-tracker-state.json
import { writeReport, REPORT_DIR } from './_lib.mjs';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TARGET_DOMAIN = 'darshya.online';
const STATE_PATH = join(REPORT_DIR, '_keyword-rank-tracker-state.json');

// Seed keywords spanning core SEO surfaces. Update list as new programmatic
// SEO pages ship — keep <= 30 to stay within free SERP rate limits.
const KEYWORDS = [
  'online puja booking with video proof',
  'rudrabhishek booking online',
  'satyanarayan puja booking',
  'gau seva donation online',
  'gaushala donation 80g',
  'temple priest booking india',
  'hanuman chalisa with meaning',
  'shiva mantra om namah shivaya',
  'krishna janmashtami 2026',
  'maha shivratri puja online',
  'navaratri puja booking',
  'kashi vishwanath puja booking',
  'tirupati venkateswara puja',
  'jagannath puri darshan',
  'kedarnath yatra package',
  'char dham yatra booking',
  'vaishno devi yatra package',
  'online astrology consultation india',
  'kundli matching online free',
  'panchang today tithi',
  'devotional super app india',
  'sri mandir alternative',
  'puja for nri abroad',
  'pandit booking in usa',
  'video proof puja booking',
];

function loadState() {
  if (!existsSync(STATE_PATH)) return { history: {} };
  try { return JSON.parse(readFileSync(STATE_PATH, 'utf8')); } catch { return { history: {} }; }
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

async function rankFor(keyword) {
  // DuckDuckGo Lite SERP. Free, no JS, no rate-limit headers when reasonable.
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(keyword + ' site:' + TARGET_DOMAIN + ' OR ' + keyword)}`;
  try {
    const r = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; darshya-rank/1.0)',
        'accept-language': 'en-IN,en;q=0.9',
      },
    });
    if (!r.ok) return { rank: null, error: `HTTP ${r.status}` };
    const html = await r.text();
    // DDG uses <a class="result__a" href="..."> for organic results.
    const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"/g;
    let m, idx = 0;
    while ((m = re.exec(html))) {
      idx += 1;
      let href = m[1];
      try { href = decodeURIComponent(href.replace(/^\/\/duckduckgo\.com\/l\/\?uddg=/, '')); } catch {}
      if (href.includes(TARGET_DOMAIN)) return { rank: idx, url: href };
      if (idx >= 30) break;
    }
    return { rank: null };
  } catch (e) {
    return { rank: null, error: String(e) };
  }
}

async function main() {
  const state = loadState();
  state.history[state.lastRun] = state.history[state.lastRun] || {};
  const today = new Date().toISOString().slice(0, 10);
  const todayRanks = {};

  const results = [];
  for (const kw of KEYWORDS) {
    const r = await rankFor(kw);
    const prev = (state.history && Object.values(state.history).reverse().find((h) => h[kw]?.rank))?.[kw]?.rank ?? null;
    const delta = r.rank && prev ? prev - r.rank : null;
    todayRanks[kw] = { rank: r.rank, url: r.url || null };
    results.push({ kw, rank: r.rank, prev, delta, url: r.url, error: r.error });
    await new Promise((res) => setTimeout(res, 1200)); // be polite
  }

  state.history[today] = todayRanks;
  state.lastRun = today;
  // Trim to 90 days history.
  const days = Object.keys(state.history).sort();
  if (days.length > 90) for (const d of days.slice(0, days.length - 90)) delete state.history[d];
  saveState(state);

  const ranked = results.filter((r) => r.rank !== null);
  const top10 = ranked.filter((r) => r.rank <= 10);
  const top30 = ranked.filter((r) => r.rank <= 30);
  const movers = ranked.filter((r) => r.delta !== null && r.delta !== 0).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));

  const lines = [];
  lines.push(`# Keyword rank tracker — ${today}`);
  lines.push('');
  lines.push(`> Source: DuckDuckGo HTML SERP. Target: \`${TARGET_DOMAIN}\`. ${KEYWORDS.length} keywords tracked.`);
  lines.push('');
  lines.push(`**Summary:** ${top10.length} in top 10 · ${top30.length} in top 30 · ${KEYWORDS.length - ranked.length} unranked.`);
  lines.push('');

  if (top10.length) {
    lines.push('## Top 10 wins');
    lines.push('');
    lines.push('| Keyword | Rank | URL |');
    lines.push('|---|---|---|');
    for (const r of top10.sort((a, b) => a.rank - b.rank)) {
      lines.push(`| ${r.kw} | ${r.rank} | ${r.url || '—'} |`);
    }
    lines.push('');
  }

  if (movers.length) {
    lines.push('## Movers (24h delta)');
    lines.push('');
    lines.push('| Keyword | Yesterday | Today | Δ |');
    lines.push('|---|---|---|---|');
    for (const r of movers.slice(0, 10)) {
      lines.push(`| ${r.kw} | ${r.prev ?? '—'} | ${r.rank ?? '—'} | ${r.delta > 0 ? '↑' : '↓'}${Math.abs(r.delta)} |`);
    }
    lines.push('');
  }

  const unranked = results.filter((r) => r.rank === null);
  if (unranked.length) {
    lines.push('## Unranked (target for new content)');
    lines.push('');
    for (const r of unranked) lines.push(`- ${r.kw}${r.error ? ` _(${r.error})_` : ''}`);
    lines.push('');
  }

  writeReport('keyword-rank-tracker', lines.join('\n'));
}

main().catch((e) => { console.error(e); process.exit(1); });
