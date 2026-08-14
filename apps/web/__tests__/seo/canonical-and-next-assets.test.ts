// SEO-01 + SEO-02 regression guards (prod sweep 2026-08-12).
//
// SEO-01 — 349 indexable pages canonicalised to the homepage.
//   app/layout.tsx declared `alternates.canonical: "https://darshya.online"` on
//   the ROOT metadata. Next.js inherits a parent's `alternates.canonical` into
//   every child route that does not set its own, so /pujas, /temples,
//   /become-priest, 30+ /content/* pages and ~340 others each emitted
//   `<link rel="canonical" href="https://darshya.online">` — an explicit
//   instruction to Google to drop the URL and fold its signals into the
//   homepage. Fix: the root supplies NO canonical (Google self-canonicalises
//   by default, which is far safer than a wrong one) and each route supplies
//   its own.
//
//   The mechanism matters as much as the value: the repo previously hardcoded
//   /auth/login's canonical on the shared auth SEGMENT layout, which mistagged
//   signup/verify/callback the same way at smaller scale. So these tests
//   assert per-route correctness — every literal canonical must equal the URL
//   of the route that declares it — not merely that a canonical exists.
//
// SEO-02 — robots.txt disallowed `/_next/`, the prefix under which every
//   stylesheet, script and font on the site is served. Googlebot was being
//   asked to render pages whose renderer it had been forbidden to fetch.
//
// These are source-level assertions on purpose. The runtime shape was verified
// by importing app/layout.tsx under vitest (it resolves to exactly the literal
// written in the file), but that import pulls the whole component tree and
// costs ~36s, so the fast static form is used here. app/robots.ts has no
// component deps and is imported for real.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import robots from '../../app/robots';

const APP_DIR = path.resolve(__dirname, '../../app');
const SITE = 'https://darshya.online';

/** Strip block + line comments so prose like "the canonical apex" can't match. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function collect(dir: string, filename: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'api') continue; // route handlers, not pages
      collect(full, filename, acc);
    } else if (entry.name === filename) {
      acc.push(full);
    }
  }
  return acc;
}

/** URL path of the route that owns this page/layout file. Root => ''. */
function routeOf(file: string): string {
  const rel = path.relative(APP_DIR, path.dirname(file)).split(path.sep).filter(Boolean).join('/');
  return rel ? `/${rel}` : '';
}

function read(file: string): string {
  return stripComments(fs.readFileSync(file, 'utf8'));
}

function rel(file: string): string {
  return path.relative(APP_DIR, file).split(path.sep).join('/');
}

