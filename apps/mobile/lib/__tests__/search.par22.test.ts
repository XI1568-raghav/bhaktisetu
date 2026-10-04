import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  MIN_QUERY_LENGTH,
  normalizeQuery,
  canSearch,
  selectTempleSearchResults,
  selectContentSearchResults,
  selectSearchTotal,
  searchResultDestination,
  type SearchResultVM,
} from '../search';

/**
 * PAR-22 (B) — the home control now searches, because the endpoints it was
 * said not to have do exist.
 *
 * The previous pass relabelled the fake search bar as "Browse all pujas" and
 * justified it, in two places, with this claim:
 *
 *   "There is no in-app search endpoint to wire it to
 *    (apps/web/app/search is web-only)"
 *
 * That is false. Two PUBLIC, unauthenticated routes were already live:
 *
 *   GET /api/v1/temples/search?q=&page=&limit=   apps/api/src/routes/temples.ts:127
 *   GET /api/v1/content/search?q=&type=&language=&page=&limit=
 *                                               apps/api/src/routes/content.ts:47
 *
 * Both answer with the SAME envelope — and it is not the envelope the rest of
 * the app reads:
 *
 *   { results, total, query, page, limit }
 *
 * `results`, not `temples` and not `content`. Handing a search body to the
 * existing selectTemples() (which reads `payload.temples`) yields [] with no
 * error — the exact silent-empty failure PAR-02..PAR-07 were all instances of.
 * So search gets its own selectors, pinned here to the field list in the
 * route's own `select:` block rather than to a guess.
 *
 * Guard note: the source assertions below read each file with COMMENTS
 * STRIPPED. Five guards in this sweep matched the prose explaining a rule
 * instead of the code obeying it — including one held green by a comment that
 * described a query the same commit had deleted.
 */

// ─── fixtures: verbatim field lists from the route handlers ─────────────────

/** apps/api/src/services/temple.service.ts:289 `select:` block, verbatim keys. */
const TEMPLE_SEARCH_BODY = {
  results: [
    {
      id: 'tmp_1',
      name: 'Kashi Vishwanath Temple',
      nameLocal: 'काशी विश्वनाथ मंदिर',
      slug: 'kashi-vishwanath',
      deityPrimary: 'Shiva',
      tradition: 'shaiva',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      images: ['https://cdn.example/kv.jpg'],
      isVerified: true,
      liveDarshanEnabled: true,
    },
    {
      id: 'tmp_2',
      name: 'Somnath Temple',
      nameLocal: null,
      slug: 'somnath',
      deityPrimary: 'Shiva',
      tradition: 'shaiva',
      city: 'Veraval',
      state: 'Gujarat',
      images: [],
      isVerified: false,
      liveDarshanEnabled: false,
    },
  ],
  total: 2,
  query: 'shiva',
  page: 1,
  limit: 20,
};

/** apps/api/src/services/content.service.ts:192 `select:` block, verbatim keys. */
const CONTENT_SEARCH_BODY = {
  results: [
    {
      id: 'cnt_1',
      type: 'aarti',
      title: 'Om Jai Jagdish Hare',
      titleLocal: 'ॐ जय जगदीश हरे',
      slug: 'om-jai-jagdish-hare',
      deity: 'Vishnu',
      language: 'hi',
      durationSeconds: 342,
      tags: ['aarti', 'vishnu'],
      isPremium: false,
      viewCount: 9120,
      likeCount: 310,
      imageUrl: 'https://cdn.example/aarti.jpg',
      audioUrl: 'https://cdn.example/aarti.mp3',
      publishedAt: '2026-01-04T00:00:00.000Z',
    },
  ],
  total: 1,
  query: 'aarti',
  page: 1,
  limit: 20,
};

/** Both routes answer this for a blank q — an empty page, not an error. */
const EMPTY_BODY = { results: [], total: 0, query: '', page: 1, limit: 20 };

/** What the route sends on failure (both files: reply.status(500).send). */
const ERROR_BODY = { error: 'Failed to search temples' };

// ─── the query itself ───────────────────────────────────────────────────────

