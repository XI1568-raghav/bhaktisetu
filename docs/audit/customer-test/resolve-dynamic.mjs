#!/usr/bin/env node
/**
 * Resolve dynamic routes ([slug]/[id]) to real, live values using the prod sitemap,
 * then probe each one. Every pattern also gets a deliberately bogus value so the
 * 404 path is exercised — a dynamic route tested only with a valid slug is half-tested.
 *
 *   node docs/audit/customer-test/resolve-dynamic.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://darshya.online';
const DELAY_MS = 400;
const MAX_RETRY = 4;
const BOGUS = '__ct_does_not_exist_zzz';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const patterns = readFileSync(resolve(HERE, 'routes.txt'), 'utf-8')
  .split(/\r?\n/).map((s) => s.trim()).filter((s) => s && s.includes('['));

const sitemap = readFileSync(resolve(HERE, 'sitemap-urls.txt'), 'utf-8')
  .split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

// A pattern like /aarti/[slug] becomes ^/aarti/([^/]+)$ so it only matches at the
// same depth — otherwise /temples/[slug] would swallow /temples/a/b/c.
function toRegex(pattern) {
  const src = '^' + pattern
    .split('/')
    .map((seg) => {
      if (/^\[\.\.\..+\]$/.test(seg)) return '(.+)';        // catch-all
      if (/^\[.+\]$/.test(seg)) return '([^/]+)';           // single dynamic
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/') + '$';
  return new RegExp(src);
}

// Longest (most specific) patterns claim a URL first, so /a/[x]/edit wins over /a/[x].
const ordered = [...patterns].sort((a, b) => b.split('/').length - a.split('/').length);

const resolved = [];
for (const pattern of ordered) {
  const re = toRegex(pattern);
  const hits = sitemap.filter((u) => re.test(u)).slice(0, 2);
  resolved.push({ pattern, samples: hits, bogus: pattern.replace(/\[[^\]]+\]/, BOGUS) });
}

const withSamples = resolved.filter((r) => r.samples.length > 0);
console.log(`patterns=${patterns.length}  resolved-from-sitemap=${withSamples.length}  unresolved=${patterns.length - withSamples.length}`);

async function probe(url, attempt = 0) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45_000);
  try {
    const res = await fetch(`${BASE}${url}`, { redirect: 'manual', signal: ctrl.signal });
    if (res.status === 429 && attempt < MAX_RETRY) {
      clearTimeout(timer);
      await sleep(2500 * Math.pow(2, attempt));
      return probe(url, attempt + 1);
    }
    let bytes = 0;
    if (res.status === 200) bytes = (await res.text()).length;
    return { url, status: res.status, bytes, location: res.headers.get('location') || null };
  } catch (e) {
    return { url, status: 0, bytes: 0, error: String(e?.name === 'AbortError' ? 'timeout' : e?.message) };
  } finally {
    clearTimeout(timer);
  }
}

const out = [];
for (const r of resolved) {
  const entry = { pattern: r.pattern, valid: [], notFound: null };
  for (const s of r.samples) {
    entry.valid.push(await probe(s));
    await sleep(DELAY_MS);
  }
  // Only probe the bogus path when the pattern had at least one real sample —
  // otherwise we cannot tell "correct 404" from "route does not exist at all".
  if (r.samples.length) {
    entry.notFound = await probe(r.bogus);
    await sleep(DELAY_MS);
  }
  // A valid slug must render (200/3xx); a bogus one MUST NOT return 200.
  const badValid = entry.valid.filter((v) => v.status >= 400 || v.status === 0);
  const softNotFound = entry.notFound && entry.notFound.status === 200;
  entry.state = !r.samples.length ? 'UNRESOLVED' : badValid.length || softNotFound ? 'FAIL' : 'PASS';
  if (softNotFound) entry.note = 'bogus slug returned 200 — soft 404, page renders for nonexistent content';
  if (badValid.length) entry.note = `valid slug failed: ${badValid.map((v) => v.status).join(',')}`;
  out.push(entry);
  if (entry.state !== 'PASS') console.log(`  ${entry.state} ${entry.pattern} ${entry.note || '(no sitemap sample)'}`);
}

const totals = out.reduce((a, e) => ((a[e.state] = (a[e.state] || 0) + 1), a), {});
writeFileSync(resolve(HERE, 'LEDGER-dynamic.json'), JSON.stringify({ generatedAt: new Date().toISOString(), totals, routes: out }, null, 2));
console.log('\n' + JSON.stringify(totals, null, 2));
