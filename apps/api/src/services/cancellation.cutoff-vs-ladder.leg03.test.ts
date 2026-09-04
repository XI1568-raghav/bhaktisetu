import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CANCEL_POLICY,
  DEVOTEE_CANCEL_CUTOFF_HOURS,
  devoteeCancelAllowed,
  cancellationService,
} from './cancellation.service.js';

/**
 * LEG-03 (F223) — the site and the engine must agree about what a devotee gets
 * back, including when the answer is "nothing, and you cannot cancel".
 *
 * THE FINDING AS FILED. /faqs, /nri-pujas, /why-darshya and Terms §8 all said a
 * cancellation inside 24 hours was "not permitted" with "no refund", while
 * DEFAULT_CANCEL_POLICY carries a 50% tier at 4-24h and a 25% tier under 4h.
 * The copy half of that was fixed by routing every consumer surface through
 * apps/web/lib/cancellation-policy.ts. THIS file pins the other half, which
 * survived and was still reachable in production:
 *
 *   `booking.service.cancelBooking` refuses a devotee cancel inside 24h, so
 *   those two tiers are UNREACHABLE on the devotee-cancel path — but
 *   GET /bookings/:id/cancel-quote priced them anyway. A devotee ten hours from
 *   their slot opened the cancel dialog, was shown "You get ₹4,000 back
 *   (50% refund (4-24h before))", pressed confirm, and the POST answered 409.
 *   Quoting half a devotee's money and then paying none of it is the same
 *   defect LEG-03 filed, pointing the other way.
 *
 * The invariant below is the one that keeps them honest: for every hour offset
 * at which the ladder would pay a tier BELOW the published floor, a devotee
 * cancel must be refused — and, symmetrically, every tier a devotee CAN reach
 * must be one the published policy advertises. Move the cutoff or the ladder
 * independently and this fails.
 */

/** The two fractions apps/web/lib/cancellation-policy.ts publishes. */
const PUBLISHED_FRACTIONS = [1.0, 0.75];

/** A slot at a known number of hours in the future, expressed as date + slot. */
function slotAt(hoursFromNow: number): { scheduledDate: Date; scheduledTimeSlot: string; now: Date } {
  // Anchor `now` at an exact IST hour so the slot string is unambiguous.
  const now = new Date('2026-10-01T06:30:00.000Z'); // 12:00 IST
  const target = new Date(now.getTime() + hoursFromNow * 3600_000);
  const istMs = target.getTime() + 5.5 * 3600_000;
  const ist = new Date(istMs);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  const hh = String(ist.getUTCHours()).padStart(2, '0');
  const mm = String(ist.getUTCMinutes()).padStart(2, '0');
  return {
    scheduledDate: new Date(`${y}-${m}-${d}T00:00:00.000Z`),
    scheduledTimeSlot: `${hh}:${mm}`,
    now,
  };
}

describe('LEG-03 — the cancellation cutoff and the refund ladder are one policy', () => {
  it('the cutoff is a named constant, not a literal buried in a service', () => {
    // The `24` used to exist only as `hoursUntilPuja < 24` inside
    // booking.service.cancelBooking, which is how the ladder and the copy drifted
    // for four waves without anything failing.
    expect(DEVOTEE_CANCEL_CUTOFF_HOURS).toBe(24);
  });

  it('every tier a devotee can actually reach is one the site publishes', () => {
    const reachable = DEFAULT_CANCEL_POLICY.tiers.filter((t) =>
      devoteeCancelAllowed(t.minHoursBefore, 'confirmed'),
    );
    expect(reachable.map((t) => t.refundFraction)).toEqual(PUBLISHED_FRACTIONS);
  });

  it('the 50% and 25% tiers are unreachable, so no surface may quote them', () => {
    const unreachable = DEFAULT_CANCEL_POLICY.tiers.filter(
      (t) => !devoteeCancelAllowed(t.minHoursBefore, 'confirmed'),
    );
    // Exactly the two the finding names — asserted as a set, so adding a third
    // unreachable tier trips this rather than sliding in unnoticed.
    expect(unreachable.map((t) => t.refundFraction).sort()).toEqual([0.25, 0.5]);
    for (const tier of unreachable) {
      expect(tier.minHoursBefore).toBeLessThan(DEVOTEE_CANCEL_CUTOFF_HOURS);
    }
  });

  it('refuses at the cutoff boundary and allows one hour outside it', () => {
    expect(devoteeCancelAllowed(23.9, 'confirmed')).toBe(false);
    expect(devoteeCancelAllowed(24, 'confirmed')).toBe(true);
    expect(devoteeCancelAllowed(25, 'confirmed')).toBe(true);
    // Negative hours — the slot has already passed — must not wrap round into
    // "allowed"; a `< 24` test on a negative number is the shape of RV-11.
    expect(devoteeCancelAllowed(-3, 'confirmed')).toBe(false);
  });

  it('an unpaid booking is exempt, because there is no refund to ladder', () => {
    expect(devoteeCancelAllowed(2, 'pending_payment')).toBe(true);
    expect(devoteeCancelAllowed(-40, 'pending_payment')).toBe(true);
  });

  /**
   * The concrete case from the finding, run through the real engine rather than
   * asserted as a constant: an ₹8,000 puja ten hours out.
   *
   * The ladder still computes ₹4,000 — that is correct and deliberate, because
   * the same function serves the admin ladder refund and the auto-refund cron,
   * where a booking CAN legitimately sit inside 24h. What must never happen is
   * that figure reaching a devotee as a cancel quote, and
   * `devoteeCancelAllowed` is the gate the quote endpoint applies before it
   * publishes one.
   */
  it('the ladder still prices 50% inside 24h, and the gate is what withholds it', () => {
    const { scheduledDate, scheduledTimeSlot, now } = slotAt(10);
    const quote = cancellationService.computeDevoteeRefund({
      policy: DEFAULT_CANCEL_POLICY,
      scheduledDate,
      scheduledTimeSlot,
      pujaPriceInr: 8000,
      totalPaidInr: 8000,
      now,
    });

    expect(quote.hoursUntilSlot).toBeGreaterThan(9);
    expect(quote.hoursUntilSlot).toBeLessThan(11);
    expect(quote.refundFraction).toBe(0.5);
    expect(quote.refundAmountInr).toBe(4000);

    // ...and a devotee may not act on it.
    expect(devoteeCancelAllowed(quote.hoursUntilSlot, 'confirmed')).toBe(false);
  });

  it('a booking two days out is quoted the published 75% band and may cancel', () => {
    const { scheduledDate, scheduledTimeSlot, now } = slotAt(30);
    const quote = cancellationService.computeDevoteeRefund({
      policy: DEFAULT_CANCEL_POLICY,
      scheduledDate,
      scheduledTimeSlot,
      pujaPriceInr: 8000,
      totalPaidInr: 8000,
      now,
    });

    expect(quote.refundFraction).toBe(0.75);
    expect(quote.refundAmountInr).toBe(6000);
    expect(devoteeCancelAllowed(quote.hoursUntilSlot, 'confirmed')).toBe(true);
  });
});
