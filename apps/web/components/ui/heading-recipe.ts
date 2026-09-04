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

/**
 * The colour token an archetype declares, so `h1Class` can REPLACE it instead
 * of layering a second colour utility on top of it.
 *
 * Two Tailwind `color` utilities in one class attribute do not resolve by the
 * order they are written in — they resolve by the order the generated
 * stylesheet emits them, which the call site cannot see or control. So
 * `${H1.marketing} text-violet-900` is a coin flip, not an override, and the
 * "pass a colour in the extras slot" workaround that looks obvious here is the
 * one thing that must not be done.
 */
const ARCHETYPE_COLOUR = /(^|\s)text-(?:surface-800|white)(?=\s|$)/;

/**
 * An archetype, optionally re-coloured.
 *
 * DU-05's fifth stall (after the five small white h1s that became
 * `portalInverse`, and the two raw-HTML `# ` headings that became h2s) is the
 * PER-INSTANCE COLOUR: a page whose title carries a colour that belongs to the
 * page, not to the archetype. `app/chakras/[slug]` is the live case — seven
 * static pages, each titled in its own chakra's hue (`text-red-900` …
 * `text-violet-900`), which is the page's whole identifying signal and is not
 * a divergence anyone wants removed.
 *
 * Neither existing escape hatch takes it. The extras slot cannot, for the
 * specificity reason above. A sixth archetype cannot either — it would have to
 * be seven archetypes, one per hue, which is the sprawl this file exists to
 * end.
 *
 * So the colour is a PARAMETER of the archetype rather than a second class
 * fighting it: the archetype's own colour token is removed and the caller's is
 * put in its place, leaving exactly one colour utility in the attribute. Size,
 * weight, tracking and face still come from one place and still change in one
 * place. Passing nothing returns the archetype byte-for-byte.
 *
 * `colour` must be a single Tailwind text-colour utility. It is deliberately
 * NOT typed as an arbitrary string union — the seven chakra hues come out of a
 * data map — but it is asserted in __tests__/h1-recipe-ratchet.du05.test.ts to
 * be a colour utility and not a size, weight or face, which is the failure
 * mode that would quietly re-open the sprawl through this door.
 */
export function h1Class(archetype: H1Archetype, colour?: string): string {
  const base = H1[archetype];
  if (!colour) return base;
  return `${base.replace(ARCHETYPE_COLOUR, '$1').replace(/\s+/g, ' ').trim()} ${colour}`;
}
