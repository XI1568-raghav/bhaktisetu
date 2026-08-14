/**
 * i18n plumbing regression tests (audit findings I-01, I-02, I18N-01, 2026-08-12).
 *
 * I-01   — lib/t.ts hard-imported en.json and closed over it at module scope, so
 *          `t(ns)` could only ever return English. No signature accepted a locale
 *          and no caller could pass one.
 * I-02 / I18N-01
 *        — the footer "Read in:" block links /hi /ta /te /bn /mr, but the active
 *          locale was stored nowhere and every onward link from those landings
 *          dropped straight back to English.
 *
 * These tests pin the ENGINEERING half of the fix: a real locale parameter, a
 * working per-locale lookup with an HONEST fallback (English is still rendered,
 * but it is marked as English rather than passed off as the target language),
 * one persistence mechanism (the `poojly_language` cookie), and onward links
 * that carry the locale.
 *
 * They deliberately do NOT assert translation COVERAGE — supplying 374 keys x 5
 * languages of devotional and legal copy is a content task, not a code one.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import en from '../lib/i18n/en.json';
import { t, useTranslations, getTranslations, localeCoverage, CATALOGS } from '../lib/t';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_QUERY_PARAM,
  isLocale,
  normalizeLocale,
  localeFromPathname,
  localeHref,
  resolveRequestLocale,
  readClientLocale,
  syncClientLocale,
  type Locale,
} from '../lib/i18n/locales';
import { middleware } from '../middleware';

function request(url: string, cookies: Record<string, string> = {}) {
  const req = new NextRequest(new URL(`https://darshya.online${url}`));
  for (const [k, v] of Object.entries(cookies)) req.cookies.set(k, v);
  return req;
}

/**
 * A Next.js `<Link>` prefetch. next/link prefetches every in-viewport link, and
 * the prefetch is a same-origin fetch — so any Set-Cookie on its response is
 * applied by the browser exactly as if the visitor had clicked.
 */
function prefetch(url: string, cookies: Record<string, string> = {}) {
  const req = request(url, cookies);
  req.headers.set('RSC', '1');
  req.headers.set('Next-Router-Prefetch', '1');
  return req;
}

// ── I-01: the translator actually takes a locale ────────────────────────────

describe('I-01 — the web translator has a real locale parameter', () => {
  it('returns a DIFFERENT string for two locales', () => {
    const enT = t('nav', 'en');
    const hiT = t('nav', 'hi');

    expect(enT('darshan')).toBe('Darshan');
    expect(hiT('darshan')).not.toBe(enT('darshan'));
    // and it is genuinely Devanagari, not a marker or the key name
    expect(hiT('darshan')).toMatch(/[ऀ-ॿ]/);
  });

  it('still defaults to English so the existing call sites are unchanged', () => {
    expect(t('nav')('darshan')).toBe('Darshan');
    expect(useTranslations('nav')('pujas')).toBe(en.nav.pujas);
  });

  it('exposes the same locale parameter on all three entry points', async () => {
    expect(t('nav', 'hi')('pujas')).toBe(useTranslations('nav', 'hi')('pujas'));
    expect((await getTranslations('nav', 'hi'))('pujas')).toBe(t('nav', 'hi')('pujas'));
  });

  it('carries the resolved locale on the translator itself', () => {
    expect(t('nav', 'hi').locale).toBe('hi');
    expect(t('nav').locale).toBe(DEFAULT_LOCALE);
  });

  it('falls back to the key (not undefined) for a key absent from every catalog', () => {
    const tr = t('nav', 'hi') as unknown as (k: string) => string;
    expect(tr('thisKeyDoesNotExist')).toBe('thisKeyDoesNotExist');
  });
});

// ── I-01: the fallback is honest rather than silent ─────────────────────────

describe('I-01 — untranslated strings fall back VISIBLY, not silently', () => {
  it('marks a fallback string as English so it can be rendered lang="en"', () => {
    // "Refund Policy" is deliberately NOT in hi.json — mistranslating a refund
    // policy label is worse than showing English (owner decision, see report).
    const hiFooter = t('footer', 'hi');
    const missing = hiFooter.entry('refunds');

    expect(missing.text).toBe(en.footer.refunds); // still usable
    expect(missing.fallback).toBe(true); // but honestly labelled
    expect(missing.lang).toBe('en'); // -> <span lang="en">
    expect(hiFooter.has('refunds')).toBe(false);
  });

  it('marks a genuinely translated string as being in the target locale', () => {
    const hiNav = t('nav', 'hi');
    const hit = hiNav.entry('darshan');

    expect(hit.fallback).toBe(false);
    expect(hit.lang).toBe('hi');
    expect(hiNav.has('darshan')).toBe(true);
  });

  it('never reports a fallback for English itself', () => {
    const enFooter = t('footer', 'en');
    expect(enFooter.entry('refunds').fallback).toBe(false);
    expect(enFooter.entry('refunds').lang).toBe('en');
  });

  it('reports truthful per-locale coverage instead of implying a full translation', () => {
    const enCov = localeCoverage('en');
    expect(enCov.ratio).toBe(1);

    const hiCov = localeCoverage('hi');
    expect(hiCov.total).toBe(enCov.total);
    expect(hiCov.translated).toBeGreaterThan(0); // the mechanism is real
    expect(hiCov.ratio).toBeLessThan(1); // and honest about the gap
    expect(hiCov.ratio).toBeGreaterThan(0);

    // A locale with no catalog at all must report 0, not silently claim English.
    expect(localeCoverage('ta').translated).toBe(0);
    expect(localeCoverage('ta').ratio).toBe(0);
  });
});

