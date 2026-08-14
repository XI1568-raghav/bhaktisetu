/**
 * Browser language negotiation (audit finding I-08, prod sweep 2026-08-12).
 *
 * I-08: "Accept-Language is never negotiated — no i18n config, no middleware
 * locale logic, no redirect." Two of those three are now false: middleware.ts
 * DOES carry locale logic (shipped for I-02/I18N-01). The part that still
 * reproduced is the one the finding names in its customer_impact: "nothing
 * reads the one header that states their preference", so a phone configured
 * entirely in Hindi or Tamil gets English with no signal the product has
 * anything else, and the locale landings stay undiscoverable behind a footer
 * link.
 *
 * WHAT THESE TESTS PIN, AND WHAT THEY DELIBERATELY DO NOT.
 *
 * They pin that the browser's stated language preference is (a) parsed
 * correctly, q-weights and all, (b) matched only against locales that actually
 * have a destination, and (c) acted on by OFFERING the localized landing.
 *
 * They also pin the opposite: it must never SWITCH the visitor. The /hi landing
 * measured ~16% translated and hi.json covers 19 of 374 keys, so silently
 * adopting a locale off a request header would hand a Hindi-preferring visitor
 * a page that is still mostly English while claiming to be Hindi — the exact
 * fabrication this audit exists to stop. An explicit choice (cookie) therefore
 * always beats the header, and the offer says out loud, in the target language,
 * that the translation is partial.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import { TranslationCoverageNotice } from '../components/TranslationCoverageNotice';
import {
  LOCALE_COOKIE,
  LOCALE_OFFER_DISMISSED_KEY,
  negotiateLocale,
} from '../lib/i18n/locales';

const nav = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

function setLocaleCookie(value: string | null) {
  if (value === null) {
    document.cookie = `${LOCALE_COOKIE}=; max-age=0; path=/`;
    return;
  }
  document.cookie = `${LOCALE_COOKIE}=${value}; path=/`;
}

/** Stand in for the browser's configured language list. */
function setBrowserLanguages(langs: string[]) {
  Object.defineProperty(window.navigator, 'languages', {
    value: langs,
    configurable: true,
  });
  Object.defineProperty(window.navigator, 'language', {
    value: langs[0] ?? 'en-US',
    configurable: true,
  });
}

/** Stand in for a page that declares its own content language (app/hi/page.tsx). */
function mountContentLanguage(lang: string) {
  const main = document.createElement('main');
  main.setAttribute('lang', lang);
  main.textContent = 'page body';
  document.body.appendChild(main);
}

function reset() {
  setLocaleCookie(null);
  window.localStorage.clear();
  document.documentElement.lang = 'en';
  document.body.innerHTML = '';
  nav.pathname = '/';
  setBrowserLanguages(['en-US', 'en']);
}

beforeEach(reset);
afterEach(() => {
  cleanup();
  reset();
});

// ── the parser itself ───────────────────────────────────────────────────────

describe('I-08 — the browser language preference is actually parsed', () => {
  it('reads a real Accept-Language header', () => {
    expect(negotiateLocale('hi-IN,hi;q=0.9,en;q=0.8')).toBe('hi');
  });

  it('honours q-weights rather than list order', () => {
    // A browser can list a lower-priority language first; q decides.
    expect(negotiateLocale('en;q=0.5,ta;q=0.9')).toBe('ta');
  });

  it('treats a missing q as 1 (the RFC default), beating an explicit 0.9', () => {
    expect(negotiateLocale('bn;q=0.9,mr')).toBe('mr');
  });

  it('drops a language explicitly refused with q=0', () => {
    expect(negotiateLocale('te;q=0,en;q=0.1')).toBeNull();
  });

  it('matches on the primary subtag, so bn-BD counts as Bengali', () => {
    expect(negotiateLocale('bn-BD')).toBe('bn');
  });

  it('returns null for an English browser — there is nothing to offer', () => {
    expect(negotiateLocale('en-US,en;q=0.9')).toBeNull();
  });

  it('returns null for a language the web has NO destination for', () => {
    // Kannada is in the API error catalog and the DB enum but has no landing
    // page (audit I-11 / I18N-04). Offering it would be a dead link.
    expect(negotiateLocale('kn-IN,kn;q=0.9')).toBeNull();
  });

  it('accepts navigator.languages, which is the same preference list', () => {
    expect(negotiateLocale(['ta-IN', 'en-US'])).toBe('ta');
  });

  it('ignores the wildcard and survives junk without throwing', () => {
    expect(negotiateLocale('*')).toBeNull();
    expect(negotiateLocale('hi;q=banana,en')).toBe('hi');
    expect(negotiateLocale('')).toBeNull();
    expect(negotiateLocale(null)).toBeNull();
    expect(negotiateLocale(undefined)).toBeNull();
  });
});

