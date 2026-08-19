/**
 * [SEO-09] Pages that never declare a title or a description.
 *
 * The prod sweep found 128 prerendered pages sharing one <title> and 129
 * sharing one <meta name="description"> — the ROOT defaults in app/layout.tsx
 * ("Darshya — India's Devotional Super App" / "Experience live darshan, book
 * pujas…"). Next.js inherits `title` and `description` from the nearest
 * ancestor that sets them, so a page.tsx with no `metadata` export and no
 * metadata-bearing segment layout above it is not "untitled": it silently
 * claims to be the homepage. In a SERP that is 128 results with identical blue
 * links, and Google treats a duplicate title as a strong signal to drop the
 * duplicates.
 *
 * WHAT THIS FILE IS AND IS NOT. It is a measurement and a ratchet. Writing the
 * missing metadata means editing ~130 route files, which is not this change's
 * lane — so the number below is today's count, not an accepted target. It must
 * only ever go DOWN. Adding a page with no metadata fails here with the file
 * named, which is the part that stops the number growing back while the backlog
 * is worked off.
 *
 * THREE EXCLUSIONS, ALL DELIBERATE:
 *  - A route robots.txt already disallows cannot show up in a SERP at all, so a
 *    shared title costs nothing there. That is most of /admin and the portals.
 *  - A page under a segment layout that DOES declare metadata (app/auth/* under
 *    app/auth/layout.tsx, for instance) inherits a real title, not the root
 *    default. The finding is specifically about falling through to the ROOT.
 *  - A page whose whole body is `redirect()` / `permanentRedirect()` never
 *    renders a document. Next answers those routes with a 307/308 and no HTML,
 *    so there is no <title> to be duplicated and nothing a metadata export
 *    could change — Next never resolves metadata for a render that throws a
 *    redirect. Counting them inflated the finding by 8 and the only way to
 *    "fix" one is a dead export that exists to satisfy this file, which is the
 *    thing a ratchet is supposed to prevent. The excluded set is pinned by name
 *    below so this cannot quietly become an escape hatch.
 *
 * The root layout is excluded as a source on purpose: it is the thing being
 * fallen through TO. Counting it as an ancestor would make every page "covered"
 * and the guard would measure nothing — the exact shape of a test that passes
 * against the defect it was written for.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import robots from '../../app/robots';

const APP_DIR = path.resolve(__dirname, '../../app');

/** Strip comments: prose in this repo quotes `export const metadata` verbatim. */
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

function routeOf(file: string): string {
  const rel = path.relative(APP_DIR, path.dirname(file)).split(path.sep).filter(Boolean).join('/');
  return rel ? `/${rel}` : '';
}

const DECLARES_METADATA =
  /export\s+const\s+metadata\b|export\s+(async\s+)?function\s+generateMetadata\b/;

const DISALLOWED: string[] = (() => {
  const rules = robots().rules;
  const list = Array.isArray(rules) ? rules : [rules];
  return list.flatMap((r) => {
    const d = r?.disallow;
    if (!d) return [];
    return Array.isArray(d) ? d : [d];
  });
})();

function robotsBlocks(route: string): boolean {
  const r = route === '' ? '/' : route;
  return DISALLOWED.some((d) => r === d || r.startsWith(d) || `${r}/` === d);
}

/**
 * `description:` at the metadata root. Excludes `openGraph.description` and
 * `twitter.description`, which resolve separately and do NOT satisfy
 * <meta name="description"> — a page with only those still emits the root's.
 *
 * The regex alone does NOT do that: `/(^|[^\w$.])description\s*:/` happily
 * matches the `description:` INSIDE an `openGraph: { … }` object literal, so a
 * page carrying only an OG description used to read as covered. No page in the
 * tree exploited that today (measured: 0), but it was a live escape hatch, so
 * the nested blocks are brace-matched away before the test runs.
 */
const DECLARES_DESCRIPTION = /(^|[^\w$.])description\s*:/;

