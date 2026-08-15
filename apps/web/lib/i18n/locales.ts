/**
 * The one place that decides what "a supported language" means on the web app.
 *
 * Audit I-02 / I18N-01 / I18N-04 (2026-08-12): the product carried four
 * mutually inconsistent language lists and no shared notion of an "active"
 * locale at all. This module is the single source of truth for the web side:
 * the list, the storage key, and the rules for reading a locale off a request
 * and putting one onto a link.
 *
 * STORAGE MECHANISM — one, not two. The app already persisted a language
 * choice under the key `poojly_language` (components/LanguageSwitcher.tsx wrote
 * it to localStorage). We promote that same key to a cookie so the SERVER can
 * read it too, because everything that renders chrome is a server component.
 * `?lang=xx` exists only as a bootstrap for links (matching the API's existing
 * `?lang=` convention in apps/api/src/lib/error-i18n.ts); the middleware
 * converts it to the cookie and redirects it off the URL, so there is exactly
 * one durable store and no indexable duplicate URLs.
 */

/**
 * Locales the product actually offers a destination for. Kept in step with the
 * footer switcher in app/layout.tsx and the app/{hi,ta,te,bn,mr}/page.tsx
 * landings. Do NOT add a locale here before it has somewhere to land.
 */
export const SUPPORTED_LOCALES = ['en', 'hi', 'ta', 'te', 'bn', 'mr'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Cookie the active locale lives in. Same key the client switcher already used. */
export const LOCALE_COOKIE = 'poojly_language';

/** Bootstrap query param. Transient — middleware strips it after storing the cookie. */
export const LOCALE_QUERY_PARAM = 'lang';

/** One year, matching how long a deliberate language choice should reasonably stick. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Where a refused "your language is available" offer is remembered (audit
 * I-08). Deliberately NOT the locale cookie: refusing the offer is not choosing
 * English, and conflating the two would suppress the coverage disclosure for a
 * visitor who simply dismissed a banner. It is localStorage rather than a
 * cookie so it never reaches the server and so it cannot add a `Vary` to an
 * otherwise perfectly cacheable anonymous page.
 */
export const LOCALE_OFFER_DISMISSED_KEY = 'poojly_language_offer_dismissed';

/**
 * Each language's name in its own script. Same strings the footer switcher
 * renders (app/layout.tsx:573-577) — kept here so the list, the parser and the
 * labels cannot drift apart (audit I-11 / I18N-04 is four lists disagreeing).
 */
export const LOCALE_NATIVE_NAMES: Record<Locale, string> = {
  en: 'English',
  hi: 'हिन्दी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  bn: 'বাংলা',
  mr: 'मराठी',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Strict parse: a supported locale, or null. Unlike `normalizeLocale` this does
 * NOT collapse junk to English — callers that need to tell "the visitor chose
 * English" apart from "the visitor chose nothing" depend on the difference.
 */
export function parseLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const primary = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(primary) ? primary : null;
}

/**
 * Coerce anything user-supplied into a supported locale. Accepts region tags
 * ('hi-IN' -> 'hi') and is case-insensitive. Anything unrecognised — including
 * languages the DB enum accepts but the web has no destination for (gu, kn,
 * ml, pa) — collapses to English rather than throwing or half-applying.
 */
export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) return DEFAULT_LOCALE;
  const primary = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(primary) ? primary : DEFAULT_LOCALE;
}

/**
 * Read a locale off a landing path. The prefix must be a whole path segment —
 * '/hindi' is a content page, not the Hindi landing.
 */
export function localeFromPathname(pathname: string): Locale | null {
  const segment = pathname.split('/')[1]?.toLowerCase();
  if (!segment) return null;
  return isLocale(segment) && segment !== DEFAULT_LOCALE ? segment : null;
}

/**
 * The language the DOCUMENT served at this route is written in — the value for
 * the `Content-Language` response header (audit I18N-10, which measured it
 * absent on every page) and the same claim `<html lang>` should carry.
 *
 * DERIVED FROM THE ROUTE AND NOTHING ELSE, which is the whole point. It
 * deliberately ignores the visitor's stored locale, for the reason
 * components/TranslationCoverageNotice records at length for the sibling
 * attribute: the nine pages wired to lib/t.ts still call it without a locale,
 * so /pujas is an English document regardless of what the visitor picked.
 * Announcing otherwise would tell Google and every screen reader that English
 * pricing and legal copy is Hindi — a fabricated claim about content, and
 * strictly worse than the silence I18N-10 found.
 *
 * Being path-derived also means it needs no `Vary`: the anonymous English page
 * stays the one shared CDN entry it is today.
 *
 * The locale landings are ~16% translated over English chrome, and this still
 * reports them as their own language rather than hedging to a list. The hedge
 * belongs in copy the visitor can read — that is what TranslationCoverageNotice
 * is for — not in a header, where a second value would just make the page
 * contradict its own `<main lang>`.
 *
 * TWO ROUTE SHAPES CARRY A LANGUAGE, and both are matched explicitly rather
 * than by scanning for "any segment that happens to parse as a locale":
 *
 *   /{locale}[/…]                    the landings and their city pages
 *   /help/articles/{locale}/{slug}   app/help/articles/[lang]/[slug]
 *
 * The second one is not optional. That page already declares its language in
 * its own metadata, so a rule that did not know about it would put an English
 * header over a Hindi article — a contradiction introduced BY announcing the
 * language, which is worse than the silence the audit found. A loose "any
 * segment" rule is equally wrong in the other direction: it would turn
 * /store/orders/hi into a Hindi document.
 */
