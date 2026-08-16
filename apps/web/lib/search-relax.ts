/**
 * CM-12 — query relaxation for the catalogue half of site search.
 *
 * `GET /api/v1/search` matches with one whole-string `contains` per column
 * (apps/api/src/routes/search.ts:26-72):
 *
 *   { name: { contains: trimmed, mode: 'insensitive' } }
 *
 * `trimmed` is the raw query, never split. The endpoint can therefore only
 * answer a query that is a literal substring of a single column, which means
 * every ordinary phrasing of a booking intent returns nothing:
 *
 *   "rudrabhishek puja"   no column contains that exact string
 *   "shiva abhishek"      "Rudrabhishek" is not a superstring of it
 *   "rudrabhishekam"      the fuller Sanskrit form is longer than the row
 *   "satyanarayan katha ki booking"
 *
 * Meanwhile the article index inside app/search/SearchClient.tsx tokenises and
 * ANDs, so the two halves of one page disagree about what "matches" means — and
 * the strict half is the only one that can take money.
 *
 * Widening the SQL is the right long-term fix and is an apps/api change. This
 * module is the client-side recovery the finding asks for: derive a short,
 * ordered list of narrower queries to retry once the exact one has come back
 * empty. The caller retries them in order, stops at the first that returns
 * anything, and must tell the user which term produced the results — a relaxed
 * search that presents itself as an exact one is worse than a dead end.
 */

/**
 * Words that carry booking intent but no catalogue signal. Stripping them turns
 * "rudrabhishek puja" into a query the endpoint can actually answer.
 *
 * Deliberately narrow. Devotional nouns that name real rows — `path`, `katha`,
 * `aarti`, `chalisa`, `temple`, `mandir`, `homa` — are NOT here: they are the
 * best search term in the query, not filler.
 */
const FILLER = new Set([
  'puja',
  'pooja',
  'pujas',
  'poojas',
  'pujan',
  'poojan',
  'book',
  'booking',
  'online',
  'near',
  'me',
  'my',
  'the',
  'a',
  'an',
  'of',
  'for',
  'in',
  'at',
  'and',
  'with',
  'to',
  'ka',
  'ki',
  'ke',
  'liye',
  'karna',
  'karana',
  'kaise',
  'price',
  'cost',
  'best',
]);

/**
 * Inflectional tails. Sanskrit and Hindi transliterations reach the box in
 * forms the seed rows do not carry — "Rudrabhishekam" for `Rudrabhishek`,
 * "Satyanarayana" for `Satyanarayan` — and `contains` is substring-of-column,
 * so a query longer than the row can never match it.
 *
 * A one-letter tail is far more likely to be part of the word than an ending
 * ("shiva" is not "shiv" plus a suffix), so it has to leave a longer stem
 * behind before it is worth issuing.
 */
const TAILS: ReadonlyArray<readonly [tail: string, minStem: number]> = [
  ['ams', 4],
  ['am', 4],
  ['as', 4],
  ['ah', 4],
  ['aa', 4],
  ['ji', 4],
  ['a', 6],
  ['s', 6],
  ['m', 6],
];

/** Shortest candidate worth issuing. Below this a `contains` matches noise. */
const MIN_TERM = 3;

/** Below this the API itself refuses (routes/search.ts:13) — nothing to relax. */
const MIN_QUERY = 2;

/** How many retries a zero-result search is allowed to cost. */
const MAX_CANDIDATES = 4;

function normalise(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Every stem reachable by stripping one inflectional tail, shortest first.
 *
 * Shortest first because `contains` asks whether the COLUMN contains the query:
 * "rudrabhishek" finds the row `Rudrabhishek`, "rudrabhisheka" cannot. More of
 * the word left on is more precise but less likely to match anything at all,
 * and this list is only ever consulted after an exact search found nothing.
 */
function stems(token: string): string[] {
  const out: string[] = [];
  for (const [tail, minStem] of TAILS) {
    if (!token.endsWith(tail)) continue;
    const stripped = token.slice(0, -tail.length);
    if (stripped.length >= minStem && !out.includes(stripped)) out.push(stripped);
  }
  return out.sort((a, b) => a.length - b.length);
}

/**
 * Narrower queries to retry, best first, for a query that returned nothing.
 *
 * Returns `[]` when there is nothing honest to try — a single bare word with no
 * strippable tail is already the narrowest form of itself, and broadening it
 * would be inventing an intent the devotee did not express.
 */
export function buildRelaxedQueries(raw: string): string[] {
  const query = normalise(raw);
  if (query.length < MIN_QUERY) return [];

  const tokens = query.split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= MIN_TERM);
  if (tokens.length === 0) return [];

  // Keep the words that name something. If the query is nothing but filler,
  // fall back to the filler itself: "puja" is a real catalogue term and
  // relaxing must never hand the caller an empty search.
  const content = tokens.filter((t) => !FILLER.has(t));
  const significant = content.length > 0 ? content : tokens;

  // Longest first: the most distinctive word is the one most likely to be a
  // substring of a row name.
  const ordered = [...new Set(significant)].sort((a, b) => b.length - a.length);

  const candidates: string[] = [];
  const push = (value: string) => {
    if (value.length < MIN_TERM) return;
    if (value === query) return; // never re-issue what already returned nothing
    if (candidates.includes(value)) return;
    candidates.push(value);
  };

  for (const token of ordered) push(token);
  for (const token of ordered) {
    for (const stemmed of stems(token)) push(stemmed);
  }

  // Last resort for a long word whose tail is a misspelling rather than an
  // inflection ("rudrabhishekaam"). A six-character head is specific enough to
  // be a real prefix and short enough to survive a garbled ending.
  for (const token of ordered) {
    if (token.length >= 9) push(token.slice(0, 6));
  }

  return candidates.slice(0, MAX_CANDIDATES);
}
