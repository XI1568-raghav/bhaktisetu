#!/usr/bin/env node
// Competitor Feature Watcher — scrapes competitor /pricing, /features, key
// product pages weekly and diffs against last snapshot. Detects new SKUs,
// price changes, feature additions, removed offerings.
//
// Complements competitor-watch (which reads blog RSS). This one reads the
// actual product surfaces so we know what they're shipping, not what
// they're announcing. Output: docs/agent-reports/YYYY-MM-DD-competitor-features.md
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fetchText, writeReport, upsertLog, TODAY } from './_lib.mjs';

const STATE_FILE = 'docs/agent-reports/_competitor-feature-watcher-state.json';

const SURFACES = [
  { name: 'SriMandir Home', url: 'https://srimandir.com/' },
  { name: 'SriMandir Pujas', url: 'https://srimandir.com/pujas' },
  { name: 'Utsav Home', url: 'https://utsav-app.com/' },
  { name: 'AstroSage Pujas', url: 'https://www.astrosage.com/online-puja/' },
  { name: 'AstroSage Pricing', url: 'https://www.astrosage.com/horoscope/online-reports.asp' },
  { name: 'AppsForBharat Home', url: 'https://appsforbharat.com/' },
];

function loadState() {
  if (!existsSync(STATE_FILE)) return { snapshots: {} };
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch { return { snapshots: {} }; }
}

function saveState(s) {
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2), 'utf8');
}

// Extract a feature fingerprint from HTML — H1/H2/H3 text + price-like strings.
function fingerprint(html) {
  const headings = [];
  const headingRe = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let m;
  while ((m = headingRe.exec(html))) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text && text.length < 120) headings.push(text);
  }

  const prices = [];
  const priceRe = /(?:Rs\.?|₹|INR|\$|USD)\s*[\d,]+(?:\.\d+)?(?:\s*\/\s*[a-z]+)?/gi;
  while ((m = priceRe.exec(html))) {
    prices.push(m[0].trim());
  }

  // Strip duplicates and cap.
  return {
    headings: [...new Set(headings)].slice(0, 50),
    prices: [...new Set(prices)].slice(0, 30),
  };
}

function diff(prev, curr) {
  const prevH = new Set(prev?.headings || []);
  const currH = new Set(curr.headings);
  const prevP = new Set(prev?.prices || []);
  const currP = new Set(curr.prices);

  return {
    newHeadings: [...currH].filter((h) => !prevH.has(h)),
    removedHeadings: [...prevH].filter((h) => !currH.has(h)),
    newPrices: [...currP].filter((p) => !prevP.has(p)),
    removedPrices: [...prevP].filter((p) => !currP.has(p)),
  };
}

async function run() {
  const state = loadState();
  const snapshots = state.snapshots || {};
  const surfaceReports = [];

  for (const s of SURFACES) {
    const { status, text } = await fetchText(s.url);
    if (status !== 200) {
      surfaceReports.push({ name: s.name, url: s.url, error: `HTTP ${status}` });
      continue;
    }
    const fp = fingerprint(text);
    const prev = snapshots[s.url];
    const d = diff(prev, fp);
    snapshots[s.url] = { ...fp, capturedAt: TODAY };

    surfaceReports.push({
      name: s.name,
      url: s.url,
      headingCount: fp.headings.length,
      priceCount: fp.prices.length,
      diff: d,
      firstRun: !prev,
    });
  }

  state.snapshots = snapshots;
  saveState(state);

  const totalNew =
    surfaceReports.reduce((a, r) => a + (r.diff?.newHeadings.length || 0) + (r.diff?.newPrices.length || 0), 0);
  const totalRemoved =
    surfaceReports.reduce((a, r) => a + (r.diff?.removedHeadings.length || 0) + (r.diff?.removedPrices.length || 0), 0);
  const errors = surfaceReports.filter((r) => r.error);

  let md = `# Competitor Feature Watcher — ${TODAY}\n\n`;
  md += `Snapshots ${SURFACES.length} competitor product surfaces and diffs against last run.\n\n`;
  md += `**Net change**: +${totalNew} new signals, -${totalRemoved} removed. Errors: ${errors.length}.\n\n`;

  for (const r of surfaceReports) {
    md += `## ${r.name}\n`;
    md += `- URL: ${r.url}\n`;
    if (r.error) { md += `- Error: ${r.error}\n\n`; continue; }
    if (r.firstRun) {
      md += `- First run — captured ${r.headingCount} headings, ${r.priceCount} prices. Baseline only.\n\n`;
      continue;
    }
    const d = r.diff;
    if (d.newHeadings.length === 0 && d.removedHeadings.length === 0 && d.newPrices.length === 0 && d.removedPrices.length === 0) {
      md += `- No changes since last snapshot.\n\n`;
      continue;
    }
    if (d.newHeadings.length) {
      md += `- **New headings (${d.newHeadings.length}):**\n`;
      for (const h of d.newHeadings.slice(0, 15)) md += `  - ${h}\n`;
    }
    if (d.removedHeadings.length) {
      md += `- **Removed headings (${d.removedHeadings.length}):**\n`;
      for (const h of d.removedHeadings.slice(0, 15)) md += `  - ${h}\n`;
    }
    if (d.newPrices.length) {
      md += `- **New prices (${d.newPrices.length}):** ${d.newPrices.slice(0, 12).join(', ')}\n`;
    }
    if (d.removedPrices.length) {
      md += `- **Removed prices (${d.removedPrices.length}):** ${d.removedPrices.slice(0, 12).join(', ')}\n`;
    }
    md += '\n';
  }

  if (errors.length) {
    md += `## Errors\n\n`;
    for (const e of errors) md += `- ${e.name} (${e.url}): ${e.error}\n`;
  }

  md += `\n## How to act\n
- **New SKUs** in competitor catalog → consider matching offering in /pujas
- **Price changes** → re-benchmark our INR + NRI tiers
- **New headings** = likely new landing pages → check if they target keywords we should also rank for
- Schedule: weekly cron (Mondays). Snapshot lives in \`${STATE_FILE}\` — delete to reset baseline.
`;

  writeReport('competitor-features', md);
  upsertLog('competitor-features', `new=${totalNew} removed=${totalRemoved} errors=${errors.length}`);
}

run().catch((e) => {
  console.error('[competitor-feature-watcher] FATAL', e);
  process.exit(1);
});
