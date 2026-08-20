/**
 * The page-title recipes, one per page archetype.
 *
 * DU-05 (prod sweep 2026-08-12) measured SEVEN distinct h1 treatments across
 * ten screens — 18px to 70.4px, two typefaces, four weight/family
 * combinations, seven colour tokens — and two of the ten screens had no h1 at
 * all. Repo-wide: 349 h1 tags in 45 distinct size+weight recipes.
 *
 * The finding's own expected state is "one h1 recipe per page archetype
 * (marketing / catalogue / detail / portal), exactly one h1 per page, and the
 * display typeface used consistently for it". These are those four.
 *
 * No `'use client'` here on purpose — the catalogue and detail pages are
 * Server Components, and a client module hands them a client reference, not a
 * string (see components/ui/button-recipe.ts for the same reason).
 *
 * `heading-display` is the DU-06 utility in globals.css. Portal chrome
 * deliberately does NOT carry it: the display face is for the surfaces a
 * visitor is being sold to, not the dashboard a provider lives in all day.
 */
export const H1 = {
  /**
   * Marketing surfaces — home hero, /pricing, campaign landings.
   *
   * No `leading-*`. This carried `leading-[1.1]` — an arbitrary value pinned
   * across all three of its steps. The scale already pairs a leading with each
   * step (--text-3xl--line-height 1.2, 4xl 1.1, 5xl 1.05) and
   * __tests__/design-tokens.test.ts asserts that pairing tightens as type
   * grows; the override defeated it in both directions at once — tighter than
   * declared at 30px on a phone, looser than declared at 72px on a desktop.
   * In Tailwind v4 `text-*` emits
   * `line-height: var(--tw-leading, var(--text-*--line-height))` and
   * `leading-*` sets `--tw-leading`, so a single unprefixed `leading-` beats
   * every responsive step regardless of source order. Derive, never redefine.
   */
  marketing: 'heading-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight',

  /** Catalogue index pages — /pujas, /temples, /store. */
  catalogue:
    'heading-display text-3xl md:text-4xl font-semibold tracking-tight text-surface-800',

  /** Detail heroes painted over an image. */
  detail:
    'heading-display text-3xl md:text-4xl font-semibold tracking-tight text-white drop-shadow-lg',

  /**
   * Portal / app chrome — /admin, /priest and the six *-portal routes.
   * DU-07: still has to outrank its own sections, which is why /admin's
   * 18px h1 (smaller than a /pujas h3) was a finding in its own right.
   */
  portal: 'text-xl font-semibold tracking-tight text-surface-800',
} as const;

export type H1Archetype = keyof typeof H1;