describe('PAR-22 search — query normalisation', () => {
  it('trims and collapses whitespace so "  shiva   temple " is one query', () => {
    expect(normalizeQuery('  shiva   temple ')).toBe('shiva temple');
  });

  it('normalises a non-string to the empty query rather than "undefined"', () => {
    expect(normalizeQuery(undefined as unknown as string)).toBe('');
    expect(normalizeQuery(null as unknown as string)).toBe('');
  });

  it('refuses to fire a request below the minimum length', () => {
    // The server answers a blank q with an empty page, so firing anyway would
    // paint "No results" over a query the user has not finished typing.
    expect(canSearch('')).toBe(false);
    expect(canSearch('   ')).toBe(false);
    expect(canSearch('a')).toBe(false);
    expect(MIN_QUERY_LENGTH).toBeGreaterThanOrEqual(2);
  });

  it('fires once the query is long enough, counting trimmed characters', () => {
    expect(canSearch('om')).toBe(true);
    expect(canSearch('  om  ')).toBe(true);
  });
});

// ─── temple results ─────────────────────────────────────────────────────────

describe('PAR-22 search — selectTempleSearchResults', () => {
  it('reads `results`, which is NOT the `temples` key the catalogue selector reads', () => {
    const rows = selectTempleSearchResults(TEMPLE_SEARCH_BODY);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.title).toBe('Kashi Vishwanath Temple');
    // The trap this whole selector exists for: the search envelope under the
    // catalogue key is empty, and empty is indistinguishable from "no match".
    expect(selectTempleSearchResults({ temples: TEMPLE_SEARCH_BODY.results })).toEqual([]);
  });

  it('maps every row to a tappable result carrying its slug and kind', () => {
    const [first, second] = selectTempleSearchResults(TEMPLE_SEARCH_BODY);
    expect(first).toMatchObject({
      kind: 'temple',
      id: 'tmp_1',
      slug: 'kashi-vishwanath',
      title: 'Kashi Vishwanath Temple',
      isLive: true,
    });
    expect(first?.subtitle).toContain('Varanasi');
    expect(second?.isLive).toBe(false);
  });

  it('drops a row with no slug instead of rendering a dead link', () => {
    // The web route is /temples/[slug] and the in-app darshan player keys on
    // slug too, so a slugless row has nowhere to go.
    const rows = selectTempleSearchResults({
      results: [{ ...TEMPLE_SEARCH_BODY.results[0], slug: null }],
    });
    expect(rows).toEqual([]);
  });

  it('returns [] — never invented rows — for an error body or an unknown shape', () => {
    expect(selectTempleSearchResults(ERROR_BODY)).toEqual([]);
    expect(selectTempleSearchResults(EMPTY_BODY)).toEqual([]);
    expect(selectTempleSearchResults(null)).toEqual([]);
    expect(selectTempleSearchResults(undefined)).toEqual([]);
    expect(selectTempleSearchResults('kashi')).toEqual([]);
    expect(selectTempleSearchResults({ results: 'kashi' })).toEqual([]);
  });
});

// ─── content results ────────────────────────────────────────────────────────

describe('PAR-22 search — selectContentSearchResults', () => {
  it('maps a content row to a result carrying its type and deity', () => {
    const [row] = selectContentSearchResults(CONTENT_SEARCH_BODY);
    expect(row).toMatchObject({
      kind: 'content',
      id: 'cnt_1',
      slug: 'om-jai-jagdish-hare',
      title: 'Om Jai Jagdish Hare',
    });
    expect(row?.subtitle?.toLowerCase()).toContain('aarti');
    expect(row?.subtitle).toContain('Vishnu');
  });

  it('marks premium rows so the app does not promise free playback', () => {
    const [free] = selectContentSearchResults(CONTENT_SEARCH_BODY);
    expect(free?.isPremium).toBe(false);
    const [paid] = selectContentSearchResults({
      results: [{ ...CONTENT_SEARCH_BODY.results[0], isPremium: true }],
    });
    expect(paid?.isPremium).toBe(true);
  });

  it('returns [] for an error body, an empty page or an unknown shape', () => {
    expect(selectContentSearchResults(ERROR_BODY)).toEqual([]);
    expect(selectContentSearchResults(EMPTY_BODY)).toEqual([]);
    expect(selectContentSearchResults(null)).toEqual([]);
    expect(selectContentSearchResults({ content: CONTENT_SEARCH_BODY.results })).toEqual([]);
  });
});

