/**
 * DB-07 — one devotee could blank out a whole slot, and any year was bookable.
 *
 * Reproduced on the prod sweep (2026-08-12) against a booted API with a real
 * devotee token, on an offering whose slot reported {remaining:5, total:5}:
 *
 *   POST /bookings/create-order x6, same offering + date + slot, same user
 *   -> 201 BS-20260812-IMJRW / M9OBX / KXVGX / B6R1Z / S5VSQ, then
 *      409 {"error":"The selected time slot is no longer available."}
 *   GET /bookings/slots -> that slot now {"remaining":0,"total":5}
 *
 * The capacity guard held; the hole is that nothing said the five holds all
 * belonged to ONE unpaid user. Every abandoned checkout and every failed
 * gateway attempt mints another hold, and they survive UNPAID_HOLD_MINUTES, so
 * a marquee slot goes dark for half an hour with no malice required.
 *
 * RES-05 already reuses a byte-identical hold, which closes the retry case.
 * It deliberately does not fire when the devotee names, the amount or the
 * prasad choice differ — and the sweep's repro used a different devotee name
 * each time, which is exactly how five rows were minted. Reuse handles "the
 * same request again"; this handles "a different request for a slot you are
 * already holding".
 *
 * Second half, same finding: `scheduledDate: "2031-01-01"` returned 201 and
 * rendered on My Bookings as "1 Jan 2031". futureBookingDateSchema refined
 * against past dates only — there was no upper bound at all, so a mistyped
 * year created a booking five years out that no pandit will ever be assigned.
 */
import { describe, it, expect } from 'vitest';
import { __testing } from './bookings.js';

const {
  createOrderBodySchema,
  fromOfferingBodySchema,
  MAX_BOOKING_HORIZON_DAYS,
  classifyCreateBookingError,
} = __testing;

function isoDaysAhead(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const baseOrder = {
  pujaSlug: 'rudrabhishek',
  templeOfferingId: '11111111-1111-4111-8111-111111111111',
  scheduledTime: '06:00',
  devotees: [{ name: 'Arjun Sharma' }],
};

const baseOffering = {
  offeringId: '11111111-1111-4111-8111-111111111111',
  scheduledTime: '06:00',
  devotees: [{ name: 'Arjun Sharma' }],
};

describe('DB-07 — the booking horizon has an upper bound', () => {
  it('exposes a horizon the client can be checked against', () => {
    expect(typeof MAX_BOOKING_HORIZON_DAYS).toBe('number');
    expect(MAX_BOOKING_HORIZON_DAYS).toBeGreaterThan(30);
  });

  it('rejects the mistyped year the sweep booked', () => {
    const parsed = createOrderBodySchema.safeParse({
      ...baseOrder,
      scheduledDate: '2031-01-01',
    });
    expect(parsed.success).toBe(false);
  });

  it('says how far ahead bookings actually open', () => {
    const parsed = createOrderBodySchema.safeParse({
      ...baseOrder,
      scheduledDate: isoDaysAhead(MAX_BOOKING_HORIZON_DAYS + 30),
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(JSON.stringify(parsed.error.issues)).toMatch(/too far ahead/i);
  });

  it('applies the same bound to POST /from-offering', () => {
    const parsed = fromOfferingBodySchema.safeParse({
      ...baseOffering,
      scheduledDate: '2031-01-01',
    });
    expect(parsed.success).toBe(false);
  });

  it('still accepts a date inside the window', () => {
    for (const days of [1, 30, 45, MAX_BOOKING_HORIZON_DAYS - 1]) {
      const parsed = createOrderBodySchema.safeParse({
        ...baseOrder,
        scheduledDate: isoDaysAhead(days),
      });
      expect(parsed.success, `+${days}d`).toBe(true);
    }
  });

  it('still rejects a past date', () => {
    const parsed = createOrderBodySchema.safeParse({
      ...baseOrder,
      scheduledDate: isoDaysAhead(-1),
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(JSON.stringify(parsed.error.issues)).toMatch(/past date/i);
  });
});

describe('DB-07 — a duplicate hold answers 409, not 400', () => {
  it('classifies the duplicate-hold refusal as a state conflict', () => {
    // booking.service throws this verbatim; a bare 400 would tell the wizard
    // the REQUEST was malformed, which it was not.
    const failure = classifyCreateBookingError(
      'You already have an unpaid booking (BS-20260812-IMJRW) for this puja at this date and time. ' +
        'Complete or cancel that booking before making another.',
    );
    expect(failure.status).toBe(409);
    // No localised code: the caller needs the booking NUMBER, and a code would
    // replace the message that carries it.
    expect(failure.code).toBeUndefined();
  });

  it('leaves the existing slot-race classification alone', () => {
    expect(
      classifyCreateBookingError('No availability for the selected slot. Maximum 5 bookings allowed.'),
    ).toEqual({ status: 409, code: 'SLOT_UNAVAILABLE' });
  });
});
