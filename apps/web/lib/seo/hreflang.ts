/**
 * I18N-08 (prod sweep 2026-08-12) — the ONE definition of an hreflang cluster.
 *
 * WHAT WAS WRONG. app/layout.tsx rendered seven literal tags in <head>:
 *
 *   <link rel="alternate" hrefLang="en"        href="https://darshya.online"    />
 *   <link rel="alternate" hrefLang="hi"        href="https://darshya.online/hi" />
 *   … ta, te, bn, mr, x-default
 *
 * The root layout wraps every route, so every one of the ~1,785 prerendered
 * pages shipped that block verbatim. `/aarti/vishnu-aarti` told Google its
 * Hindi equivalent was the Hindi HOMEPAGE, and `/pujas` said the same thing,
 * and so did `/store`. An hreflang annotation is a claim about the CURRENT
 * document, and it is only honoured when the target returns the same claim:
 * /hi does not — and cannot — return-link to /aarti/vishnu-aarti, because it is
 * a different page about a different thing. A cluster that fails the return
 * check is not quietly ignored; it discredits the rest of the cluster, so the
 * block was actively worse than emitting nothing.
 *
 * WHY THE ROOT LAYOUT CAN NEVER HOST THIS. The tags are page-specific by
 * definition, and a root layout has no pathname: there is no `[locale]` segment
 * and no second root layout, and reading `headers()` there would opt all ~1,785
 * routes out of static prerendering to compute something each page already
 * knows about itself. So the cluster belongs to the page.
 *
 * WHAT LIVES HERE. The homepage cluster (the one page the old block was ever
 * true for — and app/page.tsx already declares six of its seven entries by
 * hand), plus the builder any other route should use once locale-scoped product
 * routes exist. Both are derived from SUPPORTED_LOCALES and SITE_URL so the
 * advertised-language list, the footer switcher and the annotations cannot
 * drift apart — the same single-source rule lib/i18n/locales.ts and
 * lib/seo/title-template.ts already follow.
 *
 * ⚠️ ONLY ANNOTATE A ROUTE THAT REALLY HAS PER-LOCALE URLS. `hreflangClusterFor`
 * assumes `/{locale}{route}` exists for every supported locale. Today that is
 * true for `/` alone: `/hi/pujas` is a 404 (see middleware.ts, which redirects
 * only the bare root for exactly this reason). Pointing a cluster at URLs that
 * 404 reproduces the defect this module exists to remove, in a new place. The
 * builder is here so the wiring is a one-liner on the day those routes ship,
 * not so it can be sprinkled on routes that do not have them.
 *
 * Guarded by __tests__/seo/hreflang-cluster.test.ts.
 */

import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from '../i18n/locales';
import { SITE_URL } from '../site-metadata';

/**
 * The key Google reads as "use this when no other language matches". Not a
 * language tag, which is why it is typed separately from `Locale`.
 */
export const X_DEFAULT = 'x-default' as const;

export type HreflangCluster = Record<Locale | typeof X_DEFAULT, string>;

/** Strip a leading/duplicated slash and any trailing slash: '' means the root. */
function normaliseRoute(route: string): string {
  const trimmed = route.trim().replace(/^\/+/, '').replace(/\/+$/, '');
  return trimmed ? `/${trimmed}` : '';
}

/**
 * The cluster for `route`, assuming a `/{locale}` prefix carries the locale.
 * Read the warning at the top of this file before using it on anything but `/`.
 */
export function hreflangClusterFor(route: string): HreflangCluster {
  const path = normaliseRoute(route);
  // `path` is '' for the root, so this is SITE_URL with no trailing slash.
  const english = `${SITE_URL}${path}`;

  const cluster = { [X_DEFAULT]: english } as HreflangCluster;
  for (const locale of SUPPORTED_LOCALES) {
    cluster[locale] = locale === DEFAULT_LOCALE ? english : `${SITE_URL}/${locale}${path}`;
  }
  return cluster;
}

/**
 * The homepage cluster — the only one that is true today.
 *
 * Feed it to Next as `alternates: { canonical: SITE_URL, languages:
 * HOMEPAGE_LANGUAGE_ALTERNATES }` from app/page.tsx. Note that Next REPLACES a
 * parent's whole `alternates` object rather than merging it key by key
 * (next/dist/lib/metadata/resolve-metadata.js, `case 'alternates'`), so a page
 * that declares any `alternates` must declare its complete cluster there.
 */
export const HOMEPAGE_LANGUAGE_ALTERNATES: HreflangCluster = hreflangClusterFor('/');
