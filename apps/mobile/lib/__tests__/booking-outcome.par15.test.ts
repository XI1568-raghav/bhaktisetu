import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createBookingOutcome } from '../booking-flow';

/**
 * PAR-15 — a 2xx the client cannot parse is not a failure.
 *
 * The native booking screen decided its outcome with
 * `if (!res.ok || !booking) setSubmitError(bookingErrorMessage(body, res.status))`.
 * That folds two different events into one:
 *
 *   - the server refused (4xx/5xx). Nothing was created; retry is correct.
 *   - the server ACCEPTED (201) but the body did not parse into a booking —
 *     a proxy rewrote it, a field was renamed, a CDN served an error page with
 *     a 200. A `PujaBooking` row now exists at `pending_payment` holding one of
 *     the offering's seats.
 *
 * In the second case the devotee was told "Could not create the booking (status
 * 201)" — a sentence that contradicts itself and, worse, advises exactly the
 * wrong action. Booking again mints a SECOND row and a SECOND slot hold for one
 * customer intent, which is how the ghost `pending_payment` bookings in DB-03
 * accumulated in the first place. The module's own docblock names that failure
 * mode as the reason it refuses to call /create-order; the submit path then
 * walked into it by another door.
 *
 * Three outcomes, not two — the same discipline `resolveSlotAvailability`
 * already applies to the availability read.
 */

describe('createBookingOutcome', () => {
  const booking = { id: 'b-1', bookingNumber: 'BS-20260820-A1B2C', status: 'pending_payment' };

  it('a 201 carrying a booking is created', () => {
    const out = createBookingOutcome({ ok: true, status: 201, body: { booking } });
    expect(out.kind).toBe('created');
    if (out.kind !== 'created') throw new Error('unreachable');
    expect(out.booking.id).toBe('b-1');
    expect(out.booking.bookingNumber).toBe('BS-20260820-A1B2C');
  });

  it('a 409 slot race is a failure carrying the recoverable message', () => {
    const out = createBookingOutcome({
      ok: false,
      status: 409,
      body: { error: 'Slot taken', code: 'SLOT_TAKEN', message: 'That slot was just taken.' },
    });
    expect(out.kind).toBe('failed');
    if (out.kind !== 'failed') throw new Error('unreachable');
    expect(out.message).toBe('That slot was just taken.');
  });

  it('a 400 validation error is a failure carrying the first zod detail', () => {
    const out = createBookingOutcome({
      ok: false,
      status: 400,
      body: { error: 'Validation Error', details: [{ path: ['scheduledDate'], message: 'Cannot book a past date.' }] },
    });
    expect(out.kind).toBe('failed');
    if (out.kind !== 'failed') throw new Error('unreachable');
    expect(out.message).toBe('Cannot book a past date.');
  });

  it('a 401 is a failure telling the devotee to sign in', () => {
    const out = createBookingOutcome({ ok: false, status: 401, body: null });
    expect(out.kind).toBe('failed');
    if (out.kind !== 'failed') throw new Error('unreachable');
    expect(out.message).toBe('Sign in to book a puja.');
  });

  it('a 2xx whose body has no booking is UNCERTAIN, never failed', () => {
    for (const body of [null, {}, { booking: null }, { booking: {} }, 'not json at all']) {
      const out = createBookingOutcome({ ok: true, status: 200, body });
      expect(out.kind, `body ${JSON.stringify(body)} was not treated as uncertain`).toBe(
        'uncertain',
      );
    }
  });

  it('the uncertain message never claims the booking failed', () => {
    const out = createBookingOutcome({ ok: true, status: 201, body: {} });
    if (out.kind !== 'uncertain') throw new Error('expected uncertain');
    expect(out.message.toLowerCase()).not.toContain('was not created');
    expect(out.message.toLowerCase()).not.toContain('could not create');
    // It must send the devotee to look rather than to retry — a retry is the
    // one action that creates a second slot hold.
    expect(out.message).toMatch(/My Bookings/);
  });

  it('the uncertain message never quotes the success status back as an error', () => {
    const out = createBookingOutcome({ ok: true, status: 201, body: {} });
    if (out.kind !== 'uncertain') throw new Error('expected uncertain');
    expect(out.message).not.toContain('201');
  });

  it('a transport failure (no reply at all) is a failure, not uncertainty', () => {
    // The request never reached the server, so nothing can have been created.
    const out = createBookingOutcome(null);
    expect(out.kind).toBe('failed');
    if (out.kind !== 'failed') throw new Error('unreachable');
    expect(out.message).toMatch(/not created/);
  });
});

describe('the booking screen consumes the three-way outcome', () => {
  const SCREEN = path.resolve(__dirname, '../../app/(devotee)/puja-book.tsx');

  /** Comments blanked, so the docblock explaining the fix cannot satisfy it. */
  function stripComments(src: string): string {
    return src
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/(^|[^:])\/\/.*$/gm, (m, p1: string) => p1 + ' '.repeat(m.length - p1.length));
  }

  const src = stripComments(readFileSync(SCREEN, 'utf8'));

  it('the stripper actually removes this file class of comment', () => {
    const raw = readFileSync(SCREEN, 'utf8');
    expect((raw.match(/createBookingOutcome/g) ?? []).length).toBeGreaterThan(
      (src.match(/createBookingOutcome/g) ?? []).length,
    );
  });

  it('calls createBookingOutcome', () => {
    expect(src).toContain('createBookingOutcome(');
  });

  it('no longer decides the outcome with the two-way !res.ok || !booking test', () => {
    expect(src).not.toMatch(/!res\.ok\s*\|\|\s*!booking/);
  });

  it('still re-reads availability on the 409 slot race', () => {
    // The recovery this screen already had must survive the refactor.
    expect(src).toMatch(/409/);
    expect(src).toContain('setAvailabilityNonce');
  });
});