// ─── totals ─────────────────────────────────────────────────────────────────

describe('PAR-22 search — selectSearchTotal', () => {
  it('reads the server total so "2 of 47" is the server’s number', () => {
    expect(selectSearchTotal(TEMPLE_SEARCH_BODY, 2)).toBe(2);
    expect(selectSearchTotal({ ...TEMPLE_SEARCH_BODY, total: 47 }, 2)).toBe(47);
  });

  it('falls back to the rows actually rendered when total is absent', () => {
    expect(selectSearchTotal(ERROR_BODY, 0)).toBe(0);
    expect(selectSearchTotal({ results: [] }, 3)).toBe(3);
  });
});

// ─── where a result goes ────────────────────────────────────────────────────

describe('PAR-22 search — searchResultDestination', () => {
  const liveTemple: SearchResultVM = {
    kind: 'temple',
    id: 'tmp_1',
    slug: 'kashi-vishwanath',
    title: 'Kashi Vishwanath Temple',
    subtitle: 'Shiva · Varanasi, Uttar Pradesh',
    isLive: true,
    isPremium: false,
  };

  /**
   * Narrowing helpers. SearchDestination is a discriminated union, so reading
   * `.url` off the unnarrowed value is a type error — and asserting through
   * `as any` would hide a genuine wrong-branch result. These throw instead, so
   * a destination on the wrong branch fails the test rather than the compiler.
   */
  function inApp(d: ReturnType<typeof searchResultDestination>) {
    if (!d.inApp) throw new Error(`expected an in-app destination, got ${d.url}`);
    return d;
  }
  function onWeb(d: ReturnType<typeof searchResultDestination>) {
    if (d.inApp) throw new Error(`expected a web destination, got ${d.pathname}`);
    return d;
  }

  it('sends a LIVE temple where the temple card sends it — the detail screen', () => {
    // DV-01. This used to jump straight to the darshan player, under a comment
    // claiming it was "the same rule (devotee)/temples.tsx already follows".
    // temples.tsx sends live cards to the DETAIL screen and states the reason:
    // the player was otherwise the only way a streaming temple could be read
    // about, and the detail's first action is "Live darshan" anyway.
    const dest = inApp(searchResultDestination(liveTemple));
    expect(dest.pathname).toBe('/(devotee)/temple-detail');
    expect(dest.params).toMatchObject({ slug: 'kashi-vishwanath' });
  });

  it('keeps a NON-live temple in the app too, on the same screen', () => {
    // DV-01. This opened the WEBSITE because "everything else has no in-app
    // detail screen yet". app/(devotee)/temple-detail.tsx is that screen.
    const dest = inApp(searchResultDestination({ ...liveTemple, isLive: false }));
    expect(dest.pathname).toBe('/(devotee)/temple-detail');
    // PAR-17: keyed by SLUG. temple-detail queries /temples/:slug; the id 404s.
    expect(dest.params).toMatchObject({ slug: 'kashi-vishwanath' });
    expect(JSON.stringify(dest.params)).not.toContain('tmp_1');
  });

  it('sends a content row to /content/[slug] on the website', () => {
    const dest = onWeb(
      searchResultDestination({
        kind: 'content',
        id: 'cnt_1',
        slug: 'om-jai-jagdish-hare',
        title: 'Om Jai Jagdish Hare',
        subtitle: 'Aarti · Vishnu',
        isLive: false,
        isPremium: false,
      }),
    );
    expect(dest.url).toContain('/content/om-jai-jagdish-hare');
  });

  it('percent-encodes a slug rather than pasting it into a URL raw', () => {
    const dest = onWeb(
      searchResultDestination({
        kind: 'content',
        id: 'c',
        slug: 'a b/c',
        title: 't',
        subtitle: '',
        isLive: false,
        isPremium: false,
      }),
    );
    expect(dest.url).toContain(encodeURIComponent('a b/c'));
  });
});