export function contentLanguageFor(pathname: string): Locale {
  const fromLanding = localeFromPathname(pathname);
  if (fromLanding) return fromLanding;

  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'help' && segments[1] === 'articles' && segments.length >= 3) {
    return parseLocale(segments[2]) ?? DEFAULT_LOCALE;
  }

  return DEFAULT_LOCALE;
}

/* ──────────────────────────────────────────────────────────────────────────
 * BROWSER LANGUAGE NEGOTIATION — audit I-08
 *
 * I-08: "Accept-Language is never negotiated — no i18n config, no middleware
 * locale logic, no redirect." The middleware half of that is fixed (see
 * `resolveRequestLocale` above and middleware.ts). What remained is that the
 * one signal stating the visitor's own language — the browser's configured
 * language list, which is where the Accept-Language header comes from — was
 * read nowhere, so a phone configured entirely in Hindi or Tamil got English
 * with no indication the product had anything else.
 *
 * WHY THIS ONLY EVER OFFERS, NEVER SWITCHES. The finding's own fix text allows
 * a redirect on '/'; we deliberately do not take it. /hi measured ~16%
 * translated and hi.json covers 19 of 374 keys, so auto-adopting a locale from
 * a header would serve a mostly-English page while asserting it is Hindi —
 * fabricating a claim about content, and doing it to a visitor who never asked.
 * An explicit choice (the `poojly_language` cookie, written only in response to
 * a click) therefore always outranks this, and the offer states the coverage
 * caveat in the target language rather than implying a localised product.
 *
 * WHY IT LIVES ON THE CLIENT. `navigator.languages` carries exactly the same
 * preference list as the Accept-Language header, so reading it there costs no
 * `Vary: Accept-Language`, no Set-Cookie, and no dynamic rendering — a
 * server-side branch would make the homepage a per-visitor render on a
 * free-tier box in exchange for the same information. The parser accepts both
 * shapes so the middleware can adopt it unchanged the day locale-scoped product
 * routes exist and a redirect becomes honest.
 * ────────────────────────────────────────────────────────────────────────── */

interface WeightedTag {
  locale: Locale;
  q: number;
}

/**
 * Split one `Accept-Language` element ('hi-IN;q=0.9') into a supported locale
 * and its quality value. Returns null for anything unsupported, for the `*`
 * wildcard, and for an explicit q=0 (which is a REFUSAL, not a preference).
 *
 * An unparseable q falls back to 1, matching RFC 9110's "if no q is given the
 * default is 1" rather than dropping the tag — a browser sending junk still
 * told us which language it wants.
 */
function parseLanguageRange(raw: string, fallbackQ: number): WeightedTag | null {
  const [tagPart, ...params] = raw.split(';');
  const locale = parseLocale(tagPart);
  if (!locale) return null;

  let q = fallbackQ;
  for (const p of params) {
    const [name, value] = p.split('=');
    if (name?.trim().toLowerCase() !== 'q') continue;
    const parsed = Number.parseFloat((value ?? '').trim());
    q = Number.isFinite(parsed) ? parsed : fallbackQ;
  }

  if (q <= 0) return null;
  return { locale, q };
}

/**
 * The locale this browser is asking for, or null when it is asking for English
 * (or for something we have no page in).
 *
 * Accepts either an `Accept-Language` header string or a `navigator.languages`
 * array — they are the same list in two encodings. For the array form, position
 * IS the preference, so entries get gently descending weights.
 *
 * Returns null rather than 'en' on purpose: "wants English" and "wants a
 * language we cannot serve" both mean *do nothing*, and a caller that got 'en'
 * back would have to re-derive that distinction.
 */
