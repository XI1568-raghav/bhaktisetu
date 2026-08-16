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
 * TWO EXCLUSIONS, BOTH DELIBERATE:
 *  - A route robots.txt already disallows cannot show up in a SERP at all, so a
 *    shared title costs nothing there. That is most of /admin and the portals.
 *  - A page under a segment layout that DOES declare metadata (app/auth/* under
 *    app/auth/layout.tsx, for instance) inherits a real title, not the root
 *    default. The finding is specifically about falling through to the ROOT.
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

const declares = (file: string) =>
  fs.existsSync(file) && DECLARES_METADATA.test(stripComments(fs.readFileSync(file, 'utf8')));

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

const PAGES = collect(APP_DIR, 'page.tsx');

/** Indexable pages that fall all the way through to the root defaults. */
const INHERIT_ROOT_DEFAULTS = PAGES.filter(
  (f) => !declares(f) && !coveredByAncestorLayout(f) && !robotsBlocks(routeOf(f)),
)
  .map((f) => path.relative(APP_DIR, f).split(path.sep).join('/'))
  .sort();

/**
 * Today's count. LOWER THIS as pages gain their own metadata; never raise it.
 * Measured from comment-free source, so a comment mentioning `export const
 * metadata` cannot mark a page as covered.
 */
const BASELINE = 65;

describe('[SEO-09] indexable pages do not fall through to the root title', () => {
  it('the guard is actually measuring something', () => {
    // A parsing regression that made every page look "covered" would turn the
    // ratchet below into a test that can never fail.
    expect(PAGES.length).toBeGreaterThan(300);
    expect(INHERIT_ROOT_DEFAULTS.length).toBeGreaterThan(0);
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
});
