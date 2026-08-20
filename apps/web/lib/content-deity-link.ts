/**
 * CI-06 (delta completion sweep 2026-08-20) — encyclopedia → `/deity/<slug>`
 * cross-links that hard-404.
 *
 * `/deity/[slug]` sets `dynamicParams = false` and prerenders exactly the
 * slugs in `DEITIES`, so any other slug is a hard 404, not a soft one. The
 * `deitySlug` field in lib/aartis.ts and lib/chalisas.ts was hand-written
 * against no such check: measured on this tree, 24 of the 131 references
 * across those two datasets name a deity with no page (30 across the whole
 * repo, 20 distinct deities).
 *
 * Two different failures were mixed together in that 24:
 *
 *   - transliteration drift onto a deity that DOES have a page
 *     (venkateswara/venkateshwara, bhairav/bhairava, kuber/kubera,
 *     mahalakshmi/mahalakshmi-ashtalakshmi, mahakali → kali,
 *     gajalakshmi → lakshmi). These are repairable and are repaired here.
 *
 *   - deities with genuinely no entry (Vindhyavasini, Shitala, Santoshi Mata,
 *     Vitthal, Swaminarayan, Vaishno Devi, Tara, Baglamukhi, the river
 *     goddesses, "navagraha" which is nine deities not one). These are NOT
 *     guessed at — `deityHref` returns null and the caller renders no link.
 *     Sending a Baglamukhi devotee to Kali would be worse than the 404.
 *
 * Resolution is validated against `DEITIES` on every call, so adding a deity
 * to that dictionary automatically switches its links on, and an alias whose
 * target is later removed returns null rather than resurrecting a 404.
 *
 * Other surfaces still interpolate `deitySlug` raw and remain affected —
 * lib/sacred-rivers.ts (4: ganga, yamuna, narmada, godavari), lib/festivals.ts
 * (1: murugan) and lib/cities.ts (1: murugan). They should import this helper.
 */

import { DEITIES } from './deities';

/**
 * A different SPELLING of a deity that has a page — never a different deity.
 *
 * Mahakali and Gajalakshmi are the two judgement calls: both are named forms
 * of a deity the dictionary carries under its principal name (Kali, Lakshmi),
 * and `/deity/kali` and `/deity/lakshmi` both describe that form. Everything
 * more distant is left to return null.
 */
export const CONTENT_DEITY_SLUG_ALIASES: Readonly<Record<string, string>> = {
  venkateswara: 'venkateshwara',
  bhairav: 'bhairava',
  kuber: 'kubera',
  mahalakshmi: 'mahalakshmi-ashtalakshmi',
  mahakali: 'kali',
  gajalakshmi: 'lakshmi',
  // Murugan is the Tamil name for Kartikeya. Used raw by lib/festivals.ts and
  // lib/cities.ts, which are outside this lane — /deity/[slug] serves the
  // alias and 308s it, so those two call sites are repaired without editing
  // them. Every key here is also a prerendered param on that route.
  murugan: 'kartikeya',
};

const KNOWN_DEITY_SLUGS: ReadonlySet<string> = new Set(DEITIES.map((d) => d.slug));

/** True when `/deity/<slug>` is a page that exists. */
export function hasDeityPage(slug: string | null | undefined): boolean {
  return typeof slug === 'string' && KNOWN_DEITY_SLUGS.has(slug);
}

/**
 * The `/deity/<slug>` href for an editorial `deitySlug`, or null when there is
 * no page to link to. Callers must render nothing on null.
 */
export function deityHref(slug: string | null | undefined): string | null {
  if (typeof slug !== 'string' || slug.length === 0) return null;
  const resolved = CONTENT_DEITY_SLUG_ALIASES[slug] ?? slug;
  return KNOWN_DEITY_SLUGS.has(resolved) ? `/deity/${resolved}` : null;
}
