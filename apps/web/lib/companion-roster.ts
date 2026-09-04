/**
 * TC-06 — the published travel-companion roster.
 *
 * `lib/yatra-data.ts` carries eight fully invented companion profiles
 * (`rajesh-kumar`, `priya-sharma`, `mohammed-aslam`, `lakshmi-iyer`,
 * `vikram-nayar`, `anita-deshmukh`, `suresh-nair`, `meena-agarwal`) with
 * hand-typed ages, cities, day rates, star ratings, review counts, availability
 * states and `verified: { aadhaar: true, background: true, medical: true }`
 * flags, plus sixteen invented review authors. `/yatra/companion` rendered all
 * eight as a bookable pool under the heading "8 verified travel companions",
 * and `/yatra/companion/[id]` pre-rendered a profile page for each one with a
 * 30-day availability calendar and a "Book This Companion" CTA.
 *
 * A devotee could pick a stranger by name to accompany an elderly parent
 * across the country on the strength of an Aadhaar badge nobody ever checked,
 * because the person does not exist. That is the single most direct
 * physical-trust failure on the site.
 *
 * The fixture rows are NOT deleted here — `lib/yatra-data.ts` is shared with the
 * yatra packages and sacred-site data, and the `TravelCompanion` type is the
 * shape a real roster will take. What changes is that nothing publishes them.
 * This module is the ONLY source `/yatra/companion` and `/yatra/companion/[id]`
 * read, and it publishes a companion only once Darshya has actually recruited,
 * ID-verified, background-checked and first-aid-trained that person.
 *
 * To publish a real companion: add the row here (not in `yatra-data.ts`) with
 * `verified` flags reflecting checks that were genuinely performed, and
 * `rating`/`reviewCount` at 0 until real yatris have rated them.
 */
import type { TravelCompanion } from './yatra-data';

export type { TravelCompanion };

/**
 * Companions Darshya has signed, vetted and can actually dispatch.
 *
 * Empty on purpose. No companion has been recruited yet, so the listing shows
 * its waitlist state and every `/yatra/companion/<id>` URL 404s rather than
 * offering a stranger for hire.
 */
export const publishedCompanions: TravelCompanion[] = [];

/** Look up a companion the platform is willing to stand behind. */
export function getPublishedCompanionById(
  id: string,
): TravelCompanion | undefined {
  return publishedCompanions.find((c) => c.id === id);
}

/** True once at least one real, vetted companion is listed. */
export function hasPublishedCompanions(): boolean {
  return publishedCompanions.length > 0;
}
