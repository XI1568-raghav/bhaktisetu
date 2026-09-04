/**
 * The page-title recipe for the internal admin console.
 *
 * WHY THIS FILE EXISTS AT ALL, given apps/web/components/ui/heading-recipe.ts.
 *
 * DU-05 (prod sweep 2026-08-12) is a repo-wide finding — "the h1 is a different
 * thing on every screen" — and the guard that closed it,
 * apps/web/__tests__/h1-recipe-ratchet.du05.test.ts, walked only
 * apps/web/{app,components,lib}. apps/admin is a second Next app in the same
 * repo with its own 13 page titles, and every one of them was invisible to that
 * census. Measured 2026-09-02: 13 of 13 hand-rolled, in three treatments —
 *
 *     7x  text-2xl font-bold text-stone-900 sm:text-3xl
 *     4x  the same, plus style={{ color: SAFFRON }}   (the inline hex WINS,
 *         so those four render saffron while their class says stone)
 *     2x  text-2xl font-bold sm:text-3xl + style={{ color: SAFFRON }}
 *
 * — i.e. two rendered colours for one role, six of them written as a raw hex
 * that no token can reach, which is the same disease in a denominator nobody
 * was counting.
 *
 * IT IS NOT AN IMPORT OF THE WEB RECIPE, and that is deliberate rather than
 * lazy. apps/admin's `@theme` block (app/globals.css) declares eight saffron
 * steps and nothing else — there is no `--color-surface-800` here, so
 * `H1.portal`'s own class would resolve to no colour at all. The archetype's
 * SHAPE is shared; the token has to be the one the app actually defines. The
 * two files are held in agreement by the ratchet test named above, which reads
 * both off disk and asserts that this recipe carries the same weight and
 * tracking as the web `portal` archetype it mirrors.
 *
 * WHAT CHANGED VISUALLY. Size and weight are exactly the dominant treatment
 * that was already here, so no page title changes rank — this is not a restyle
 * smuggled in behind a refactor. The colour resolves to `text-stone-900`, the
 * token already written in the class attribute at 11 of the 13 call sites; the
 * six that painted `#E16318` over it now match the other seven. If the owner
 * wants the console's titles in brand saffron instead, that is one token on
 * this line and all thirteen follow — which is the entire point.
 *
 * `tracking-tight` is the one addition. It is what apps/web's portal archetype
 * carries, and at 24-30px a title without it sets noticeably looser than the
 * same title on the product's own /admin route.
 */
export const H1 = {
  /** Every page title in the admin console. One archetype, because the console
   *  has exactly one page archetype: portal chrome. */
  portal: 'text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl',
} as const;

export type H1Archetype = keyof typeof H1;