// ── Catalog hygiene: non-en files may be partial, never divergent ───────────

describe('catalog discipline', () => {
  it('every non-English key exists in en.json (no orphaned/drifted keys)', () => {
    const enDict = en as unknown as Record<string, Record<string, string>>;
    const orphans: string[] = [];

    for (const [locale, catalog] of Object.entries(CATALOGS)) {
      if (locale === 'en') continue;
      for (const [ns, entries] of Object.entries(catalog as Record<string, Record<string, string>>)) {
        if (!enDict[ns]) {
          orphans.push(`${locale}.${ns}`);
          continue;
        }
        for (const key of Object.keys(entries)) {
          if (!(key in enDict[ns])) orphans.push(`${locale}.${ns}.${key}`);
        }
      }
    }

    expect(orphans).toEqual([]);
  });

  it('every advertised locale is resolvable, even with no catalog yet', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(() => t('nav', locale)).not.toThrow();
      expect(t('nav', locale)('darshan')).toBeTruthy();
    }
  });
});

// ── I-02 / I18N-01: onward links preserve the active locale ─────────────────

describe('I-02 / I18N-01 — onward links preserve the active locale', () => {
  it('carries the locale on a link out of a locale landing page', () => {
    // Today every LangLanding CTA is a bare "/pujas" and the locale is lost.
    expect(localeHref('/pujas', 'hi')).not.toBe('/pujas');
    expect(localeHref('/pujas', 'hi')).toContain(`${LOCALE_QUERY_PARAM}=hi`);
  });

  it('leaves English links untouched so nothing changes for the default locale', () => {
    expect(localeHref('/pujas', 'en')).toBe('/pujas');
    expect(localeHref('/', 'en')).toBe('/');
  });

  it('merges with an existing query string and keeps the hash last', () => {
    expect(localeHref('/pujas?tier=premium', 'ta')).toBe('/pujas?tier=premium&lang=ta');
    expect(localeHref('/pujas#book', 'ta')).toBe('/pujas?lang=ta#book');
  });

  it('does not double-append when the link already carries a locale', () => {
    expect(localeHref('/pujas?lang=hi', 'hi')).toBe('/pujas?lang=hi');
  });

  it('leaves external and non-path hrefs alone', () => {
    expect(localeHref('https://example.com/x', 'hi')).toBe('https://example.com/x');
    expect(localeHref('mailto:support@darshya.online', 'hi')).toBe('mailto:support@darshya.online');
  });
});

// ── One persistence mechanism: the poojly_language cookie ───────────────────

describe('locale persistence — one mechanism, the poojly_language cookie', () => {
  it('reuses the language key the app already stores rather than inventing a second one', () => {
    expect(LOCALE_COOKIE).toBe('poojly_language');
  });

  it('normalises region tags and rejects junk', () => {
    expect(normalizeLocale('hi-IN')).toBe('hi');
    expect(normalizeLocale('HI')).toBe('hi');
    expect(normalizeLocale('kn')).toBe(DEFAULT_LOCALE); // no kn landing exists
    expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale('../../etc/passwd')).toBe(DEFAULT_LOCALE);
    expect(isLocale('hi')).toBe(true);
    expect(isLocale('xx')).toBe(false);
  });

  it('reads the locale out of a landing path', () => {
    expect(localeFromPathname('/hi')).toBe('hi');
    expect(localeFromPathname('/ta/')).toBe('ta');
    expect(localeFromPathname('/hindi')).toBeNull(); // prefix must be a full segment
    expect(localeFromPathname('/pujas')).toBeNull();
  });

  it('resolves an explicit ?lang above the path, and the path above the cookie', () => {
    const q = new URLSearchParams('lang=ta');
    expect(resolveRequestLocale({ pathname: '/hi', search: q, cookie: 'bn' }).locale).toBe('ta');
    expect(resolveRequestLocale({ pathname: '/hi', search: new URLSearchParams(), cookie: 'bn' }).locale).toBe('hi');
    expect(resolveRequestLocale({ pathname: '/pujas', search: new URLSearchParams(), cookie: 'bn' }).locale).toBe('bn');
    expect(resolveRequestLocale({ pathname: '/pujas', search: new URLSearchParams(), cookie: null }).locale).toBe(DEFAULT_LOCALE);
  });
});