export function negotiateLocale(
  languages: string | readonly string[] | null | undefined,
): Locale | null {
  if (!languages) return null;

  const ranges = Array.isArray(languages)
    ? (languages as readonly string[])
    : String(languages).split(',');

  const weighted: WeightedTag[] = [];
  ranges.forEach((raw, i) => {
    // Array form carries no q; keep the browser's own ordering authoritative.
    const implicitQ = Array.isArray(languages) ? 1 - i / 1000 : 1;
    const tag = parseLanguageRange(String(raw).trim(), implicitQ);
    if (tag) weighted.push(tag);
  });

  if (weighted.length === 0) return null;

  // Stable sort: equal q keeps the order the browser sent, which is itself a
  // preference signal.
  weighted.sort((a, b) => b.q - a.q);

  // If English outranks everything we could offer, the visitor is already in
  // the language they asked for.
  const top = weighted[0]?.locale ?? DEFAULT_LOCALE;
  return top === DEFAULT_LOCALE ? null : top;
}

export interface RequestLocaleInput {
  pathname: string;
  search: URLSearchParams;
  cookie: string | null | undefined;
}

export interface RequestLocaleResult {
  locale: Locale;
  /** 'query' means the URL carried ?lang= and should be redirected clean. */
  source: 'query' | 'path' | 'cookie' | 'default';
}

/**
 * Resolve the active locale for a request. Precedence is deliberate:
 *
 *   1. `?lang=` — an explicit, just-clicked choice always wins.
 *   2. path segment — /hi means the visitor asked for the Hindi landing.
 *   3. cookie — the choice they made earlier in the session.
 *   4. English.
 *
 * Accept-Language is deliberately absent from this ladder even though
 * `negotiateLocale` above now parses it. Everything resolved here becomes the
 * durable `poojly_language` cookie, and a request header is not a choice: at 19
 * of 374 keys in hi.json and no catalog at all for ta/te/bn/mr, adopting one
 * would serve a mostly-English page while asserting it is Hindi. The browser's
 * preference is honoured by OFFERING the locale landing instead — see
 * components/TranslationCoverageNotice. Fold it in here (as `source: 'header'`)
 * once locale-scoped product routes and real coverage exist; until then the
 * only thing that writes this cookie is a click.
 */
export function resolveRequestLocale(input: RequestLocaleInput): RequestLocaleResult {
  const queried = input.search.get(LOCALE_QUERY_PARAM);
  if (queried && isLocale(normalizeLocale(queried)) && normalizeLocale(queried) !== DEFAULT_LOCALE) {
    return { locale: normalizeLocale(queried), source: 'query' };
  }
  if (queried) {
    // An explicit ?lang=en (or junk) is still an explicit choice: honour English
    // and let the middleware strip the param.
    return { locale: DEFAULT_LOCALE, source: 'query' };
  }

  const fromPath = localeFromPathname(input.pathname);
  if (fromPath) return { locale: fromPath, source: 'path' };

  if (input.cookie) {
    const cookieLocale = normalizeLocale(input.cookie);
    if (cookieLocale !== DEFAULT_LOCALE) return { locale: cookieLocale, source: 'cookie' };
  }

  return { locale: DEFAULT_LOCALE, source: 'default' };
}

/* ──────────────────────────────────────────────────────────────────────────
 * CLIENT-SIDE RECONCILIATION — audit I-03 / I18N-05
 *
 * The product ended up with TWO persistence mechanisms sharing one key name,
 * writing in opposite directions and never reading each other:
 *
 *   components/LanguageSwitcher.tsx:24,78   ->  localStorage['poojly_language']
 *   middleware.ts:73 (via LOCALE_COOKIE)    ->  cookie       poojly_language
 *
 * Consequences, both reproducible today:
 *
 *   - A visitor uses the ONLY in-app language control (the globe on /content)
 *     and picks हिन्दी. It lands in localStorage, which no server code can
 *     read, so the middleware, `lib/i18n/server.ts` and the coverage notice all
 *     still believe they are serving an English visitor. The switcher is
 *     decorative outside its own page header — which is exactly what I-03 and
 *     I18N-05 measured.
 *   - A visitor clicks हिन्दी in the FOOTER and lands on /hi. That writes the
 *     cookie. Navigating to /content then shows the switcher reading "English",
 *     because it only ever looks at localStorage. The product forgets a choice
 *     it stored one click ago.
 *
 * These helpers make the client converge the two stores on every page view, so
 * whichever half of the product a visitor uses, the other half hears about it.
 * They are browser-only by design: `locales.ts` is imported by middleware.ts
 * (edge runtime), so nothing here may touch `document` or `localStorage` at
 * module scope.
 * ────────────────────────────────────────────────────────────────────────── */

function readCookieLocale(): Locale | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const raw = match?.[1];
  return parseLocale(raw ? decodeURIComponent(raw) : null);
}

