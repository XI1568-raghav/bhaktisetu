import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guard for the Cloudflare "serve it from assets" set (scripts/static-pages-to-assets.mjs).
 *
 * A page copied into .open-next/assets is answered WITHOUT the Worker: no middleware.ts, no
 * request cookies/headers/query. If a portal shell or legal page quietly starts reading any of
 * those on the server, the prerendered copy would freeze one visitor-less rendering, and the
 * build script would (correctly) fail on it. This is the cheap source-level guard that fails
 * in `vitest` before a 4-minute `build:cf` is needed to find out.
 */
const WEB = join(__dirname, '..');
const cfg = JSON.parse(readFileSync(join(WEB, 'scripts/cf-static-pages.json'), 'utf8')) as {
  mustBeStatic: { routes: string[]; portalPrefixes: string[] };
  exclude: { routes: Record<string, string>; prefixes: Record<string, string> };
  isrStaticPrefixes: { prefixes: string[] };
  workerServed: Record<string, string>;
};
const served = Object.keys(cfg.workerServed).filter((k) => k.startsWith('/')).map((k) => join(WEB, 'app', k));

const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === '__tests__' || name === 'node_modules') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx?|mjs)$/.test(name) && !/\.test\./.test(name)) out.push(full);
  }
  return out;
}

// Anything here makes Next render per request (or per visitor) instead of at build time.
const SERVER_REQUEST_DATA = [
  /from\s+['"]next\/headers['"]/,
  /\bcookies\s*\(/,
  /\bheaders\s*\(\s*\)/,
  /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/,
  /export\s+const\s+revalidate\b/,
  /\bunstable_noStore\b|\bnoStore\s*\(/,
];

const isClient = (src: string) => /^\s*['"]use client['"]/.test(src);

describe('Cloudflare asset-served pages stay free of server-side request data', () => {
  it('portalPrefixes mirror middleware.ts PORTAL_PREFIXES exactly', () => {
    const mw = readFileSync(join(WEB, 'middleware.ts'), 'utf8');
    const block = mw.match(/const PORTAL_PREFIXES = \[([\s\S]*?)\];/)![1]!;
    const fromMiddleware = [...block.matchAll(/'(\/[^']+)'/g)].map((m) => m[1]!).sort();
    expect([...cfg.mustBeStatic.portalPrefixes].sort()).toEqual(fromMiddleware);
  });

  for (const prefix of cfg.mustBeStatic.portalPrefixes) {
    it(`${prefix}/** pages and layouts read no cookies, headers or searchParams on the server`, () => {
      // Pages listed in workerServed are Worker-rendered by design, so they are exempt.
      const files = walk(join(WEB, 'app', prefix)).filter((f) => !served.some((d) => f.startsWith(d + '/')));
      expect(files.length).toBeGreaterThan(0);
      for (const f of files) {
        const src = strip(readFileSync(f, 'utf8'));
        for (const re of SERVER_REQUEST_DATA) expect(src, `${f} matches ${re}`).not.toMatch(re);
        if (/\/(page|layout)\.tsx?$/.test(f) && !isClient(src)) {
          expect(src, `${f}: server page/layout must not take searchParams`).not.toMatch(/\bsearchParams\b/);
        }
      }
    });
  }

  it('mustBeStatic routes have pages and none sits under an excluded prefix', () => {
    for (const route of cfg.mustBeStatic.routes) {
      const base = join(WEB, 'app', route);
      expect(existsSync(join(base, 'page.tsx')) || existsSync(join(base, 'page.ts')), route).toBe(true);
      for (const p of Object.keys(cfg.exclude.prefixes).filter((k) => !k.startsWith('_'))) {
        expect(route.startsWith(p), `${route} is both required-static and excluded (${p})`).toBe(false);
      }
    }
  });

  it('locale landings stay excluded: middleware writes poojly_language on them', () => {
    for (const l of ['/hi', '/ta', '/te', '/bn', '/mr']) expect(Object.keys(cfg.exclude.routes)).toContain(l);
    expect(Object.keys(cfg.exclude.prefixes)).toContain('/help/articles/');
  });

  it('ISR sections copied to assets render committed data only (no fetch, cookies, dates)', () => {
    for (const prefix of cfg.isrStaticPrefixes.prefixes) {
      for (const f of walk(join(WEB, 'app', prefix))) {
        const src = strip(readFileSync(f, 'utf8'));
        expect(src, `${f}: live data does not belong in an asset-served section`).not.toMatch(
          /\bfetch\s*\(|\bserverFetch\b|lib\/api['"]|\bnew Date\(\)|\bDate\.now\(|\bcookies\s*\(|next\/headers|\bsearchParams\b/,
        );
      }
    }
  });
});
