#!/usr/bin/env node
// GSC submitter — pings Google + Bing/IndexNow with sitemap URL so freshly
// added URLs get re-crawled without waiting for the next scheduled fetch.
// Free, no auth needed for sitemap ping. Optional IndexNow key for Bing.
// Output: docs/agent-reports/YYYY-MM-DD-gsc-submitter.md
import { fetchText, writeReport, upsertLog, WEB_BASE, TODAY } from './_lib.mjs';

const SITEMAP_URL = `${WEB_BASE}/sitemap.xml`;
// Self-issued IndexNow key — committed to repo + served at /<key>.txt by CF Pages.
// Owner doesn't need to paste anything; agent pings Bing on every run. Owner CAN
// override via INDEXNOW_KEY env var if they want to rotate.
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || 'b9d4f2e7c6a31085f8e5d2a7c9b1e4f6';

async function pingGoogle() {
  const url = `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
  const { status, text } = await fetchText(url);
  return { engine: 'google', status, snippet: text.slice(0, 160) };
}

async function pingBing() {
  // Bing officially deprecated /ping in 2022. They route everything through
  // IndexNow now. Skip when no key.
  if (!INDEXNOW_KEY) return { engine: 'bing', status: -1, snippet: 'no INDEXNOW_KEY' };
  const url = 'https://api.indexnow.org/indexnow';
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'darshya-gsc/1.0' },
      body: JSON.stringify({
        host: new URL(WEB_BASE).host,
        key: INDEXNOW_KEY,
        keyLocation: `${WEB_BASE}/${INDEXNOW_KEY}.txt`,
        urlList: [WEB_BASE, `${WEB_BASE}/temples`, `${WEB_BASE}/pujas`, `${WEB_BASE}/shlokas`, `${WEB_BASE}/refer`],
      }),
    });
    return { engine: 'bing-indexnow', status: r.status, snippet: (await r.text()).slice(0, 160) };
  } catch (e) {
    return { engine: 'bing-indexnow', status: 0, snippet: String(e?.message || e) };
  }
}

async function verifySitemap() {
  const { status, text } = await fetchText(SITEMAP_URL);
  const urlCount = (text.match(/<loc>/g) || []).length;
  return { status, urlCount };
}

async function run() {
  const sitemap = await verifySitemap();
  const pings = await Promise.all([pingGoogle(), pingBing()]);

  let md = `# GSC submitter — ${TODAY}\n\n`;
  md += `Sitemap: ${SITEMAP_URL}\n`;
  md += `- Status: **${sitemap.status}**\n`;
  md += `- URLs in sitemap: **${sitemap.urlCount}**\n\n`;
  md += `## Pings\n\n| Engine | HTTP | Response |\n|---|---|---|\n`;
  for (const p of pings) md += `| ${p.engine} | ${p.status} | ${p.snippet || '-'} |\n`;

  md += `\n> IndexNow key self-issued (committed to repo + served at \`${WEB_BASE}/${INDEXNOW_KEY}.txt\`). No owner action needed.\n`;

  writeReport('gsc-submitter', md);
  upsertLog('gsc-submitter', `urls=${sitemap.urlCount} google=${pings[0].status} bing=${pings[1].status}`);
}

run().catch((e) => {
  console.error('[gsc-submitter] FATAL', e);
  process.exit(1);
});