// ── I-03 / I18N-05: ONE language store, not two with the same name ──────────

describe('I-03 / I18N-05 — the two language stores are reconciled', () => {
  // The product ended up with two persistence mechanisms sharing one key name
  // and never speaking to each other:
  //
  //   components/LanguageSwitcher.tsx:24,78  ->  localStorage['poojly_language']
  //   middleware.ts:73 + lib/i18n/locales.ts:32 ->  cookie  poojly_language
  //
  // So the only in-app switcher wrote somewhere the server can never read, and
  // the footer landings wrote somewhere the switcher never reads. Each half
  // silently discarded the other half's choice.
  const clearBoth = () => {
    document.cookie = `${LOCALE_COOKIE}=; max-age=0; path=/`;
    window.localStorage.removeItem(LOCALE_COOKIE);
  };

  beforeEach(clearBoth);
  afterEach(clearBoth);

  it('sees a choice made by the in-app switcher, which only writes localStorage', () => {
    window.localStorage.setItem(LOCALE_COOKIE, 'hi');

    expect(readClientLocale()).toBe('hi');
  });

  it('promotes that choice to the cookie so the server side can act on it at all', () => {
    window.localStorage.setItem(LOCALE_COOKIE, 'hi');

    expect(syncClientLocale()).toBe('hi');
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=hi`);
  });

  it('mirrors a footer/landing choice back into the store the switcher reads', () => {
    document.cookie = `${LOCALE_COOKIE}=ta; path=/`;

    expect(syncClientLocale()).toBe('ta');
    expect(window.localStorage.getItem(LOCALE_COOKIE)).toBe('ta');
  });

  it('lets the cookie win a conflict — it is what this URL just asked for', () => {
    // Visitor had picked Hindi in the /content switcher months ago, then just
    // clicked தமிழ் in the footer and landed on /ta.
    window.localStorage.setItem(LOCALE_COOKIE, 'hi');
    document.cookie = `${LOCALE_COOKIE}=ta; path=/`;

    expect(syncClientLocale()).toBe('ta');
    expect(window.localStorage.getItem(LOCALE_COOKIE)).toBe('ta');
  });

  it('writes NOTHING for a visitor who never chose a language (keeps pages CDN-cacheable)', () => {
    expect(syncClientLocale()).toBe(DEFAULT_LOCALE);
    // No cookie with an actual value — an anonymous English page view must not
    // acquire a Set-Cookie, or every page stops being a single shared CDN entry.
    expect(document.cookie).not.toMatch(new RegExp(`${LOCALE_COOKIE}=[^;\\s]`));
    expect(window.localStorage.getItem(LOCALE_COOKIE)).toBeNull();
  });

  it('ignores junk in either store instead of propagating it', () => {
    window.localStorage.setItem(LOCALE_COOKIE, '../../etc/passwd');

    expect(readClientLocale()).toBeNull();
    expect(syncClientLocale()).toBe(DEFAULT_LOCALE);
  });

  it('normalises a region tag written by either side', () => {
    window.localStorage.setItem(LOCALE_COOKIE, 'hi-IN');

    expect(syncClientLocale()).toBe('hi');
    expect(window.localStorage.getItem(LOCALE_COOKIE)).toBe('hi');
  });
});

// ── Middleware: the switcher choice actually sticks ─────────────────────────

describe('middleware — the language choice persists across navigation', () => {
  it('stores the locale when a visitor lands on /hi', () => {
    const res = middleware(request('/hi'));
    expect(res.cookies.get(LOCALE_COOKIE)?.value).toBe('hi');
  });

  it.each(['hi', 'ta', 'te', 'bn', 'mr'] as Locale[])(
    'stores the locale for the /%s landing the footer advertises',
    (locale) => {
      const res = middleware(request(`/${locale}`));
      expect(res.cookies.get(LOCALE_COOKIE)?.value).toBe(locale);
    },
  );

  it('END TO END: an onward link out of /hi keeps the visitor in Hindi', () => {
    // 1. visitor lands on the Hindi landing -> locale is stored
    const landing = middleware(request('/hi'));
    const stored = landing.cookies.get(LOCALE_COOKIE)?.value;
    expect(stored).toBe('hi');

    // 2. a feature card links onward with the locale attached
    const onward = localeHref('/pujas', 'hi');
    expect(onward).toBe('/pujas?lang=hi');

    // 3. following it keeps the locale (and cleans the URL back up)
    const next = middleware(request(onward, { [LOCALE_COOKIE]: stored! }));
    expect(next.cookies.get(LOCALE_COOKIE)?.value).toBe('hi');

    // 4. and the page that renders reads Hindi, not English
    const url = new URL(next.headers.get('location') ?? 'https://darshya.online/pujas');
    expect(url.searchParams.get(LOCALE_QUERY_PARAM)).toBeNull(); // no indexable ?lang duplicate
    expect(t('nav', 'hi')('pujas')).not.toBe(t('nav', 'en')('pujas'));
  });

  it('strips ?lang from the URL so no duplicate locale URLs get indexed', () => {
    const res = middleware(request('/pujas?lang=hi'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://darshya.online/pujas');
    expect(res.cookies.get(LOCALE_COOKIE)?.value).toBe('hi');
  });

  it('does NOT emit Set-Cookie on an ordinary request (keeps pages CDN-cacheable)', () => {
    const res = middleware(request('/pujas'));
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(res.status).toBe(200);
  });

  it('does not rewrite the cookie when it already matches the landing', () => {
    const res = middleware(request('/hi', { [LOCALE_COOKIE]: 'hi' }));
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('varies the cache on Cookie once a non-default locale is in play', () => {
    const res = middleware(request('/pujas', { [LOCALE_COOKIE]: 'hi' }));
    expect(res.headers.get('vary') ?? '').toContain('Cookie');
  });

  it('still gates the portals it gated before (no regression on the auth middleware)', () => {
    const out = middleware(request('/admin'));
    expect(out.status).toBe(307);
    expect(out.headers.get('location')).toBe(
      'https://darshya.online/auth/login?redirect=%2Fadmin',
    );

    const inn = middleware(request('/admin', { poojly_user: '{"id":"u1"}' }));
    expect(inn.status).toBe(200);
  });

  it('leaves public pages alone', () => {
    const res = middleware(request('/temples'));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });
});

// ── A prefetch is not a choice ───────────────────────────────────────────────

describe('the locale is only ever changed by a real navigation, never a prefetch', () => {
  // The footer "Read in:" block (app/layout.tsx:572-578) renders <Link href="/hi">
  // … <Link href="/mr"> on EVERY page of the product, and next/link prefetches
  // links as they enter the viewport. Those prefetches are same-origin fetches,
  // so a Set-Cookie on the response is stored by the browser just as a click's
  // would be. Treating a prefetch as a locale signal therefore means:
  //
  //   - Scrolling to the footer of any English page silently sets the visitor's
  //     locale to whichever of /hi /ta /te /bn /mr was prefetched last. They get
  //     a Marathi coverage disclosure, `Vary: Cookie` starts splitting the CDN
  //     entry for a page they never asked to change, and they never clicked
  //     anything.
  //   - Worse in the other direction: the same footer carries "/?lang=en", so a
  //     Hindi visitor scrolling to the bottom of ANY page has their Hindi
  //     choice erased.
  //
  // A locale change must require intent.

  it('does not adopt a locale from a prefetch of a footer language link', () => {
    const res = middleware(prefetch('/mr'));

    expect(res.cookies.get(LOCALE_COOKIE)?.value).toBeUndefined();
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('does not ERASE a stored locale when the footer English link is prefetched', () => {
    const res = middleware(prefetch('/?lang=en', { [LOCALE_COOKIE]: 'hi' }));

    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('does not adopt a locale from a prefetched ?lang= link either', () => {
    const res = middleware(prefetch('/pujas?lang=ta'));

    expect(res.cookies.get(LOCALE_COOKIE)?.value).toBeUndefined();
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('honours the browser-level prefetch hint too, not just the Next.js one', () => {
    // Chrome speculation-rules / prefetch-proxy requests carry Sec-Purpose
    // rather than Next-Router-Prefetch.
    const req = request('/hi');
    req.headers.set('Sec-Purpose', 'prefetch;anonymous-client-ip');

    expect(middleware(req).headers.get('set-cookie')).toBeNull();
  });

  it('STILL stores the locale when the visitor actually navigates there', () => {
    // The guard must not disarm the fix it is protecting.
    expect(middleware(request('/mr')).cookies.get(LOCALE_COOKIE)?.value).toBe('mr');
    expect(middleware(request('/pujas?lang=ta')).cookies.get(LOCALE_COOKIE)?.value).toBe('ta');
  });

  it('still serves the prefetched page rather than blocking it', () => {
    // Suppressing the cookie must not turn a prefetch into an error or a
    // redirect loop — the payload is what the router came for.
    const res = middleware(prefetch('/mr'));
    expect(res.status).toBe(200);
  });
});
