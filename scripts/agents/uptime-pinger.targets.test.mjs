/**
 * Guard: every API target the uptime pinger polls must correspond to a prefix
 * the API actually registers.
 *
 * WHY: two of the pinger's fourteen targets — `/healthz` and
 * `/api/v1/puja-types` — had never existed. `server.ts` registers health at
 * `/health` and `/api/v1/health`, and puja routes under the `/api/v1/pujas`
 * prefix (where the handler is `/types`). Both targets returned 404 on every
 * run since the pinger was written, so the daily availability report always
 * carried permanent failures.
 *
 * A monitor that is always partly red teaches its reader that red is normal.
 * That is the same failure mode that let the 2026-08-17 Render suspension serve
 * 503s for three days before anyone noticed — the thing that was supposed to
 * notice had been crying wolf since the day it was written.
 *
 * This test is structural rather than networked: it parses the prefixes out of
 * server.ts and checks the pinger against them, so it catches a route being
 * renamed or removed without needing production to be reachable.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');

const pinger = fs.readFileSync(path.join(here, 'uptime-pinger.mjs'), 'utf8');
const server = fs.readFileSync(path.join(repo, 'apps/api/src/server.ts'), 'utf8');

/** Prefixes passed to `server.register(routes, { prefix: '...' })`. */
function registeredPrefixes() {
  const out = new Set();
  const re = /prefix:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(server))) out.add(m[1]);
  return out;
}

/** API paths the pinger polls, with `${API_BASE}` and any query string removed. */
function pingedApiPaths() {
  const out = [];
  const re = /url:\s*`\$\{API_BASE\}([^`]+)`/g;
  let m;
  while ((m = re.exec(pinger))) out.push(m[1].split('?')[0]);
  return out;
}

describe('uptime-pinger targets exist in the API', () => {
  const prefixes = registeredPrefixes();
  const paths = pingedApiPaths();

  it('finds both the registered prefixes and the polled paths', () => {
    // If either parse breaks, every assertion below passes vacuously — so the
    // parse itself is asserted first.
    expect(prefixes.size).toBeGreaterThan(10);
    expect(paths.length).toBeGreaterThan(0);
  });

  it.each(paths)('%s sits under a prefix server.ts registers', (p) => {
    const covered = [...prefixes].some((pre) => p === pre || p.startsWith(pre.endsWith('/') ? pre : pre + '/'));
    expect(covered, `${p} matches no registered prefix — this target will 404 forever`).toBe(true);
  });

  it('does not poll the two paths that were permanently 404ing', () => {
    // Named explicitly: these are the regressions this file exists to prevent,
    // and both were confirmed 404 against production before the fix.
    //
    // COMMENTS ARE STRIPPED FIRST. The first version of this assertion searched
    // the raw file and failed on its own documentation -- the comment above the
    // fix in uptime-pinger.mjs explains that /healthz never existed, so the
    // literal string is present in prose while no code polls it. That mistake
    // (a guard matching the comment that explains the guard) has now happened
    // nine times in this engagement, so the stripping is the point of the test,
    // not an incidental detail.
    const code = pinger.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toContain('/healthz');
    expect(code).not.toContain('puja-types');
  });

  it('the comment-stripper actually removes comments', () => {
    // Without this, a broken stripper would blank the file and make the
    // assertion above pass vacuously -- the exact "vacuous test" failure the
    // verifiers refuted twice in this engagement.
    const code = pinger.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(pinger).toContain('/healthz'); // present, in prose
    expect(code).toContain('api-health'); // real code survived the strip
    expect(code.length).toBeGreaterThan(300);
  });
});
