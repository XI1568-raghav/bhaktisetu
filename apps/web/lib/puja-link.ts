/**
 * CI-01 (delta completion sweep 2026-08-20) — the aarti/chalisa half of DF-02.
 *
 * DF-02 established the rule that a booking link is emitted only after the
 * live catalogue confirms the slug, and wired it into `/festival`, `/calendar`
 * and the homepage strip. `/aarti/<slug>` and `/chalisa/<slug>` were never
 * wired, and they are the larger surface: 155 pages emitting 517 links off
 * hand-written `relatedPujas` arrays, of which exactly 15 named a slug the
 * catalogue sells. 502 dead links at the top of the acquisition funnel.
 *
 * This module is the aarti/chalisa entry point into the same resolver. It
 * deliberately does NOT keep a second copy of the festival alias table —
 * `resolveBookablePujas` owns that, and a second copy would drift. What lives
 * here is only the drift the two encyclopedia datasets introduce and the
 * festival calendar never had.
 *
 * As with DF-02: an unreadable catalogue yields ZERO links, not optimistic
 * ones. The caller renders the `/pujas` browse CTA instead (CI-05), so the
 * page still ends somewhere bookable.
 */

import { resolveBookablePujas } from './festivals';

/**
 * Editorial spellings used only by lib/aartis.ts and lib/chalisas.ts.
 *
 * Same rule as the festival table: each pair must name the SAME ritual.
 * Nothing here redirects one puja onto a different one, and nothing here
 * silently upgrades a location- or duration-qualified ritual (rudrabhishek
 * -at-Kashi, akhand 24-hour Ramayana) onto the plain catalogue entry — a
 * devotee who clicked for the qualified version would not get it.
 *
 *   sundara-kanda-parayana   the Sundara Kanda parayana IS the Sundarkand path
 *   diwali-lakshmi-puja      Diwali/Kojagari/Friday Lakshmi Puja are the
 *   kojagari-lakshmi-puja      Lakshmi Puja, named for the occasion it is
 *   shukravar-lakshmi-puja     performed on
 *   ganesh-chaturthi-puja    likewise Ganesh Puja named for its occasion
 *   wednesday-ganesh-puja
 *   pitra-dosh-shanti        "shanti" and "nivaran" are the same remedy; the
 *                              festival table already maps two other spellings
 */
export const CONTENT_PUJA_SLUG_ALIASES: Readonly<Record<string, string>> = {
  'sundara-kanda-parayana': 'sunderkand-path',
  'diwali-lakshmi-puja': 'lakshmi-puja',
  'kojagari-lakshmi-puja': 'lakshmi-puja',
  'shukravar-lakshmi-puja': 'lakshmi-puja',
  'ganesh-chaturthi-puja': 'ganesh-puja',
  'wednesday-ganesh-puja': 'ganesh-puja',
  'pitra-dosh-shanti': 'pitru-dosh-nivaran-puja',
};

/** Where a page sends a devotee when nothing in its editorial list resolves. */
export const BROWSE_PUJAS_HREF = '/pujas';

/**
 * Map an editorial `relatedPujas` array onto slugs that are bookable RIGHT NOW.
 *
 * Order is preserved and duplicates created by two spellings collapsing onto
 * one real puja are removed (both properties come from `resolveBookablePujas`).
 * An empty `catalogue` returns `[]`.
 */
export function resolveContentPujas(
  slugs: readonly string[],
  catalogue: ReadonlySet<string>,
): string[] {
  return resolveBookablePujas(
    slugs.map((raw) => CONTENT_PUJA_SLUG_ALIASES[raw] ?? raw),
    catalogue,
  );
}

/** Title-cased display label for a catalogue slug ("ganesh-puja" → "Ganesh Puja"). */
export function pujaLinkLabel(slug: string): string {
  return slug.replace(/-/g, ' ');
}
