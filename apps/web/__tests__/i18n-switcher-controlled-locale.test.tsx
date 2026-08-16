/**
 * Audit I-03 / I18N-05, render half — the switcher told a Hindi visitor they
 * were reading English, in the one configuration the product actually ships.
 *
 * __tests__/i18n-switcher-persistence.test.tsx already covers the switcher, but
 * every case in it renders `<LanguageSwitcher />` UNCONTROLLED. The only mount
 * in the product is controlled:
 *
 *     components/ContentPageHeader.tsx:39-42
 *       <LanguageSwitcher currentLanguage={language} onLanguageChange={…} />
 *
 * and that parent seeds `language` from localStorage ALONE. So on the exact
 * journey I-03 describes — click हिन्दी in the footer, land on /hi (middleware
 * writes the COOKIE and nothing else), navigate to /content — the parent hands
 * down `currentLanguage="en"`, the switcher's own cookie read is discarded by
 * the `!currentLanguage` guard, and the control reports "English" one click
 * after the visitor chose Hindi.
 *
 * The component had already grown the machinery to avoid saying that; it just
 * applied it to the wrong half of the problem. `activeLocale` corrected the lie
 * only for locales the control cannot OFFER (ta/te/bn/mr), so தமிழ் displayed
 * correctly while हिन्दी — the one locale with a catalog behind it, and the one
 * a footer click actually produces — did not.
 *
 * Nothing here asserts copy. These are behaviour assertions about which locale
 * the control claims is active, driven from the store the SERVER reads.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import LanguageSwitcher from '../components/LanguageSwitcher';
import { LOCALE_COOKIE, LOCALE_NATIVE_NAMES } from '../lib/i18n/locales';

function clearCookies() {
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

function trigger(): HTMLElement {
  return screen.getByRole('button', { expanded: false });
}

/** The options the listbox currently marks as the active choice. */
function selectedOptionNames(): string[] {
  fireEvent.click(trigger());
  return screen
    .getAllByRole('option')
    .filter((o) => o.getAttribute('aria-selected') === 'true')
    .map((o) => o.textContent ?? '');
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

describe('I-03 — the controlled switcher still reports the locale the server sees', () => {
  it('reports Hindi when the cookie says Hindi and the parent still says English', () => {
    // middleware.ts on /hi: cookie written, localStorage untouched. The parent
    // (ContentPageHeader) reads only localStorage, so it passes down 'en'.
    document.cookie = `${LOCALE_COOKIE}=hi; path=/`;

    render(<LanguageSwitcher currentLanguage="en" />);

    expect(trigger().textContent).toContain(LOCALE_NATIVE_NAMES.hi);
    expect(trigger().textContent).not.toContain(LOCALE_NATIVE_NAMES.en);
  });

  it('marks the option the visitor actually chose, not the parent-pinned one', () => {
    document.cookie = `${LOCALE_COOKIE}=hi; path=/`;

    render(<LanguageSwitcher currentLanguage="en" />);

    expect(selectedOptionNames().join('|')).toContain(LOCALE_NATIVE_NAMES.hi);
  });

  it('tags the trigger with the language its own text is written in', () => {
    // A screen reader given lang="en" over हिन्दी reads Devanagari with English
    // phonetics. The attribute has to follow the same locale the label does.
    document.cookie = `${LOCALE_COOKIE}=hi; path=/`;

    render(<LanguageSwitcher currentLanguage="en" />);

    const label = trigger().querySelector('[lang]');
    expect(label?.getAttribute('lang')).toBe('hi');
  });
});

describe('I-03 — the listbox never contradicts the trigger', () => {
  it('marks nothing selected when the active locale is one it cannot offer', () => {
    // Trigger already renders தமிழ் here. Marking "English" selected in the same
    // control is the same false claim, moved into the list.
    document.cookie = `${LOCALE_COOKIE}=ta; path=/`;

    render(<LanguageSwitcher />);

    expect(trigger().textContent).toContain(LOCALE_NATIVE_NAMES.ta);
    expect(selectedOptionNames()).toEqual([]);
  });
});

describe('I-03 — the compact toggle offers the language the visitor is not already in', () => {
  it('offers English to a visitor the cookie puts on Hindi, even when controlled', () => {
    document.cookie = `${LOCALE_COOKIE}=hi; path=/`;

    render(<LanguageSwitcher compact currentLanguage="en" />);

    const button = screen.getByRole('button');
    expect(button.textContent).toContain('EN');
    expect(button.getAttribute('title')).toContain('English');
  });

  it('still offers Hindi to a visitor who has chosen nothing', () => {
    render(<LanguageSwitcher compact />);

    expect(screen.getByRole('button').textContent).toContain('हि');
  });
});
