/**
 * DF-01 (prod sweep 2026-08-12) — a logged-out devotee lost the ENTIRE booking
 * form AND the puja itself at the Pay button.
 *
 * Two independent failures stacked:
 *   1. `/pujas/book` redirected to `/auth/login?redirect=<pathname>` — pathname
 *      ONLY, so `?slug=rudrabhishek&temple=…` was stripped and the bounce-back
 *      landed on the bare "No puja selected" screen.
 *   2. Nothing persisted the wizard state, and `window.location.href` is a full
 *      page navigation, so every field the devotee typed was discarded.
 *
 * These tests cover the recovery module (lib/booking-draft) plus source-level
 * guards on the wizard so a future refactor cannot silently reintroduce either
 * half.
 *
 * SECURITY: the draft is sessionStorage-only. Issue #199 shipped a plaintext
 * password in localStorage; the `never touches localStorage` and `carries no
 * credential fields` tests below are the standing regression guard for that.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  BOOKING_DRAFT_KEY,
  BOOKING_DRAFT_TTL_MS,
  buildLoginRedirect,
  clearBookingDraft,
  loadBookingDraft,
  saveBookingDraft,
  type BookingDraft,
} from '../lib/booking-draft';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

function makeDraft(over: Partial<BookingDraft> = {}): BookingDraft {
  return {
    slug: 'rudrabhishek',
    selectedTempleId: 'to-1',
    selectedDate: '2026-08-14',
    selectedSlot: '06:00',
    devotees: [{ name: 'Ramesh Kumar Sharma', gotra: 'Kashyap', nakshatra: 'Rohini' }],
    sankalp: 'Om, for the health and long life of my mother.',
    specialInstructions: 'Please chant slowly.',
    wantsPrasad: true,
    address: {
      fullName: 'Ramesh Kumar Sharma',
      line1: 'Flat 402, Shanti Apartments',
      line2: 'Near Gandhi Chowk',
      city: 'Gurugram',
      state: 'Haryana',
      pincode: '122001',
      phone: '9876543210',
    },
    agreedTerms: true,
    currentStep: 3,
    savedAt: Date.now(),
    ...over,
  };
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('DF-01 — login redirect preserves the full booking intent', () => {
  it('keeps the query string, not just the pathname', () => {
    const url = buildLoginRedirect(
      '/pujas/book',
      '?slug=rudrabhishek&temple=kashi-vishwanath-varanasi',
    );
    const target = decodeURIComponent(new URL(url, 'http://x').searchParams.get('redirect')!);
    expect(target).toBe('/pujas/book?slug=rudrabhishek&temple=kashi-vishwanath-varanasi');
  });

  it('is a root-relative /auth/login URL with an encoded redirect param', () => {
    const url = buildLoginRedirect('/pujas/book', '?slug=rudrabhishek');
    expect(url.startsWith('/auth/login?redirect=')).toBe(true);
    // The whole target must be percent-encoded so login's own parser sees one param.
    expect(url).toContain(encodeURIComponent('/pujas/book?slug=rudrabhishek'));
  });

  it('works when there is no query string at all', () => {
    expect(buildLoginRedirect('/pujas/book', '')).toBe(
      `/auth/login?redirect=${encodeURIComponent('/pujas/book')}`,
    );
  });

  it('refuses to build an off-origin redirect (open-redirect guard)', () => {
    for (const evil of ['//evil.com/pujas/book', 'https://evil.com/x', 'javascript:alert(1)']) {
      const url = buildLoginRedirect(evil, '?slug=x');
      const target = decodeURIComponent(new URL(url, 'http://x').searchParams.get('redirect')!);
      expect(target.startsWith('//')).toBe(false);
      expect(target).toMatch(/^\/(?!\/)/);
      expect(target).not.toContain('evil.com');
    }
  });
});

describe('DF-01 — the in-progress wizard survives the round trip', () => {
  it('round-trips every field the devotee typed', () => {
    const draft = makeDraft();
    expect(saveBookingDraft(draft)).toBe(true);

    const back = loadBookingDraft('rudrabhishek');
    expect(back).not.toBeNull();
    expect(back!.selectedTempleId).toBe('to-1');
    expect(back!.selectedDate).toBe('2026-08-14');
    expect(back!.selectedSlot).toBe('06:00');
    expect(back!.devotees[0]).toEqual({
      name: 'Ramesh Kumar Sharma',
      gotra: 'Kashyap',
      nakshatra: 'Rohini',
    });
    expect(back!.sankalp).toContain('long life of my mother');
    expect(back!.specialInstructions).toBe('Please chant slowly.');
    expect(back!.wantsPrasad).toBe(true);
    expect(back!.address.pincode).toBe('122001');
    expect(back!.agreedTerms).toBe(true);
    expect(back!.currentStep).toBe(3);
  });

  it('does not hand a draft for one puja to a different puja', () => {
    saveBookingDraft(makeDraft({ slug: 'rudrabhishek' }));
    expect(loadBookingDraft('satyanarayan-katha')).toBeNull();
    // …and the stale draft is not left lying around for the wrong puja.
    expect(loadBookingDraft('rudrabhishek')).not.toBeNull();
  });

  it('expires (and purges) a draft older than the TTL', () => {
    saveBookingDraft(makeDraft({ savedAt: Date.now() - BOOKING_DRAFT_TTL_MS - 1000 }));
    expect(loadBookingDraft('rudrabhishek')).toBeNull();
    expect(sessionStorage.getItem(BOOKING_DRAFT_KEY)).toBeNull();
  });

  it('clearBookingDraft removes it', () => {
    saveBookingDraft(makeDraft());
    clearBookingDraft();
    expect(loadBookingDraft('rudrabhishek')).toBeNull();
    expect(sessionStorage.getItem(BOOKING_DRAFT_KEY)).toBeNull();
  });

  it('survives a corrupt payload without throwing', () => {
    sessionStorage.setItem(BOOKING_DRAFT_KEY, '{not json');
    expect(() => loadBookingDraft('rudrabhishek')).not.toThrow();
    expect(loadBookingDraft('rudrabhishek')).toBeNull();
  });
});

describe('DF-01 — #199 regression guard: nothing sensitive leaves sessionStorage', () => {
  it('writes to sessionStorage and never to localStorage', () => {
    saveBookingDraft(makeDraft());
    expect(sessionStorage.getItem(BOOKING_DRAFT_KEY)).toBeTruthy();
    expect(localStorage.length).toBe(0);
  });

  it('carries no credential-shaped fields', () => {
    saveBookingDraft(makeDraft());
    const raw = sessionStorage.getItem(BOOKING_DRAFT_KEY)!;
    for (const banned of ['password', 'accessToken', 'refreshToken', 'apiKey', 'card', 'cvv']) {
      expect(raw.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it('the draft module itself never references localStorage', () => {
    // The guard is about CODE. As first written it matched the raw file text,
    // which meant the module's own header comment — the one that spells out the
    // #199 ban ("sessionStorage ONLY. Never localStorage.") — tripped its own
    // test, and the cheapest way to go green would have been to delete the
    // documentation of the rule. Strip comments first, so the assertion catches
    // a real `localStorage` call and nothing else.
    const code = read('lib/booking-draft.ts')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code).not.toContain('localStorage');
  });
});

describe('DF-01 — booking wizard wiring', () => {
  const src = () => read('app/pujas/book/page.tsx');

  it('no longer redirects to login with pathname alone', () => {
    // The exact defect: `encodeURIComponent(window.location.pathname)`.
    expect(src()).not.toMatch(/encodeURIComponent\(\s*window\.location\.pathname\s*\)/);
  });

  it('builds the login redirect from pathname AND search', () => {
    const s = src();
    expect(s).toContain('buildLoginRedirect');
    expect(s).toContain('window.location.search');
  });

  it('saves the draft before bouncing to login and restores it on mount', () => {
    const s = src();
    expect(s).toContain('saveBookingDraft');
    expect(s).toContain('loadBookingDraft');
  });

  it('clears the draft once the booking is confirmed', () => {
    expect(src()).toContain('clearBookingDraft');
  });

  it('never persists wizard state to localStorage', () => {
    expect(src()).not.toContain('localStorage');
  });
});
