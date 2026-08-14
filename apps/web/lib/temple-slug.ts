// One temple, one URL.
//
// SEO-06 (prod sweep 2026-08-12): /temples/kashi-vishwanath and
// /temples/kashi-vishwanath-varanasi both returned 200, both rendered the same
// temple, and each declared ITSELF canonical — while the PlaceOfWorship JSON-LD
// on the long-slug page pointed at the short one, contradicting that page's own
// canonical link. Link equity for the highest-intent surface on the site
// ("kashi vishwanath puja booking") split across two URLs, and Google was free
// to pick the one the sitemap never advertised.
//
// The normaliser existed — twice. app/temples/[slug]/page.tsx had one keyed off
// TEMPLE_DETAILS; app/sitemap.ts had a second, independent one keyed off a
// hardcoded slug array. Neither redirected, and they could disagree. This is now
// the single implementation, imported by the route (which 308s an alias), by
// generateMetadata (which builds the canonical) and by the sitemap (which
// advertises it), so all three cannot drift apart again.

import { getTempleDetail } from './temple-details';

/**
 * Same temple, different name — cases the `<name>-<city>` suffix rule cannot
 * reach because the two slugs share no prefix. Each pair was confirmed against
 * the temples table (name + city) and the curated entry before being added:
 *
 *   tirumala-tirupati          "Tirumala Tirupati Devasthanam", Tirupati
 *     → tirupati-balaji        "Tirumala Tirupati Venkateswara Temple", Tirumala
 *   meenakshi-madurai          "Meenakshi Amman Temple", Madurai
 *     → meenakshi-temple       "Arulmigu Meenakshi Sundareswarar Temple", Madurai
 *   ramanathaswamy-rameshwaram "Ramanathaswamy Temple", Rameshwaram
 *     → rameshwaram            "Ramanathaswamy Temple, Rameshwaram"
 *   rameswaram                 a SECOND curated entry for that same temple
 *     → rameshwaram            (three URLs for one temple before this)
 *
 * Only add a pair here when the two records are demonstrably the same temple.
 * A wrong entry 308s a real temple onto a different one.
 */
export const TEMPLE_SLUG_ALIASES: Readonly<Record<string, string>> = {
  'tirumala-tirupati': 'tirupati-balaji',
  'meenakshi-madurai': 'meenakshi-temple',
  'ramanathaswamy-rameshwaram': 'rameshwaram',
  rameswaram: 'rameshwaram',
};

const slugifyPlace = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/**
 * Does the stripped suffix actually name the curated entry's place?
 *
 * Without this check the suffix rule is a blind prefix match, and a blind prefix
 * match merges DIFFERENT temples that happen to share a name. The temples table
 * holds both `akshardham-delhi` and `akshardham-gandhinagar`; both stripped down
 * to the curated `akshardham` (which is the DELHI temple), so Gandhinagar
 * rendered Delhi's curated prose — and once the route started 308ing aliases,
 * that would have become a permanent redirect of one real temple onto another.
 * Caught by the "no two temples collapse onto the same URL" test.
 */
function suffixNamesThePlace(candidate: string, suffix: string): boolean {
  const detail = getTempleDetail(candidate);
  if (!detail) return false;
  const place = `-${slugifyPlace(`${detail.location ?? ''} ${detail.state ?? ''}`)}-`;
  const tokens = suffix.split('-').filter(Boolean);
  return tokens.length > 0 && tokens.every((tok) => place.includes(`-${tok}-`));
}

/**
 * The single URL this temple is served at.
 *
 * Resolution order:
 *   1. explicit alias (a different NAME for the same temple);
 *   2. `<curated-slug>-<place>` suffix, which is how the API seeds slugs
 *      (kashi-vishwanath-varanasi → kashi-vishwanath) — but only when the
 *      stripped suffix really is that temple's city or state;
 *   3. unchanged — an unknown or ambiguous slug is never guessed at. Leaving it
 *      alone costs one un-merged URL; guessing wrong 308s a devotee to the wrong
 *      temple.
 *
 * Idempotent by construction: an alias target is never itself an alias key
 * (asserted in __tests__/seo/structured-data-honesty.test.ts), so applying this
 * to its own output is a no-op and the route's 308 cannot loop.
 */
export function canonicalTempleSlug(slug: string): string {
  const alias = TEMPLE_SLUG_ALIASES[slug];
  if (alias) return alias;

  if (getTempleDetail(slug)) return slug;

  const parts = slug.split('-');
  const stripped: string[] = [];
  while (parts.length > 1) {
    stripped.unshift(parts.pop() as string);
    const candidate = parts.join('-');
    if (suffixNamesThePlace(candidate, stripped.join('-'))) return candidate;
  }
  return slug;
}
