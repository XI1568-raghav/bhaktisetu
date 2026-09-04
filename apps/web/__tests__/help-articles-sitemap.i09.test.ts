/**
 * I-09 residual (prod sweep 2026-08-12, triage 2026-08-15) — the help articles
 * exist, are linked from /help, and the unreviewed translations are correctly
 * noindexed. What was still missing: nothing ever told a crawler the seven
 * ENGLISH articles exist. app/sitemap.ts emitted `/help` and nothing below it.
 *
 * The contract asserted here is two-sided on purpose, because "add them all"
 * would be a different bug: an article the article route marks
 * `robots: { index: false }` must NOT appear in the sitemap — advertising a
 * noindex URL is a Search Console error, not an improvement. So the sitemap
 * must carry exactly the articles for which `isUnreviewedTranslation` is false.
 *
 * Everything below reads DATA — the exported catalogue and the URLs the sitemap
 * function actually returns. No assertion here can be satisfied by a comment.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

import { HELP_ARTICLES, isUnreviewedTranslation } from '../lib/help-articles';

// The sitemap fetches temples/pujas at build time and falls back on failure.
// Mock rather than let it reach the network: the fallback path is exercised
// elsewhere and a real fetch would make this test slow and flaky.
vi.mock('../lib/api', () => ({
  getTemples: vi.fn(async () => ({ data: [] })),
  getPujaTypes: vi.fn(async () => ({ data: [] })),
}));

const BASE_URL = 'https://darshya.online';

let urls: Set<string>;

beforeAll(async () => {
  const sitemap = (await import('../app/sitemap')).default;
  const entries = await sitemap();
  urls = new Set(entries.map((e) => e.url));
});

describe('I-09 — the indexable help articles are discoverable in the sitemap', () => {
  it('still lists the /help hub itself', () => {
    expect(urls.has(`${BASE_URL}/help`)).toBe(true);
  });

  it('lists every article the article route lets Google index', () => {
    const indexable = HELP_ARTICLES.filter((a) => !isUnreviewedTranslation(a));
    expect(indexable.length).toBeGreaterThan(0);
    for (const article of indexable) {
      const url = `${BASE_URL}/help/articles/${article.lang}/${article.slug}`;
      expect(urls.has(url), `sitemap omits indexable article ${url}`).toBe(true);
    }
  });

  it('lists no article the article route marks noindex', () => {
    const unreviewed = HELP_ARTICLES.filter((a) => isUnreviewedTranslation(a));
    expect(unreviewed.length).toBeGreaterThan(0);
    for (const article of unreviewed) {
      const url = `${BASE_URL}/help/articles/${article.lang}/${article.slug}`;
      expect(
        urls.has(url),
        `sitemap advertises ${url}, which the article route serves with robots.index=false`,
      ).toBe(false);
    }
  });

  it('emits one sitemap entry per indexable article and no more', () => {
    const articleUrls = [...urls].filter((u) => u.startsWith(`${BASE_URL}/help/articles/`));
    const indexable = HELP_ARTICLES.filter((a) => !isUnreviewedTranslation(a));
    expect(articleUrls).toHaveLength(indexable.length);
  });
});
