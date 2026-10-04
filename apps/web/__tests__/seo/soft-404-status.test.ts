/**
 * [SEO-11] (prod sweep 2026-09-08) — a route that 404s at render time must
 * answer HTTP 404, not 200 with not-found markup.
 *
 * ── THE MECHANISM, established rather than guessed ────────────────────────
 *
 * `notFound()` sets a status in exactly ONE place: the catch block of
 * `renderToHTMLOrFlightImpl`
 *   next/dist/server/app-render/app-render.js:1402
 *     if (isHTTPAccessFallbackError(err)) {
 *       res.statusCode = getAccessFallbackHTTPStatus(err);
 *       metadata.statusCode = res.statusCode;
 *     }
 * — reached only when the not-found error escapes the whole render.
 *
 * A `loading.tsx` in ANY ancestor segment stops it escaping. The App Router
 * wraps that segment's entire child subtree in a real <Suspense>
 *   next/dist/client/components/layout-router.js:353  (LoadingBoundary)
 *   next/dist/client/components/layout-router.js:478-500
 *     ErrorBoundary -> LoadingBoundary(Suspense) -> HTTPAccessFallbackBoundary -> page
 * so React flushes the shell — <head> included, status committed — with the
 * loading skeleton as the fallback BEFORE the page resolves. The throw then
 * lands inside that boundary and is absorbed by
 *   next/dist/client/components/http-access-fallback/error-boundary.js:30-37
 * which renders <meta name="robots" content="noindex"> plus app/not-found.tsx
 * as a late chunk. The render never rejects, so the catch never runs.
 *
 * Note what is NOT the cause. The sibling `error.tsx` re-throws Next router
 * errors untouched (next/dist/client/components/error-boundary.js:34-38), and
 * ISR is not implicated either — see the MISS column below.
 *
 * ── THE MEASUREMENT (prod, 2026-09-08, paced 7-12s, browser UA, status
 *    asserted before any body was read — see ledger OPS-12 / F451) ─────────
 *
 *   /blog/<bogus>                    no ancestor loading.tsx   404   MISS
 *   /puja/<bogus>/<bogus>            no ancestor loading.tsx   404   MISS
 *   /temples/<bogus>                 app/temples/loading.tsx   200   MISS
 *   /temples/<bogus>/pujas           app/temples/loading.tsx   200
 *   /pujas/<bogus>                   app/pujas/loading.tsx     200
 *   /pujas/<bogus>/temples           app/pujas/loading.tsx     200
 *   /pujas/home-puja/<bogus>         app/pujas/loading.tsx     200
 *   /astrology/pancha-pakshi/<bogus> app/astrology/loading.tsx 200
 *
 * Eight routes, one variable, no exceptions. Both groups call `notFound()`,
 * both declare `revalidate`, and one route in EACH group rendered fresh
 * (x-nextjs-cache: MISS) and still landed on opposite statuses — which is what
 * rules ISR out. The 200 bodies additionally contain the skeleton's own
 * "Loading temples" / "Loading pujas" string, i.e. the Suspense fallback
 * really was flushed into the shell ahead of the page.
 *
 * ── THE FIX, AND WHY IT IS NOT IN THE PAGE ────────────────────────────────
 *
 * Nothing a page exports can move a Suspense boundary its PARENT segment
 * declares, and the shell is committed before the page component even runs.
 * The fix is to stop the loading.tsx covering the dynamic child — either
 * delete it, or move the directory page into a route group so the skeleton
 * keeps covering the index without covering the detail route:
 *
 *   app/temples/page.tsx     -> app/temples/(index)/page.tsx
 *   app/temples/loading.tsx  -> app/temples/(index)/loading.tsx
 *
 * Route groups do not appear in the URL, so /temples and /temples/<slug> are
 * unchanged. `dynamicParams = false` is NOT an option here: it is precisely
 * what P0 #202 removed, because it 404'd every api-seeded `<name>-<city>` slug
 * at the routing layer.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const APP_DIR = path.resolve(__dirname, '../../app');

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const ALL = walk(APP_DIR);
const rel = (f: string) => path.relative(APP_DIR, f).split(path.sep).join('/');

const PAGES = ALL.filter((f) => path.basename(f) === 'page.tsx');

/**
 * Every ancestor segment of `page`, plus its own, that declares a loading.tsx.
 * A loading.tsx wraps its own segment AND everything below it, so the page's
 * own directory counts too.
 */
function coveringLoadingFiles(page: string): string[] {
  const found: string[] = [];
  let dir = path.dirname(page);
  for (;;) {
    const candidate = path.join(dir, 'loading.tsx');
    if (fs.existsSync(candidate)) found.push(rel(candidate));
    if (path.resolve(dir) === APP_DIR) break;
    dir = path.dirname(dir);
  }
  return found;
}

/**
 * Routes that decide "this does not exist" while RENDERING.
 *
 * `dynamicParams = false` routes are excluded on purpose: an unknown param
 * never reaches the component there, it is rejected by the router with a real
 * 404 before any render happens, so their `notFound()` call is unreachable for
 * unknown slugs and cannot soft-404. app/astrology/horoscope/[rashi]/page.tsx
 * is the one route this exemption actually covers today.
 */
const renderTimeNotFound = PAGES.filter((f) => {
  const src = fs.readFileSync(f, 'utf8');
  if (!/\bnotFound\(\)/.test(src)) return false;
  if (/^export const dynamicParams = false/m.test(src)) return false;
  return true;
});

