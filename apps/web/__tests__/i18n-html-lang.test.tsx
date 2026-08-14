/**
 * <html lang> honesty (audit I-05 / I18N-01, 2026-08-12).
 *
 * I-05 says app/layout.tsx hardcodes `lang="en"` on the root <html>, which (a)
 * lies to screen readers on the Devanagari landings and (b) makes the
 * `html[lang="hi"]` Devanagari font rule in globals.css a selector that can
 * never match.
 *
 * The remediation that shipped for I-02 put a client-side correction in
 * TranslationCoverageNotice — but it drove `document.documentElement.lang` off
 * the VISITOR'S STORED PREFERENCE rather than off the language the page is
 * actually written in. Because lib/t.ts is still called without a locale on all
 * nine wired pages, essentially every product page renders 100% English. So a
 * Hindi-preferring visitor on /pujas ended up with `<html lang="hi">` wrapped
 * around an entirely English document: a screen reader then pronounces English
 * legal and pricing copy with Hindi phonetics, and the Devanagari font rule
 * activates for text that has no Devanagari in it. That is strictly worse than
 * the hardcoded "en" it was meant to fix, and it is a fabricated claim about
 * content — exactly the failure mode this audit exists to stop.
 *
 * These tests pin the invariant: `<html lang>` describes THE DOCUMENT, never the
 * visitor's wish. The only truthful source available on the client is a
 * declared content-language element — the locale landings and localized city
 * pages already ship `<main lang="hi|ta|te|bn|mr">`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { TranslationCoverageNotice } from '../components/TranslationCoverageNotice';
import { LOCALE_COOKIE } from '../lib/i18n/locales';

/**
 * The App Router keeps the root layout mounted across a client-side navigation
 * and swaps only the page slot beneath it, so the route is the ONLY signal this
 * component gets that the document it is describing has changed.
 */
const nav = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

function setLocaleCookie(value: string | null) {
  if (value === null) {
    document.cookie = `${LOCALE_COOKIE}=; max-age=0; path=/`;
    return;
  }
  document.cookie = `${LOCALE_COOKIE}=${value}; path=/`;
}

/** Stand in for a page that declares its own content language (app/hi/page.tsx et al). */
function mountContentLanguage(lang: string) {
  const main = document.createElement('main');
  main.setAttribute('lang', lang);
  main.textContent = 'page body';
  document.body.appendChild(main);
  return main;
}

function reset() {
  setLocaleCookie(null);
  window.localStorage.removeItem(LOCALE_COOKIE);
  document.documentElement.lang = 'en';
  document.body.innerHTML = '';
  nav.pathname = '/';
}

beforeEach(reset);

afterEach(() => {
  cleanup();
  reset();
});

describe('I-05 — <html lang> reports the document, not the visitor preference', () => {
  it('leaves an English page declared English even when the visitor prefers Hindi', () => {
    // /pujas, /store, /terms … every page that calls t(ns) with no locale.
    setLocaleCookie('hi');

    render(<TranslationCoverageNotice />);

    expect(document.documentElement.lang).toBe('en');
  });

  it.each(['ta', 'te', 'bn', 'mr'])(
    'does not claim %s on an English page for a %s-preferring visitor',
    (locale) => {
      setLocaleCookie(locale);

      render(<TranslationCoverageNotice />);

      expect(document.documentElement.lang).toBe('en');
    },
  );

  it('adopts the page language when the page actually declares one', () => {
    // app/hi/page.tsx:53 renders <main lang="hi">.
    setLocaleCookie('hi');
    mountContentLanguage('hi');

    render(<TranslationCoverageNotice />);

    expect(document.documentElement.lang).toBe('hi');
  });

  it('adopts the page language even when the visitor has no stored preference', () => {
    // A Tamil city page (app/ta/chennai) reached from a search result: the
    // document IS Tamil regardless of what the visitor previously chose.
    mountContentLanguage('ta');

    render(<TranslationCoverageNotice />);

    expect(document.documentElement.lang).toBe('ta');
  });

  it('ignores a junk content-language declaration rather than emitting it', () => {
    setLocaleCookie('hi');
    mountContentLanguage('../../etc/passwd');

    render(<TranslationCoverageNotice />);

    expect(document.documentElement.lang).toBe('en');
  });
});

