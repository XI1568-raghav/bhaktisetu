/**
 * Booking-wizard draft recovery.
 *
 * DF-01 (prod sweep 2026-08-12): a logged-out devotee filled in the whole
 * 4-step puja wizard — temple, date, slot, every devotee's name/gotra/nakshatra,
 * the sankalp, a prasad delivery address, the terms checkbox — tapped Pay, was
 * bounced to `/auth/login`, and came back to a bare "No puja selected" screen.
 * Two things were broken at once:
 *
 *   1. the redirect was built from `window.location.pathname` alone, so
 *      `?slug=…&temple=…` was stripped and the bounce-back had no puja;
 *   2. nothing persisted the form, and `window.location.href = …` is a full
 *      page navigation, so all React state was discarded.
 *
 * This module fixes both halves: `buildLoginRedirect` preserves the full
 * same-origin target, and save/load persist the in-progress wizard.
 *
 * ── STORAGE / PRIVACY CONTRACT ────────────────────────────────────────────
 * sessionStorage ONLY. Never localStorage. Issue #199 shipped a plaintext
 * password to localStorage; this repo does not get to make that mistake twice.
 * sessionStorage is per-tab and dies with the tab, which is the right lifetime
 * for "I am mid-checkout and about to sign in".
 *
 * The draft holds ritual details and a delivery address the devotee typed
 * themselves. It holds NO credentials: no password, no Supabase access or
 * refresh token, no card or UPI data (Razorpay collects those in its own iframe
 * and they never reach this app). It is additionally TTL-capped and is cleared
 * the moment the booking is confirmed. `__tests__/booking-draft.test.ts`
 * asserts all of that.
 */

export const BOOKING_DRAFT_KEY = 'darshya_booking_draft_v1';

/** A checkout that has been parked for longer than this is stale, not resumable. */
export const BOOKING_DRAFT_TTL_MS = 30 * 60 * 1000;

export interface BookingDraftDevotee {
  name: string;
  gotra: string;
  nakshatra: string;
}

export interface BookingDraftAddress {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  /**
   * ISO 3166-1 alpha-2 delivery country (CM-06). Drafts parked before this
   * field existed have no `country`, so the normaliser below defaults it to
   * 'IN' — which is exactly what those drafts implicitly were.
   */
  country: string;
}

export interface BookingDraft {
  /** Puja slug the draft belongs to — a draft is never replayed onto another puja. */
  slug: string;
  selectedTempleId: string;
  selectedDate: string;
  selectedSlot: string;
  devotees: BookingDraftDevotee[];
  sankalp: string;
  specialInstructions: string;
  wantsPrasad: boolean;
  address: BookingDraftAddress;
  agreedTerms: boolean;
  /** Wizard step the devotee had reached, so they resume where they left off. */
  currentStep: number;
  /** Epoch ms; drives the TTL. */
  savedAt: number;
}

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null;
    return window.sessionStorage;
  } catch {
    // Safari private mode / storage disabled — recovery is a nice-to-have,
    // never a hard dependency of checkout.
    return null;
  }
}

/**
 * Build the `/auth/login?redirect=…` URL, preserving the query string.
 *
 * The redirect target is forced root-relative. `/auth/login` re-validates with
 * its own `safeRedirect` guard (P0-1, 2026-07-17), but a redirect target should
 * never be able to leave the origin in the first place, and `pathname` can be
 * attacker-influenced on a page that reads it back out of the URL.
 */
export function buildLoginRedirect(pathname: string, search: string): string {
  let safePath = pathname || '/';
  // Reject absolute URLs and protocol-relative "//evil.com".
  if (!safePath.startsWith('/') || safePath.startsWith('//')) {
    try {
      // If it parses as a URL at all, keep only its path.
      safePath = new URL(safePath, 'http://localhost').pathname;
    } catch {
      safePath = '/';
    }
    if (!safePath.startsWith('/') || safePath.startsWith('//')) safePath = '/';
  }
  const safeSearch = search && search !== '?' ? (search.startsWith('?') ? search : `?${search}`) : '';
  return `/auth/login?redirect=${encodeURIComponent(`${safePath}${safeSearch}`)}`;
}

/** Persist the in-progress wizard. Returns false when storage is unavailable. */
export function saveBookingDraft(draft: BookingDraft): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(BOOKING_DRAFT_KEY, JSON.stringify({ ...draft, savedAt: draft.savedAt || Date.now() }));
    return true;
  } catch {
    // Quota or serialization failure — losing the draft is bad, throwing
    // mid-checkout is worse.
    return false;
  }
}

