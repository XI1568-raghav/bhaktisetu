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
 *
 * I-03 (2026-08-19): this map was ENGLISH-ONLY and frozen, so /content's
 * section heading stayed English even once the rest of the page was translated.
 * It is still the English contract; `contentTypeLabel` now takes a locale and
 * asks the shared catalog first.
 */

import en from './i18n/en.json';
import { DEFAULT_LOCALE, type Locale } from './i18n/locales';
import { t } from './t';

type ContentKey = keyof typeof en.content;

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
 * Which `content` catalog slot carries the translated form of each enum member
 * (audit I-03). The map above stays the English contract — every enum member
 * must appear there or a filtered view loses its heading — while this map says
 * which of those labels a non-English catalog can actually answer.
 *
 * A member absent here (shloka, video_reel) renders its English label under a
 * Hindi chrome. That is the honest state: no human has written those words in
 * Devanagari anywhere in this repo, and inventing them is exactly what
 * __tests__/i18n-hi-catalog's provenance guard exists to stop. `All Content`
 * has no slot for the same reason — CONTENT_LABELS.hi's `सभी` is "All", the
 * tab, not "All Content", the heading, and near enough is how a catalog starts
 * lying.
 */
const CATALOG_KEY_FOR_TYPE = Object.freeze({
  aarti: 'tabAarti',
  chalisa: 'tabChalisa',
  mantra: 'tabMantra',
  bhajan: 'tabBhajan',
  article: 'tabArticle',
  story: 'stories',
} as const) satisfies Readonly<Record<string, ContentKey>>;

/**
 * The heading for a `?type=` value. `undefined`, `'all'` and any value outside
 * the enum resolve to the unfiltered label.
 *
 * The `locale` argument defaults to English so every existing call site keeps
 * its exact behaviour; /content passes the visitor's resolved locale.
 */
export function contentTypeLabel(type?: string | null, locale: Locale = DEFAULT_LOCALE): string {
  if (!type || type === 'all') return ALL_CONTENT_LABEL;

  const english = CONTENT_TYPE_LABELS[type];
  if (!english) return ALL_CONTENT_LABEL;
  if (locale === DEFAULT_LOCALE) return english;

  const key = (CATALOG_KEY_FOR_TYPE as Readonly<Record<string, ContentKey>>)[type];
  if (!key) return english;

  const tr = t('content', locale);
  // `has` is false when the catalog would fall back to English anyway; asking
  // first keeps this function's answer identical to the English one instead of
  // routing it through a translator that has nothing to add.
  return tr.has(key) ? tr(key) : english;
}
