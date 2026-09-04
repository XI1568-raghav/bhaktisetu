// One tirtha, one URL.
//
// CI-07 (delta audit 2026-08-20): /tirth shipped twelve temples twice, each
// pair at two slugs, each URL declaring ITSELF canonical. Two of the pairs did
// not even differ by name — `kalighat-kolkata` and `kalighat-kali-temple` are
// both "Kalighat Kali Temple", `lingaraj-bhubaneswar` and
// `lingaraj-temple-bhubaneswar` are both "Lingaraj Temple Bhubaneswar" — so a
// reader scrolling the index saw the same temple twice with different darshan
// timings behind each card.
//
// This mirrors lib/temple-slug.ts, which does the same job for /temples. It is
// deliberately a hand-checked table and not a fuzzy matcher: a wrong entry
// permanently redirects one real temple onto a different one.

import { TIRTHAS } from './tirthas';

/**
 * Retired slug -> surviving slug. Every pair below was confirmed to be the
 * same shrine by comparing `name`, `state` and `presiding` on the two records:
 *
 *   somnath-jyotirlinga                "Somnath Jyotirlinga Mandir", Gujarat
 *     -> somnath                       "Somnath", Gujarat
 *   amarnath-cave                      "Amarnath Cave Shrine"
 *     -> amarnath                      "Amarnath Cave"
 *   rameswaram-jyotirlinga             "Rameswaram Ramanathaswamy Temple"
 *     -> rameswaram                    "Rameswaram"
 *   badrinath-temple                   "Badrinath Temple"
 *     -> badrinath                     "Badrinath"
 *   kedarnath-jyotirlinga              "Kedarnath Jyotirlinga"
 *     -> kedarnath                     "Kedarnath"
 *   dwarka-jagat-mandir                "Dwarka Jagat Mandir" (= the Dwarkadhish
 *     -> dwarka                         temple), "Dwarkadhish Dwarka"
 *   meenakshi-amman-madurai            "Meenakshi Amman Temple Madurai"
 *     -> madurai-meenakshi             "Meenakshi Amman Temple, Madurai"
 *   lingaraj-temple-bhubaneswar        "Lingaraj Temple Bhubaneswar"
 *     -> lingaraj-bhubaneswar          "Lingaraj Temple Bhubaneswar"
 *   kalighat-kali-temple               "Kalighat Kali Temple"
 *     -> kalighat-kolkata              "Kalighat Kali Temple"
 *   trimbakeshwar-jyotirlinga          "Trimbakeshwar Jyotirlinga"
 *     -> trimbakeshwar                 "Trimbakeshwar Jyotirlinga"
 *   mallikarjuna-jyotirlinga-srisailam "Mallikarjuna Jyotirlinga Srisailam"
 *     -> srisailam-mallikarjuna        "Srisailam Mallikarjuna"
 *   ramnathaswamy-kanchipuram          "Ekambareshwarar Kanchipuram" — the slug
 *     -> kanchipuram-ekambareswarar     names the wrong deity; the record is the
 *                                       Ekambareswarar temple
 *
 * The survivor is in every case the shorter, plain-place slug, which is the
 * form the rest of the site already links to (pilgrimage circuits, the temple
 * catalogue and the sitemap all use it).
 */
export const TIRTHA_ALIASES: Readonly<Record<string, string>> = {
  'somnath-jyotirlinga': 'somnath',
  'amarnath-cave': 'amarnath',
  'rameswaram-jyotirlinga': 'rameswaram',
  'badrinath-temple': 'badrinath',
  'kedarnath-jyotirlinga': 'kedarnath',
  'dwarka-jagat-mandir': 'dwarka',
  'meenakshi-amman-madurai': 'madurai-meenakshi',
  'lingaraj-temple-bhubaneswar': 'lingaraj-bhubaneswar',
  'kalighat-kali-temple': 'kalighat-kolkata',
  'trimbakeshwar-jyotirlinga': 'trimbakeshwar',
  'mallikarjuna-jyotirlinga-srisailam': 'srisailam-mallikarjuna',
  'ramnathaswamy-kanchipuram': 'kanchipuram-ekambareswarar',
};