/**
 * Read back the draft for `slug`. Returns null (and purges) when the stored
 * draft is missing, malformed, for a different puja, or past its TTL.
 */
export function loadBookingDraft(slug: string, now: number = Date.now()): BookingDraft | null {
  const store = storage();
  if (!store) return null;
  let raw: string | null;
  try {
    raw = store.getItem(BOOKING_DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearBookingDraft();
    return null;
  }

  if (!parsed || typeof parsed !== 'object') {
    clearBookingDraft();
    return null;
  }
  const d = parsed as Partial<BookingDraft>;

  if (typeof d.savedAt !== 'number' || now - d.savedAt > BOOKING_DRAFT_TTL_MS) {
    clearBookingDraft();
    return null;
  }
  // A draft for a different puja is not stale, it is simply not ours — leave it
  // alone so switching tabs between two pujas cannot destroy the other one.
  if (d.slug !== slug) return null;

  return {
    slug: d.slug,
    selectedTempleId: typeof d.selectedTempleId === 'string' ? d.selectedTempleId : '',
    selectedDate: typeof d.selectedDate === 'string' ? d.selectedDate : '',
    selectedSlot: typeof d.selectedSlot === 'string' ? d.selectedSlot : '',
    devotees: Array.isArray(d.devotees)
      ? d.devotees.map((x) => ({
          name: typeof x?.name === 'string' ? x.name : '',
          gotra: typeof x?.gotra === 'string' ? x.gotra : '',
          nakshatra: typeof x?.nakshatra === 'string' ? x.nakshatra : '',
        }))
      : [],
    sankalp: typeof d.sankalp === 'string' ? d.sankalp : '',
    specialInstructions: typeof d.specialInstructions === 'string' ? d.specialInstructions : '',
    wantsPrasad: d.wantsPrasad === true,
    address: {
      fullName: typeof d.address?.fullName === 'string' ? d.address.fullName : '',
      line1: typeof d.address?.line1 === 'string' ? d.address.line1 : '',
      line2: typeof d.address?.line2 === 'string' ? d.address.line2 : '',
      city: typeof d.address?.city === 'string' ? d.address.city : '',
      state: typeof d.address?.state === 'string' ? d.address.state : '',
      pincode: typeof d.address?.pincode === 'string' ? d.address.pincode : '',
      phone: typeof d.address?.phone === 'string' ? d.address.phone : '',
      country:
        typeof d.address?.country === 'string' && d.address.country.trim()
          ? d.address.country.trim().toUpperCase()
          : 'IN',
    },
    agreedTerms: d.agreedTerms === true,
    currentStep:
      typeof d.currentStep === 'number' && d.currentStep >= 0 && d.currentStep <= 3
        ? d.currentStep
        : 0,
    savedAt: d.savedAt,
  };
}

/**
 * The slug of whatever draft is parked, whichever puja it belongs to.
 *
 * Belt-and-braces for the PJ-04 failure mode: the pandit dispatch accept-link
 * died because a redirect dropped its query string. `/auth/login` preserves ours
 * (see `buildLoginRedirect` + login's own `safeRedirect`), but if a devotee ever
 * lands back on `/pujas/book` with no `?slug=`, this lets the page name the puja
 * they were buying instead of showing them a dead end. Returns null for a stale
 * or malformed draft, and only ever yields a catalogue-shaped slug.
 */
export function peekBookingDraftSlug(now: number = Date.now()): string | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(BOOKING_DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<BookingDraft> | null;
    if (!d || typeof d !== 'object') return null;
    if (typeof d.savedAt !== 'number' || now - d.savedAt > BOOKING_DRAFT_TTL_MS) return null;
    // The slug goes straight into a link the devotee clicks, so it is validated
    // against the same shape `/pujas/book` accepts rather than trusted.
    if (typeof d.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(d.slug)) return null;
    return d.slug;
  } catch {
    return null;
  }
}

/** Drop the draft — called on confirmed booking and on explicit "start over". */
export function clearBookingDraft(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(BOOKING_DRAFT_KEY);
  } catch {
    /* nothing to do */
  }
}

/** True when the devotee has actually typed something worth preserving. */
export function draftHasContent(draft: BookingDraft): boolean {
  return Boolean(
    draft.selectedTempleId ||
      draft.selectedSlot ||
      draft.sankalp.trim() ||
      draft.specialInstructions.trim() ||
      draft.devotees.some((d) => d.name.trim() || d.gotra.trim() || d.nakshatra.trim()),
  );
}