// ── acting on it: offer, never switch ───────────────────────────────────────

describe('I-08 — a Hindi-configured browser is told the Hindi page exists', () => {
  it('offers the localized landing to a visitor who has chosen nothing', () => {
    setBrowserLanguages(['hi-IN', 'en-US']);
    render(<TranslationCoverageNotice />);

    const offer = screen.getByTestId('locale-offer');
    expect(offer).toBeTruthy();
    const link = offer.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/hi');
    // The label is the language's own name, so it is legible to the person it
    // is aimed at.
    expect(link?.textContent).toBe('हिन्दी');
  });

  it('states the translation is partial, in that language, instead of implying a localized product', () => {
    setBrowserLanguages(['hi-IN']);
    render(<TranslationCoverageNotice />);

    const offer = screen.getByTestId('locale-offer');
    expect(offer.getAttribute('lang')).toBe('hi');
    expect(offer.textContent).toContain('अधिकांश पृष्ठ अभी अंग्रेज़ी में हैं');
  });

  it('offers Tamil to a Tamil browser too — all five landings, not just Hindi', () => {
    setBrowserLanguages(['ta-IN', 'en-GB']);
    render(<TranslationCoverageNotice />);

    const offer = screen.getByTestId('locale-offer');
    expect(offer.querySelector('a')?.getAttribute('href')).toBe('/ta');
    expect(offer.getAttribute('lang')).toBe('ta');
  });

  it('shows NOTHING to an English browser — the default experience is untouched', () => {
    setBrowserLanguages(['en-US', 'en']);
    render(<TranslationCoverageNotice />);
    expect(screen.queryByTestId('locale-offer')).toBeNull();
  });
});

describe('I-08 — the header is a hint, never an override', () => {
  it('does NOT offer when the visitor explicitly chose English', () => {
    // /?lang=en → middleware stores 'en'. That is a decision, not an absence.
    setLocaleCookie('en');
    setBrowserLanguages(['hi-IN', 'hi']);
    render(<TranslationCoverageNotice />);
    expect(screen.queryByTestId('locale-offer')).toBeNull();
  });

  it('does NOT offer when the visitor already chose a language', () => {
    setLocaleCookie('hi');
    setBrowserLanguages(['ta-IN']);
    render(<TranslationCoverageNotice />);
    expect(screen.queryByTestId('locale-offer')).toBeNull();
  });

  it('never rewrites the stored locale from the header (no silent switch)', () => {
    setBrowserLanguages(['hi-IN', 'hi']);
    render(<TranslationCoverageNotice />);
    // Reading a header is not the visitor choosing. Nothing may be persisted,
    // which also keeps anonymous English pages a single CDN cache entry.
    expect(document.cookie).not.toContain(`${LOCALE_COOKIE}=hi`);
    expect(window.localStorage.getItem(LOCALE_COOKIE)).toBeNull();
  });

  it('does not offer a page the visitor is already reading', () => {
    setBrowserLanguages(['hi-IN']);
    nav.pathname = '/hi';
    mountContentLanguage('hi');
    render(<TranslationCoverageNotice />);
    expect(screen.queryByTestId('locale-offer')).toBeNull();
  });
});

describe('I-08 — the offer can be refused once and for all', () => {
  it('disappears after dismissal and stays gone on the next page view', () => {
    setBrowserLanguages(['hi-IN']);
    const first = render(<TranslationCoverageNotice />);
    fireEvent.click(screen.getByTestId('locale-offer-dismiss'));
    expect(screen.queryByTestId('locale-offer')).toBeNull();

    first.unmount();
    render(<TranslationCoverageNotice />);
    expect(screen.queryByTestId('locale-offer')).toBeNull();
  });

  it('remembers the refusal in the browser, not just in component state', () => {
    setBrowserLanguages(['hi-IN']);
    render(<TranslationCoverageNotice />);
    fireEvent.click(screen.getByTestId('locale-offer-dismiss'));
    expect(window.localStorage.getItem(LOCALE_OFFER_DISMISSED_KEY)).toBeTruthy();
  });
});

describe('I-08 — no regression on the coverage disclosure it shares a component with', () => {
  it('still discloses partial coverage to a visitor reading in Hindi on an English page', () => {
    setLocaleCookie('hi');
    setBrowserLanguages(['hi-IN']);
    render(<TranslationCoverageNotice />);
    expect(screen.getByTestId('translation-coverage-notice')).toBeTruthy();
  });

  it('never renders the disclosure and the offer at the same time', () => {
    setLocaleCookie('hi');
    setBrowserLanguages(['hi-IN']);
    render(<TranslationCoverageNotice />);
    expect(screen.queryByTestId('locale-offer')).toBeNull();
  });
});
