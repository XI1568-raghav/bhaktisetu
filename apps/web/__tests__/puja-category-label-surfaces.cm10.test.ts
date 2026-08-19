/**
 * [CM-10] Every rendered surface that prints a puja category runs it through
 * pujaCategoryLabel().
 *
 * The original finding was closed on /pujas and /pujas/<slug> only. Three more
 * surfaces kept interpolating the raw Prisma `PujaCategory` enum straight into
 * JSX, so a devotee still read "special_occasion" — and on two of them the chip
 * is `uppercase tracking-wider`, so it rendered "SPECIAL_OCCASION":
 *
 *   app/pujas/book/page.tsx        the CHECKOUT page's subtitle
 *   app/deity/[slug]/page.tsx      the puja card chip
 *   app/temples/[slug]/pujas/page.tsx  the same chip on the temple offerings list
 *
 * These read clean when the API is down (the offline fallback carries human
 * strings) and leak the moment it answers, which is why a manual pass missed
 * them.
 *
 * SOURCE-TEXT GUARD, COMMENTS STRIPPED FIRST. This file quotes the exact
 * interpolations it bans, and so do the pages' own comments — matching against
 * raw source would let a comment satisfy or trip the assertion.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(__dirname, '..');

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const read = (rel: string) => stripComments(fs.readFileSync(path.join(WEB, rel), 'utf8'));

/** Surface -> the raw interpolation that must not appear on it. */
const SURFACES: Array<{ file: string; raw: RegExp; what: string }> = [
  { file: 'app/pujas/page.tsx', raw: /\{puja\.category\}/, what: 'the /pujas card metadata row' },
  {
    file: 'app/pujas/[slug]/page.tsx',
    raw: /\{puja\.category\}/,
    what: 'the puja detail hero chip',
  },
  {
    file: 'app/pujas/book/page.tsx',
    raw: /\{puja\.category\}/,
    what: 'the checkout page subtitle',
  },
  { file: 'app/deity/[slug]/page.tsx', raw: /\{p\.category\}/, what: 'the deity page puja chip' },
  {
    file: 'app/temples/[slug]/pujas/page.tsx',
    raw: /\{o\.pujaType\.category\}/,
    what: 'the temple offerings chip',
  },
];

describe('[CM-10] no rendered surface prints the raw PujaCategory enum', () => {
  for (const { file, raw, what } of SURFACES) {
    it(`${file} maps the category through pujaCategoryLabel (${what})`, () => {
      const src = read(file);
      expect(src, `${file} never imports lib/puja-labels`).toMatch(/pujaCategoryLabel\s*\(/);
      expect(
        src,
        `${file} still interpolates the raw enum — a devotee reads "special_occasion" here`,
      ).not.toMatch(raw);
    });
  }

  it('the guard is measuring something — the banned pattern really is a JSX interpolation', () => {
    // If the regexes below could never match anything, the assertions above
    // would be free. Prove they bite on the exact string they are written for.
    expect(/\{puja\.category\}/.test('<span>{puja.category}</span>')).toBe(true);
    expect(/\{o\.pujaType\.category\}/.test('{o.pujaType.category}')).toBe(true);
    // ...and that comment stripping is what keeps this file's own prose out.
    expect(stripComments('/* {puja.category} */').trim()).toBe('');
  });
});

/**
 * Repo-wide backstop: a NEW page cannot reopen this by interpolating a
 * puja-shaped `.category` directly.
 *
 * Scoped to PUJA surfaces only, and scoped by evidence rather than by a
 * hand-kept allowlist: a file is in scope when it actually reaches for the puja
 * catalogue (`getPujaTypes`, the `PujaType`/`pujaType` shape, or a fetch of
 * `/pujas/types`). Every other `.category` in the app — store products, chants,
 * tirths, tithis, roadmap items, support articles — is already display copy and
 * is none of CM-10's business, so counting those would make this guard noise
 * that the next author switches off.
 */
describe('[CM-10] no new puja surface can reopen the leak', () => {
  function walk(dir: string, acc: string[] = []): string[] {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '__tests__' || e.name === '.next') continue;
        walk(full, acc);
      } else if (/\.tsx$/.test(e.name)) {
        acc.push(full);
      }
    }
    return acc;
  }

  const SOURCES = [...walk(path.join(WEB, 'app')), ...walk(path.join(WEB, 'components'))];

  /** The file reads the puja catalogue, so its `.category` is the Prisma enum. */
  const PUJA_SURFACE = /getPujaTypes|PujaType|pujaType|pujas\/types|mapPujaTypeToCard/;

  /** `{foo.category}` / `{foo.bar.category}` — nothing else inside the braces. */
  const RAW_CATEGORY = /\{\s*[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\.category\s*\}/g;

  const inScope = SOURCES.filter((f) => PUJA_SURFACE.test(stripComments(fs.readFileSync(f, 'utf8'))));

  it('the scope filter selects real puja surfaces (it is not matching nothing)', () => {
    const rels = inScope.map((f) => path.relative(WEB, f).split(path.sep).join('/'));
    expect(rels.length).toBeGreaterThan(3);
    for (const known of SURFACES.map((s) => s.file)) {
      expect(rels, `${known} must be inside the scope this guard walks`).toContain(known);
    }
  });

  it('lists every offender so a new one is named, not just counted', () => {
    const offenders: string[] = [];
    for (const file of inScope) {
      const rel = path.relative(WEB, file).split(path.sep).join('/');
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      // A file that calls pujaCategoryLabel elsewhere is still an offender if it
      // ALSO prints a raw one, so there is no exemption for the import.
      const hits = src.match(RAW_CATEGORY);
      // `filters.category` is the UI filter state (already a display string the
      // page itself chose), not a row value off the API.
      const real = [...new Set(hits ?? [])].filter((h) => !/\{\s*filters\./.test(h));
      if (real.length) offenders.push(`${rel} :: ${real.join(' ')}`);
    }
    expect(
      offenders,
      'these interpolate a raw PujaCategory into JSX. Wrap it in pujaCategoryLabel() ' +
        'from lib/puja-labels — a devotee otherwise reads "special_occasion".\n' +
        offenders.join('\n'),
    ).toEqual([]);
  });
});
