/**
 * Audit I18N-10 (+ I-08) — the served document finally states its own language
 * over the wire.
 *
 * I18N-10 measured this directly: "Request to http://127.0.0.1:3000/ with
 * 'Accept-Language: hi-IN,hi;q=0.9,en;q=0.8' returned 200, Location header
 * absent, <html lang>=en, Content-Language absent." The negotiation half of
 * that finding was closed in an earlier wave (negotiateLocale in
 * lib/i18n/locales.ts, consumed as an OFFER by components/TranslationCoverageNotice),
 * and the routing half by the root redirect in middleware.ts. The one clause
 * left standing was the response header, which nothing in apps/web ever emitted
 * for a page — the only occurrence in the whole app was a per-article metadata
 * key on app/help/articles/[lang]/[slug].
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE INVARIANT UNDER TEST, AND WHY IT IS THE INTERESTING PART
 *
 * Content-Language describes the DOCUMENT, never the visitor's wish. That is
 * the same rule components/TranslationCoverageNotice learned the hard way for
 * <html lang> (see its rule 1): a Hindi-preferring visitor on /pujas gets a 100%
 * English document, because lib/t.ts is still called without a locale on all
 * nine wired pages. Announcing `Content-Language: hi` there would tell Google
 * and every assistive technology that English pricing and legal copy is Hindi —
 * strictly worse than saying nothing, and a fabricated claim about content.
 *
 * So the header is derived from the ROUTE and from nothing else. Two things
 * fall out of that, and both are pinned below:
 *
 *   - A cookie cannot change it. `/pujas` announces English to a visitor who
 *     chose Hindi, because /pujas IS English.
 *   - It therefore needs no `Vary`. The anonymous English page stays the single
 *     shared CDN entry it is today; adding `Vary: Accept-Language` to ~370
 *     routes on a free-tier box to carry one static header would be a real bill
 *     for nothing.
 *
 * The last test closes the loop the other way: whatever the middleware
 * announces for a locale route has to be what that page's own source declares,
 * so the header and the `<main lang>` the coverage notice reads can never drift.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';

import { middleware } from '../middleware';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, LOCALE_COOKIE } from '../lib/i18n/locales';

function request(url: string, cookies: Record<string, string> = {}) {
  const req = new NextRequest(new URL(`https://darshya.online${url}`));
  for (const [k, v] of Object.entries(cookies)) req.cookies.set(k, v);
  return req;
}

function contentLanguage(url: string, cookies: Record<string, string> = {}): string | null {
  return middleware(request(url, cookies)).headers.get('content-language');
}

/** Locale landings plus the localized city pages that ship under them. */
const LOCALE_ROUTES: { route: string; locale: string }[] = [
  { route: '/hi', locale: 'hi' },
  { route: '/ta', locale: 'ta' },
  { route: '/te', locale: 'te' },
  { route: '/bn', locale: 'bn' },
  { route: '/mr', locale: 'mr' },
  { route: '/ta/chennai', locale: 'ta' },
  { route: '/te/hyderabad', locale: 'te' },
  { route: '/mr/pune', locale: 'mr' },
];

/**
 * The other family of routes that carries its language in the path:
 * app/help/articles/[lang]/[slug]. Those pages ALREADY declare their language
 * in page metadata, so a route-shape rule that did not know about them would
 * have the response header contradicting the document's own declaration — a
 * regression this header would have introduced, not one it inherited.
 */
const HELP_ARTICLE_SLUG = 'how-to-book-a-puja';

describe('I18N-10 — every response says which language the document is in', () => {
  it('announces Hindi on the Hindi landing', () => {
    expect(contentLanguage('/hi')).toBe('hi');
  });

  it('announces the right language on every locale route, landings and city pages alike', () => {
    for (const { route, locale } of LOCALE_ROUTES) {
      expect(contentLanguage(route), route).toBe(locale);
    }
  });

  it('announces English on the English pages, rather than staying silent', () => {
    for (const route of ['/', '/pujas', '/temples', '/store', '/help']) {
      expect(contentLanguage(route), route).toBe(DEFAULT_LOCALE);
    }
  });

  it('matches on a whole path segment — /temples is not Telugu', () => {
    // '/te' is a locale and '/temples' starts with it. A prefix match here would
    // announce Telugu on the single most-visited category page in the product.
    expect(contentLanguage('/temples')).toBe(DEFAULT_LOCALE);
    expect(contentLanguage('/tenders')).toBe(DEFAULT_LOCALE);
    expect(contentLanguage('/hindi-calendar')).toBe(DEFAULT_LOCALE);
  });
});

