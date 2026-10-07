/**
 * [I18N-08] An hreflang cluster describes ONE page, so it cannot live in the
 * root layout.
 *
 * app/layout.tsx used to render seven literal tags in <head>:
 *
 *   <link rel="alternate" hrefLang="en" href="https://darshya.online" />
 *   <link rel="alternate" hrefLang="hi" href="https://darshya.online/hi" />
 *   … ta, te, bn, mr, x-default
 *
 * The root layout wraps every route, so all ~1,785 prerendered pages shipped
 * that block verbatim. /aarti/vishnu-aarti told Google its Hindi equivalent was
 * the Hindi HOMEPAGE, and that its x-default was the English homepage. Google's
 * rule is that annotations must be reciprocal and page-specific — /hi does not
 * return-link to /aarti/vishnu-aarti, and cannot, because it is a different
 * page. A cluster that fails the return check is not merely ignored: it makes
 * every OTHER annotation in the cluster suspect, which is why this is worse
 * than emitting nothing.
 *
 * The homepage is the one page the block was ever true for, and app/page.tsx
 * already declares the same six URLs through `alternates.languages` — so the
 * layout copy was pure duplication there and pure noise on the other 1,784.
 *
 * What replaces it: lib/seo/hreflang.ts, one definition, adopted by the page
 * whose cluster it actually is.
 *
 * WHAT THIS TEST DELIBERATELY DOES NOT FLAG. The footer "Read in:" switcher
 * renders <Link hrefLang="hi"> on every page too, and that is CORRECT — the
 * `hreflang` attribute on an <a>/<Link> is a hint about the destination of that
 * link, not a `rel="alternate"` annotation about the current document. Only
 * <link rel="alternate"> in <head> makes the claim this finding is about, so
 * the scan is anchored on `rel="alternate"` rather than on the word hreflang.
 * The RSS <link rel="alternate" type="application/rss+xml"> is a feed
 * discovery link with no hrefLang and is equally out of scope.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../../lib/i18n/locales';
import {
  HOMEPAGE_LANGUAGE_ALTERNATES,
  X_DEFAULT,
  hreflangClusterFor,
} from '../../lib/seo/hreflang';
import { SITE_URL } from '../../lib/site-metadata';

const WEB = path.resolve(__dirname, '../..');
const LAYOUT = path.join(WEB, 'app/layout.tsx');

/** Comments quote the removed tags verbatim; strip them before scanning. */
function stripComments(src: string): string {
  return src
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const layoutSrc = stripComments(fs.readFileSync(LAYOUT, 'utf8'));

/** Every `<link …>` element in the (comment-free) layout source. */
const LINK_TAGS = [...layoutSrc.matchAll(/<link\b[\s\S]*?\/>/g)].map((m) =>
  m[0].replace(/\s+/g, ' ').trim(),
);

describe('[I18N-08] the root layout emits no page-agnostic hreflang cluster', () => {
  it('renders no <link rel="alternate" hrefLang> in <head>', () => {
    const offenders = LINK_TAGS.filter(
      (t) => /rel="alternate"/.test(t) && /hrefLang=/i.test(t),
    );
    expect(
      offenders,
      'A cluster in the ROOT layout is emitted by every route, so each page claims the ' +
        'HOMEPAGE of each language as its own translation. Google drops a cluster whose ' +
        'return links do not match, so this annotates ~1,785 pages with a claim that is ' +
        'false on 1,784 of them.',
    ).toEqual([]);
  });

  it('keeps the RSS alternate, which is a feed link and not a language claim', () => {
    const rss = LINK_TAGS.filter((t) => /application\/rss\+xml/.test(t));
    expect(rss.length, 'the feed discovery link should survive this change').toBe(1);
    expect(rss[0]).not.toMatch(/hrefLang=/i);
  });

  it('leaves the footer language switcher alone — <Link hrefLang> is not an annotation', () => {
    // i18n-root-redirect.test.ts asserts the layout still advertises exactly the
    // six supported locales; that claim now rests entirely on the switcher, so
    // prove the switcher is still there rather than letting it pass vacuously.
    const advertised = new Set(
      [...(layoutSrc + stripComments(fs.readFileSync(path.join(WEB, 'components/FooterLanguageLinks.tsx'), 'utf8'))).matchAll(/<Link[^>]*hrefLang="([a-z-]+)"/g)].map((m) => m[1]!),
    );
    expect([...advertised].sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });
});

describe('[I18N-08] the cluster has one definition, keyed to the page it describes', () => {
  it('covers every advertised locale plus x-default', () => {
    expect(Object.keys(HOMEPAGE_LANGUAGE_ALTERNATES).sort()).toEqual(
      [...SUPPORTED_LOCALES, X_DEFAULT].sort(),
    );
  });

  it('every href is absolute and on the canonical origin', () => {
    for (const [lang, href] of Object.entries(HOMEPAGE_LANGUAGE_ALTERNATES)) {
      expect(href, `${lang} must be an absolute URL`).toMatch(/^https:\/\//);
      expect(href.startsWith(SITE_URL), `${lang} must live on ${SITE_URL}`).toBe(true);
    }
  });

  it('x-default and the default locale both resolve to the English page', () => {
    expect(HOMEPAGE_LANGUAGE_ALTERNATES[X_DEFAULT]).toBe(SITE_URL);
    expect(HOMEPAGE_LANGUAGE_ALTERNATES[DEFAULT_LOCALE]).toBe(SITE_URL);
  });

  it('each non-default locale points at its own landing, not at the homepage', () => {
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === DEFAULT_LOCALE) continue;
      expect(HOMEPAGE_LANGUAGE_ALTERNATES[locale]).toBe(`${SITE_URL}/${locale}`);
      // The whole defect was six entries that all resolved to one document.
      expect(HOMEPAGE_LANGUAGE_ALTERNATES[locale]).not.toBe(SITE_URL);
    }
  });

  it('a cluster for any other route is built from that route, never from /', () => {
    const cluster = hreflangClusterFor('/pujas');
    expect(cluster[DEFAULT_LOCALE]).toBe(`${SITE_URL}/pujas`);
    expect(cluster.hi).toBe(`${SITE_URL}/hi/pujas`);
    expect(cluster[X_DEFAULT]).toBe(`${SITE_URL}/pujas`);
    // Every entry must be distinct per locale — the failure this replaces was
    // six locales sharing one URL.
    const hrefs = SUPPORTED_LOCALES.map((l) => cluster[l]);
    expect(new Set(hrefs).size).toBe(SUPPORTED_LOCALES.length);
  });

  it('normalises the route so the homepage cluster is not built with a trailing slash', () => {
    expect(hreflangClusterFor('/')).toEqual(HOMEPAGE_LANGUAGE_ALTERNATES);
    expect(hreflangClusterFor('')).toEqual(HOMEPAGE_LANGUAGE_ALTERNATES);
    expect(hreflangClusterFor('pujas')).toEqual(hreflangClusterFor('/pujas'));
  });
});
