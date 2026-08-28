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
 * display typeface used consistently for it". These are those four, plus
 * `portalInverse` — portal chrome on a dark surface, which the finding's four
 * names did not anticipate and which five h1s in the tail needed. It is
 * `portal`'s size and weight with `portal`'s colour inverted, not a sixth
 * treatment: see its own note below.
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
   *
   * `text-surface-800` is a lock, not a repaint. This archetype was the only
   * one of the four that named no colour, so its nineteen call sites rendered
   * at whatever they inherited — today `body { color: var(--color-text) }`,
   * and `--color-text` IS `--color-surface-800`, the token `catalogue` and
   * `portal` already declare. Every one of the nineteen was checked first:
   * none sits on a dark surface and none carries a colour class of its own, so
   * nothing moves a pixel. What changes is that the colour is now stated —
   * DU-05 counted SEVEN colour tokens for this one role, and an archetype
   * whose colour comes from an ancestor is one coloured section away from an
   * eighth, silently. A marketing title over an image belongs on `H1.detail`.
   */
  marketing:
    'heading-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-surface-800',

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

  /**
   * The same portal chrome, inverted — app chrome that sits on a DARK surface.
   *
   * This is the fifth archetype the DU-05 backlog stalled on. Five h1s (the
   * live-darshan player bar and its coming-soon panel, the two /demo device
   * mockups, the /mobile darshan screen) are 16-24px bold light copy on a dark
   * bar, and neither existing light-surface recipe could take them: `detail`
   * is a 30/36px display-face hero painted over a photograph, and `portal` is
   * `text-surface-800` — dark ink, invisible on a dark bar. So those five went
   * on rendering four different hand-rolled recipes (text-base / text-xl /
   * text-2xl / text-xl sm:text-2xl, all font-bold) for one role.
   *
   * Size and weight are `portal`'s, deliberately: it IS portal chrome, and a
   * dashboard title should not change rank because the surface under it is
   * dark. Only the colour differs, and it is DECLARED rather than inherited
   * for the same reason every other archetype declares one — an archetype that
   * takes its colour from an ancestor is one coloured section away from an
   * eighth colour token, silently. No `heading-display`, again like `portal`.
   */
  portalInverse: 'text-xl font-semibold tracking-tight text-white',
} as const;

export type H1Archetype = keyof typeof H1;