// Presence check. Deliberately matches the bare word so the shorthand form
// (`alternates: { canonical, languages: {...} }`, used by /puja/[city]/[slug])
// counts too. `\b` on both sides keeps `canonicalUrl` and friends out.
const CANONICAL_KEY = /\bcanonical\b/;
// Value check, covering both `canonical: '…'` and `const canonical = '…'`.
const CANONICAL_LITERAL = /\bcanonical\s*[:=]\s*(['"`])([^'"`]*)\1/;
const EXPORTS_METADATA = /export\s+const\s+metadata\b|export\s+(async\s+)?function\s+generateMetadata\b/;

const PAGES = collect(APP_DIR, 'page.tsx');
const LAYOUTS = collect(APP_DIR, 'layout.tsx');
const ROOT_LAYOUT = path.join(APP_DIR, 'layout.tsx');
const HOME_PAGE = path.join(APP_DIR, 'page.tsx');

const DISALLOWED: string[] = (() => {
  const rules = robots().rules;
  const list = Array.isArray(rules) ? rules : [rules];
  return list.flatMap((r) => {
    const d = r?.disallow;
    if (!d) return [];
    return Array.isArray(d) ? d : [d];
  });
})();

/** True when robots.txt already keeps crawlers off this route entirely. */
function robotsBlocks(route: string): boolean {
  const r = route === '' ? '/' : route;
  return DISALLOWED.some((d) => r === d || r.startsWith(d) || `${r}/` === d);
}

describe('[SEO-01] canonical URLs are declared per-route, never inherited', () => {
  it('the ROOT layout declares no canonical (it would be inherited by every child route)', () => {
    const src = read(ROOT_LAYOUT);
    const offending = src
      .split('\n')
      .map((line, i) => [i + 1, line] as const)
      .filter(([, line]) => CANONICAL_KEY.test(line))
      .map(([n, line]) => `app/layout.tsx:${n}: ${line.trim()}`);

    expect(
      offending,
      'A canonical on the root layout is inherited by every route that does not set its own, ' +
        'declaring hundreds of distinct pages to be duplicates of the homepage.',
    ).toEqual([]);
  });

  it('the ROOT layout keeps alternates.languages (only the canonical key is removed)', () => {
    expect(read(ROOT_LAYOUT)).toMatch(/\blanguages\s*:/);
  });

  it('the homepage supplies its own canonical, so dropping the root one leaves / covered', () => {
    const m = read(HOME_PAGE).match(CANONICAL_LITERAL);
    expect(m?.[2]).toBe(SITE);
  });

  it('every metadata-exporting page declares a canonical (or is noindex / robots-blocked)', () => {
    const offenders = PAGES.filter((file) => {
      const src = read(file);
      if (!EXPORTS_METADATA.test(src)) return false; // no metadata at all — out of scope
      if (CANONICAL_KEY.test(src)) return false;
      if (/\bindex\s*:\s*false/.test(src)) return false; // explicitly noindex
      return !robotsBlocks(routeOf(file));
    }).map(rel);

    expect(offenders, `${offenders.length} indexable pages have metadata but no canonical`).toEqual(
      [],
    );
  });

  it('every literal canonical equals the URL of the route that declares it', () => {
    const mismatches: string[] = [];

    for (const file of [...PAGES, ...LAYOUTS]) {
      const src = read(file);
      const m = src.match(CANONICAL_LITERAL);
      if (!m) continue;

      let value = m[2];
      if (value.includes('${') && /const BASE_URL = 'https:\/\/darshya\.online'/.test(src)) {
        value = value.replace('${BASE_URL}', SITE);
      }
      if (value.includes('${')) continue; // per-item canonical, checked by the dynamic-route test

      const route = routeOf(file);
      const expected = [`${SITE}${route}`, route || '/'];
      const normalised = value.replace(/\/$/, '');
      if (!expected.some((e) => e.replace(/\/$/, '') === normalised)) {
        mismatches.push(`${rel(file)} (route ${route || '/'}) declares canonical ${value}`);
      }
    }

    expect(
      mismatches,
      'A canonical pointing anywhere but its own URL tells Google to de-index the page.',
    ).toEqual([]);
  });

  it('routes with a dynamic segment never hardcode a single static canonical', () => {
    const offenders = [...PAGES, ...LAYOUTS]
      .filter((file) => routeOf(file).includes('['))
      .filter((file) => {
        const m = read(file).match(CANONICAL_LITERAL);
        return Boolean(m) && !m![2].includes('${');
      })
      .map(rel);

    expect(
      offenders,
      'Every URL under a dynamic segment would claim to be the same page.',
    ).toEqual([]);
  });

  it("a dynamic route's interpolated canonical is built from its own path", () => {
    const mismatches: string[] = [];

    for (const file of [...PAGES, ...LAYOUTS]) {
      const route = routeOf(file);
      if (!route.includes('[')) continue;

      const m = read(file).match(CANONICAL_LITERAL);
      if (!m || !m[2].includes('${')) continue;

      const value = m[2].replace('${BASE_URL}', SITE);
      const pathPart = value.startsWith(SITE) ? value.slice(SITE.length) : value;
      const literalPrefix = pathPart.split('${')[0];
      const routePrefix = route.split('[')[0];

      if (literalPrefix !== routePrefix) {
        mismatches.push(`${rel(file)} (route ${route}) builds canonical from ${literalPrefix}`);
      }
    }

    expect(
      mismatches,
      'A copy-pasted canonical that interpolates the right param under the wrong path ' +
        'still points every page at a URL it does not own.',
    ).toEqual([]);
  });
});

describe('[SEO-02] robots.txt must not block the renderer', () => {
  it('does not disallow /_next/', () => {
    expect(DISALLOWED).not.toContain('/_next/');
  });

  it('does not disallow any prefix of /_next/static/ (all CSS, JS and fonts live there)', () => {
    const blocking = DISALLOWED.filter(
      (d) => '/_next/static/chunks/main.js'.startsWith(d) || '/_next/static/media/font.woff2'.startsWith(d),
    );
    expect(
      blocking,
      'Googlebot renders every page unstyled and unhydrated when it cannot fetch /_next/static.',
    ).toEqual([]);
  });

  it('still blocks the private surfaces', () => {
    for (const p of ['/api/', '/admin/', '/auth/', '/priest/', '/temple-portal/']) {
      expect(DISALLOWED).toContain(p);
    }
  });
});
