/**
 * Audit I-08 (+ I-02) — the stored language choice is finally allowed to route.
 *
 * I-08: "Accept-Language is never negotiated — no i18n config, no middleware
 * locale logic, no redirect." The first remediation wave shipped the parser
 * (`negotiateLocale`), the middleware locale logic, and the offer banner. What
 * it explicitly did NOT ship was the last clause: a redirect. So a visitor who
 * clicked हिन्दी, was given a cookie, and then tapped the logo landed back on
 * the English homepage — the cookie was written, read for disclosure, and then
 * ignored by routing. I-02's customer_impact is the same loop from the other
 * end: "reads one translated screen, clicks any call-to-action, and is in
 * English with no way back".
 *
 * WHAT IS DELIBERATELY STILL NOT DONE, AND WHY. The finding's fix text also
 * allows redirecting on an Accept-Language MATCH. We still refuse that, for the
 * reason already recorded in lib/i18n/locales.ts:112-119: hi.json covers a
 * fraction of en.json and ta/te/bn/mr have no catalog at all, so adopting a
 * locale from a request header would serve a mostly-English page while
 * asserting it is Hindi — to a visitor who never asked. A COOKIE is different
 * in kind: it exists only because somebody clicked a language link, and
 * lib/i18n/locales.ts only ever writes it in response to a `?lang=` click or a
 * `/xx` landing path. Honouring a choice is not fabricating one.
 *
 * The four hard constraints this redirect has to respect, each pinned below:
 *
 *   1. ROOT ONLY. The finding is explicit — "Never redirect on non-root paths
 *      until locale-scoped product routes exist, or users will be bounced to a
 *      landing page mid-flow." /hi/pujas is still a 404.
 *   2. NO COOKIE, NO REDIRECT. The anonymous English homepage must stay one
 *      shared CDN entry: no Set-Cookie, no Vary, no 307. Crawlers send no
 *      cookie, so Googlebot always sees the English `/` and the hreflang
 *      cluster is unaffected.
 *   3. EXPLICIT ENGLISH WINS. `?lang=en` stores 'en'; that visitor stays on `/`.
 *   4. A REDIRECT MUST NOT BE SHAREABLE. It varies on a cookie, so it carries
 *      `Vary: Cookie` and is not storable by a shared cache. A CDN that cached
 *      this 307 would send every anonymous visitor to /hi.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';

import { middleware } from '../middleware';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_NATIVE_NAMES,
} from '../lib/i18n/locales';

function request(url: string, cookies: Record<string, string> = {}) {
  const req = new NextRequest(new URL(`https://darshya.online${url}`));
  for (const [k, v] of Object.entries(cookies)) req.cookies.set(k, v);
  return req;
}

/** next/link prefetches every in-viewport link — scrolling is not navigating. */
function prefetch(url: string, cookies: Record<string, string> = {}) {
  const req = request(url, cookies);
  req.headers.set('RSC', '1');
  req.headers.set('Next-Router-Prefetch', '1');
  return req;
}

describe('I-08 — a stored language choice actually routes the visitor', () => {
  it('sends a visitor who chose Hindi to the Hindi landing instead of the English homepage', () => {
    const res = middleware(request('/', { [LOCALE_COOKIE]: 'hi' }));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://darshya.online/hi');
  });

  it('does the same for every advertised language, not just Hindi', () => {
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === DEFAULT_LOCALE) continue;
      const res = middleware(request('/', { [LOCALE_COOKIE]: locale }));
      expect(res.headers.get('location')).toBe(`https://darshya.online/${locale}`);
    }
  });

  it('normalises a region tag rather than redirecting to a route that does not exist', () => {
    const res = middleware(request('/', { [LOCALE_COOKIE]: 'hi-IN' }));
    expect(res.headers.get('location')).toBe('https://darshya.online/hi');
  });

  it('keeps the query string, so campaign attribution survives the redirect', () => {
    const res = middleware(request('/?utm_source=whatsapp', { [LOCALE_COOKIE]: 'hi' }));
    expect(res.headers.get('location')).toBe('https://darshya.online/hi?utm_source=whatsapp');
  });
});

