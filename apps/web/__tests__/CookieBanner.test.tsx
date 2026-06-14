import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CookieBanner, { getStoredConsent, hasConsent } from '../components/CookieBanner';

const STORAGE_KEY = 'darshya_cookie_consent_v1';

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
