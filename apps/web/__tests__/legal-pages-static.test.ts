import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Legal and support pages must be PURE static on the Cloudflare Worker free plan.
 *
 * Production QA 2026-10-22: error 1102 "Worker exceeded resource limits" on the refund policy,
 * support tickets and live darshan pages. Measured with `pnpm build:cf` + wrangler dev: the
 * Worker spends ~0.9 s CPU importing its server bundle on the first request of a cold isolate,
 * and an expired-ISR page adds a full re-render on top; the limit is 10 ms. The only page that
 * costs no CPU is one answered from static assets, which scripts/static-pages-to-assets.mjs does
 * for every route in scripts/cf-static-pages.json, and only for routes `next build` reports as
 * fully static. This test is the cheap source-level guard (the build script is the strict one).
 */
const WEB = join(__dirname, '..');
const cfg = JSON.parse(readFileSync(join(WEB, 'scripts/cf-static-pages.json'), 'utf8')) as {
  mustBeStatic: { routes: string[]; portalPrefixes: string[] };
};
// Server-rendered legal pages: held to the strict no-fetch / no-request-data source check below.
// (The client portal shells in mustBeStatic are covered by cf-static-assets.test.ts.)
const LEGAL = ['/privacy', '/privacy/v2', '/terms', '/refund', '/refunds', '/shipping', '/legal/cookies', '/legal/privacy-uk', '/data-deletion'];

const strip = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const DYNAMIC = [
  /export\s+const\s+dynamic\b/,
  /export\s+const\s+revalidate\b/,
  /export\s+const\s+fetchCache\b/,
  /from\s+['"]next\/headers['"]/,
  /\bnoStore\b|unstable_noStore/,
  /\bsearchParams\b/,
  /\bgenerateMetadata\b/,
  /\bfetch\s*\(/,
  /from\s+['"][^'"]*lib\/api['"]/,
  /\bserverFetch\b/,
];

function pageFile(route: string): string {
  const base = join(WEB, 'app', route);
  for (const f of ['page.tsx', 'page.ts']) if (existsSync(join(base, f))) return join(base, f);
  throw new Error(`no page file for ${route}`);
}

function relativeImports(file: string, src: string): string[] {
  const dir = join(file, '..');
  const out: string[] = [];
  for (const m of src.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)) {
    const target = join(dir, m[1]!);
    for (const ext of ['.tsx', '.ts', '/page.tsx', '/index.tsx', '/index.ts']) {
      if (existsSync(target + ext)) {
        out.push(target + ext);
        break;
      }
    }
  }
  return out;
}

describe('legal pages stay pure static', () => {
  it('lists the real refund route (/refunds is what the footer and sitemap use)', () => {
    for (const route of LEGAL) expect(cfg.mustBeStatic.routes).toContain(route);
  });

  for (const route of LEGAL) {
    it(`${route} reads no request data, has no revalidate and fetches nothing`, () => {
      const file = pageFile(route);
      // The page itself, plus pages it re-exports/wraps (/refund renders /refunds).
      const queue = [file];
      const seen = new Set<string>();
      while (queue.length) {
        const f = queue.pop()!;
        if (seen.has(f)) continue;
        seen.add(f);
        const src = strip(readFileSync(f, 'utf8'));
        // generateMetadata is allowed to be absent only; static `metadata` objects are the norm.
        for (const re of DYNAMIC) expect(src, `${f} matches ${re}`).not.toMatch(re);
        if (f.endsWith('page.tsx')) queue.push(...relativeImports(f, src).filter((i) => i.endsWith('/page.tsx')));
      }
    });
  }

  it('the root layout does not opt every route out of prerendering', () => {
    const src = strip(readFileSync(join(WEB, 'app/layout.tsx'), 'utf8'));
    expect(src).not.toMatch(/from\s+['"]next\/headers['"]/);
    expect(src).not.toMatch(/export\s+const\s+dynamic\b/);
  });

  it('every route the asset copier lists has a page, and tickets/darshan stay out of ISR', () => {
    for (const route of [...cfg.mustBeStatic.routes, '/darshan']) expect(() => pageFile(route)).not.toThrow();
    for (const route of ['/darshan', '/darshan/[id]']) {
      const src = strip(readFileSync(join(WEB, 'app', route, 'page.tsx'), 'utf8'));
      expect(src, `${route} must not export revalidate (Worker cannot revalidate)`).not.toMatch(/export\s+const\s+revalidate\b/);
      expect(src, `${route} must not fetch with a revalidate window`).not.toMatch(/getLiveDarshan\(\)|getScheduledDarshan\(\)/);
      expect(src).not.toMatch(/resolveDarshanSource/);
    }
  });

  it('public/_redirects maps the common legal aliases to the real routes', () => {
    const rules = readFileSync(join(WEB, 'public/_redirects'), 'utf8');
    expect(rules).toMatch(/^\/refund-policy\s+\/refunds\s+301/m);
    expect(rules).toMatch(/^\/privacy-policy\s+\/privacy\s+301/m);
  });
});
