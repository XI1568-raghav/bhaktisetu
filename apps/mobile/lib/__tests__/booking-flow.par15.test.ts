import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  selectPujaBookingDetail,
  selectBookableSlots,
  isSlotBookable,
  buildCreateBookingBody,
  selectCreatedBooking,
  bookingErrorMessage,
  resumePaymentUrl,
  offeringPriceInr,
  toLocalDateKey,
  isPastDate,
  upcomingDateKeys,
  BookingInputError,
  type BookingFormState,
} from '../booking-flow';

/**
 * PAR-15 — the booking flow the app did not have.
 *
 * Fixtures are transcribed from the reply objects in the route handlers, cited
 * per-block. The assertions are chosen to fail against the specific wrong
 * implementations that were available to be written here:
 *
 *   • reading `temples[].templeId` as the offering id (the two are different
 *     columns; the service comment at puja.service.ts:122-128 exists because
 *     the web made exactly this mistake);
 *   • `toISOString().slice(0,10)` for the date key, which is YESTERDAY for any
 *     IST user after 18:30 and gets the booking rejected as a past date;
 *   • treating an unknown `remaining` as "free";
 *   • letting the shared client's `data?.error?.message` reader stand, which
 *     turns "that slot was just taken" into "Request failed with status 409".
 */

// ─── GET /api/v1/pujas/types/:slug ──────────────────────────────────────────
// routes/pujas.ts:64 sends `{...pujaType, pujaType}`; the object is built at
// services/puja.service.ts:140-181.
const PUJA_DETAIL = {
  id: 'aaaaaaaa-1111-4000-8000-000000000001',
  slug: 'satyanarayan-katha',
  name: 'Satyanarayan Katha',
  description: 'Full katha with 108 offerings.',
  basePrice: '1501.00',
  nriPrice: '13509.00',
  durationMinutes: 120,
  samagriIncluded: true,
  temples: [
    {
      // `id` IS the TemplePujaOffering id. `templeId` is the Temple.
      id: 'off11111-1111-4000-8000-000000000001',
      offeringId: 'off11111-1111-4000-8000-000000000001',
      templeId: 'tmp11111-1111-4000-8000-000000000001',
      templeName: 'Kashi Vishwanath',
      templeCity: 'Varanasi',
      templeState: 'Uttar Pradesh',
      isActive: true,
      isVerified: true,
      priceOverride: '1750.00',
      maxBookingsPerSlot: 3,
      availableSlots: [
        { time: '06:00', label: 'Morning (6:00 AM)' },
        { time: '18:00', label: 'Evening (6:00 PM)' },
      ],
      // legacy flat duplicates the service also emits
      name: 'Kashi Vishwanath',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
    },
    {
      id: 'off22222-2222-4000-8000-000000000002',
      offeringId: 'off22222-2222-4000-8000-000000000002',
      templeId: 'tmp22222-2222-4000-8000-000000000002',
      templeName: 'Somnath',
      templeCity: 'Prabhas Patan',
      templeState: 'Gujarat',
      isActive: true,
      isVerified: false,
      priceOverride: null,
      maxBookingsPerSlot: 2,
      availableSlots: [{ time: '07:30', label: 'Morning (7:30 AM)' }],
    },
  ],
};

describe('PAR-15 selectPujaBookingDetail', () => {
  it('reads the booking fields off the ROOT, not a `data` wrapper', () => {
    const d = selectPujaBookingDetail(PUJA_DETAIL)!;
    expect(d.pujaTypeId).toBe('aaaaaaaa-1111-4000-8000-000000000001');
    expect(d.basePriceInr).toBe(1501);
    expect(d.nriPriceInr).toBe(13509);
  });

  it('keeps the OFFERING id separate from the temple id', () => {
    // Sending the temple id as templePujaOfferingId 400s with "Temple puja
    // offering not found" after the whole form is filled in.
    const first = selectPujaBookingDetail(PUJA_DETAIL)!.offerings[0]!;
    expect(first.offeringId).toBe('off11111-1111-4000-8000-000000000001');
    expect(first.templeId).toBe('tmp11111-1111-4000-8000-000000000001');
    expect(first.offeringId).not.toBe(first.templeId);
  });

  it('prefers the offering price over the puja base price', () => {
    const d = selectPujaBookingDetail(PUJA_DETAIL)!;
    // Temple 1 overrides at 1750; temple 2 has no override and pays the base.
    expect(offeringPriceInr(d, d.offerings[0]!)).toBe(1750);
    expect(offeringPriceInr(d, d.offerings[1]!)).toBe(1501);
  });

  it('drops inactive offerings before they reach the picker', () => {
    const d = selectPujaBookingDetail({
      ...PUJA_DETAIL,
      temples: [{ ...PUJA_DETAIL.temples[0]!, isActive: false }],
    })!;
    expect(d.offerings).toHaveLength(0);
  });

  it('returns null for the 404 body rather than a half-built booking screen', () => {
    expect(selectPujaBookingDetail({ error: 'Puja type not found' })).toBeNull();
  });
});