describe('I-08 — the redirect never fires where it would do harm', () => {
  it('leaves the anonymous English homepage completely untouched (one CDN entry)', () => {
    const res = middleware(request('/'));

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('set-cookie')).toBeNull();
    // No Vary means the English homepage stays a single shared cache entry.
    expect(res.headers.get('vary')).toBeNull();
  });

  it('leaves a visitor who explicitly chose English on the English homepage', () => {
    const res = middleware(request('/', { [LOCALE_COOKIE]: 'en' }));

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('never bounces a visitor mid-flow — only the bare root redirects', () => {
    for (const p of ['/pujas', '/temples', '/store/checkout', '/dashboard', '/help']) {
      const res = middleware(request(p, { [LOCALE_COOKIE]: 'hi' }));
      expect(res.status, `${p} must not redirect`).toBe(200);
      expect(res.headers.get('location'), `${p} must not redirect`).toBeNull();
    }
  });

  it('does not loop: the landing it redirects to never redirects again', () => {
    const res = middleware(request('/hi', { [LOCALE_COOKIE]: 'hi' }));

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('does not hijack a prefetch — the client router cache must never hold a redirected "/"', () => {
    const res = middleware(prefetch('/', { [LOCALE_COOKIE]: 'hi' }));

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('END TO END: the "English →" link still escapes the Hindi landing for good', () => {
    // The trap this redirect could have created: /hi links back to "/?lang=en",
    // and if that only cleared the cookie AFTER the root had already bounced,
    // a visitor who chose Hindi could never reach the English homepage again.
    const escape = middleware(request('/?lang=en', { [LOCALE_COOKIE]: 'hi' }));
    expect(escape.status).toBe(307);
    expect(escape.headers.get('location')).toBe('https://darshya.online/');

    const setCookie = escape.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`${LOCALE_COOKIE}=en`);

    // Browser applies Set-Cookie, then follows to "/" — which must stay put.
    const landed = middleware(request('/', { [LOCALE_COOKIE]: 'en' }));
    expect(landed.status).toBe(200);
    expect(landed.headers.get('location')).toBeNull();
  });

  it('still sends a logged-out visitor to login rather than to their language landing', () => {
    const res = middleware(request('/admin', { [LOCALE_COOKIE]: 'hi' }));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/auth/login');
  });
});

describe('I-08 — the redirect is not shareable between visitors', () => {
  it('varies on the cookie it was decided by', () => {
    const res = middleware(request('/', { [LOCALE_COOKIE]: 'hi' }));
    expect(res.headers.get('vary')).toContain('Cookie');
  });

  it('forbids a shared cache from storing it — a cached 307 would send everyone to /hi', () => {
    const res = middleware(request('/', { [LOCALE_COOKIE]: 'hi' }));
    const cc = res.headers.get('cache-control') ?? '';

    expect(cc).toMatch(/no-store|private/);
  });
});

/**
 * I-11 / I18N-04 is "four different, mutually inconsistent lists of supported
 * languages". lib/i18n/locales.ts was made the web side's single source of
 * truth in the first wave; these are the teeth. They are REGRESSION GUARDS, not
 * a fix — they pass today. The lists that still genuinely disagree are outside
 * this lane and are named in the finding: components/LanguageSwitcher.tsx:8
 * ('en'|'hi'), apps/api/src/lib/error-i18n.ts:14 (adds kn, drops bn+mr),
 * lib/support.ts:694 (claims seven, including Kannada), and the Prisma
 * preferred_language enum (ten).
 *
 * What these DO buy is that the new redirect can never point at a 404, and
 * that adding a seventh footer link without a landing page fails the build
 * instead of shipping the exact harm I18N-04 describes.
 */
describe('I-08 / I18N-04 — the redirect can only ever target a page that exists', () => {
  it('every advertised locale has a landing route to be redirected to', () => {
    const appDir = path.join(process.cwd(), 'app');

    for (const locale of SUPPORTED_LOCALES) {
      if (locale === DEFAULT_LOCALE) continue;
      const landing = path.join(appDir, locale, 'page.tsx');
      expect(fs.existsSync(landing), `${locale} is advertised but ${landing} is missing`).toBe(true);
    }
  });

  it('the root layout advertises exactly the locales this module can serve', () => {
    const layout = fs.readFileSync(path.join(process.cwd(), 'app', 'layout.tsx'), 'utf8');

    // Every hreflang the layout emits — the footer "Read in:" switcher and the
    // <link rel="alternate"> block both use it. 'x-default' is not a language
    // and does not match.
    const advertised = new Set(
      [...layout.matchAll(/hrefLang="([a-z]{2})"/g)].map((m) => m[1]),
    );

    expect([...advertised].sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });

  it('renders each language under the same native name this module declares', () => {
    // locales.ts:52-54 says the native names live there "so the list, the
    // parser and the labels cannot drift apart". This is that claim, checked.
    const layout = fs.readFileSync(path.join(process.cwd(), 'app', 'layout.tsx'), 'utf8');

    for (const locale of SUPPORTED_LOCALES) {
      if (locale === DEFAULT_LOCALE) continue;
      expect(layout, `footer label for ${locale}`).toContain(LOCALE_NATIVE_NAMES[locale]);
    }
  });
});