function readStorageRaw(): string | null {
  // localStorage throws in Safari private mode and when cookies are blocked.
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(LOCALE_COOKIE);
  } catch {
    return null;
  }
}

function readStorageLocale(): Locale | null {
  return parseLocale(readStorageRaw());
}

/**
 * The locale the visitor has actually chosen, from whichever store holds it.
 * `null` when they have never chosen one — which is NOT the same as choosing
 * English, and the difference is what keeps us from writing a cookie (and so a
 * `Vary: Cookie`) onto every anonymous English page view.
 *
 * The cookie wins a conflict: the middleware only writes it in response to an
 * explicit signal on THIS request (a `?lang=` click or a `/xx` landing path),
 * so it is the fresher of the two.
 */
export function readClientLocale(): Locale | null {
  return readCookieLocale() ?? readStorageLocale();
}

function writeCookieLocale(locale: Locale): void {
  if (typeof document === 'undefined') return;
  // Same attributes the middleware uses (locales.ts is the one definition of
  // this cookie), so we update the existing cookie rather than shadowing it
  // with a second one on a narrower path.
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}

function writeStorageLocale(locale: Locale): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage?.setItem(LOCALE_COOKIE, locale);
  } catch {
    // Storage unavailable — the cookie is still authoritative.
  }
}

/**
 * Record a locale the visitor JUST CHOSE, into both stores at once.
 *
 * This is the write half `readClientLocale`/`syncClientLocale` were missing,
 * and its absence is what kept the in-app switcher decorative: the only
 * language control in the product (components/LanguageSwitcher.tsx, mounted on
 * the content page header, the profile page and the onboarding modal) wrote
 * `localStorage` and nothing else, so no server code could see the choice —
 * not the middleware, not lib/i18n/server.ts, not the coverage disclosure.
 *
 * WHY BOTH STORES AND NOT JUST THE COOKIE. `syncClientLocale` resolves a
 * conflict in the COOKIE's favour, because the middleware only writes it in
 * response to an explicit signal on that request. So a switcher pick that
 * updated only localStorage was not merely invisible — it was actively erased
 * by the next navigation's reconciliation, silently restoring whatever the
 * footer had stored earlier. Writing both keeps that tie-break honest: the
 * click IS the explicit signal.
 *
 * Unconditional on purpose (unlike the convergence writes in
 * `syncClientLocale`): re-picking the language you already have should still
 * refresh the year-long expiry, and these are `document.cookie` /
 * `localStorage` writes, so neither costs a request or a cache entry.
 */
export function writeClientLocale(locale: Locale): Locale {
  const active = normalizeLocale(locale);
  writeCookieLocale(active);
  writeStorageLocale(active);
  return active;
}

/**
 * Read the active locale AND converge both stores onto it. Returns the active
 * locale (English when nothing was ever chosen).
 *
 * Writes nothing at all for a visitor who has made no choice.
 */
export function syncClientLocale(): Locale {
  const cookie = readCookieLocale();
  const stored = readStorageLocale();
  if (cookie === null && stored === null) return DEFAULT_LOCALE;

  const active: Locale = cookie ?? stored ?? DEFAULT_LOCALE;

  if (cookie !== active) writeCookieLocale(active);

  // Compare the RAW stored string, not the parsed locale: a stored 'hi-IN'
  // parses to 'hi' but is not what the switcher's canonical-code check accepts,
  // so it has to be rewritten in canonical form.
  if (readStorageRaw() !== active) writeStorageLocale(active);

  return active;
}

/**
 * Attach the active locale to an onward link.
 *
 * Audit I-02: every CTA on the /hi..//mr landings was a bare '/pujas', so a
 * Hindi visitor's first click dropped them into English with nothing carrying
 * their choice. This keeps the locale on the link itself, which matters because
 * a link can be shared, opened in a fresh browser, or followed before the
 * cookie exists.
 *
 * English is the default, so English links are returned untouched — no churn on
 * the 99% of the app that is English-only today.
 */
export function localeHref(href: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return href;
  // Only decorate in-app paths. External URLs, mailto:, tel: and fragments are
  // somebody else's routing.
  if (!href.startsWith('/')) return href;

  const hashAt = href.indexOf('#');
  const hash = hashAt === -1 ? '' : href.slice(hashAt);
  const withoutHash = hashAt === -1 ? href : href.slice(0, hashAt);

  const queryAt = withoutHash.indexOf('?');
  const path = queryAt === -1 ? withoutHash : withoutHash.slice(0, queryAt);
  const params = new URLSearchParams(queryAt === -1 ? '' : withoutHash.slice(queryAt + 1));

  if (params.get(LOCALE_QUERY_PARAM) === locale) return href;
  params.set(LOCALE_QUERY_PARAM, locale);

  return `${path}?${params.toString()}${hash}`;
}
