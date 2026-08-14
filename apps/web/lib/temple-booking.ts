/**
 * DF-04 (prod sweep 2026-08-12) — booking CTAs on a temple page must carry the
 * puja AND the temple.
 *
 * Every "Book Now" on /temples/<slug> pointed at `/pujas?temple=<slug>`. No
 * reader for that param exists, so the devotee who had already chosen
 * "Rudrabhishek ₹1,100 at Kashi" landed on the unfiltered ten-item catalogue
 * with no mention of Kashi anywhere. The working deep link already shipped —
 * app/pujas/[slug]/book/page.tsx redirects `/pujas/<puja>/book?temple=<temple>`
 * into the wizard with the temple preselected — it just was not being used.
 *
 * Two honest outcomes, no third:
 *   1. the API confirms this temple offers this puja  -> deep-link the wizard;
 *   2. it does not                                    -> the temple-scoped
 *      listing (/temples/<slug>/pujas), which renders that temple's REAL
 *      offerings and says so plainly when there are none.
 * A curated card that no live offering backs gets no Book button at all. The
 * caller decides that; this module simply refuses to invent a match.
 */

export interface TempleOfferingLike {
  isActive?: boolean;
  pujaType: { slug: string; name: string };
}

/** Lowercase, collapse everything that is not a letter or digit. */
function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Resolve a curated `pujasOffered[].name` onto a live API offering.
 *
 * Deliberately strict. The curated list is editorial prose — "Mangala Aarti
 * Darshan (VIP)", "Sugam Darshan Pass" — and most entries are temple darshan
 * passes with no catalogue equivalent. A fuzzy match here would sell a devotee
 * a different ritual than the card they clicked, so only an exact normalised
 * name, or a curated name that fully contains the catalogue name as a word
 * run, counts. Inactive offerings never match.
 */
export function matchTempleOffering(
  curatedName: string,
  offerings: readonly TempleOfferingLike[] | null | undefined,
): TempleOfferingLike | null {
  if (!offerings || offerings.length === 0) return null;
  const target = normalise(curatedName);
  if (!target) return null;

  const active = offerings.filter((o) => o.isActive !== false);

  const exact = active.find((o) => normalise(o.pujaType.name) === target);
  if (exact) return exact;

  const contained = active.find((o) => {
    const name = normalise(o.pujaType.name);
    return name.length > 0 && (target === name || target.startsWith(`${name} `));
  });
  return contained ?? null;
}

/**
 * The href a temple-page booking control should carry.
 *
 * @param templeSlug     the curated slug this page is served at
 * @param apiTempleSlug  the temples-table slug, or null when the API has no
 *                       such temple (in which case the temple-scoped listing
 *                       would 404, so we send them to the catalogue)
 * @param offering       a live offering resolved by matchTempleOffering, or null
 */
export function templeBookHref(
  templeSlug: string,
  apiTempleSlug: string | null,
  offering: TempleOfferingLike | null,
): string {
  if (offering && apiTempleSlug) {
    return `/pujas/${offering.pujaType.slug}/book?temple=${encodeURIComponent(apiTempleSlug)}`;
  }
  if (apiTempleSlug) return `/temples/${templeSlug}/pujas`;
  return '/pujas';
}

/**
 * COM-12 (prod sweep 2026-08-12) — whether this temple may advertise puja
 * booking at all.
 *
 * 15 of the 20 seeded temples have zero active offerings (verified in the
 * database: 20 temples, 5 with an active row in temple_puja_offerings), yet
 * every temple page rendered the same "Book Puja via Darshya — Verified
 * priests, video proof, prasad delivery to your door" card. That is a booking
 * promise made to the highest-intent traffic on the site with nothing behind
 * it.
 *
 * `templeBookHref` answers WHERE a booking control should point. This answers
 * the prior question — whether one should exist. Two states, no third: the API
 * confirms at least one ACTIVE offering for a temple it actually knows, or the
 * promise is not made.
 */
export type TempleBookCta =
  | { available: true; href: string }
  | { available: false; href: null };

export function templeBookCta(
  templeSlug: string,
  apiTempleSlug: string | null,
  offerings: readonly TempleOfferingLike[] | null | undefined,
): TempleBookCta {
  const bookable = (offerings ?? []).filter((o) => o.isActive !== false);
  if (!apiTempleSlug || bookable.length === 0) return { available: false, href: null };
  return { available: true, href: templeBookHref(templeSlug, apiTempleSlug, null) };
}
