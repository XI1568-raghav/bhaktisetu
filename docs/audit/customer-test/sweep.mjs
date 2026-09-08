#!/usr/bin/env node
/**
 * Phase-1 HTTP sweep for the customer test.
 *
 * Hits every STATIC route in routes.txt against prod and records status, bytes,
 * redirect target and timing into LEDGER.json. This is deliberately cheap and
 * deterministic: it is the coverage floor that proves no route was skipped.
 * Browser-level CTA/form/interaction testing runs on top of it, not instead of it.
 *
 * Dynamic routes ([slug]/[id]) are emitted UNRESOLVED — they need real ids and
 * are handled in a separate pass, because a dynamic route tested only with a
 * valid slug is half-tested (the 404 path is the other half).
 *
 *   node docs/audit/customer-test/sweep.mjs [--base https://darshya.online] [--conc 6]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(k);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const BASE = arg('--base', 'https://darshya.online').replace(/\/$/, '');
const CONC = Number(arg('--conc', '6'));
const TIMEOUT_MS = 45_000;
const DELAY_MS = Number(arg('--delay', '350'));
const MAX_RETRY = 4;
const BACKOFF_MS = 2500;

const routes = readFileSync(resolve(HERE, 'routes.txt'), 'utf-8')
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

const dynamic = routes.filter((r) => r.includes('['));
const statics = routes.filter((r) => !r.includes('['));

console.log(`base=${BASE}  static=${statics.length}  dynamic=${dynamic.length}  conc=${CONC}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function probe(route, attempt = 0) {
  const url = `${BASE}${route}`;
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    // redirect:manual so an auth gate reads as a 307/302 finding, not a silent 200.
    const res = await fetch(url, { redirect: 'manual', signal: ctrl.signal });
    // 429 is the edge throttling THIS sweep, not a property of the route.
    // Back off and retry so the ledger records the route's real status.
    if (res.status === 429 && attempt < MAX_RETRY) {
      clearTimeout(timer);
      const ra = Number(res.headers.get('retry-after')) || 0;
      await sleep(ra ? ra * 1000 : BACKOFF_MS * Math.pow(2, attempt));
      return probe(route, attempt + 1);
    }
    let bytes = 0;
    let title = null;
    if (res.status === 200) {
      const body = await res.text();
      bytes = body.length;
      title = (body.match(/<title[^>]*>([^<]{0,120})/i) || [])[1]?.trim() || null;
    }
    return {
      route,
      status: res.status,
      location: res.headers.get('location') || null,
      bytes,
      title,
      ms: Date.now() - started,
      state: res.status === 200 ? 'PASS' : res.status >= 500 ? 'FAIL' : 'REVIEW',
    };
  } catch (err) {
    return {
      route,
      status: 0,
      location: null,
      bytes: 0,
      title: null,
      ms: Date.now() - started,
      state: 'FAIL',
      error: String(err?.name === 'AbortError' ? `timeout>${TIMEOUT_MS}ms` : err?.message || err),
    };
  }
}

const results = [];
let cursor = 0;
let done = 0;

async function worker() {
  while (cursor < statics.length) {
    const route = statics[cursor++];
    const r = await probe(route);
    await sleep(DELAY_MS);
    results.push(r);
    done++;
    if (r.state !== 'PASS') {
      console.log(`  ${String(r.status).padStart(3)} ${r.route}${r.location ? ` -> ${r.location}` : ''}${r.error ? ` (${r.error})` : ''}`);
    }
    if (done % 50 === 0) console.log(`  ...${done}/${statics.length}`);
  }
}

const t0 = Date.now();
await Promise.all(Array.from({ length: CONC }, worker));
results.sort((a, b) => a.route.localeCompare(b.route));

const byState = results.reduce((acc, r) => ((acc[r.state] = (acc[r.state] || 0) + 1), acc), {});
const ledger = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  totals: {
    routes: routes.length,
    static: statics.length,
    dynamic: dynamic.length,
    ...byState,
    UNVISITED: dynamic.length,
  },
  elapsedMs: Date.now() - t0,
  static: results,
  dynamicUnresolved: dynamic,
};

writeFileSync(resolve(HERE, 'LEDGER.json'), JSON.stringify(ledger, null, 2));
console.log(`\ndone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(JSON.stringify(ledger.totals, null, 2));
