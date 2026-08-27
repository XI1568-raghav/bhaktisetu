// Server-side portal session gate (audit remediation P1-16, 2026-07-10)
// + active-locale persistence (audit I-02 / I18N-01, 2026-08-12).
//
// SECURITY MODEL: this middleware checks ONLY "session exists" — it verifies
// the `poojly_user` cookie is present and non-empty. It deliberately does NOT
// trust the `role` field inside that cookie. The cookie is client-set
// (auth-context setCookie: lib/auth-context.tsx:264-266) as plain,
// unsigned, non-HttpOnly JSON, so its `role` value is user-spoofable.
// Gating on it here would let an attacker set `role:'admin'` in their cookie
// and bypass the shell flash — reducing real protection to nothing.
//
// Role enforcement is API-side: every portal API call is authenticated by the
// server against the real session/JWT, and the client AuthGuard
// (AuthGuard in lib/auth-context) renders the correct portal shell only after
// the server confirms the role. This middleware is defence-in-depth + UX only:
// it stops the page shell from rendering for a fully logged-out user (no
// cookie at all) and avoids a flash of gated chrome before the client redirect
// can fire. A user with ANY cookie passes this gate; the API + AuthGuard are
// the real authorization boundary.
//
// LOCALE MODEL: the footer switcher sends visitors to /hi /ta /te /bn /mr, but
// before this change the choice was stored NOWHERE — the first onward click
// dropped them back into English with nothing to remember them by. Middleware
// is the right home for that because it is the only place that already runs on
// every request without forcing any page to render dynamically. It normalises
// the three ways a locale can arrive (an explicit ?lang=, a /xx landing path,
// an existing cookie) down to one durable store: the `poojly_language` cookie.
// See lib/i18n/locales.ts for the precedence rules.

import { NextResponse, type NextRequest } from 'next/server';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_QUERY_PARAM,
  contentLanguageFor,
  normalizeLocale,
  resolveRequestLocale,
  type Locale,
} from './lib/i18n/locales';

// Portal path prefixes that require a logged-in session to render.
// NOTE: these are no longer role-gated — see comment above.
//
// A-003 / A-013 (2026-08-10): `/temple-portal` and `/payouts` were missing, so
// they were the only AuthGuard-wrapped surfaces with no server-side gate — a
// logged-out visitor got a 200 + shell flash + client redirect instead of the
// clean 307 the other portals emit. Both are 100% authenticated pages (every
// route under them is wrapped in <AuthGuard>), so gating them costs no public
// content.
//
// `config.matcher` below is now broad (locale handling has to see every page),
// so THIS LIST is the sole definition of which paths are gated — the matcher no
// longer needs to mirror it. Adding a portal here is enough.
const PORTAL_PREFIXES = [
  '/admin',
  '/priest',
  '/store-admin',
  '/astrologer-portal',
  '/wellness-portal',
  '/gaushala-portal',
  '/temple-portal',
  '/payouts',
];

// A session exists iff the poojly_user cookie is present and non-empty.
// We intentionally do NOT parse or trust the `role` field inside it.
//
// ── SEC-02, STEP 4: this gate is COSMETIC, and cannot currently be made
//    otherwise. Stated plainly so nobody mistakes it for a security boundary.
//
// `poojly_user` is JS-readable and client-writable, so anyone can set it and
// walk past this check. That buys them a rendered shell and nothing else: every
// portal route fetches its data from the API, and the API authorises each
// request itself (middlewares/auth.ts + requireRole). This gate exists to send
// a signed-OUT visitor to /auth/login instead of showing them an empty screen —
// it is UX, not authorization.
//
// The obvious hardening — gate on the httpOnly `darshya_session` instead — DOES
// NOT WORK HERE, and it is worth recording why before someone tries it:
// apps/api sets that cookie with NO `domain` option (routes/auth.ts,
// setAuthCookies), so it is a HOST-ONLY cookie for api.darshya.online. The web
// app is served from darshya.online, a different host, so the browser never
// sends `darshya_session` to Next at all and `req.cookies.get('darshya_session')`
// would be undefined for every signed-in user. Switching the gate would
// redirect 100% of authenticated traffic to /auth/login.
//
// Making it real needs a cross-host session cookie (`domain=.darshya.online`,
// which widens the cookie's exposure and is a deliberate security decision), or
// a first-party /api proxy route on darshya.online. Both are larger changes than
// SEC-02's localStorage work and are NOT prerequisites for it — the token can
// leave localStorage without touching this gate at all.
function hasSession(req: NextRequest): boolean {
  const raw = req.cookies.get('poojly_user')?.value;
  return !!raw && raw.trim().length > 0;
}