describe('I18N-10 — the header never contradicts a page that declares its own language', () => {
  it('announces the article language on a localized help article', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const route = `/help/articles/${locale}/${HELP_ARTICLE_SLUG}`;
      expect(contentLanguage(route), route).toBe(locale);
    }
  });

  it('agrees with the declaration the article page already emits', () => {
    // app/help/articles/[lang]/[slug]/page.tsx sets a content-language entry in
    // its metadata from the [lang] segment. Two sources describing one document
    // must not disagree: an HTTP header saying English over a page declaring
    // Hindi is worse for Google than the silence I18N-10 originally found.
    const page = fs.readFileSync(
      path.join(process.cwd(), 'app', 'help', 'articles', '[lang]', '[slug]', 'page.tsx'),
      'utf8',
    );
    // Matches the metadata key in CODE, and only in code — the string is not
    // repeated in any comment near it.
    expect(page).toMatch(/["']content-language["']\s*:/);

    expect(contentLanguage(`/help/articles/hi/${HELP_ARTICLE_SLUG}`)).toBe('hi');
    expect(contentLanguage(`/help/articles/en/${HELP_ARTICLE_SLUG}`)).toBe(DEFAULT_LOCALE);
  });

  it('does not read a language out of an arbitrary third path segment', () => {
    // The rule is a known route shape, not "any segment that parses as a
    // locale". /store/orders/hi would otherwise become a Hindi document.
    expect(contentLanguage('/store/orders/hi')).toBe(DEFAULT_LOCALE);
    expect(contentLanguage('/help/hi')).toBe(DEFAULT_LOCALE);
    expect(contentLanguage(`/help/articles/zz/${HELP_ARTICLE_SLUG}`)).toBe(DEFAULT_LOCALE);
  });
});

describe('I18N-10 — the header describes the page, never the visitor', () => {
  it('still announces English on an English page to a visitor who chose Hindi', () => {
    // The whole point. /pujas renders through lib/t.ts with no locale, so it is
    // an English document no matter what this visitor picked. Claiming Hindi
    // would make a screen reader pronounce English prices with Hindi phonetics
    // and would tell Google the page is a Hindi alternate that it is not.
    expect(contentLanguage('/pujas', { [LOCALE_COOKIE]: 'hi' })).toBe(DEFAULT_LOCALE);
  });

  it('still announces Hindi on the Hindi landing to a visitor who chose English', () => {
    expect(contentLanguage('/hi', { [LOCALE_COOKIE]: 'en' })).toBe('hi');
  });

  it('agrees with the language the coverage notice will put on <html lang>', () => {
    // components/TranslationCoverageNotice reads `main[lang]` and writes it onto
    // document.documentElement. Two independent signals about the same document:
    // if they ever disagree the page contradicts its own headers.
    for (const { route, locale } of LOCALE_ROUTES) {
      expect(contentLanguage(route), route).toBe(locale);
    }
    expect(contentLanguage('/pujas')).toBe(DEFAULT_LOCALE);
  });
});

describe('I18N-10 — announcing the language costs the cache nothing', () => {
  it('adds no Vary to the anonymous English page, which stays one shared entry', () => {
    const res = middleware(request('/'));

    expect(res.headers.get('content-language')).toBe(DEFAULT_LOCALE);
    // Derived from the path alone, so nothing to vary on.
    expect(res.headers.get('vary')).toBeNull();
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('never varies on Accept-Language, which is not read here at all', () => {
    for (const route of ['/', '/pujas', '/hi']) {
      const vary = middleware(request(route)).headers.get('vary') ?? '';
      expect(vary.toLowerCase(), route).not.toContain('accept-language');
    }
  });
});

describe('I18N-10 — the header cannot drift from what the page itself declares', () => {
  /**
   * Comments are stripped before matching. Three guards broke earlier in this
   * audit by asserting against prose that merely quoted the thing being
   * searched for, and the files scanned here document their own lang handling
   * at length.
   */
  function sourceWithoutComments(file: string): string {
    return fs
      .readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  }

  it('every locale route declares, in its own source, the language the wire announces', () => {
    for (const { route, locale } of LOCALE_ROUTES) {
      const file = path.join(process.cwd(), 'app', ...route.split('/').filter(Boolean), 'page.tsx');
      expect(fs.existsSync(file), `${route} has no page`).toBe(true);

      const src = sourceWithoutComments(file);
      // Either the page renders <main lang="xx"> itself (app/hi, the city
      // pages) or it hands the code to components/LangLanding, which does.
      const declared =
        src.match(/<main[^>]*\slang="([a-z-]+)"/)?.[1] ??
        src.match(/\blangCode="([a-z-]+)"/)?.[1] ??
        null;

      expect(declared, `${route} declares no content language`).not.toBeNull();
      expect(declared, `${route} declares ${declared} but the wire says ${locale}`).toBe(locale);
      expect(contentLanguage(route), route).toBe(declared);
    }
  });

  it('covers every advertised locale — a new landing cannot ship unannounced', () => {
    const announced = new Set(LOCALE_ROUTES.map((r) => r.locale));
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === DEFAULT_LOCALE) continue;
      expect(announced.has(locale), `${locale} is advertised but untested here`).toBe(true);
      expect(contentLanguage(`/${locale}`)).toBe(locale);
    }
  });
});
