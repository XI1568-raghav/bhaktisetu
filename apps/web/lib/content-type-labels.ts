/**
 * Human labels for the `ContentType` enum in apps/api/prisma/schema.prisma.
 *
 * HN-07 (prod sweep 2026-08-12): /content derived its heading from the five
 * filter chips it happens to render, so any other member of the enum fell
 * through to "All Content" and a filtered view was indistinguishable from the
 * unfiltered one — which is exactly what the footer's Bhajan link produced.
 * The chips are a UI choice; the enum is the contract. Label against the
 * contract.
 *
 * Keep in step with the enum. A member missing here is not a crash — it is a
 * view that quietly claims to be showing everything.
 */

export const CONTENT_TYPE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  aarti: 'Aarti',
  chalisa: 'Chalisa',
  mantra: 'Mantra',
  bhajan: 'Bhajan',
  story: 'Stories',
  article: 'Articles',
  shloka: 'Shlokas',
  video_reel: 'Video reels',
});

/** Heading for the unfiltered library, and for anything unrecognised. */
export const ALL_CONTENT_LABEL = 'All Content';

/**
 * The heading for a `?type=` value. `undefined`, `'all'` and any value outside
 * the enum resolve to the unfiltered label.
 */
export function contentTypeLabel(type?: string | null): string {
  if (!type || type === 'all') return ALL_CONTENT_LABEL;
  return CONTENT_TYPE_LABELS[type] ?? ALL_CONTENT_LABEL;
}
