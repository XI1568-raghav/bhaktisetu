// TD-03 (prod sweep 2026-08-12): /temples showed 33 cards for 29 temples.
//
// Two catalogues feed that grid — the curated TEMPLE_DETAILS map and the API's
// temples table — and they name the same temple differently
// (`tirupati-balaji` vs `tirumala-tirupati`, `meenakshi-temple` vs
// `meenakshi-madurai`, `rameshwaram` vs `ramanathaswamy-rameshwaram`). The
// curated map even holds Ramanathaswamy twice on its own, as `rameswaram` and
// `rameshwaram`. The page's own normaliser only stripped a trailing
// `<place>` segment, which cannot bridge two different NAMES, so each pair
// rendered as separate cards. The two Meenakshi cards then contradicted each
// other about live darshan, because the curated card hardcodes it on and the
// api-seeded row has it off.
//
// `canonicalTempleSlug` already knows all of this — the detail route 308s an
// alias onto its canonical URL and the sitemap advertises only the canonical.
// The grid now reads from the same table, so it cannot drift from either.

import { canonicalTempleSlug } from './temple-slug';

/**
 * One card per temple, keyed on the canonical slug.
 *
 * When several inputs collapse onto the same temple the CANONICAL one wins —
 * the entry whose own slug is already the canonical URL — regardless of input
 * order. First-wins would be wrong: `rameswaram` is declared before
 * `rameshwaram` in the curated map, so first-wins would serve the alias
 * entry's prose and photography under the canonical URL. Where no input is
 * canonical (an api-only temple with no curated twin) the first is kept and
 * its slug rewritten, so the card never links to a URL that 308s.
 *
 * Order is stable: cards come back in the order their temple was first seen.
 */
export function dedupeTempleCards<T extends { slug: string }>(cards: readonly T[]): T[] {
  const order: string[] = [];
  const chosen = new Map<string, T>();

  for (const card of cards) {
    const slug = canonicalTempleSlug(card.slug);
    const existing = chosen.get(slug);
    if (!existing) {
      order.push(slug);
      chosen.set(slug, card);
      continue;
    }
    // Upgrade only when this input IS the canonical entry and the incumbent
    // is not. Two canonical entries for one slug cannot happen: the slug is
    // the map key.
    if (card.slug === slug && existing.slug !== slug) chosen.set(slug, card);
  }

  return order.map((slug) => {
    const card = chosen.get(slug)!;
    return card.slug === slug ? card : { ...card, slug };
  });
}