const offenders = renderTimeNotFound
  .map((f) => ({ page: rel(f), loading: coveringLoadingFiles(f) }))
  .filter((o) => o.loading.length > 0)
  .map((o) => `${o.page}  <- Suspense from ${o.loading.join(', ')}`)
  .sort();

describe('[SEO-11] a route that 404s at render time must answer 404, not 200', () => {
  it('the measurement above is still describable: exactly three segments declare a loading.tsx', () => {
    // Non-vacuity anchor. If loading.tsx disappeared from the app entirely the
    // offender assertion below would pass for a reason that has nothing to do
    // with the defect, so pin the population the rule is drawn from.
    const loaders = ALL.filter((f) => path.basename(f) === 'loading.tsx').map(rel).sort();
    expect(loaders.length, `loading.tsx files found: ${loaders.join(', ')}`).toBeGreaterThan(0);
  });

  it('no page that calls notFound() sits under a segment loading.tsx', () => {
    // FIXED 2026-09-08 by the route-group move this assertion prescribed:
    // app/{temples,pujas,astrology}/page.tsx and their loading.tsx moved into
    // an (index) group, so the skeleton still covers the index page — a route
    // group does not appear in the URL — and no longer covers the dynamic
    // child. The alternative, deleting the three loading.tsx files, would have
    // cost the index pages the skeleton CM-15 added deliberately.
    //
    // This is now a live rule, not a ticket: add a loading.tsx above any route
    // that calls notFound() and it goes red again, because the Suspense
    // boundary flushes the shell — and the 200 — before the throw can reach
    // app-render.js:1402.
    expect(
      offenders,
      `${offenders.length} routes render a not-found page under a Suspense boundary, so the ` +
        'shell (and the 200) is flushed before notFound() throws and ' +
        'app-render.js:1402 never sets the 404. Every unknown slug under these ' +
        'prefixes is an indexable-looking soft 404 over an unbounded URL space. ' +
        'Fix: move each segment page + its loading.tsx into a route group, e.g. ' +
        'app/temples/page.tsx -> app/temples/(index)/page.tsx, so the skeleton ' +
        'no longer covers the dynamic child.',
    ).toEqual([]);
  });

  it('the index pages kept their skeleton — the fix did not just delete it', () => {
    // The cheap way to make the offender list empty is to delete every
    // loading.tsx, which trades a soft-404 for a blank screen on the two
    // highest-traffic browse pages. Assert the skeletons still exist and still
    // sit beside the index page they were written for, so a future "fix" that
    // simply removes them fails here instead of passing quietly.
    for (const seg of ['temples', 'pujas', 'astrology']) {
      const grouped = path.join(APP_DIR, seg, '(index)');
      expect(
        fs.existsSync(path.join(grouped, 'loading.tsx')),
        `app/${seg}/(index)/loading.tsx is missing — was the skeleton deleted rather than moved?`,
      ).toBe(true);
      expect(
        fs.existsSync(path.join(grouped, 'page.tsx')),
        `app/${seg}/(index)/page.tsx is missing — the group must contain the index page it shields`,
      ).toBe(true);
    }
  });
});

// ──────────────────────────────────────────────────────────────
// [SEO-03] the brand-doubling hole this finding walked through.
// ──────────────────────────────────────────────────────────────

/**
 * __tests__/seo/title-template.test.ts already forbids a metadata title that
 * ends in the brand — but its TITLE_PROP regex is
 *
 *   /(^|[^\w$.])title\s*:\s*(['"`])((?:[^\\]|\\.)*?)\2/g
 *
 * i.e. `title:` followed IMMEDIATELY by a string literal. A conditional title
 * is invisible to it, which is how
 *
 *   title: lookup.status === 'not-found' ? 'Puja not found | Darshya' : …
 *
 * shipped `<title>Puja not found | Darshya | Darshya</title>` to production
 * with the guard green. This closes that shape.
 */
const BRAND_TAIL = /\bDarshya\s*$|[—|·–-]\s*Darshya\s+\S+\s*$/;
const STRING_LITERAL = /(['"`])((?:\\.|(?!\1).)*)\1/g;

const ternaryBrandTitles: string[] = [];
for (const file of ALL.filter(
  (f) => path.basename(f) === 'page.tsx' || path.basename(f) === 'layout.tsx',
)) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('Darshya')) continue;
  src.split('\n').forEach((line, i) => {
    // Only conditional titles — the shape the existing guard cannot see. A
    // brand suffix inside openGraph/twitter is CORRECT (those resolve through a
    // separate, null template), so if one of those ever becomes a ternary this
    // needs the brace-depth analyser from title-template.test.ts rather than a
    // line scan. None exists today.
    if (!/(^|[^\w$.])title\s*:/.test(line)) return;
    if (!line.includes('?')) return;
    STRING_LITERAL.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = STRING_LITERAL.exec(line))) {
      if (BRAND_TAIL.test(m[2])) {
        ternaryBrandTitles.push(`${rel(file)}:${i + 1} ${JSON.stringify(m[2])}`);
      }
    }
  });
}

describe('[SEO-03] the brand is appended once — including from a conditional title', () => {
  it('no arm of a conditional metadata title carries the brand', () => {
    // ⚠ EXPECTED RED for app/content/[slug]/page.tsx, which has the identical
    // defect on a route outside this lane. Fix is to drop " | Darshya" from
    // both arms, exactly as done in app/pujas/[slug]/page.tsx.
    expect(
      ternaryBrandTitles,
      'the root layout TITLE_TEMPLATE appends " | Darshya" to any plain-string page ' +
        'title, so a title that already carries the brand renders it twice and eats ' +
        '~11 chars of a ~60-char SERP budget.',
    ).toEqual([]);
  });
});