/** The URL a tirtha slug should be served at. Unknown slugs pass through. */
export function canonicalTirthaSlug(slug: string): string {
  return TIRTHA_ALIASES[slug] ?? slug;
}

/**
 * One record per temple, in first-seen order.
 *
 * The CANONICAL record wins when both members of a pair are present, so the
 * card always links to a URL that serves a page rather than one that redirects.
 */
export function dedupeTirthas<T extends { slug: string }>(rows: readonly T[]): T[] {
  const order: string[] = [];
  const chosen = new Map<string, T>();

  for (const row of rows) {
    const key = canonicalTirthaSlug(row.slug);
    const existing = chosen.get(key);
    if (!existing) {
      order.push(key);
      chosen.set(key, row);
      continue;
    }
    // Prefer the record that already lives at the canonical URL.
    if (existing.slug !== key && row.slug === key) chosen.set(key, row);
  }

  return order.map((k) => chosen.get(k)!);
}

let publishedTirthas: ReadonlyMap<string, string> | undefined;

/**
 * slug -> display name for every tirtha that has a page of its own.
 *
 * Built from the DEDUPED catalogue: an alias slug serves a redirect, so it must
 * never become the target of a link this module generates.
 *
 * Computed on first use, not at module scope: lib/tirthas.ts imports
 * `dedupeTirthas` from here for `tirthaSlugs()`, and reading TIRTHAS eagerly
 * across that cycle would hit the temporal dead zone depending on which module
 * the bundler evaluates first.
 */
function publishedTirthaNames(): ReadonlyMap<string, string> {
  publishedTirthas ??= new Map(dedupeTirthas(TIRTHAS).map((t) => [t.slug, t.name]));
  return publishedTirthas;
}

/** A `nearbyTirthas` entry, ready to render. */
export interface NearbyTirtha {
  /** Human-readable text. Never a raw slug. */
  label: string;
  /** Set only when the site actually publishes a page for it. */
  href?: string;
}

const RAW_SLUG = /^[a-z0-9]+(-[a-z0-9]+)+$/;

/** "thillai-kali-temple" -> "Thillai Kali Temple". */
function deslugify(slug: string): string {
  return slug
    .split('-')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** "Lingaraj Bhubaneswar (60 km)" -> "lingaraj-bhubaneswar". */
function slugifyLabel(label: string): string {
  return label
    .replace(/\([^)]*\)/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * CI-13 — `nearbyTirthas` is a mixed bag. The first half of the catalogue
 * stores display names ("Konark Sun Temple (35 km)"); the second half stores
 * slugs ("mukteshwar-temple"). The detail page printed the array verbatim, so
 * 37 of the 84 pages showed bullets of raw hyphenated slugs, and not one of
 * the 392 entries linked anywhere — including the many that name a tirtha this
 * site publishes a full guide for.
 *
 * A slug is only linked when a record for it exists, so the block can never
 * manufacture a link into a 404. Aliases are resolved first, so a neighbour
 * stored as `kedarnath-jyotirlinga` links straight to `/tirth/kedarnath`
 * instead of bouncing through a redirect.
 *
 * @param entries raw `Tirtha['nearbyTirthas']`
 * @param known slugs that have a page; defaults to the whole catalogue
 */
export function resolveNearbyTirthas(
  entries: readonly string[],
  known?: ReadonlyMap<string, string>,
): NearbyTirtha[] {
  const lookup = known ?? publishedTirthaNames();
  return entries.map((entry) => {
    const raw = RAW_SLUG.test(entry);
    const candidate = canonicalTirthaSlug(raw ? entry : slugifyLabel(entry));
    const match = lookup.get(candidate);
    if (match) {
      // Keep the author's own wording when they wrote prose — it often carries
      // a distance ("60 km") the record itself does not have.
      return { label: raw ? match : entry, href: `/tirth/${candidate}` };
    }
    return { label: raw ? deslugify(entry) : entry };
  });
}
