/**
 * Editing an UNPAID booking.
 *
 * A booking stuck on "Pending Payment" (the gateway hiccuped, the devotee closed
 * the pay sheet, or they simply want a different date) used to be a dead end on
 * the dashboard: the card showed a status pill and nothing to press.
 *
 * Why this is "reopen the form", not "edit the row". A booking's price, prasad
 * fee, slot capacity, the open gateway order and the one-unpaid-hold-per-slot
 * rule (DB-07) all hang off the same fields the devotee wants to change. Editing
 * the row in place would re-implement every one of those checks; the booking
 * wizard already enforces them. So:
 *
 *   1. read the unpaid booking,
 *   2. park its details as a wizard draft (lib/booking-draft, sessionStorage),
 *   3. release the unpaid hold (POST /bookings/:id/cancel: nothing was paid, so
 *      there is nothing to refund) so the devotee can re-pick the SAME slot,
 *   4. send them to the wizard, which replays the draft.
 *
 * Only `pending_payment` bookings are eligible; anything paid goes through the
 * existing reschedule/cancel flows, which have a refund policy.
 */

import { BOOKING_DRAFT_KEY, saveBookingDraft, type BookingDraft } from './booking-draft';

export interface PendingBookingDetail {
  id: string;
  status?: string;
  scheduledDate?: string | null;
  scheduledTimeSlot?: string | null;
  templePujaOfferingId?: string | null;
  devoteeNames?: unknown;
  sankalpDetails?: string | null;
  specialInstructions?: string | null;
  prasadDeliveryRequested?: boolean | null;
  temple?: { slug?: string } | null;
  pujaType?: { slug?: string } | null;
}

export const EDIT_UNAVAILABLE = 'This booking can no longer be edited here. Please open it from My Bookings.';

function toDevotees(raw: unknown): BookingDraft['devotees'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d) => {
      if (typeof d === 'string') return { name: d, gotra: '', nakshatra: '' };
      const o = (d ?? {}) as { name?: unknown; gotra?: unknown; nakshatra?: unknown };
      return {
        name: typeof o.name === 'string' ? o.name : '',
        gotra: typeof o.gotra === 'string' ? o.gotra : '',
        nakshatra: typeof o.nakshatra === 'string' ? o.nakshatra : '',
      };
    })
    .filter((d) => d.name.trim() || d.gotra.trim() || d.nakshatra.trim());
}

/** ISO timestamp or date -> the YYYY-MM-DD the wizard's date field holds. */
function toDateInput(v: string | null | undefined): string {
  if (!v) return '';
  const m = /^\d{4}-\d{2}-\d{2}/.exec(v);
  return m ? m[0] : '';
}

/** Pure: an unpaid booking -> the wizard draft that recreates it. null when it cannot. */
export function buildDraftFromBooking(b: PendingBookingDetail, now: number = Date.now()): BookingDraft | null {
  if (b.status !== 'pending_payment') return null;
  const slug = b.pujaType?.slug?.trim();
  const offeringId = b.templePujaOfferingId?.trim();
  if (!slug || !offeringId) return null;
  return {
    slug,
    selectedTempleId: offeringId,
    selectedDate: toDateInput(b.scheduledDate),
    selectedSlot: b.scheduledTimeSlot ?? '',
    devotees: toDevotees(b.devoteeNames),
    sankalp: b.sankalpDetails ?? '',
    specialInstructions: b.specialInstructions ?? '',
    wantsPrasad: b.prasadDeliveryRequested === true,
    // The delivery address is not echoed back by the API in wizard shape; the
    // devotee re-enters it on the prasad step.
    address: { fullName: '', line1: '', line2: '', city: '', state: '', pincode: '', phone: '', country: 'IN' },
    agreedTerms: false,
    currentStep: 0,
    savedAt: now,
  };
}

export function wizardHref(slug: string, templeSlug?: string | null): string {
  const q = new URLSearchParams({ slug });
  if (templeSlug) q.set('temple', templeSlug);
  return `/pujas/book?${q.toString()}`;
}

export type EditResult = { ok: true; href: string } | { ok: false; message: string };

/**
 * Do the whole hand-off. `fetchImpl` is injectable so the order of operations
 * (read, park the draft, THEN release the hold) is testable: if parking the
 * draft fails we must not have cancelled anything.
 */
export async function prepareEditPendingBooking(
  bookingId: string,
  token: string,
  apiBase: string,
  fetchImpl: typeof fetch = fetch,
): Promise<EditResult> {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  let detail: PendingBookingDetail | null = null;
  try {
    const res = await fetchImpl(`${apiBase}/bookings/${encodeURIComponent(bookingId)}`, { headers });
    if (!res.ok) return { ok: false, message: res.status === 401 ? 'Your session has expired. Please sign in again.' : EDIT_UNAVAILABLE };
    const body = (await res.json().catch(() => null)) as { booking?: PendingBookingDetail } | null;
    detail = body?.booking ?? null;
  } catch {
    return { ok: false, message: 'Network error. Check your connection and try again.' };
  }
  if (!detail) return { ok: false, message: EDIT_UNAVAILABLE };

  const draft = buildDraftFromBooking(detail);
  if (!draft) return { ok: false, message: EDIT_UNAVAILABLE };
  if (!saveBookingDraft(draft)) {
    return { ok: false, message: 'Your browser blocked saving the form, so we left the booking as it is. Use Complete payment instead.' };
  }

  try {
    const res = await fetchImpl(`${apiBase}/bookings/${encodeURIComponent(bookingId)}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'Edited by devotee before payment' }),
    });
    if (!res.ok) {
      try { window.sessionStorage.removeItem(BOOKING_DRAFT_KEY); } catch { /* storage unavailable */ }
      return { ok: false, message: 'Could not release this booking for editing. It is unchanged; please try again.' };
    }
  } catch {
    try { window.sessionStorage.removeItem(BOOKING_DRAFT_KEY); } catch { /* storage unavailable */ }
    return { ok: false, message: 'Network error. The booking is unchanged; please try again.' };
  }
  return { ok: true, href: wizardHref(draft.slug, detail.temple?.slug) };
}
