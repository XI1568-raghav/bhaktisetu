import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  PLATFORM_FEE_INR,
  PRASAD_DELIVERY_FEE_INR,
  bookingPriceBreakdown,
  type PujaBookingDetail,
  type TempleOfferingOption,
} from '../booking-flow';

/**
 * PAR-15 — the native checkout re-introduced CM-03 on mobile.
 *
 * WHAT WENT WRONG
 * ---------------
 * Before PAR-15 the Book control opened the web wizard, and the web wizard
 * discloses the fee schedule: "Puja price ₹1,100 / Platform fee ₹51 / Total
 * ₹1,151" (apps/web/app/pujas/book/page.tsx:1748-1753, constants in
 * apps/web/lib/puja-pricing.ts). That disclosure IS the CM-03 fix — the sweep
 * caught an advertised ₹1,100 becoming ₹1,301 at step 3 of 4 on a site whose
 * trust strip promised "₹0 hidden fees".
 *
 * PAR-15 moved checkout into the app and did not bring the fee schedule with
 * it. app/(devotee)/puja-book.tsx rendered:
 *
 *     <Text style={styles.summaryLabel}>Total</Text>
 *     <Text style={styles.summaryValue}>{formatInr(priceInr)}</Text>
 *
 * where `priceInr = offering.priceOverride ?? detail.basePrice` — the puja
 * price ALONE. The server does not charge that number. createBooking builds
 *
 *     priceAmount = pujaPrice + PLATFORM_FEE_INR (+ PRASAD_DELIVERY_FEE_INR)
 *     — apps/api/src/services/booking.service.ts
 *
 * and POST /payments/create-order mints the Razorpay order from priceAmount
 * (payment.service.ts:702 `Math.round(Number(booking.priceAmount) * 100)`), so
 * the hand-off page the app opens right after renders "Pay ₹1,151"
 * (apps/web/app/bookings/pay/page.tsx:418) under a screen that said the total
 * was ₹1,100. A word labelled "Total" that is not the total is the CM-03
 * defect exactly, moved to a new surface — and it was undisclosed.
 *
 * WHAT THESE TESTS LOCK
 * ---------------------
 *   1. the mobile fee constants stay in lockstep with the API's — the only
 *      side that charges. Drift here is a mischarge, so it fails CI.
 *   2. the breakdown maths, including the ₹1,100 → ₹1,151 case the sweep
 *      captured and the unknown-price case that must NOT show a bare ₹51.
 *   3. the screen renders the fee and totals the charged amount. Source
 *      guards, comments stripped first — this package has no React Native
 *      renderer (vitest.config.ts scopes the runner to pure modules).
 */

// ─── 1. the constants mirror the API ────────────────────────────────────────

const API_BOOKING_SERVICE = path.resolve(
  __dirname,
  '../../../api/src/services/booking.service.ts',
);

describe('PAR-15/CM-03 — mobile fee constants mirror the API (the only side that charges)', () => {
  it('can see the API source it is mirroring', () => {
    // A missing file would make both assertions below vacuous.
    expect(existsSync(API_BOOKING_SERVICE), API_BOOKING_SERVICE).toBe(true);
  });

  const apiSrc = existsSync(API_BOOKING_SERVICE)
    ? readFileSync(API_BOOKING_SERVICE, 'utf8')
    : '';

  it('platform fee matches apps/api PLATFORM_FEE_INR', () => {
    const m = apiSrc.match(/export const PLATFORM_FEE_INR\s*=\s*(\d+)/);
    expect(m, 'API PLATFORM_FEE_INR not found — the mirror cannot verify').toBeTruthy();
    expect(PLATFORM_FEE_INR).toBe(Number(m![1]));
  });

  it('prasad delivery fee matches apps/api PRASAD_DELIVERY_FEE_INR', () => {
    const m = apiSrc.match(/export const PRASAD_DELIVERY_FEE_INR\s*=\s*(\d+)/);
    expect(m, 'API PRASAD_DELIVERY_FEE_INR not found').toBeTruthy();
    expect(PRASAD_DELIVERY_FEE_INR).toBe(Number(m![1]));
  });

  it('matches the web mirror, so the two clients cannot quote different totals', () => {
    const webPricing = path.resolve(__dirname, '../../../web/lib/puja-pricing.ts');
    expect(existsSync(webPricing), webPricing).toBe(true);
    const src = readFileSync(webPricing, 'utf8');
    expect(PLATFORM_FEE_INR).toBe(
      Number(/export const PLATFORM_FEE_INR\s*=\s*(\d+)/.exec(src)![1]),
    );
    expect(PRASAD_DELIVERY_FEE_INR).toBe(
      Number(/export const PRASAD_DELIVERY_FEE_INR\s*=\s*(\d+)/.exec(src)![1]),
    );
  });
});

// ─── 2. the breakdown ───────────────────────────────────────────────────────

const detail = (basePriceInr: number | null): PujaBookingDetail => ({
  pujaTypeId: 'pt-1',
  slug: 'satyanarayan-katha',
  name: 'Satyanarayan Katha',
  basePriceInr,
  nriPriceInr: 5100,
  durationMinutes: 90,
  description: null,
  offerings: [],
});

