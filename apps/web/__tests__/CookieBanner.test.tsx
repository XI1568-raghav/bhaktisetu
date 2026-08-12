import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CookieBanner, { getStoredConsent, hasConsent } from '../components/CookieBanner';

const STORAGE_KEY = 'darshya_cookie_consent_v1';
const CONSENT_VAR = '--consent-h';

const validConsent = () =>
  JSON.stringify({
    essential: true,
    analytics: true,
    marketing: false,
    acceptedAt: new Date().toISOString(),
    version: 1,
  });

describe('CookieBanner — R-Q3-L-002 GDPR/UK DPA', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('shows banner on first visit', () => {
    render(<CookieBanner />);
    expect(
      screen.getByRole('dialog', { name: /cookies for darshan/i }),
    ).toBeTruthy();
  });

  it('Reject-all stores essential-only consent and hides banner', () => {
    const { queryByRole } = render(<CookieBanner />);
    fireEvent.click(screen.getByRole('button', { name: /reject all/i }));
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.essential).toBe(true);
    expect(stored.analytics).toBe(false);
    expect(stored.marketing).toBe(false);
    expect(queryByRole('dialog')).toBeNull();
  });

  it('Accept-all stores all categories true', () => {
    render(<CookieBanner />);
    fireEvent.click(screen.getByRole('button', { name: /accept all/i }));
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.analytics).toBe(true);
    expect(stored.marketing).toBe(true);
  });

  it('Manage preferences allows granular toggle', () => {
    render(<CookieBanner />);
    fireEvent.click(screen.getByRole('button', { name: /manage preferences/i }));
    const checkboxes = screen
      .getAllByRole('checkbox')
      .filter((el) => !(el as HTMLInputElement).disabled);
    // first non-disabled = analytics, second = marketing
    fireEvent.click(checkboxes[0]);
    fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.analytics).toBe(true);
    expect(stored.marketing).toBe(false);
  });

  it('hides banner when valid consent already stored', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        essential: true,
        analytics: true,
        marketing: false,
        acceptedAt: new Date().toISOString(),
        version: 1,
      }),
    );
    const { queryByRole } = render(<CookieBanner />);
    expect(queryByRole('dialog')).toBeNull();
  });

  it('hasConsent honours stored state, defaults essential = true', () => {
    expect(hasConsent('essential')).toBe(true);
    expect(hasConsent('analytics')).toBe(false);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        essential: true,
        analytics: true,
        marketing: false,
        acceptedAt: new Date().toISOString(),
        version: 1,
      }),
    );
    expect(hasConsent('analytics')).toBe(true);
    expect(hasConsent('marketing')).toBe(false);
  });

  it('treats stale consent (> 1 year) as expired', () => {
    const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        essential: true,
        analytics: true,
        marketing: true,
        acceptedAt: twoYearsAgo,
        version: 1,
      }),
    );
    expect(getStoredConsent()).toBeNull();
    expect(hasConsent('analytics')).toBe(false);
  });

  it('ignores stored consent with mismatched version', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        essential: true,
        analytics: true,
        marketing: true,
        acceptedAt: new Date().toISOString(),
        version: 99,
      }),
    );
    expect(getStoredConsent()).toBeNull();
  });
});

// RESP-01 — the banner is position:fixed at z-[80]. At 390x844 it covered 41%
// of the viewport and buried the whole /auth/login form: a hit test on the
// Sign In button's own centre returned "Reject all", and scrolling did not
// help. The fix publishes the banner's live height as --consent-h so globals
// .css can reserve document space and MobileBottomTabs can ride above it.
//
// Every assertion below fails if the banner stops publishing the variable, or
// stops clearing it — a stale --consent-h would leave a permanent dead gap at
// the bottom of every page, which is the opposite failure.
describe('CookieBanner — RESP-01 reserves its own height', () => {
  const BANNER_HEIGHT = 347; // measured at 390x844 in the audit

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.removeProperty(CONSENT_VAR);
    // happy-dom reports every rect as 0x0, so the component would publish 0px
    // and prove nothing. Give the banner a real measured height.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      height: BANNER_HEIGHT,
      width: 390, top: 497, bottom: 844, left: 0, right: 390, x: 0, y: 497,
      toJSON: () => ({}),
    } as DOMRect);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
    document.documentElement.style.removeProperty(CONSENT_VAR);
  });

  const consentVar = () =>
    document.documentElement.style.getPropertyValue(CONSENT_VAR);

  it('publishes its measured height while open', () => {
    render(<CookieBanner />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(consentVar()).toBe(`${BANNER_HEIGHT}px`);
  });

  it('never reserves space when consent is already stored', () => {
    window.localStorage.setItem(STORAGE_KEY, validConsent());
    render(<CookieBanner />);
    expect(consentVar()).toBe('');
  });

  it('releases the reserved space on Accept all', () => {
    render(<CookieBanner />);
    expect(consentVar()).toBe(`${BANNER_HEIGHT}px`);
    fireEvent.click(screen.getByRole('button', { name: /accept all/i }));
    expect(consentVar()).toBe('');
  });

  it('releases the reserved space on Reject all', () => {
    render(<CookieBanner />);
    fireEvent.click(screen.getByRole('button', { name: /reject all/i }));
    expect(consentVar()).toBe('');
  });

  it('releases the reserved space on unmount', () => {
    const { unmount } = render(<CookieBanner />);
    expect(consentVar()).toBe(`${BANNER_HEIGHT}px`);
    unmount();
    expect(consentVar()).toBe('');
  });

  it('keeps reserving while the preferences panel is expanded', () => {
    render(<CookieBanner />);
    fireEvent.click(screen.getByRole('button', { name: /manage preferences/i }));
    // Expanding makes the banner TALLER — the reservation must not vanish.
    expect(consentVar()).toBe(`${BANNER_HEIGHT}px`);
    expect(screen.getByRole('button', { name: /save preferences/i })).toBeTruthy();
  });
});
