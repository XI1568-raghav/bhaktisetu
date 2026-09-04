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
  // An ARBITRARY stand-in, deliberately not the real banner height. It used to
  // be `347 // measured at 390x844 in the audit`, which read as a fact about
  // the product and was wrong twice over: the banner was 262px by then and is
  // 227px after the 2026-09-01 pass. A number this test injects can only ever
  // describe the test. The real geometry is measured in a browser — see the
  // per-viewport table in app/auth/layout.tsx.
  const STUB_HEIGHT = 347;

  /** Make happy-dom (which reports every rect as 0x0) report a height. */
  const stubHeight = (height: number) =>
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      height,
      width: 390, top: 844 - height, bottom: 844, left: 0, right: 390, x: 0, y: 844 - height,
      toJSON: () => ({}),
    } as DOMRect);

  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.removeProperty(CONSENT_VAR);
    stubHeight(STUB_HEIGHT);
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
    expect(consentVar()).toBe(`${STUB_HEIGHT}px`);
  });

  it('never reserves space when consent is already stored', () => {
    window.localStorage.setItem(STORAGE_KEY, validConsent());
    render(<CookieBanner />);
    expect(consentVar()).toBe('');
  });

  it('releases the reserved space on Accept all', () => {
    render(<CookieBanner />);
    expect(consentVar()).toBe(`${STUB_HEIGHT}px`);
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
    expect(consentVar()).toBe(`${STUB_HEIGHT}px`);
    unmount();
    expect(consentVar()).toBe('');
  });

  it('keeps reserving while the preferences panel is expanded', () => {
    render(<CookieBanner />);
    fireEvent.click(screen.getByRole('button', { name: /manage preferences/i }));
    // Expanding makes the banner TALLER — the reservation must not vanish.
    expect(consentVar()).toBe(`${STUB_HEIGHT}px`);
    expect(screen.getByRole('button', { name: /save preferences/i })).toBeTruthy();
  });

  // The three tests above can all be satisfied by a component that publishes
  // ANY fixed string. These two cannot.
  it('reports the height it actually measured, not a constant', () => {
    // Two mounts, two different rects, two different reservations. A hardcoded
    // px value, a cached first measurement, or a height read off a class name
    // instead of the box all fail here and pass everything above.
    vi.restoreAllMocks();
    stubHeight(203);
    const first = render(<CookieBanner />);
    expect(consentVar()).toBe('203px');
    first.unmount();

    vi.restoreAllMocks();
    stubHeight(311);
    render(<CookieBanner />);
    expect(consentVar()).toBe('311px');
  });

  it('rounds a fractional height UP, never down', () => {
    // Real banner heights are fractional — 226.4px at 360 CSS px with the brand
    // face loaded. Reserving 226 leaves a 0.4px sliver of the page under the
    // banner, and that sliver is where a 44px tap target's last row of pixels
    // lives. Math.ceil is the contract; a Math.round or a bitwise truncation
    // would satisfy every other test in this file.
    vi.restoreAllMocks();
    stubHeight(226.4);
    render(<CookieBanner />);
    expect(consentVar()).toBe('227px');
  });
});
