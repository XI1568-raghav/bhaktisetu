/**
 * Audit I-03 / I18N-05, render half — the language switcher stops being
 * decorative.
 *
 * __tests__/i18n-hi-catalog.test.ts closed the CATALOG half of I18N-05 (the
 * authored Hindi moved into lib/i18n/hi.json) and said in its own header that
 * "the RENDER half lives in components/ContentPageHeader.tsx and
 * components/LanguageSwitcher.tsx". This file closes the LanguageSwitcher part
 * of it, which is the persistence defect lib/i18n/locales.ts:302-329 documents
 * at length and then never wires up:
 *
 *   components/LanguageSwitcher.tsx  ->  localStorage['poojly_language']
 *   middleware.ts (via LOCALE_COOKIE) ->  cookie       poojly_language
 *
 * Three reproducible consequences, all asserted below:
 *
 *   1. Picking a language in the ONLY in-app language control wrote a key no
 *      server code can read, so the middleware, lib/i18n/server.ts and
 *      components/TranslationCoverageNotice all still believed they were
 *      serving an English visitor.
 *   2. A locale chosen through the footer landings (/hi, /ta …) writes only the
 *      cookie, and the switcher read only localStorage — so it rendered
 *      "English" over a product the visitor had just set to Hindi.
 *   3. Worst of the three: with a cookie already holding another locale, a pick
 *      in the switcher was ERASED on the next navigation. `syncClientLocale()`
 *      (run from the root layout on every route change) gives the cookie
 *      priority and copies it back over localStorage, so the switcher's own
 *      choice lasted exactly until the next click.
 *
 * These are behaviour assertions on the component, not on copy: supplying 374
 * keys x 5 languages is a content task and is deliberately not asserted here.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import LanguageSwitcher from '../components/LanguageSwitcher';
import {
  LOCALE_COOKIE,
  LOCALE_NATIVE_NAMES,
  readClientLocale,
  syncClientLocale,
} from '../lib/i18n/locales';

function clearCookies() {
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

function cookieLocale(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function storedLocale(): string | null {
  return window.localStorage.getItem(LOCALE_COOKIE);
}

/** Open the dropdown and click one of its options by its native name. */
function pick(nativeName: string) {
  fireEvent.click(screen.getByRole('button', { expanded: false }));
  fireEvent.click(screen.getByRole('option', { name: new RegExp(nativeName) }));
}

beforeEach(() => {
  window.localStorage.clear();
  clearCookies();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  clearCookies();
});

describe('I-03 — a language picked in the switcher reaches the server', () => {
  it('writes the locale cookie, not only localStorage', () => {
    render(<LanguageSwitcher />);

    pick(LOCALE_NATIVE_NAMES.hi);

    // localStorage is invisible to every server component in this app. The
    // cookie is the half that the middleware and lib/i18n/server.ts can read.
    expect(storedLocale()).toBe('hi');
    expect(cookieLocale()).toBe('hi');
  });

  it('persists an explicit switch back to English too', () => {
    render(<LanguageSwitcher />);
    pick(LOCALE_NATIVE_NAMES.hi);
    pick(LOCALE_NATIVE_NAMES.en);

    // "I chose English" is a decision and must outrank browser negotiation —
    // see the I-08 offer gate in components/TranslationCoverageNotice, which
    // keys off readClientLocale() being non-null.
    expect(cookieLocale()).toBe('en');
    expect(readClientLocale()).toBe('en');
  });

  it('persists through the compact toggle as well as the dropdown', () => {
    render(<LanguageSwitcher compact />);

    fireEvent.click(screen.getByRole('button'));

    expect(cookieLocale()).toBe('hi');
    expect(storedLocale()).toBe('hi');
  });
});

describe('I-03 — the switcher reports the locale the product is actually in', () => {
  it('reflects a locale chosen through the footer landings (cookie only)', () => {
    // Exactly what middleware.ts does when a visitor clicks "हिन्दी" in the
    // footer and lands on /hi: cookie written, localStorage untouched.
    document.cookie = `${LOCALE_COOKIE}=hi; path=/`;

    render(<LanguageSwitcher />);

    expect(screen.getByRole('button', { expanded: false }).textContent).toContain(
      LOCALE_NATIVE_NAMES.hi,
    );
  });

  it('does not claim "English" when the visitor chose Tamil', () => {
    document.cookie = `${LOCALE_COOKIE}=ta; path=/`;

    render(<LanguageSwitcher />);

    const trigger = screen.getByRole('button', { expanded: false });
    expect(trigger.textContent).toContain(LOCALE_NATIVE_NAMES.ta);
    expect(trigger.textContent).not.toContain(LOCALE_NATIVE_NAMES.en);
  });
});

describe('I-03 — the choice survives the next navigation', () => {
  it('is not reverted by the root layout reconciliation on the next route', () => {
    // Visitor first picked Tamil in the footer (cookie), then opens the content
    // page and picks Hindi in the switcher.
    document.cookie = `${LOCALE_COOKIE}=ta; path=/`;
    render(<LanguageSwitcher />);

    pick(LOCALE_NATIVE_NAMES.hi);

    // components/TranslationCoverageNotice runs this from the root layout on
    // every route change, and the cookie beats localStorage inside it. If the
    // switcher had written only localStorage, this call would copy 'ta' back
    // over the pick and the choice would be gone one click later.
    expect(syncClientLocale()).toBe('hi');
    expect(cookieLocale()).toBe('hi');
    expect(storedLocale()).toBe('hi');
  });
});

describe('I18N-04 — the switcher is not a fourth list of languages', () => {
  it('labels every option from LOCALE_NATIVE_NAMES', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole('button', { expanded: false }));

    for (const code of ['en', 'hi'] as const) {
      expect(
        screen.getByRole('option', { name: new RegExp(LOCALE_NATIVE_NAMES[code]) }),
      ).toBeTruthy();
    }
  });
});
