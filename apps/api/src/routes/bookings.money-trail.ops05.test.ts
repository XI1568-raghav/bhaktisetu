import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { __testing } from './bookings.js';
import { MONEY_EVENTS } from '../lib/audit-money.js';

/**
 * OPS-05 — `BOOKING_CREATED` was a declared money-event constant with ZERO call
 * sites.
 *
 * `lib/audit-money.ts` declares 17 event types and 13 of them are wired (7 in
 * payment.service, 2 in payout.service, 4 in refund.service). `BOOKING_CREATED`
 * was not one of them, which leaves the durable trail starting at
 * PAYMENT_INITIATED — i.e. the trail could tell you a gateway order was opened
 * but not that a booking existed, what it was priced at, or how the price was
 * split, and those are the first three questions a disputed booking asks.
 *
 * It matters most on the two order paths. `POST /create-order` and `POST
 * /from-offering` each create a booking AND open a Razorpay order in one
 * request, so a failure between the two leaves a `pending_payment` row that the
 * trail cannot distinguish from "the devotee never tried".
 *
 * Three creation sites exist in this file — `/book`, `/create-order` and
 * `/from-offering`. All three are wired.
 *
 * TESTABILITY. This route file has no Fastify+Prisma integration scaffolding
 * anywhere in the suite (bookings.test.ts:43 records the same constraint and
 * the same remedy). So the DECISION — what gets logged, with what amount, under
 * what idempotency key — lives in a pure builder exported through `__testing`
 * and is asserted for real below; only the `void recordMoneyEvent(...)`
 * plumbing is checked at the source, and that check is scoped to each
 * handler's own slice so a single call could not satisfy all three.
 */

const { bookingCreatedEvent } = __testing;

const SOURCE = readFileSync(fileURLToPath(new URL('./bookings.ts', import.meta.url)), 'utf8');

/**
 * Strip block and `//` comments. This file's own prose names the function it
 * looks for, and so does the route file's — a raw scan would be satisfied by an
 * explanation of the wiring rather than by the wiring.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** The source of ONE route handler: from its `'<path>'` literal to the next `server.`. */
function handlerSlice(routePath: string): string {
  const code = stripComments(SOURCE);
  const start = code.indexOf(`'${routePath}',`);
  expect(start, `route ${routePath} not found`).toBeGreaterThan(-1);
  const next = code.indexOf('server.post(', start + 1);
  const nextGet = code.indexOf('server.get(', start + 1);
  const candidates = [next, nextGet].filter((n) => n > -1);
  const end = candidates.length ? Math.min(...candidates) : code.length;
  return code.slice(start, end);
}

const BOOKING = {
  id: '7c1d2f90-1111-4222-8333-444455556666',
  bookingNumber: 'BS-20260828-ABCDE',
  priceAmount: '1301.00',
  currency: 'INR',
  status: 'pending_payment',
};

describe('OPS-05 — the money trail records that a booking exists', () => {
  it('builds a BOOKING_CREATED event naming the booking and its price', () => {
    const ev = bookingCreatedEvent({
      booking: BOOKING,
      userId: 'u-1',
      rail: 'create-order',
    });

    expect(ev.eventType).toBe(MONEY_EVENTS.BOOKING_CREATED);
    expect(ev.subjectType).toBe('booking');
    expect(ev.subjectId).toBe(BOOKING.id);
    expect(ev.bookingId).toBe(BOOKING.id);
    // The AMOUNT is the whole point — a trail row with no figure cannot answer
    // "what was this booking for" after the fact.
    expect(String(ev.amount)).toBe('1301.00');
    expect(ev.currency).toBe('INR');
    expect(ev.statusAfter).toBe('pending_payment');
  });

  it('attributes the event to the devotee who made it, not to the system', () => {
    const ev = bookingCreatedEvent({ booking: BOOKING, userId: 'u-1', rail: '/book' });
    expect(ev.actorType).toBe('devotee');
    expect(ev.actorId).toBe('u-1');
  });

  it('keys idempotency on the booking id, so a retry collapses to one row', () => {
    const a = bookingCreatedEvent({ booking: BOOKING, userId: 'u-1', rail: 'create-order' });
    const b = bookingCreatedEvent({ booking: BOOKING, userId: 'u-1', rail: 'create-order' });
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
    expect(a.idempotencyKey).toContain(BOOKING.id);
    // Do NOT pre-prefix with the event type — recordMoneyEvent namespaces it,
    // and a caller-side prefix would push the writer's own off the length clip.
    expect(a.idempotencyKey).not.toContain(MONEY_EVENTS.BOOKING_CREATED);
  });

  it('records which rail created it, so the three paths stay distinguishable', () => {
    const a = bookingCreatedEvent({ booking: BOOKING, userId: 'u-1', rail: 'from-offering' });
    expect(a.metadata).toMatchObject({ rail: 'from-offering' });
    expect(a.metadata).toMatchObject({ bookingNumber: BOOKING.bookingNumber });
  });

  it('survives a booking row with no price rather than writing NaN', () => {
    const ev = bookingCreatedEvent({
      booking: { ...BOOKING, priceAmount: null as unknown as string },
      userId: 'u-1',
      rail: '/book',
    });
    expect(ev.subjectId).toBe(BOOKING.id);
    expect(ev.amount ?? null).toBeNull();
  });
});

describe('OPS-05 — every booking-creating handler records it', () => {
  it.each(['/book', '/create-order', '/from-offering'])(
    'POST %s records BOOKING_CREATED',
    (routePath) => {
      const slice = handlerSlice(routePath);
      expect(slice, `${routePath} does not build the event`).toMatch(/bookingCreatedEvent\(/);
      expect(slice, `${routePath} builds the event but never records it`).toMatch(
        /recordMoneyEvent\(/,
      );
    },
  );

  it('the comment stripper cannot be satisfied by prose', () => {
    expect(stripComments('// recordMoneyEvent(bookingCreatedEvent(x))\n')).not.toMatch(
      /recordMoneyEvent/,
    );
    expect(stripComments('/* bookingCreatedEvent( */')).not.toMatch(/bookingCreatedEvent/);
    expect(stripComments('void recordMoneyEvent(x);')).toMatch(/recordMoneyEvent/);
    expect(stripComments("const u = 'https://x.test/a';")).toMatch(/https:\/\/x\.test\/a/);
  });

  it('the slicer really isolates one handler', () => {
    // If the slice ran to end-of-file, one call site would satisfy all three
    // cases above and the test would be worthless.
    const slice = handlerSlice('/book');
    expect(slice.length).toBeGreaterThan(200);
    expect(slice.length).toBeLessThan(stripComments(SOURCE).length / 3);
    expect(slice).not.toMatch(/'\/from-offering',/);
  });
});
