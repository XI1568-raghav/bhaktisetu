/**
 * LEG-15 (prod sweep 2026-08-12) — consent could be given in one click and
 * withdrawn only by hand-editing localStorage.
 *
 * Measured on the live site: after clicking "Reject all", a scan of every <a>
 * and <button> for /cookie|consent|preferen|privacy setting/i returned []. The
 * cookie policy's published remedy was "clearing the darshya_cookie_consent_v1
 * entry in your browser storage". UK GDPR Art. 7(3) and DPDP s.6(4) both
 * require withdrawal to be as easy as consent.
 *
 * These tests pin the loop end to end: a stored choice, a control, the panel
 * re-opening with that choice pre-filled, and the new choice actually
 * persisting.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import CookieBanner, { openCookieSettings, OPEN_CONSENT_EVENT } from '../components/CookieBanner';
import CookieSettingsButton from '../components/CookieSettingsButton';

const STORAGE_KEY = 'darshya_cookie_consent_v1';

const storeConsent = (analytics: boolean, marketing: boolean) =>
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      essential: true,
      analytics,
      marketing,
      acceptedAt: new Date().toISOString(),
      version: 1,
    }),
  );

describe('LEG-15 — consent can be withdrawn after it has been given', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('the banner stays hidden once a choice is stored (unchanged behaviour)', () => {
    storeConsent(true, true);
    render(<CookieBanner />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('re-opens on the consent event with the stored choices pre-filled', () => {
    storeConsent(true, false);
    render(<CookieBanner />);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent(window, new CustomEvent(OPEN_CONSENT_EVENT));

    expect(screen.getByRole('dialog', { name: /cookies for darshan/i })).toBeTruthy();
    const boxes = screen
      .getAllByRole('checkbox')
      .filter((el) => !(el as HTMLInputElement).disabled) as HTMLInputElement[];
    // panel is expanded straight away, analytics on, marketing off — as stored
    expect(boxes).toHaveLength(2);
    expect(boxes[0].checked).toBe(true);
    expect(boxes[1].checked).toBe(false);
  });

  it('the Cookie settings button is what fires it', () => {
    storeConsent(true, true);
    render(
      <>
        <CookieBanner />
        <CookieSettingsButton />
      </>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByTestId('cookie-settings-button'));

    expect(screen.getByRole('dialog', { name: /cookies for darshan/i })).toBeTruthy();
  });

  it('withdrawing analytics consent persists — it is not cosmetic', () => {
    storeConsent(true, true);
    render(<CookieBanner />);
    act(() => openCookieSettings());

    const boxes = screen
      .getAllByRole('checkbox')
      .filter((el) => !(el as HTMLInputElement).disabled) as HTMLInputElement[];
    fireEvent.click(boxes[0]); // analytics -> false
    fireEvent.click(boxes[1]); // marketing -> false
    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.analytics).toBe(false);
    expect(stored.marketing).toBe(false);
    expect(stored.essential).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('re-opening a second time reflects the withdrawal, not the original grant', () => {
    storeConsent(true, true);
    render(<CookieBanner />);

    act(() => openCookieSettings());
    let boxes = screen
      .getAllByRole('checkbox')
      .filter((el) => !(el as HTMLInputElement).disabled) as HTMLInputElement[];
    fireEvent.click(boxes[0]);
    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

    act(() => openCookieSettings());
    boxes = screen
      .getAllByRole('checkbox')
      .filter((el) => !(el as HTMLInputElement).disabled) as HTMLInputElement[];
    expect(boxes[0].checked).toBe(false);
  });
});

/**
 * LEG-15, remaining half — the control existed on three pages but nowhere
 * persistent, and the finding names the footer explicitly: "Add a 'Cookie
 * settings' link to the footer AND to /legal/cookies".
 *
 * A user who rejected on the homepage and now wants analytics back had to
 * already know that /legal/cookies, /privacy or /account/privacy exists. The
 * footer is on every page of the site, which is the whole point: withdrawal
 * has to be reachable from wherever the user happens to be, not only from the
 * page that explains cookies.
 *
 * The footer is a Server Component inside app/layout.tsx, which pulls
 * next/font/google and the whole i18n table — it cannot be rendered in this
 * environment. So the wiring is asserted at the source, and the BEHAVIOUR of
 * the thing being wired (click -> panel opens with stored choices) is already
 * covered by the DOM tests above. Both halves have to hold for the loop to
 * close.
 */
describe('LEG-15 — the cookie control is reachable from every page', () => {
  const layout = () =>
    fs.readFileSync(path.join(path.resolve(__dirname, '..'), 'app/layout.tsx'), 'utf8');

  it('the root layout imports the consent control', () => {
    expect(layout()).toMatch(
      /import\s+CookieSettingsButton\s+from\s+["'][^"']*components\/CookieSettingsButton["']/,
    );
  });

  it('renders it inside the <footer>, not merely somewhere in the file', () => {
    const src = layout();
    const footerStart = src.indexOf('<footer');
    const footerEnd = src.indexOf('</footer>');
    expect(footerStart).toBeGreaterThan(-1);
    expect(footerEnd).toBeGreaterThan(footerStart);
    expect(src.slice(footerStart, footerEnd)).toMatch(/<CookieSettingsButton\b/);
  });

  it('the cookie policy still carries its own copy of the control', () => {
    const policy = fs.readFileSync(
      path.join(path.resolve(__dirname, '..'), 'app/legal/cookies/page.tsx'),
      'utf8',
    );
    expect(policy).toMatch(/<CookieSettingsButton\b/);
    // and no longer tells the reader to hand-edit browser storage
    expect(policy).not.toMatch(/clearing the darshya_cookie_consent_v1/i);
  });
});
