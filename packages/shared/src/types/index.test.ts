import { describe, it, expect } from 'vitest';
import type { Payment, PriestPayout, PujaBooking, Subscription } from './index.js';

// These are TYPE regression tests. They are deliberately compile-time first:
// each `@ts-expect-error` fails `tsc --noEmit` the moment the defect is
// reintroduced (an unused @ts-expect-error is itself an error), so re-adding a
// USD member or a Stripe id cannot land silently. The runtime `expect`s only
// keep vitest from reporting an empty suite.

describe('money shape is INR-only', () => {
  // Stripe was removed on 2026-08-11; Razorpay is the only gateway and INR the
  // only currency. A "USD" member on a response type is the false signal that
  // produced RV-01 — an INR amount handed onward as if it were dollars.
  it('rejects a USD currency on every money-bearing response type', () => {
    // @ts-expect-error currency is "INR"-only — no USD rail exists
    const bookingCurrency: PujaBooking['currency'] = 'USD';
    // @ts-expect-error currency is "INR"-only — no USD rail exists
    const paymentCurrency: Payment['currency'] = 'USD';
    // @ts-expect-error currency is "INR"-only — no USD rail exists
    const payoutCurrency: PriestPayout['currency'] = 'USD';
    // @ts-expect-error currency is "INR"-only — no USD rail exists
    const subscriptionCurrency: Subscription['currency'] = 'USD';

    expect([bookingCurrency, paymentCurrency, payoutCurrency, subscriptionCurrency]).toEqual([
      'USD',
      'USD',
      'USD',
      'USD',
    ]);
  });

  it('accepts INR', () => {
    const currency: Payment['currency'] = 'INR';
    expect(currency).toBe('INR');
  });
});

describe('no Stripe fields survive on the wire shapes', () => {
  it('has no stripePaymentIntentId on Payment', () => {
    // @ts-expect-error the Stripe rail is deleted — this key must not exist
    const _probe: keyof Payment = 'stripePaymentIntentId';
    expect(true).toBe(true);
  });

  it('has no stripeSubscriptionId on Subscription', () => {
    // @ts-expect-error the Stripe rail is deleted — this key must not exist
    const _probe: keyof Subscription = 'stripeSubscriptionId';
    expect(true).toBe(true);
  });
});

describe('booking slot field matches the wire shape', () => {
  // The API returns `scheduledTimeSlot` (a free-form IST slot label) alongside
  // `scheduledDate` (a DATE at midnight). The type used to declare
  // `scheduledTime`, which the API never returns, so consumers got undefined
  // and compared scheduledDate alone — the exact mis-comparison
  // apps/api/src/lib/slot-time.ts exists to prevent.
  it('exposes scheduledTimeSlot, not scheduledTime', () => {
    const slotKey: keyof PujaBooking = 'scheduledTimeSlot';
    // @ts-expect-error `scheduledTime` is not a field the API ever returns
    const phantomKey: keyof PujaBooking = 'scheduledTime';

    expect(slotKey).toBe('scheduledTimeSlot');
    expect(phantomKey).toBe('scheduledTime');
  });
});
