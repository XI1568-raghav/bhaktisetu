import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * PAR-22 — the home search control must not promise a search it cannot do.
 *
 * HISTORY, because this control has now been wrong in two opposite ways and
 * the guard was wrong along with it.
 *
 * Round 1 (the defect). The home screen rendered a magnifying glass over the
 * placeholder "Search pujas, temples, content…" whose onPress was
 * `router.push('/(devotee)/pujas')`. It did not search. A devotee tapped it
 * expecting a query field and silently landed on the Pujas tab.
 *
 * Round 2 (the over-correction, and what this file used to pin). The fix
 * relabelled the control "Browse all pujas", swapped the magnifying glass for
 * a flame, and recorded the reason as: the app has nothing to query, since
 * apps/web/app/search is web-only. This file then froze that shape in place
 * by asserting the search icon was ABSENT and the role was `link`.
 *
 * The reason was false. Two PUBLIC, unauthenticated routes were already live:
 *
 *   GET /api/v1/temples/search   apps/api/src/routes/temples.ts:127
 *   GET /api/v1/content/search   apps/api/src/routes/content.ts:47
 *
 * So the guard was pinning an unnecessary amputation: it would have FAILED a
 * correct implementation of real search purely for drawing a magnifying glass.
 *
 * Round 3 (this file). The assertion below is the invariant rather than either
 * remedy: a control that PRESENTS as search must LEAD to something that
 * actually queries the search endpoints. Under that rule both the round-1
 * defect and a hypothetical regression to it fail, while real search passes —
 * icon and all. Behavioural coverage of the search itself is in
 * ./search.par22.test.ts; this file only checks the promise/‑delivery link.
 *
 * Guard note: assertions read the file with COMMENTS STRIPPED, except the one
 * that is explicitly about a claim made in a comment. Five source guards in
 * this sweep matched the prose describing a rule instead of the code obeying
 * it, so the stripping is not decoration.
 */

const ROOT = path.resolve(__dirname, '../..');
const SCREEN = path.join(ROOT, 'app/(devotee)/index.tsx');
const SEARCH_SCREEN = path.join(ROOT, 'app/(devotee)/search.tsx');
const SEARCH_QUERIES = path.join(ROOT, 'lib/search-queries.ts');

/** Source with block and line comments removed — a guard must match code. */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * The JSX of the control itself, so "does it look like search" and "where does
 * it go" are read off the SAME element. Reading them off the whole file would
 * let an unrelated search icon elsewhere satisfy the first half.
 */
function homeSearchControl(): string {
  const src = code(SCREEN);
  const start = src.indexOf('styles.searchBar');
  expect(start, 'the home screen still renders a styles.searchBar control').toBeGreaterThan(-1);
  const end = src.indexOf('</TouchableOpacity>', start);
  expect(end, 'the control is a closed TouchableOpacity').toBeGreaterThan(start);
  return src.slice(start, end);
}

/**
 * Does the control present itself to the USER as a search field?
 *
 * The `styles.searchBar` / `styles.searchPlaceholder` references are stripped
 * first, on purpose. Leaving them in makes this predicate trivially true for
 * any element anchored by that style name — which would quietly convert every
 * conditional assertion below into an unconditional one and misrepresent what
 * this file checks. Only what a user or a screen reader can perceive counts:
 * a search icon, the search a11y role, or the word in visible copy.
 */
function presentsAsSearch(control: string): boolean {
  const visible = control.replace(/styles\.[A-Za-z0-9_]+/g, '');
  return (
    /name=["']search[-a-z]*["']/.test(visible) ||
    /accessibilityRole=["']search["']/.test(visible) ||
    /[Ss]earch/.test(visible)
  );
}

describe('PAR-22 — a control that looks like search must lead to search', () => {
  it('renders a home control that presents itself as search', () => {
    // Not a requirement that it exist as search forever — but it does today,
    // which is what makes the assertions below binding.
    expect(presentsAsSearch(homeSearchControl())).toBe(true);
  });

  it('does NOT send a search-looking control straight to the pujas tab', () => {
    // This is the round-1 defect, stated exactly: search promise, tab push.
    const control = homeSearchControl();
    if (!presentsAsSearch(control)) return;
    expect(control).not.toMatch(/router\.push\(\s*['"]\/\(devotee\)\/pujas/);
  });

  it('sends it to the search screen instead', () => {
    const control = homeSearchControl();
    if (!presentsAsSearch(control)) return;
    expect(control).toMatch(/\/\(devotee\)\/search/);
  });

  it('and that screen exists', () => {
    expect(existsSync(SEARCH_SCREEN)).toBe(true);
  });

  it('and something behind it really calls the search routes', () => {
    // The whole point: the promise is only honest if it is delivered. Comments
    // are stripped, so naming the routes in prose does not satisfy this.
    const src = code(SEARCH_QUERIES);
    expect(src).toMatch(/\/api\/v1\/temples\/search/);
    expect(src).toMatch(/\/api\/v1\/content\/search/);
  });

  it('never re-introduces the original three-way placeholder', () => {
    // "Search pujas, temples, content" named three things and searched none.
    // Pujas still have no /search route, so that wording stays banned.
    expect(code(SCREEN)).not.toMatch(/Search pujas, temples, content/);
  });

  it('does not still claim in a comment that no search endpoint exists', () => {
    // Reads the RAW file: this claim only ever lived in a comment. The
    // whitespace class is load-bearing — the original sentence wrapped across
    // two comment lines, so a literal-space regex matched nothing at all.
    expect(readFileSync(SCREEN, 'utf8')).not.toMatch(/no\s+in-app\s+search\s+endpoint/i);
  });

  it('announces the control to assistive tech', () => {
    const control = homeSearchControl();
    expect(control).toMatch(/accessibilityRole=/);
    expect(control).toMatch(/accessibilityLabel=/);
  });
});
