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
  isrStaticRoutes: { routes: string[] };
  isrBuildDataPrefixes: { prefixes: string[] };
  mustBeCopied: { routes: string[] };
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

  it('locale landings are served from assets: cookie written by layout script, Content-Language by _headers', () => {
    const layout = readFileSync(join(WEB, 'app/layout.tsx'), 'utf8');
    expect(layout).toContain('poojly_language=');
    expect(layout).toMatch(/hi\|ta\|te\|bn\|mr/);
    const headers = readFileSync(join(WEB, 'public/_headers'), 'utf8');
    for (const l of ['hi', 'ta', 'te', 'bn', 'mr']) {
      expect(Object.keys(cfg.exclude.routes)).not.toContain('/' + l);
      expect(cfg.mustBeCopied.routes).toContain('/' + l);
      expect(headers).toMatch(new RegExp(`^/${l}\\n  Content-Language: ${l}$`, 'm'));
      expect(headers).toMatch(new RegExp(`^/${l}/\\*\\n  Content-Language: ${l}$`, 'm'));
    }
  });

  it('the home page is static: no revalidate, no per-request data, language redirect and dated content run in the browser', () => {
    const home = strip(readFileSync(join(WEB, 'app/page.tsx'), 'utf8'));
    expect(home).not.toMatch(/export\s+const\s+revalidate\b/);
    for (const re of SERVER_REQUEST_DATA) expect(home).not.toMatch(re);
    expect(home).not.toMatch(/getTodayPanchang|<ThisWeek \/>/);
    expect(home).toContain('HomeLocaleRedirect');
    expect(home).toContain('HomePanchangChip');
    expect(home).toContain('ThisWeekLive');
    expect(cfg.isrStaticRoutes.routes).toContain('/');
    expect(cfg.mustBeCopied.routes).toContain('/');
    for (const f of ['HomePanchangChip', 'ThisWeekLive']) {
      expect(isClient(readFileSync(join(WEB, `components/home/${f}.tsx`), 'utf8')), f).toBe(true);
    }
  });

  it('the home language redirect keeps middleware rules: bare root only, chosen cookie only, supported locales only', () => {
    const src = readFileSync(join(WEB, 'components/home/HomeLocaleRedirect.tsx'), 'utf8');
    expect(src).toContain("location.pathname!=='/'");
    expect(src).toContain('poojly_language');
    expect(src).toContain("['hi','ta','te','bn','mr']");
    expect(src).toContain('location.replace');
  });

  it('build-time-data sections render nothing per request (no cookies, headers, searchParams, bare new Date())', () => {
    for (const prefix of cfg.isrBuildDataPrefixes.prefixes) {
      const files = walk(join(WEB, 'app', prefix));
      expect(files.length, prefix).toBeGreaterThan(0);
      for (const f of files) {
        const raw = readFileSync(f, 'utf8');
        if (isClient(raw)) continue;
        const src = strip(raw);
        expect(src, `${f}: clock/cookie/query data does not belong in an asset-served section`).not.toMatch(
          /\bcookies\s*\(|next\/headers|\bheaders\s*\(\s*\)|\bsearchParams\b|\bnew Date\(\)|\bDate\.now\(/,
        );
      }
    }
  });

  it('exact ISR routes and pattern routes copied to assets render nothing per request (server files of their own folder)', () => {
    const dirs = [
      ...cfg.isrStaticRoutes.routes.filter((r) => r !== '/').map((r) => r.slice(1)),
      ...(cfg as unknown as { isrBuildDataPatterns: { patterns: { dir: string }[] } }).isrBuildDataPatterns.patterns.map((p) => p.dir),
    ];
    expect(dirs.length).toBeGreaterThan(15);
    for (const d of dirs) {
      const dir = join(WEB, 'app', d);
      // Only the folder's own files: a nested dynamic child ([slug]) is a different route.
      expect(existsSync(join(dir, 'page.tsx')), d).toBe(true);
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (!statSync(full).isFile() || !/\.(tsx?|mjs)$/.test(name) || /\.test\./.test(name)) continue;
        const raw = readFileSync(full, 'utf8');
        if (isClient(raw)) continue;
        expect(strip(raw), `${full}: clock/cookie/query data does not belong in an asset-served page`).not.toMatch(
          /\bcookies\s*\(|next\/headers|\bheaders\s*\(\s*\)|\bsearchParams\b|\bnew Date\(\)|\bDate\.now\(/,
        );
      }
    }
  });

  it('help articles are asset-served with the Content-Language middleware used to add per path locale', () => {
    const headers = readFileSync(join(WEB, 'public/_headers'), 'utf8');
    for (const lang of ['en', 'hi', 'ta', 'te', 'bn', 'mr']) {
      expect(headers, lang).toMatch(new RegExp(`/help/articles/${lang}/\\*\\n\\s+Content-Language: ${lang}\\n`));
    }
    expect(Object.keys(cfg.exclude.prefixes)).not.toContain('/help/articles/');
  });

  it('/checkout/success is fully static: the booking number and status are read in the browser', () => {
    const page = strip(readFileSync(join(WEB, 'app/checkout/success/page.tsx'), 'utf8'));
    expect(page).not.toMatch(/searchParams|next\/headers|cookies\s*\(/);
    expect(readFileSync(join(WEB, 'app/checkout/success/CheckoutSuccessQuery.tsx'), 'utf8')).toMatch(/window\.location\.search/);
    expect(cfg.mustBeStatic.routes).toContain('/checkout/success');
  });

  it('prerendered alias redirects are turned into _redirects rules by the build step, not hand-listed', () => {
    const script = readFileSync(join(WEB, 'scripts/static-pages-to-assets.mjs'), 'utf8');
    expect(script).toMatch(/_redirects/);
    expect(script).toMatch(/\[301, 302, 307, 308\]/);
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
