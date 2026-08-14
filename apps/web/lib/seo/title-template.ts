/**
 * SEO-03 (prod sweep 2026-08-12, P1) — the ONE definition of the title template.
 *
 * 1,043 of 1,785 prerendered pages shipped `"… — Darshya | Darshya"`, because
 * 171 route files hard-coded the brand in their own `title` while the root
 * layout's `template: "%s | Darshya"` appended it again. Those 171 were
 * stripped so the template is the single thing that brands a title.
 *
 * This module closes the other half of that idea: the template STRING itself
 * had two hard-coded copies (app/layout.tsx and app/auth/layout.tsx). Two
 * copies of a format string drift — rename the product, change the separator,
 * add a tagline, and one subtree brands differently from the rest of the site
 * with nothing failing. Import it; do not retype it.
 *
 * Next.js semantics worth knowing before editing:
 *   • `template` applies to a DESCENDANT segment's plain-string title, and the
 *     nearest ancestor template wins — it is applied once, not once per level.
 *   • A layout's OWN `title.default` is resolved by its PARENT's template.
 *   • `openGraph.title` / `twitter.title` resolve through a SEPARATE template
 *     (null here), so those blocks carry the brand themselves and are correct.
 *     Do not "clean" them to match this.
 */

/** The brand as it appears in a title suffix. */
export const SITE_NAME = 'Darshya';

/** Separator between the page title and the brand. */
export const TITLE_SEPARATOR = '|';

/**
 * Next.js `metadata.title.template`. `%s` is the descendant page's own title.
 *
 * Assembled from the parts above so a single edit propagates everywhere, and
 * so a grep for the literal string finds this file and nothing else — which is
 * what `__tests__/seo/title-template.test.ts` asserts.
 */
export const TITLE_TEMPLATE = `%s ${TITLE_SEPARATOR} ${SITE_NAME}`;