/**
 * A prefetch is not a choice.
 *
 * next/link prefetches every in-viewport link, and a prefetch is a same-origin
 * fetch — so a Set-Cookie on its response is stored by the browser exactly as a
 * clicked navigation's would be. The footer "Read in:" block
 * (app/layout.tsx:572-578) puts <Link href="/hi"> … <Link href="/mr"> plus
 * "/?lang=en" on EVERY page of the product, which made both directions wrong:
 * scrolling to the footer of an English page silently adopted whichever locale
 * was prefetched last, and scrolling to the footer while reading in Hindi
 * silently erased that choice back to English. Neither involved a click.
 *
 * So the locale is read from prefetches (the page still renders correctly for
 * whatever is already stored) but never WRITTEN by one. `Next-Router-Prefetch`
 * is what next/link sends; `Sec-Purpose` / `Purpose` cover browser-level
 * speculation-rules prefetches and the Google prefetch proxy.
 *
 * ── 2026-08-28. Two changes have been proposed to this function and BOTH are
 *    regressions. Measured against next 15.5.20 in this workspace, and pinned
 *    by __tests__/i18n-prefetch-detection.i08.test.ts:
 *
 *    • "the next-router-prefetch branch is dead, drop it" — it is not. The
 *      classic prefetch path sets it for PrefetchKind.AUTO, which is the
 *      <Link> default and what every `/`- and `?lang=`-targeting link in this
 *      app uses (client/components/router-reducer/fetch-server-response.js:77).
 *      Middleware runs inside the Next server on Render, so no adapter is
 *      between the browser and this line to remove it. The segment cache sends
 *      the same header with the value '2', which is why this is a truthiness
 *      check and not `=== '1'`.
 *
 *    • "detect the prefetch by the `_rsc` union query instead" — `_rsc` is a
 *      cache-buster appended to EVERY RSC fetch, navigations included
 *      (router-reducer/set-cache-busting-search-param.js:52-56). Using it here
 *      classifies a real click as a prefetch, so the root redirect stops
 *      firing and `?lang=` stops storing the choice — i.e. it un-fixes I-08.
 *
 *    THE GAP THAT IS REAL: `prefetch` (PrefetchKind.FULL) and the segment
 *    cache's FetchStrategy.Full send `RSC: 1` with no prefetch header at all,
 *    so they are indistinguishable from a soft navigation and this function
 *    cannot see them. Latent today — no <Link> to `/` or `?lang=` sets
 *    `prefetch`, and experimental.clientSegmentCache is off — but if that
 *    changes, the fix is at the call site (drop the prefetch, or make the
 *    redirect safe for the Router Cache), never in header sniffing.
 */
function isPrefetch(req: NextRequest): boolean {
  const h = req.headers;
  if (h.get('next-router-prefetch')) return true;
  if ((h.get('sec-purpose') ?? '').toLowerCase().includes('prefetch')) return true;
  if ((h.get('purpose') ?? '').toLowerCase() === 'prefetch') return true;
  return h.get('x-moz') === 'prefetch';
}

function storeLocale(res: NextResponse, locale: Locale): void {
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax',
    // Readable by the client switcher, which already owned this key.
    httpOnly: false,
  });
}

/**
 * Attach locale state to an outgoing response.
 *
 * Two rules matter for cost, and both are deliberate:
 *
 *  - Set-Cookie is written ONLY when the stored value would actually change.
 *    Writing it on every response would make every page uncacheable at the
 *    Cloudflare edge, which on a free-tier Render box is a real bill.
 *  - `Vary: Cookie` is added only once a non-English locale is in play, so the
 *    English copy stays the single shared cache entry it is today and only
 *    locale-carrying requests get their own.
 */
function withLocale(req: NextRequest, res: NextResponse): NextResponse {
  const stored = req.cookies.get(LOCALE_COOKIE)?.value ?? null;
  const { locale, source } = resolveRequestLocale({
    pathname: req.nextUrl.pathname,
    search: req.nextUrl.searchParams,
    cookie: stored,
  });

  if (source !== 'default' && normalizeLocale(stored) !== locale && !isPrefetch(req)) {
    storeLocale(res, locale);
  }
  if (locale !== DEFAULT_LOCALE) {
    res.headers.set('Vary', 'Cookie');
  }
  return res;
}

