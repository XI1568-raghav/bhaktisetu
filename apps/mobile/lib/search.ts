/**
 * In-app search — pure query rules, selectors and destinations.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * PAR-22 shipped a home "search bar" that did not search, and justified it in
 * both the screen and its guard with:
 *
 *   "There is no in-app search endpoint to wire it to
 *    (apps/web/app/search is web-only)"
 *
 * The codebase contradicts that. Two PUBLIC routes were already live and
 * unauthenticated:
 *
 *   GET /api/v1/temples/search?q&page&limit          routes/temples.ts:127
 *   GET /api/v1/content/search?q&type&language&page&limit
 *                                                    routes/content.ts:47
 *
 * Both answer with the SAME envelope, and it is deliberately not the envelope
 * the rest of the app reads:
 *
 *   { results, total, query, page, limit }
 *
 * `results` — not `temples`, not `content`. Feeding a search body to the
 * catalogue selector `selectTemples()` (which reads `payload.temples`) returns
 * [] with no error, which on screen is indistinguishable from "nothing
 * matched". That silent-empty class is exactly what PAR-02..PAR-07 all were,
 * so search gets its own selectors, pinned field-for-field to each route's
 * `select:` block rather than to a guess.
 *
 * Rules these selectors keep, same as lib/api-contracts.ts:
 *   1. Read the key the server actually sends.
 *   2. An unrecognised shape yields an EMPTY list — never invented rows.
 *
 * Pure and dependency-free so it runs under the Node test runner without a
 * React Native renderer. The react-query wrappers live in ./search-queries.
 */

// ─── shared helpers (local copies: this module stays dependency-free) ───────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** Rows off the shared search envelope. Anything else is an empty page. */
function resultRows(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload)) return [];
  const rows = payload.results;
  return Array.isArray(rows) ? rows.filter(isRecord) : [];
}

// ─── the query ──────────────────────────────────────────────────────────────

/**
 * Below this many characters we do not call the server at all.
 *
 * Not a performance tweak: both routes answer a blank/short `q` with
 * `{results: [], total: 0}` — a 200, not an error — so firing on the first
 * keystroke paints a confident "No results" over a query the devotee has not
 * finished typing.
 */
export const MIN_QUERY_LENGTH = 2;

/** Trim, and collapse runs of whitespace, so "  shiva   temple " is one query. */
export function normalizeQuery(raw: string): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, ' ');
}

export function canSearch(raw: string): boolean {
  return normalizeQuery(raw).length >= MIN_QUERY_LENGTH;
}

// ─── the view model ─────────────────────────────────────────────────────────

export type SearchResultKind = 'temple' | 'content';

export interface SearchResultVM {
  kind: SearchResultKind;
  id: string;
  /** The routing key. Both web routes are /[slug]; linking by id 404s (PAR-17). */
  slug: string;
  title: string;
  subtitle: string;
  /** Temples only — a live temple opens the in-app darshan player. */
  isLive: boolean;
  /** Content only — a premium row must not be advertised as free playback. */
  isPremium: boolean;
}

// ─── temples ────────────────────────────────────────────────────────────────
//
// apps/api/src/services/temple.service.ts:289 selects exactly:
//   id, name, nameLocal, slug, deityPrimary, tradition, city, state,
//   images, isVerified, liveDarshanEnabled
// (trustScore is deliberately omitted from the public response — PUB-02.)

export function selectTempleSearchResults(payload: unknown): SearchResultVM[] {
  return resultRows(payload)
    .map((t): SearchResultVM | null => {
      const id = str(t.id);
      const slug = str(t.slug);
      const name = str(t.name);
      // No slug means no destination — neither the web page nor the in-app
      // player can be reached — so the row is not worth rendering as tappable.
      if (!id || !slug || !name) return null;
      const deity = str(t.deityPrimary);
      const place = [str(t.city), str(t.state)].filter(Boolean).join(', ');
      return {
        kind: 'temple',
        id,
        slug,
        title: name,
        subtitle: [deity, place].filter(Boolean).join(' · '),
        isLive: t.liveDarshanEnabled === true,
        isPremium: false,
      };
    })
    .filter((r): r is SearchResultVM => r !== null);
}

// ─── content ────────────────────────────────────────────────────────────────
//
// apps/api/src/services/content.service.ts:192 selects exactly:
//   id, type, title, titleLocal, slug, deity, language, durationSeconds,
//   tags, isPremium, viewCount, likeCount, imageUrl, audioUrl, publishedAt

/** "aarti" -> "Aarti". Server enum values are lowercase; headings are not. */
function titleCase(v: string): string {
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export function selectContentSearchResults(payload: unknown): SearchResultVM[] {
  return resultRows(payload)
    .map((c): SearchResultVM | null => {
      const id = str(c.id);
      const slug = str(c.slug);
      const title = str(c.title);
      if (!id || !slug || !title) return null;
      const type = str(c.type);
      const deity = str(c.deity);
      return {
        kind: 'content',
        id,
        slug,
        title,
        subtitle: [type ? titleCase(type) : undefined, deity].filter(Boolean).join(' · '),
        isLive: false,
        isPremium: c.isPremium === true,
      };
    })
    .filter((r): r is SearchResultVM => r !== null);
}

// ─── totals ─────────────────────────────────────────────────────────────────

/**
 * The server's match count, so "showing 20 of 47" is the server's 47.
 * Falls back to the rows actually rendered rather than to a confident 0.
 */
export function selectSearchTotal(payload: unknown, fallbackRows: number): number {
  if (isRecord(payload)) {
    const total = payload.total;
    if (typeof total === 'number' && Number.isFinite(total)) return total;
  }
  return fallbackRows;
}

// ─── destinations ───────────────────────────────────────────────────────────

const WEB_ORIGIN = 'https://darshya.online';

export type SearchDestination =
  | { inApp: true; pathname: string; params: Record<string, string> }
  | { inApp: false; url: string };

/**
 * Where tapping a result goes.
 *
 * DV-01. BOTH temple branches used to rest on a claim that had stopped being
 * true, and the two of them disagreed with the temple LIST about where a
 * temple lives:
 *
 *   · A LIVE temple went straight to the darshan player, "the same rule
 *     (devotee)/temples.tsx already follows". It is not: temples.tsx sends
 *     live cards to the DETAIL screen too, and says why —
 *     "jumping past it meant the player was the only way a streaming temple
 *     could ever be read about. The detail's first action is 'Live darshan',
 *     one tap further on."
 *   · A NON-LIVE temple opened the WEBSITE, because "everything else has no
 *     in-app detail screen yet". `app/(devotee)/temple-detail.tsx` is that
 *     screen: same slug, same params, carrying the temple's pujas, reviews and
 *     donate CTA. Search was ejecting devotees to a browser to reach a screen
 *     the app already had.
 *
 * So every temple result now goes where the temple card goes. Content rows
 * genuinely have no in-app detail screen — `(devotee)/content.tsx` is a list —
 * so those still open the website, and the screen labels them as leaving the
 * app so the hand-off is never a surprise.
 */
export function searchResultDestination(result: SearchResultVM): SearchDestination {
  if (result.kind === 'temple') {
    // Keyed by SLUG, which is what temple-detail queries (`/temples/:slug`) and
    // what `(devotee)/temples.tsx` passes. PAR-17: the id 404s on that route.
    return {
      inApp: true,
      pathname: '/(devotee)/temple-detail',
      params: { slug: result.slug, name: result.title },
    };
  }
  return {
    inApp: false,
    url: `${WEB_ORIGIN}/content/${encodeURIComponent(result.slug)}?utm_source=mobile-app&utm_medium=search`,
  };
}
