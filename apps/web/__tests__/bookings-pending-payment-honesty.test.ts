/**
 * DB-03, remaining halves (prod sweep 2026-08-12).
 *
 * The list CTA and the /bookings/pay resume page shipped already
 * (__tests__/bookings-complete-payment.test.tsx). Two halves of the same
 * finding did not:
 *
 * 1. THE FAILURE COPY STILL SAYS NOTHING WAS CREATED. When the gateway key is
 *    unusable the wizard renders "Payments are temporarily unavailable — ...
 *    so we did not open checkout. You have NOT been charged." But the network
 *    trace from the sweep shows POST /bookings/create-order had already
 *    returned 201 with bookingNumber BS-20260812-QXUWN, and the API confirms
 *    that row persists at pending_payment holding a slot seat for
 *    UNPAID_HOLD_MINUTES. "You have NOT been charged" is true; the implication
 *    that nothing happened is not. The devotee is not told a reservation
 *    exists, so they do not know to go and complete it — which is exactly how
 *    one seeded account accumulated eight ghosts.
 *
 * 2. THE DETAIL PAGE'S BANNER HAS NO ACTION. /bookings/view renders a
 *    "Payment Pending" banner that is text only. The list row got a
 *    "Complete payment" button; the page a devotee lands on from that row did
 *    not — the same one-side-shipped split this repo keeps producing.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*/g, '$1');

const wizard = stripComments(read('app/pujas/book/page.tsx'));
const detailSrc = read('app/bookings/view/page.tsx');
const detail = stripComments(detailSrc);

describe('DB-03 — the gateway-failure copy admits the reservation exists', () => {
  it('no longer implies nothing was created', () => {
    expect(wizard).not.toMatch(/so we did not open checkout/i);
  });

  it('still states plainly that no money was taken', () => {
    expect(wizard).toMatch(/not been charged/i);
  });

  it('tells the devotee their slot is reserved and how long it is held', () => {
    expect(wizard).toMatch(/reserv/i);
    expect(wizard).toMatch(/30 minutes/);
  });

  it('points at the place the booking can actually be paid', () => {
    expect(wizard).toMatch(/My Bookings/);
  });
});

describe('DB-03 — the detail page banner carries the same action as the list row', () => {
  it('links to the resume-payment route with the booking id', () => {
    expect(detail).toMatch(/\/bookings\/pay\?id=\$\{?/);
  });

  it('labels it the same as the list so the two surfaces read as one product', () => {
    expect(detail).toContain('Complete payment');
  });

  it('the CTA is gated on pending_payment, not rendered for every booking', () => {
    const banner = detail.slice(detail.indexOf("booking.status === 'pending_payment'"));
    expect(banner).toBeTruthy();
    // The link must appear inside the pending_payment branch, before the next
    // status banner (cancelled/refunded) starts.
    const nextBanner = banner.indexOf("booking.status === 'cancelled'");
    const region = nextBanner > 0 ? banner.slice(0, nextBanner) : banner;
    expect(region).toContain('/bookings/pay?id=');
  });

  it('the banner stops saying only that payment was not received', () => {
    expect(detail).toMatch(/reserv/i);
  });
});