// ─── the wiring, as source text (comments stripped) ─────────────────────────

const ROOT = path.resolve(__dirname, '../..');
const SEARCH_SCREEN = path.join(ROOT, 'app/(devotee)/search.tsx');
const HOME_SCREEN = path.join(ROOT, 'app/(devotee)/index.tsx');
const LAYOUT = path.join(ROOT, 'app/(devotee)/_layout.tsx');
/** Where the requests are actually issued — guard the caller, not the screen. */
const QUERIES = path.join(ROOT, 'lib/search-queries.ts');

/** Source with block and line comments removed — a guard must match code. */
function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('PAR-22 search — the screen exists and calls the real routes', () => {
  it('ships a devotee search screen', () => {
    expect(existsSync(SEARCH_SCREEN)).toBe(true);
  });

  it('queries BOTH public search endpoints, by path', () => {
    // Guard the module that issues the request, not the screen that renders
    // it — otherwise the comment naming the routes satisfies the assertion
    // while nothing calls them.
    const src = code(QUERIES);
    expect(src).toMatch(/\/api\/v1\/temples\/search/);
    expect(src).toMatch(/\/api\/v1\/content\/search/);
  });

  it('sends the typed query as the `q` parameter the routes read', () => {
    expect(code(QUERIES)).toMatch(/q=\$\{encodeURIComponent/);
  });

  it('does not fire below the minimum query length', () => {
    // Both routes answer a short q with an empty 200; querying anyway paints
    // "No results" over a half-typed word.
    expect(code(QUERIES)).toMatch(/enabled:\s*canSearch/);
  });

  it('is wired into the screen — the screen imports the query hooks', () => {
    const src = code(SEARCH_SCREEN);
    expect(src).toMatch(/from ['"]\.\.\/\.\.\/lib\/search-queries['"]/);
    expect(src).toMatch(/useTempleSearch/);
    expect(src).toMatch(/useContentSearch/);
  });

  it('reports a failed search as a failure, not as an empty catalogue', () => {
    // The PAR-02..07 failure mode was a broken read rendering as "we have
    // nothing". An error branch must exist and must not be the empty state.
    const src = code(SEARCH_SCREEN);
    expect(src).toMatch(/isError/);
  });

  it('renders a text input, not another link dressed as a search box', () => {
    const src = code(SEARCH_SCREEN);
    expect(src).toMatch(/TextInput/);
  });
});

describe('PAR-22 search — the home control leads to it', () => {
  it('routes the home search bar to the search screen', () => {
    expect(code(HOME_SCREEN)).toMatch(/\/\(devotee\)\/search/);
  });

  it('no longer claims the app has no search endpoint to wire to', () => {
    // This claim lived in the SOURCE COMMENT, so it is the one assertion here
    // that must read the RAW file. It is false — see the header of this file.
    //
    // The whitespace class is load-bearing: the original sentence was wrapped
    // across two comment lines ("There is no\n * in-app search endpoint"), so
    // a literal-space regex silently matched nothing and the guard passed
    // against the very file it was meant to catch.
    const raw = readFileSync(HOME_SCREEN, 'utf8');
    expect(raw).not.toMatch(/no\s+in-app\s+search\s+endpoint/i);
  });

  it('announces the control as a search field rather than as a link', () => {
    const src = code(HOME_SCREEN);
    expect(src).toMatch(/accessibilityRole=["']search["']/);
  });
});

describe('PAR-22 search — the route is registered, so it is not a stray tab', () => {
  it('declares <Tabs.Screen name="search"> with href null', () => {
    // expo-router builds the tab bar from the filesystem: an undeclared route
    // file becomes a visible tab labelled "search". Same defect PAR-15 hit.
    const src = code(LAYOUT);
    expect(src).toMatch(/name=["']search["']/);
  });
});