// ─── GET /api/v1/bookings/slots ─────────────────────────────────────────────
// routes/bookings.ts:1856-1869 -> {slots:[{time,label,remaining,total}]}
describe('PAR-15 selectBookableSlots', () => {
  const SLOTS = {
    slots: [
      { time: '06:00', label: 'Morning (6:00 AM)', remaining: 2, total: 3 },
      { time: '18:00', label: 'Evening (6:00 PM)', remaining: 0, total: 3 },
    ],
  };

  it('carries the remaining count the server computed', () => {
    const s = selectBookableSlots(SLOTS);
    expect(s).toHaveLength(2);
    expect(s[0]!.remaining).toBe(2);
    expect(s[1]!.remaining).toBe(0);
  });

  it('marks a full slot unbookable', () => {
    const s = selectBookableSlots(SLOTS);
    expect(isSlotBookable(s[0]!)).toBe(true);
    expect(isSlotBookable(s[1]!)).toBe(false);
  });

  it('treats an UNKNOWN remaining as unbookable, not as free', () => {
    // Offering the slot anyway means the devotee fills the form and then eats
    // "No availability for the selected slot" from the create call.
    const s = selectBookableSlots({ slots: [{ time: '06:00', remaining: null }] })[0]!;
    expect(s.remaining).toBeNull();
    expect(isSlotBookable(s)).toBe(false);
  });

  it('yields [] for the empty-offering answer, not a crash', () => {
    // bookings.ts:1815 returns {slots: []} for an unresolvable offering.
    expect(selectBookableSlots({ slots: [] })).toEqual([]);
    expect(selectBookableSlots({ error: 'Failed to fetch availability' })).toEqual([]);
  });
});

// ─── the body POST /bookings/book accepts ───────────────────────────────────
// createBookingSchema, routes/bookings.ts:59-92
describe('PAR-15 buildCreateBookingBody', () => {
  const detail = selectPujaBookingDetail(PUJA_DETAIL)!;
  const base: BookingFormState = {
    pujaTypeId: detail.pujaTypeId,
    offering: detail.offerings[0]!,
    scheduledDate: '2030-01-01',
    scheduledTimeSlot: '06:00',
    devotees: [{ name: 'Arjun Sharma', gotra: 'Kashyap' }],
  };

  it('sends `scheduledTimeSlot`, which is the name the route requires', () => {
    const body = buildCreateBookingBody(base);
    expect(body.scheduledTimeSlot).toBe('06:00');
    expect('scheduledTime' in body).toBe(false);
  });

  it('sends devoteeNames as OBJECTS, not as strings', () => {
    // The shared CreateBooking type uses string[] with parallel gotras[]; the
    // route wants {name,gotra,nakshatra}[]. Sending strings fails the schema.
    const body = buildCreateBookingBody(base);
    expect(body.devoteeNames).toEqual([{ name: 'Arjun Sharma', gotra: 'Kashyap', nakshatra: undefined }]);
  });

  it('sends the offering id as templePujaOfferingId and the temple as templeId', () => {
    const body = buildCreateBookingBody(base);
    expect(body.templePujaOfferingId).toBe('off11111-1111-4000-8000-000000000001');
    expect(body.templeId).toBe('tmp11111-1111-4000-8000-000000000001');
  });

  it('never claims prasad delivery without an address', () => {
    // requirePrasadDeliveryAddress rejects true-without-address, so a hardcoded
    // true would 400 every booking.
    expect(buildCreateBookingBody(base).prasadDeliveryRequested).toBe(false);
  });

  it('drops blank devotee rows and refuses an all-blank sankalp', () => {
    expect(
      buildCreateBookingBody({ ...base, devotees: [{ name: 'Arjun' }, { name: '   ' }] })
        .devoteeNames,
    ).toHaveLength(1);
    expect(() => buildCreateBookingBody({ ...base, devotees: [{ name: '  ' }] })).toThrow(
      BookingInputError,
    );
  });

  it('refuses a past date before the devotee fills in the rest', () => {
    expect(() => buildCreateBookingBody({ ...base, scheduledDate: '2020-01-01' })).toThrow(
      /has passed/,
    );
  });

  it('refuses a missing temple, date or slot with a specific message each', () => {
    expect(() => buildCreateBookingBody({ ...base, offering: null })).toThrow(/temple/i);
    expect(() => buildCreateBookingBody({ ...base, scheduledDate: null })).toThrow(/date/i);
    expect(() => buildCreateBookingBody({ ...base, scheduledTimeSlot: null })).toThrow(/slot/i);
  });

  it('omits empty optional text rather than sending empty strings', () => {
    const body = buildCreateBookingBody({ ...base, specialInstructions: '   ' });
    expect(body.specialInstructions).toBeUndefined();
  });
});

