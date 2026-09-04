/**
 * I18N-09 residual — hreflang must not advertise what robots withholds.
 *
 * THE STATE THIS FILE FOUND. The help centre applies `isUnreviewedTranslation`
 * in two of the three places a translation is offered to a crawler:
 *
 *   - app/help/articles/[lang]/[slug] serves `robots: { index: false }` for an
 *     unattested translation.                                          ✔ done
 *   - app/sitemap.ts filters the same articles out of the sitemap, because
 *     listing a noindex URL is a Search Console error.                 ✔ done
 *   - generateMetadata's `alternates.languages` listed EVERY translation of a
 *     slug regardless of attestation.                                  ✘ gap
 *
 * So the one indexable article in the set — the English original — shipped
 * `hreflang="hi|ta|te|bn|mr"` pointing at five noindex pages, which is the same
 * claim its own docblock says was withdrawn: "actively offered to Google as THE
 * Hindi/Tamil/Telugu/Bengali/Marathi answer". Two of the three surfaces agreed
 * a machine translation about payments and ritual is not an answer yet; the
 * third still announced it.
 *
 * THE RULE. A language may appear in `alternates.languages` only if the article
 * it points at is one this site is willing to have indexed. Attest the
 * translation (`reviewed_by`) and it returns to the hreflang set on the spot —
 * this is a predicate, not a hardcoded language list.
 *
 * COMMENT HAZARD — none. Every input is the exported HELP_ARTICLES data or the
 * object generateMetadata returns; no source text is scanned, so no comment can
 * satisfy or break an assertion here.
 */

import { describe, it, expect } from 'vitest';

import * as Article from '../app/help/articles/[lang]/[slug]/page';
import { HELP_ARTICLES, isUnreviewedTranslation } from '../lib/help-articles';

const params = (lang: string, slug: string) => Promise.resolve({ lang, slug });

async function languagesFor(lang: string, slug: string): Promise<Record<string, string>> {
  const meta = await Article.generateMetadata({ params: params(lang, slug) });
  const alternates = meta.alternates as { languages?: Record<string, string> } | undefined;
  return alternates?.languages ?? {};
}

describe('I18N-09 — hreflang alternates only name indexable translations', () => {
  it('has both an attested and an unattested article, so the rule can bite', () => {
    expect(HELP_ARTICLES.filter(isUnreviewedTranslation).length).toBeGreaterThan(0);
    expect(HELP_ARTICLES.filter((a) => !isUnreviewedTranslation(a)).length).toBeGreaterThan(0);
  });

  it('never offers an unreviewed translation as a language alternate', async () => {
    const offered: string[] = [];

    for (const article of HELP_ARTICLES) {
      const languages = await languagesFor(article.lang, article.slug);
      for (const [code, href] of Object.entries(languages)) {
        const target = HELP_ARTICLES.find((a) => a.lang === code && a.slug === article.slug);
        if (target && isUnreviewedTranslation(target)) {
          offered.push(`${article.lang}/${article.slug} -> hreflang ${code} ${href}`);
        }
      }
    }

    expect(offered).toEqual([]);
  });

  it('still offers every attested translation, so the filter is not a blanket drop', async () => {
    const missing: string[] = [];

    for (const article of HELP_ARTICLES) {
      const languages = await languagesFor(article.lang, article.slug);
      const attested = HELP_ARTICLES.filter(
        (a) => a.slug === article.slug && !isUnreviewedTranslation(a),
      );
      for (const a of attested) {
        if (languages[a.lang] !== `/help/articles/${a.lang}/${a.slug}`) {
          missing.push(`${article.lang}/${article.slug} drops hreflang ${a.lang}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
