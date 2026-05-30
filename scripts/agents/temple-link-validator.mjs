#!/usr/bin/env node
// Temple-link-validator — HEAD-probes every officialWebsite + officialBookingUrl +
// officialDarshanBookingUrl from apps/web/lib/temple-details.ts. Surfaces 4xx/5xx
// /timeouts. Why: temple-info accuracy is item #4 in the founder's product-trust
// audit (2026-05-30) — a 404 link on a Jyotirlinga page is worse than missing data
// because it signals dead product to a devotee mid-booking.
// Output: docs/agent-reports/YYYY-MM-DD-temple-link-validator.md
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeReport, upsertLog, TODAY } from './_lib.mjs';

const TIMEOUT_MS = 10000;
const REPO_ROOT = process.cwd();
const SOURCE = join(REPO_ROOT, 'apps', 'web', 'lib', 'temple-details.ts');

function head(url) {
 const ctrl = new AbortController();
 const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
 const t0 = Date.now();
 return fetch(url, {
  method: 'HEAD',
  redirect: 'manual', // surface redirects separately, devotee shouldn't traverse 3 hops
  signal: ctrl.signal,
  headers: { 'user-agent': 'darshya-temple-link-validator/1.0' },
 })
  .then((r) => ({ status: r.status, ms: Date.now() - t0, loc: r.headers.get('location') ?? '' }))
  .catch((e) => ({ status: 0, ms: Date.now() - t0, err: String(e?.message || e), loc: '' }))
  .finally(() => clearTimeout(t));
}

// Some temple boards block HEAD — fall back to GET on first-attempt 405/403.
async function probe(url) {
 const h = await head(url);
 if (h.status === 405 || h.status === 403 || h.status === 0) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const t0 = Date.now();
  try {
   const r = await fetch(url, {
    method: 'GET',
    redirect: 'manual',
    signal: ctrl.signal,
    headers: { 'user-agent': 'darshya-temple-link-validator/1.0' },
   });
   return { status: r.status, ms: Date.now() - t0, loc: r.headers.get('location') ?? '', fallback: 'GET' };
  } catch (e) {
   return { status: h.status, ms: Date.now() - t0, err: h.err || String(e?.message || e), loc: '', fallback: 'GET' };
  } finally {
   clearTimeout(t);
  }
 }
 return h;
}

// Parse temple-details.ts as text. Each temple object spans multiple lines; we
// walk slug-by-slug and pull the three URL fields out of its block.
function parseTemples() {
 const src = readFileSync(SOURCE, 'utf8');
 // Match top-level slug entries: ' 'kashi-vishwanath': {' …
 const re = /['"]([a-z0-9-]+)['"]\s*:\s*\{/g;
 const out = [];
 const matches = [...src.matchAll(re)];
 for (let i = 0; i < matches.length; i++) {
  const m = matches[i];
  const slug = m[1];
  const start = m.index;
  // Pick a generous block — next slug entry start OR end-of-file.
  const next = matches[i + 1]?.index ?? src.length;
  const block = src.slice(start, next);
  // Only top-level temple records have a `name:` line; skip nested puja objects.
  if (!/name\s*:\s*['"]/i.test(block)) continue;
  const grab = (key) => {
   const r = new RegExp(`${key}\\s*:\\s*['"]([^'"]+)['"]`);
   const x = block.match(r);
   return x ? x[1] : '';
  };
  out.push({
   slug,
   name: grab('name'),
   officialWebsite: grab('officialWebsite'),
   officialBookingUrl: grab('officialBookingUrl'),
   officialDarshanBookingUrl: grab('officialDarshanBookingUrl'),
  });
 }
 return out;
}

function classify(status) {
 if (status === 0) return 'TIMEOUT';
 if (status >= 200 && status < 300) return 'OK';
 if (status >= 300 && status < 400) return 'REDIRECT';
 if (status >= 400 && status < 500) return 'BROKEN';
 if (status >= 500) return 'SERVER_ERROR';
 return 'UNKNOWN';
}

async function run() {
 const temples = parseTemples();
 const rows = [];

 // Sequential — polite to official .gov.in temple endpoints + cron once/week.
 for (const t of temples) {
  for (const field of ['officialWebsite', 'officialBookingUrl', 'officialDarshanBookingUrl']) {
   const url = t[field];
   if (!url) continue;
   const r = await probe(url);
   rows.push({ slug: t.slug, name: t.name, field, url, ...r, verdict: classify(r.status) });
   await new Promise((res) => setTimeout(res, 300));
  }
 }

 const broken = rows.filter((r) => r.verdict === 'BROKEN' || r.verdict === 'TIMEOUT' || r.verdict === 'SERVER_ERROR');
 const redirects = rows.filter((r) => r.verdict === 'REDIRECT');
 const ok = rows.filter((r) => r.verdict === 'OK');

 let md = `# Temple link validator — ${TODAY}\n\n`;
 md += `Probed **${rows.length}** official URLs across **${temples.length}** temples.\n\n`;
 md += `- OK (2xx): **${ok.length}**\n`;
 md += `- Redirects (3xx): **${redirects.length}**\n`;
 md += `- Broken (4xx/5xx/timeout): **${broken.length}**\n\n`;

 if (broken.length) {
  md += `## P1 — Broken (devotee sees dead link)\n\n`;
  md += `| Temple | Field | URL | Status | Time | Error |\n|---|---|---|---|---|---|\n`;
  for (const r of broken) {
   md += `| ${r.name || r.slug} | ${r.field} | ${r.url} | ${r.status || 'TIMEOUT'} | ${r.ms}ms | ${r.err || ''} |\n`;
  }
  md += `\n**Action**: open \`apps/web/lib/temple-details.ts\`, find slug \`${broken[0].slug}\`, replace dead URL with current value from temple's primary domain. Re-run agent to verify.\n\n`;
 }

 if (redirects.length) {
  md += `## P2 — Redirects (update URL to final target)\n\n`;
  md += `| Temple | Field | URL | → Location |\n|---|---|---|---|\n`;
  for (const r of redirects) {
   md += `| ${r.name || r.slug} | ${r.field} | ${r.url} | ${r.loc} |\n`;
  }
  md += `\n`;
 }

 if (ok.length && !broken.length && !redirects.length) {
  md += `## All clear\n\nEvery official URL responded 2xx. No action.\n`;
 }

 writeReport('temple-link-validator', md);
 upsertLog('temple-link-validator', `probed=${rows.length} broken=${broken.length} redirects=${redirects.length} ok=${ok.length}`);
}

run().catch((e) => {
 console.error('[temple-link-validator] FATAL', e);
 process.exit(1);
});