// ─── the 201 reply and the error bodies ─────────────────────────────────────
describe('PAR-15 selectCreatedBooking', () => {
  it('reads `booking`, which is the key routes/bookings.ts:886 sends', () => {
    const b = selectCreatedBooking({
      booking: {
        id: 'bk111111-1111-4000-8000-000000000001',
        bookingNumber: 'BS-20260815-A1B2C',
        status: 'pending_payment',
      },
    })!;
    expect(b.id).toBe('bk111111-1111-4000-8000-000000000001');
    expect(b.bookingNumber).toBe('BS-20260815-A1B2C');
    expect(b.status).toBe('pending_payment');
  });

  it('returns null rather than inventing a booking from an error body', () => {
    expect(selectCreatedBooking({ error: 'Validation Error', details: [] })).toBeNull();
    expect(selectCreatedBooking({ data: { id: 'x' } })).toBeNull();
  });
});

describe('PAR-15 bookingErrorMessage', () => {
  it('surfaces the recoverable slot-race message the route localizes', () => {
    // The shared client reads data?.error?.message — undefined here, because
    // `error` is a STRING on this route — and reports the status code instead.
    const body = {
      error: 'That time slot was just taken. Please pick another.',
      code: 'SLOT_TAKEN',
      message: 'That time slot was just taken. Please pick another.',
    };
    expect(bookingErrorMessage(body, 409)).toBe(
      'That time slot was just taken. Please pick another.',
    );
    expect(bookingErrorMessage(body, 409)).not.toMatch(/status 409/);
  });

  it('surfaces the first Zod detail on a 400', () => {
    const body = {
      error: 'Validation Error',
      details: [{ path: ['scheduledTimeSlot'], message: 'Time slot is required' }],
    };
    expect(bookingErrorMessage(body, 400)).toBe('Time slot is required');
  });

  it('falls back to the bare `error` string', () => {
    expect(bookingErrorMessage({ error: 'Temple puja offering not found.' }, 400)).toBe(
      'Temple puja offering not found.',
    );
  });

  it('says something usable when the body is not JSON at all', () => {
    expect(bookingErrorMessage(null, 500)).toBe('Could not create the booking (status 500).');
    expect(bookingErrorMessage(null, 401)).toMatch(/sign in/i);
  });
});