/**
 * Let a language the visitor ACTUALLY CHOSE route them — audit I-08, and the
 * back half of I-02.
 *
 * Until now the `poojly_language` cookie was written on a click, read for the
 * coverage disclosure, and then ignored by routing: a visitor who tapped
 * हिन्दी, read /hi, and then tapped the logo was returned to the English
 * homepage. I-02 measured that same loop from the other side — "reads one
 * translated screen, clicks any call-to-action, and is in English with no way
 * back". This is the "no redirect" clause of I-08.
 *
 * FOUR THINGS THIS DOES NOT DO, EACH ON PURPOSE:
 *
 *  - It does not read Accept-Language. `negotiateLocale` exists and is used,
 *    but only to OFFER (components/TranslationCoverageNotice). A header is not
 *    a choice, and at hi.json's coverage adopting one would serve a
 *    mostly-English page while asserting it is Hindi. Hence `source: 'cookie'`
 *    — the cookie only exists because somebody clicked a language link.
 *  - It does not touch any path but the bare root. The finding is explicit:
 *    never bounce a visitor mid-flow, and /hi/pujas is still a 404.
 *  - It does not fire without a cookie, so the anonymous English homepage is
 *    byte-for-byte what it is today — no Set-Cookie, no Vary, no 307, one
 *    shared CDN entry. Crawlers send no cookie, so Googlebot always indexes
 *    the English `/` and the hreflang cluster is untouched.
 *  - It does not fire on a prefetch. next/link prefetches the header logo on
 *    every page; letting that prefetch follow the redirect would park /hi's
 *    payload in the Next 15 client Router Cache under the href `/`, where it
 *    would survive a later switch back to English. Refusing costs nothing —
 *    the cached entry is then plain `/`, exactly today's behaviour.
 */
function rootLocaleRedirect(req: NextRequest): NextResponse | null {
  if (req.nextUrl.pathname !== '/') return null;
  if (isPrefetch(req)) return null;

  const { locale, source } = resolveRequestLocale({
    pathname: req.nextUrl.pathname,
    search: req.nextUrl.searchParams,
    cookie: req.cookies.get(LOCALE_COOKIE)?.value ?? null,
  });

  // 'cookie' is the only source that can reach here (root has no locale
  // segment, and `?lang=` was already consumed above), and resolveRequestLocale
  // never reports it for English — so this is exactly "they chose a language".
  if (source !== 'cookie' || locale === DEFAULT_LOCALE) return null;

  const target = req.nextUrl.clone();
  target.pathname = `/${locale}`;

  // withLocale adds `Vary: Cookie`, which this response MUST carry: it was
  // decided by a cookie, and a shared cache that served it to an anonymous
  // visitor would send the whole internet to /hi. `no-store` is the belt to
  // that braces — a cached 307 on `/` is unrecoverable from the client side.
  const res = withLocale(req, NextResponse.redirect(target, 307));
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

/**
 * State the language of the document being returned — audit I18N-10, whose
 * probe recorded "200, Location header absent, <html lang>=en, Content-Language
 * absent" and found no occurrence of the header anywhere in apps/web outside
 * one help-article metadata key.
 *
 * Applied only to the pass-through response, because that is the only one of
 * the four that carries a document; a 307 has no body to describe.
 *
 * The value comes from the ROUTE, never from the visitor's cookie — see
 * `contentLanguageFor` for why claiming Hindi on an English page is worse than
 * claiming nothing. That is also what keeps this free: nothing to `Vary` on, so
 * the anonymous English page remains a single shared cache entry.
 */
function withContentLanguage(req: NextRequest, res: NextResponse): NextResponse {
  res.headers.set('Content-Language', contentLanguageFor(req.nextUrl.pathname));
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // An explicit ?lang= is a just-made choice. Persist it, then bounce to the
  // clean URL so we never publish two indexable URLs for the same page — the
  // cookie carries the locale from here on. Mirrors the `?lang=` convention the
  // API already uses in apps/api/src/lib/error-i18n.ts.
  if (searchParams.has(LOCALE_QUERY_PARAM)) {
    const clean = req.nextUrl.clone();
    clean.searchParams.delete(LOCALE_QUERY_PARAM);
    const res = NextResponse.redirect(clean, 307);
    // A prefetch of this link is not the visitor choosing a language — see
    // isPrefetch(). Still redirect, so the router warms the destination it will
    // actually land on; just do not record a choice nobody made.
    if (!isPrefetch(req)) {
      storeLocale(res, normalizeLocale(searchParams.get(LOCALE_QUERY_PARAM)));
    }
    return res;
  }

  const isPortal = PORTAL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );

  if (isPortal && !hasSession(req)) {
    // No session cookie at all → redirect to login, preserving the intended
    // destination for post-login bounce-back.
    const signIn = new URL('/auth/login', req.url);
    signIn.searchParams.set('redirect', pathname);
    return withLocale(req, NextResponse.redirect(signIn, 307));
  }

  const rooted = rootLocaleRedirect(req);
  if (rooted) return rooted;

  return withContentLanguage(req, withLocale(req, NextResponse.next()));
}

export const config = {
  // Broad by necessity: the locale cookie has to be observable on every page,
  // not just the portals. Excludes Next internals and anything with a file
  // extension so static assets never pay for it. Running here does NOT make
  // pages render dynamically — the 61 routes with generateStaticParams stay
  // prerendered.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)'],
};