/** Remove `openGraph: { … }` / `twitter: { … }` object literals, braces balanced. */
function stripNestedMetaBlocks(src: string): string {
  let out = src;
  for (const key of ['openGraph', 'twitter']) {
    for (;;) {
      const m = new RegExp(`\\b${key}\\s*:\\s*\\{`).exec(out);
      if (!m) break;
      let depth = 0;
      let end = -1;
      for (let i = m.index + m[0].length - 1; i < out.length; i++) {
        if (out[i] === '{') depth++;
        else if (out[i] === '}') {
          depth--;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      if (end < 0) break; // unbalanced — leave it rather than eat the file
      out = out.slice(0, m.index) + out.slice(end + 1);
    }
  }
  return out;
}

const declares = (file: string) =>
  fs.existsSync(file) && DECLARES_METADATA.test(stripComments(fs.readFileSync(file, 'utf8')));

const describes = (file: string) =>
  fs.existsSync(file) &&
  DECLARES_DESCRIPTION.test(stripNestedMetaBlocks(stripComments(fs.readFileSync(file, 'utf8'))));

/**
 * A page whose entire job is to forward to another URL.
 *
 * Detected as "calls redirect()/permanentRedirect() and contains no JSX at
 * all". JSX is spotted by `</` or `/>` rather than by `<Tag`, because every TS
 * generic in these files (`Promise<{ slug: string }>`, `Record<string,
 * string[]>`) would otherwise read as an element. Comments are stripped first,
 * so a comment quoting `<Foo />` cannot mark a real page as a redirect — the
 * same rule the rest of this file follows.
 */
function isRedirectOnly(file: string): boolean {
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  return !/<\/|\/>/.test(src) && /\b(redirect|permanentRedirect)\s*\(/.test(src);
}

/** A segment layout ABOVE this page that supplies a title — root excluded. */
function coveredByAncestorLayout(file: string): boolean {
  let dir = path.dirname(path.resolve(file));
  const root = path.resolve(APP_DIR);
  while (dir.startsWith(root) && dir !== root) {
    if (declares(path.join(dir, 'layout.tsx'))) return true;
    dir = path.dirname(dir);
  }
  return false;
}

/** The same walk for `description`, which Next inherits independently. */
function describedByAncestorLayout(file: string): boolean {
  let dir = path.dirname(path.resolve(file));
  const root = path.resolve(APP_DIR);
  while (dir.startsWith(root) && dir !== root) {
    if (describes(path.join(dir, 'layout.tsx'))) return true;
    dir = path.dirname(dir);
  }
  return false;
}

const PAGES = collect(APP_DIR, 'page.tsx');

const relOf = (f: string) => path.relative(APP_DIR, f).split(path.sep).join('/');

const REDIRECT_ONLY = PAGES.filter(isRedirectOnly).map(relOf).sort();

/**
 * Every page that is allowed to skip metadata because it never renders one.
 * Pinned by name: the exclusion is only defensible for a route that answers a
 * redirect, and a list that can grow silently is a hole, not an exclusion.
 */
const EXPECTED_REDIRECT_ONLY = [
  'astrology/[id]/page.tsx',
  'festivals/page.tsx',
  'live/page.tsx',
  // Under /priest/, which robots.txt already disallows — listed because the
  // detector is repo-wide, not because the exclusion is what spares them.
  'priest/bookings/[id]/accept/page.tsx',
  'priest/bookings/[id]/page.tsx',
  'pujas/[slug]/book/page.tsx',
  'pujas/home-puja/[slug]/book/page.tsx',
  'pujas/pandits/[id]/page.tsx',
  'settings/earnings/page.tsx',
  'waitlist/confirm/page.tsx',
  // Already writes generateMetadata — it also has a notFound() branch, which
  // does render. Listed for completeness; it was never in the count.
  'yatra/[slug]/book/page.tsx',
];

/** Indexable pages that fall all the way through to the root defaults. */
const INHERIT_ROOT_DEFAULTS = PAGES.filter(
  (f) =>
    !declares(f) &&
    !coveredByAncestorLayout(f) &&
    !robotsBlocks(routeOf(f)) &&
    !isRedirectOnly(f),
)
  .map(relOf)
  .sort();

/**
 * Today's count. LOWER THIS as pages gain their own metadata; never raise it.
 * Measured from comment-free source, so a comment mentioning `export const
 * metadata` cannot mark a page as covered.
 *
 * 65 → 1 (2026-08-16, SEO-09). 8 of the 65 were redirect-only routes that were
 * never really offenders (see the exclusion above); the remaining 57 were
 * written. 54 of those are `'use client'` pages, which cannot export
 * `metadata` at all — each gained a sibling `layout.tsx` carrying it, the
 * arrangement app/astrology/kundli/layout.tsx and app/pujas/book/layout.tsx
 * already use.
 *
 * The 1 that remains is app/mobile/page.tsx. Its own segment layout
 * (app/mobile/layout.tsx) is itself `'use client'` — it reads usePathname() to
 * light the active tab — so there is no server file anywhere on that page's
 * path that can hold a metadata export. Closing it means splitting that layout
 * into a server shell plus a client tab bar, which is a change to render code,
 * not to metadata.
 */
const BASELINE = 0;

/**
 * The other half of the finding: 129 pages shared one <meta name="description">.
 *
 * Next resolves `description` independently of `title`, so a page can declare
 * `export const metadata = { title: 'Gift Puja' }` — which makes it "covered"
 * above — and still emit the root's homepage description. That is exactly what
 * app/gift/success/page.tsx did, and the title-only check could never see it.
 */
const INHERIT_ROOT_DESCRIPTION = PAGES.filter(
  (f) =>
    !describes(f) &&
    !describedByAncestorLayout(f) &&
    !robotsBlocks(routeOf(f)) &&
    !isRedirectOnly(f),
)
  .map(relOf)
  .sort();

/** Same story as BASELINE. Zero: every indexable page writes its own. */
const DESCRIPTION_BASELINE = 0;

describe('[SEO-09] indexable pages do not fall through to the root title', () => {
  it('the guard is actually measuring something', () => {
    // A parsing regression that made every page look "covered" would turn the
    // ratchet below into a test that can never fail. The backlog is now zero,
    // so "some page is still uncovered" can no longer serve as the liveness
    // proof — the DETECTORS are exercised against synthetic sources instead.
    expect(PAGES.length).toBeGreaterThan(300);

    // A page with no metadata at all must read as uncovered...
    expect(DECLARES_METADATA.test('export default function P() { return <div/>; }')).toBe(false);
    expect(DECLARES_DESCRIPTION.test('export const metadata = { title: "x" };')).toBe(false);
    // ...and a real export must read as covered.
    expect(DECLARES_METADATA.test('export const metadata: Metadata = { title: "x" };')).toBe(true);
    expect(DECLARES_METADATA.test('export async function generateMetadata() {}')).toBe(true);
    expect(DECLARES_DESCRIPTION.test('export const metadata = { description: "x" };')).toBe(true);
    // Comment stripping is what keeps prose from marking a page covered.
    expect(stripComments('/* export const metadata */').trim()).toBe('');
    // A description nested under openGraph/twitter must NOT count as covered:
    // Next resolves those separately and such a page still emits the root's
    // <meta name="description">.
    const ogOnly = 'export const metadata = { title: "x", openGraph: { description: "y" } };';
    expect(DECLARES_DESCRIPTION.test(ogOnly), 'raw regex is the hole').toBe(true);
    expect(DECLARES_DESCRIPTION.test(stripNestedMetaBlocks(ogOnly))).toBe(false);
    expect(
      DECLARES_DESCRIPTION.test(
        stripNestedMetaBlocks('export const metadata = { description: "d", twitter: { card: "s" } };'),
      ),
    ).toBe(true);
  });

  it('the redirect-only exclusion covers exactly the routes that answer a redirect', () => {
    // The one exclusion that is not verifiable from robots.txt or from a
    // layout, so it is verified by name instead. A page added to this set
    // without a redirect body, or a redirect page that grows a real body,
    // shows up here rather than silently leaving the count.
    expect(REDIRECT_ONLY).toEqual(EXPECTED_REDIRECT_ONLY);

    for (const rel of REDIRECT_ONLY) {
      const src = stripComments(fs.readFileSync(path.join(APP_DIR, rel), 'utf8'));
      expect(src, `${rel} is excluded as redirect-only but never redirects`).toMatch(
        /\b(redirect|permanentRedirect)\s*\(/,
      );
    }
  });

  it('the root layout is the thing being fallen through to, not an escape hatch', () => {
    const rootLayout = path.join(APP_DIR, 'layout.tsx');
    expect(declares(rootLayout), 'the root defaults must exist for this to be a defect').toBe(true);
    // app/page.tsx sets its own metadata, so the homepage must never be counted.
    expect(INHERIT_ROOT_DEFAULTS).not.toContain('page.tsx');
  });

  it('no NEW page ships without its own title and description', () => {
    expect(
      INHERIT_ROOT_DEFAULTS.length,
      `${INHERIT_ROOT_DEFAULTS.length} indexable pages emit the root layout's title and ` +
        `description verbatim (baseline ${BASELINE}). Each one is a SERP entry reading ` +
        `"Darshya — India's Devotional Super App". Add \`export const metadata\` to the new ` +
        `page, or \`generateMetadata\` if it is a dynamic route.\n` +
        INHERIT_ROOT_DEFAULTS.join('\n'),
    ).toBeLessThanOrEqual(BASELINE);
  });

  it('the baseline is not stale — lower it when pages are fixed', () => {
    // Keeps the ratchet honest in the other direction: once the backlog is
    // worked off, a baseline left at 62 would stop catching regressions.
    expect(
      BASELINE - INHERIT_ROOT_DEFAULTS.length,
      `BASELINE is ${BASELINE} but only ${INHERIT_ROOT_DEFAULTS.length} pages are affected — ` +
        'lower BASELINE to the real number so the ratchet keeps biting.',
    ).toBeLessThanOrEqual(0);
  });

  it('no NEW page ships the root DESCRIPTION either', () => {
    // A title-only metadata export satisfies the ratchet above and still emits
    // the homepage's description. Verified against the build output: of 1,829
    // prerendered documents, exactly two served pages carried the root
    // description — app/gift/success (a title-only export, now written) and
    // app/mobile (see BASELINE).
    expect(
      INHERIT_ROOT_DESCRIPTION.length,
      `${INHERIT_ROOT_DESCRIPTION.length} indexable pages emit the root layout's ` +
        `<meta name="description"> (baseline ${DESCRIPTION_BASELINE}). ` +
        'Add a `description` to that page\'s own metadata — openGraph.description ' +
        'does NOT satisfy it, Next resolves the two separately.\n' +
        INHERIT_ROOT_DESCRIPTION.join('\n'),
    ).toBeLessThanOrEqual(DESCRIPTION_BASELINE);
  });

  it('the description baseline is not stale either', () => {
    expect(
      DESCRIPTION_BASELINE - INHERIT_ROOT_DESCRIPTION.length,
      `DESCRIPTION_BASELINE is ${DESCRIPTION_BASELINE} but only ` +
        `${INHERIT_ROOT_DESCRIPTION.length} pages are affected — lower it.`,
    ).toBeLessThanOrEqual(0);
  });
});
