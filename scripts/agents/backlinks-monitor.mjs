// backlinks-monitor — track referring domains pointing to darshya.online via
// DuckDuckGo "link:" + Bing "linkfromdomain:" probes. No API keys required.
// Daily snapshot diff'd against prior state, surfaces new + lost backlinks.

import { writeReport, fetchText, TODAY } from './_lib.mjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const REPORT_DIR = 'docs/agent-reports';
const STATE_FILE = join(REPORT_DIR, '_backlinks-monitor-state.json');
const TARGET = 'darshya.online';

// Query patterns to probe — DDG ignores `link:` directly but redirect via search
// term "darshya.online" plus -site:darshya.online surfaces external mentions.
const QUERIES = [
  `"darshya.online" -site:darshya.online`,
  `"darshya" puja booking -site:darshya.online`,
  `"darshya" video proof -site:darshya.online`,
];

function extractLinks(html) {
  const re = /<a[^>]+href=["']?https?:\/\/([^\/"'?\s]+)/gi;
  const domains = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const d = m[1].toLowerCase();
    // skip search engine internal + own domain
    if (d.includes('duckduckgo.com')) continue;
    if (d.includes('bing.com')) continue;
    if (d.includes('google.com')) continue;
    if (d.includes('darshya.online')) continue;
    if (d.includes('darshya.com')) continue;
    domains.add(d);
  }
  return domains;
}

async function probeDdg(query) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const { status, text } = await fetchText(url, { headers: { 'accept-language': 'en-US,en;q=0.9' } });
  if (status !== 200) return new Set();
  return extractLinks(text);
}

function loadState() {
  if (!existsSync(STATE_FILE)) return { domains: [], lastSeen: {} };
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { domains: [], lastSeen: {} };
  }
}

function saveState(state) {
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function main() {
  console.log('[backlinks-monitor] starting');
  const allDomains = new Set();

  for (const q of QUERIES) {
    const found = await probeDdg(q);
    for (const d of found) allDomains.add(d);
    await new Promise((r) => setTimeout(r, 1500)); // polite delay
  }

  const current = Array.from(allDomains).sort();
  const state = loadState();
  const prior = new Set(state.domains || []);

  const newOnes = current.filter((d) => !prior.has(d));
  const lost = (state.domains || []).filter((d) => !allDomains.has(d));

  // update lastSeen for any currently-found
  const lastSeen = state.lastSeen || {};
  for (const d of current) lastSeen[d] = TODAY;

  saveState({ domains: current, lastSeen });

  const md = `# Backlinks Monitor — ${TODAY}

Probed ${QUERIES.length} DuckDuckGo queries for external mentions of \`${TARGET}\`.
Detection method is heuristic (HTML scrape, no API). False positives possible
for unrelated pages that mention the term. Use as a directional signal.

## Summary

- Domains found today: **${current.length}**
- New since last run: **${newOnes.length}**
- Lost since last run: **${lost.length}**

## New backlinks 🎉

${newOnes.length === 0 ? '_None new today._' : newOnes.map((d) => `- [${d}](https://${d})`).join('\n')}

## Lost references

${lost.length === 0 ? '_None lost._' : lost.map((d) => `- ~~${d}~~ (last seen ${state.lastSeen?.[d] || 'unknown'})`).join('\n')}

## All currently-detected referring domains (${current.length})

${current.length === 0 ? '_No domains detected — DuckDuckGo may be rate-limiting._' : current.map((d) => `- [${d}](https://${d}) — last seen ${lastSeen[d]}`).join('\n')}

---

**Why this matters:** Backlinks remain a top-3 Google ranking factor. Track
domain authority growth weekly. For real backlink data, also check Ahrefs free
backlink checker monthly.

State file: \`${STATE_FILE}\`
`;

  writeReport('backlinks-monitor', md);
  console.log(`[backlinks-monitor] ${current.length} domains, ${newOnes.length} new, ${lost.length} lost`);
}

main().catch((e) => {
  console.error('[backlinks-monitor] fatal:', e);
  process.exit(1);
});
