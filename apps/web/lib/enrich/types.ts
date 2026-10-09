/**
 * Enrichment text for programmatic encyclopedia pages (SEO Wave A).
 *
 * One record per entry, keyed by the entry's slug. `about` is 2-4 paragraphs of
 * plain prose (no markdown, no HTML). `faqs` is 2-3 question/answer pairs that
 * also feed FAQPage schema. Facts must come from established tradition and from
 * the entry's own data fields; never invent dates, verse numbers, statistics or
 * Darshya service claims. See __tests__/seo/enrichment-quality.test.ts.
 */
export interface Enrichment {
  about: string[];
  faqs: { q: string; a: string }[];
}

export type EnrichmentSet = Record<string, Enrichment>;
