/**
 * CI-08 — the Veda half.
 *
 * The same subject is published twice, and both URLs declared themselves the
 * original:
 *
 *   /vedas/rigveda          lib/vedas.ts — curated: mantra count, extant
 *                           shakhas, the four parts, famous hymns with
 *                           references, presiding priest, oral preservation.
 *   /ved/rigveda-overview   content/ved/rigveda-overview.mdx — a four-minute
 *                           prose overview of the same Veda.
 *
 * The ruling is the one CI-08 already made for the fourteen Upanishads (see
 * `canonicalUpanishadUrl` in lib/upanishads.ts): the curated dataset carries
 * strictly more, so it is the survivor and the MDX article defers to it.
 *
 * NO SLUG TABLE. Every overview article is named `<vedaSlug>-overview`, so the
 * mapping is derived from VEDAS itself via `getVeda`. That is deliberate — a
 * second hand-maintained list of Veda slugs is precisely the duplication this
 * finding exists to remove, and it would rot the first time a slug changed.
 * `aranyakas-overview` and `brahmanas-overview` are named the same way but
 * have no curated twin, and `getVeda` is what says so.
 *
 * WHERE THIS BELONGS: beside the dataset that wins, i.e. lib/vedas.ts, exactly
 * as `canonicalUpanishadUrl` sits beside UPANISHADS. It lives here only
 * because lib/vedas.ts is owned by another lane in the current engagement;
 * moving it is a pure cut-and-paste plus one import change in
 * app/ved/[slug]/page.tsx. This file is a colocated module, not a route —
 * Next only treats page/layout/route/template/etc. as routes.
 */
import { getVeda } from '../../lib/vedas';

const OVERVIEW_SUFFIX = /^(.+)-overview$/;

/**
 * The URL that should be canonical for a `content/ved` article slug, or
 * undefined when the article has no curated twin at /vedas/<slug>.
 */
export function canonicalVedaUrl(vedArticleSlug: string): string | undefined {
  const match = OVERVIEW_SUFFIX.exec(vedArticleSlug);
  const vedaSlug = match?.[1];
  if (!vedaSlug) return undefined;
  return getVeda(vedaSlug) ? `/vedas/${vedaSlug}` : undefined;
}