describe('PAR-15 resumePaymentUrl', () => {
  it('points at the resume-payment page, with its `id` parameter', () => {
    const url = resumePaymentUrl('bk111111-1111-4000-8000-000000000001');
    expect(url).toMatch(/^https:\/\/darshya\.online\/bookings\/pay\?id=/);
    expect(url).toContain('bk111111-1111-4000-8000-000000000001');
  });

  it('does NOT send the devotee back into the booking wizard', () => {
    // /pujas/book posts /bookings/create-order, which mints a SECOND booking
    // and a second slot hold for one customer intent. That is how the DB-03
    // ghost bookings accumulated.
    const url = resumePaymentUrl('bk-1');
    expect(url).not.toContain('/pujas/book');
    expect(url).not.toContain('create-order');
  });
});

// ─── dates ──────────────────────────────────────────────────────────────────
describe('PAR-15 date keys', () => {
  it('uses the LOCAL calendar day, not the UTC one', () => {
    // 2026-08-15 23:30 in a UTC+5:30 zone is 18:00 UTC on the SAME day, but
    // 2026-08-16 00:30 local is 19:00 UTC on 2026-08-15 — toISOString() there
    // yields the previous day and the route rejects it as a past date.
    // Constructed from local parts so the assertion holds in any test zone.
    const lateEvening = new Date(2026, 7, 15, 23, 30, 0);
    expect(toLocalDateKey(lateEvening)).toBe('2026-08-15');
    const justAfterMidnight = new Date(2026, 7, 16, 0, 30, 0);
    expect(toLocalDateKey(justAfterMidnight)).toBe('2026-08-16');
  });

  it('agrees with toISOString only when the two calendars agree', () => {
    // Pins the distinction rather than the machine's zone: whenever the local
    // and UTC dates differ, toLocalDateKey must follow the LOCAL one.
    const d = new Date(2026, 7, 16, 0, 30, 0);
    const utcKey = d.toISOString().slice(0, 10);
    if (utcKey !== '2026-08-16') {
      expect(toLocalDateKey(d)).not.toBe(utcKey);
    }
    expect(toLocalDateKey(d)).toBe('2026-08-16');
  });

  it('treats today as bookable and yesterday as past', () => {
    const now = new Date(2026, 7, 15, 12, 0, 0);
    expect(isPastDate('2026-08-15', now)).toBe(false);
    expect(isPastDate('2026-08-14', now)).toBe(true);
    expect(isPastDate('2026-08-16', now)).toBe(false);
  });

  it('rejects a malformed key instead of letting it reach the route', () => {
    expect(isPastDate('15-08-2026')).toBe(true);
    expect(isPastDate('')).toBe(true);
  });

  it('offers a run of days starting today', () => {
    const keys = upcomingDateKeys(3, new Date(2026, 7, 15, 12, 0, 0));
    expect(keys).toEqual(['2026-08-15', '2026-08-16', '2026-08-17']);
  });
});

// ─── the screen ─────────────────────────────────────────────────────────────

const APP = path.resolve(__dirname, '../../app');

/** Source with comments stripped — a guard must match code, not its own prose. */
function code(rel: string): string {
  return readFileSync(path.join(APP, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('PAR-15 — booking happens in the app', () => {
  it('the native booking screen exists', () => {
    expect(existsSync(path.join(APP, '(devotee)/puja-book.tsx'))).toBe(true);
  });

  it('the Book control routes in-app instead of opening a browser', () => {
    const src = code('(devotee)/pujas.tsx');
    expect(src).toMatch(/\/\(devotee\)\/puja-book/);
    // The whole finding: the only booking action was Linking.openURL.
    expect(src).not.toMatch(/Linking\.openURL/);
    expect(src).not.toMatch(/darshya\.online\/pujas\/book/);
  });

  it('the screen posts to the create route, not the order route', () => {
    const src = code('(devotee)/puja-book.tsx');
    expect(src).toMatch(/\/api\/v1\/bookings\/book/);
    // /create-order commits a booking AND a Razorpay order; without a native
    // checkout to finish it, that only manufactures unpayable ghost rows.
    expect(src).not.toMatch(/bookings\/create-order/);
  });

  it('the screen builds its body through the validated builder', () => {
    expect(code('(devotee)/puja-book.tsx')).toMatch(/buildCreateBookingBody\(/);
  });

  it('the remaining hand-off is the payment step only, and it says so', () => {
    const src = code('(devotee)/puja-book.tsx');
    expect(src).toMatch(/resumePaymentUrl\(/);
  });
});
