#!/usr/bin/env node
// Broken-link agent — crawls sitemap.xml + checks every internal link on top
// pages, reports 4xx/5xx + slow responses. Free, no external services.
// Output: docs/agent-reports/YYYY-MM-DD-broken-link.md
import { fetchText, writeReport, upsertLog, WEB_BASE, TODAY } from './_lib.mjs';

const MAX_LINKS = 200;     // safety cap per run
const TIMEOUT_MS = 8000;
const SLOW_MS = 3000;

async function head(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': 'darshya-broken-link/1.0' },
    });
    return { status: r.status, ms: Date.now() - t0 };
  } catch (e) {
    return { status: 0, ms: Date.now() - t0, err: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

function extractLinks(html, base) {
  const re = /href=["']([^"'#]+)["']/g;
  const set = new Set();
  let m;
  while ((m = re.exec(html))) {
    let u = m[1];
    if (u.startsWith('//')) u = 'https:' + u;
    if (u.startsWith('/')) u = base + u;
    if (!/^https?:\/\//.test(u)) continue;
    set.add(u.split('#')[0]);
  }
  return [...set];
}

async function run() {
  const seeds = ['/', '/temples', '/pujas', '/darshan', '/content', '/store', '/yatra', '/donations', '/refer', '/shlokas'];
  const allLinks = new Set();

  for (const path of seeds) {
    const { status, text } = await fetchText(`${WEB_BASE}${path}`);
    if (status >= 400) continue;
    extractLinks(text, WEB_BASE).forEach((u) => allLinks.add(u));
  }

  const links = [...allLinks].slice(0, MAX_LINKS);
  const results = [];

  // Sequential to be a polite citizen — cap is small enough that throughput
  // doesn't matter for a daily cron.
  for (const url of links) {
    const r = await head(url);
    results.push({ url, ...r });
  }

  const broken = results.filter((r) => r.status === 0 || r.status >= 400);
  const slow = results.filter((r) => r.status > 0 && r.status < 400 && r.ms >= SLOW_MS);
  const ok = results.length - broken.length - slow.length;

  let md = `# Broken-link audit — ${TODAY}\n\n`;
  md += `Checked **${results.length}** internal links from ${seeds.length} seed pages.\n\n`;
  md += `- OK (<${SLOW_MS}ms): **${ok}**\n`;
  md += `- Slow (>=${SLOW_MS}ms): **${slow.length}**\n`;
  md += `- Broken (4xx/5xx/timeout): **${broken.length}**\n\n`;

  if (broken.length) {
    md += `## Broken\n\n| URL | Status | Time | Error |\n|---|---|---|---|\n`;
    for (const r of broken) {
      md += `| ${r.url} | ${r.status || 'TIMEOUT'} | ${r.ms}ms | ${r.err || ''} |\n`;
    }
    md += '\n';
  }

  if (slow.length) {
    md += `## Slow responses\n\n| URL | Status | Time |\n|---|---|---|\n`;
    for (const r of slow.sort((a, b) => b.ms - a.ms).slice(0, 20)) {
      md += `| ${r.url} | ${r.status} | ${r.ms}ms |\n`;
    }
    md += '\n';
  }

  writeReport('broken-link', md);
  upsertLog('broken-link', `checked=${results.length} broken=${broken.length} slow=${slow.length}`);
}

run().catch((e) => {
  console.error('[broken-link] FATAL', e);
  process.exit(1);
});