const offering = (priceInr: number | null): TempleOfferingOption => ({
  offeringId: 'off-1',
  templeId: 'tmp-1',
  templeName: 'Kashi Vishwanath',
  city: 'Varanasi',
  state: 'UP',
  isVerified: true,
  priceInr,
  slots: [],
  maxBookingsPerSlot: 5,
});

describe('PAR-15/CM-03 — bookingPriceBreakdown states what the server will charge', () => {
  it('₹1,100 becomes ₹1,151 — the number the pay page will show', () => {
    const b = bookingPriceBreakdown(detail(1100), offering(null));
    expect(b.pujaPriceInr).toBe(1100);
    expect(b.platformFeeInr).toBe(51);
    expect(b.prasadFeeInr).toBe(0);
    expect(b.totalInr).toBe(1151);
  });

  it('the temple override, not the base price, is what gets the fee added', () => {
    const b = bookingPriceBreakdown(detail(1100), offering(2100));
    expect(b.pujaPriceInr).toBe(2100);
    expect(b.totalInr).toBe(2151);
  });

  it('prasad delivery adds its own fee — ₹1,301, the figure the sweep captured', () => {
    const b = bookingPriceBreakdown(detail(1100), offering(null), {
      prasadDeliveryRequested: true,
    });
    expect(b.prasadFeeInr).toBe(150);
    expect(b.totalInr).toBe(1301);
  });

  it('an unknown price stays unknown — never a bare ₹51 for nothing', () => {
    for (const b of [
      bookingPriceBreakdown(null, offering(null)),
      bookingPriceBreakdown(detail(1100), null),
      bookingPriceBreakdown(detail(null), offering(null)),
    ]) {
      expect(b.pujaPriceInr).toBeNull();
      expect(b.totalInr).toBeNull();
    }
  });

  it('a genuine zero price is a real ₹51 charge, not "price on request"', () => {
    // Deliberately different from the web mirror, and the difference is not an
    // oversight: apps/web/lib/puja-pricing.ts uses 0 to mean "no temple chosen
    // yet", because its input is a bare number. Here "not chosen" already has
    // its own value — null — so 0 can mean what it says. The API adds the
    // platform fee unconditionally, so ₹51 is what would be collected.
    const b = bookingPriceBreakdown(detail(0), offering(null));
    expect(b.pujaPriceInr).toBe(0);
    expect(b.totalInr).toBe(51);
  });

  it('a negative price is not turned into a payable total', () => {
    const b = bookingPriceBreakdown(detail(-100), offering(null));
    expect(b.totalInr).toBeNull();
  });
});

// ─── 3. the screen ──────────────────────────────────────────────────────────

const SCREEN = path.resolve(__dirname, '../../app/(devotee)/puja-book.tsx');

/** Comments blanked in place, so prose about the fix cannot satisfy a guard. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, (m, p1: string) => p1 + ' '.repeat(m.length - p1.length));
}

describe('PAR-15/CM-03 — the booking screen quotes the charged amount', () => {
  const raw = readFileSync(SCREEN, 'utf8');
  const src = stripComments(raw);

  it('the stripper actually removes this file class of comment', () => {
    // Without this, every assertion below could be satisfied by a docblock.
    expect((raw.match(/Platform fee/g) ?? []).length).toBeGreaterThan(0);
    expect(raw.length).toBe(src.length);
    expect(raw).not.toBe(src);
  });

  it('computes the price through the shared breakdown, not an inline sum', () => {
    expect(src).toMatch(/bookingPriceBreakdown\(/);
    // Inline literals are the drift hazard the API mirror above exists to stop.
    expect(src).not.toMatch(/\b51\b\s*[;,)]/);
    expect(src).not.toMatch(/=\s*\d+\s*\+\s*PLATFORM_FEE_INR/);
  });

  it('shows the platform fee as its own line, above the total', () => {
    const fee = src.indexOf('Platform fee');
    const total = src.indexOf('styles.summaryLabel');
    expect(fee, 'no platform-fee row on the booking screen').toBeGreaterThan(-1);
    expect(total, 'no total row on the booking screen').toBeGreaterThan(fee);
  });

  it('the row labelled Total renders the TOTAL, not the bare puja price', () => {
    const i = src.indexOf('styles.summaryLabel');
    const summary = src.slice(i, i + 500);
    expect(summary).toMatch(/Total/);
    expect(summary).toMatch(/totalInr/);
  });

  it('no longer renders a bare `priceInr` anywhere — that variable WAS the bug', () => {
    // `offeringPriceInr` / `basePriceInr` / `pujaPriceInr` all keep a capital P
    // and are unaffected; this matches only the old standalone local.
    expect(src).not.toMatch(/\bpriceInr\b/);
  });

  it('the confirmation screen names the amount still owed', () => {
    // The devotee is being sent to a page that will ask for ₹1,151. Saying
    // only "not paid yet" leaves them to discover the number there.
    const i = src.indexOf('successWarn');
    expect(i, 'no unpaid warning on the confirmation screen').toBeGreaterThan(-1);
    expect(src.slice(i, i + 400)).toMatch(/totalInr/);
  });
});