/**
 * The correction above only ever ran ONCE, on mount.
 *
 * `TranslationCoverageNotice` is rendered from the root layout
 * (app/layout.tsx:582), and in the App Router the root layout is NOT remounted
 * on a client-side navigation — only the page slot beneath it is swapped. With
 * `useEffect(…, [])` both pieces of state froze at whatever the FIRST page of
 * the session happened to be:
 *
 *   - A visitor lands on /hi (`<html lang="hi">`, correct), then taps
 *     "पूजा बुक करें" — every CTA on that landing is a client-side <Link>. The
 *     English /pujas page renders underneath an `<html lang="hi">` that nothing
 *     resets, so a screen reader pronounces English pricing and refund copy with
 *     Hindi phonetics and the `html[lang="hi"]` Devanagari font rule at
 *     globals.css:259 activates over text with no Devanagari in it. That is the
 *     exact failure the mount-time correction was written to prevent, just
 *     deferred by one click.
 *   - The disclosure inverts too: `pageLocale` stays 'hi', still equals the
 *     visitor's locale, so the "most pages are still in English" notice is
 *     suppressed on precisely the English pages that need it.
 *
 * The route is the only signal available, hence `usePathname()` as the effect's
 * dependency.
 */
describe('I-05 — <html lang> follows client-side navigation, not just first mount', () => {
  it('drops the Hindi claim when the visitor clicks from /hi into an English page', () => {
    setLocaleCookie('hi');
    nav.pathname = '/hi';
    const main = mountContentLanguage('hi');

    const view = render(<TranslationCoverageNotice />);
    expect(document.documentElement.lang).toBe('hi');
    expect(screen.queryByTestId('translation-coverage-notice')).toBeNull();

    // Client-side navigation: this component stays mounted, the page swaps.
    main.remove();
    nav.pathname = '/pujas';
    view.rerender(<TranslationCoverageNotice />);

    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByTestId('translation-coverage-notice')).toBeInTheDocument();
  });

  it('adopts the new language when the visitor navigates INTO a translated page', () => {
    setLocaleCookie('ta');
    nav.pathname = '/pujas';

    const view = render(<TranslationCoverageNotice />);
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByTestId('translation-coverage-notice')).toBeInTheDocument();

    mountContentLanguage('ta');
    nav.pathname = '/ta';
    view.rerender(<TranslationCoverageNotice />);

    expect(document.documentElement.lang).toBe('ta');
    expect(screen.queryByTestId('translation-coverage-notice')).toBeNull();
  });

  it('picks up a language chosen on the previous page by the /content switcher', () => {
    // components/LanguageSwitcher.tsx writes ONLY localStorage, and it renders
    // on /content and nowhere else. Without a per-navigation re-read, the
    // choice never reaches the cookie the server side can see.
    nav.pathname = '/content';
    const view = render(<TranslationCoverageNotice />);
    expect(screen.queryByTestId('translation-coverage-notice')).toBeNull();

    window.localStorage.setItem(LOCALE_COOKIE, 'hi');
    nav.pathname = '/pujas';
    view.rerender(<TranslationCoverageNotice />);

    expect(screen.getByTestId('translation-coverage-notice')).toBeInTheDocument();
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=hi`);
  });

  it('does not thrash <html lang> on a re-render that is not a navigation', () => {
    setLocaleCookie('hi');
    nav.pathname = '/hi';
    mountContentLanguage('hi');

    const view = render(<TranslationCoverageNotice />);
    expect(document.documentElement.lang).toBe('hi');

    // Same route, re-render for an unrelated reason: nothing about the document
    // changed, so the correction must not re-run and must not flip to English.
    view.rerender(<TranslationCoverageNotice />);
    expect(document.documentElement.lang).toBe('hi');
  });
});

describe('I-05 — the coverage disclosure stays honest and un-duplicated', () => {
  it('discloses on an English page when the visitor asked for Hindi', () => {
    setLocaleCookie('hi');

    render(<TranslationCoverageNotice />);

    const notice = screen.getByTestId('translation-coverage-notice');
    expect(notice).toBeInTheDocument();
    // The paragraph itself really is Hindi, so it keeps its own lang.
    expect(notice.getAttribute('lang')).toBe('hi');
  });

  it('does NOT duplicate the disclosure the locale landing already renders', () => {
    // app/hi/page.tsx:111 already prints this exact sentence in its footer.
    setLocaleCookie('hi');
    mountContentLanguage('hi');

    render(<TranslationCoverageNotice />);

    expect(screen.queryByTestId('translation-coverage-notice')).toBeNull();
  });

  it('renders nothing at all for an English visitor', () => {
    render(<TranslationCoverageNotice />);
    expect(screen.queryByTestId('translation-coverage-notice')).toBeNull();
    expect(document.documentElement.lang).toBe('en');
  });
});
