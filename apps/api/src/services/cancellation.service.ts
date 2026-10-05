/**
 * cancellation.service.ts — policy engine for booking cancellation refunds
 * (booking revamp 2026-08-04).
 *
 * Before this, cancellation was binary: cancel >24h before the slot and a
 * separate cron issued a FULL refund; inside 24h you couldn't cancel at all.
 * There was no partial-refund ladder, no pandit-cancel path, no no-show
 * handling, and the policy was hardcoded rather than snapshotted per booking.
 *
 * This service computes the refund for a cancellation from a policy SNAPSHOT
 * stored on the booking (cancelPolicyJson) at booking time — so the policy can
 * evolve without retro-changing existing bookings.
 *
 * The default ladder is market-anchored (research 2026-08-04) and deliberately
 * beats the harshest competitors:
 *   SmartPuja: never more than 50%, 0 inside 48h.   Harivara: 0 inside 48h.
 *   Urban(UK): >24h free, 24-2h 70%, <2h 0.         KashiPuja/Mangalnath: tiered.
 * Ours is more generous at every step (a trust differentiator vs 99Pandit,
 * which publishes no customer refund policy at all).
 */

import { prisma } from '../lib/prisma.js';
import { hoursUntilSlot } from '../lib/slot-time.js';
import { REFUND_DAYS_LABEL, REFUND_INTERNATIONAL_CARD_LABEL } from '../lib/refund-timing.js';
import { notifyDevotee, buildBookingCtx } from './booking-notify.service.js';

export interface CancelPolicyTier {
  /** Hours before the scheduled slot. Refund applies when hoursUntil >= minHoursBefore. */
  minHoursBefore: number;
  /** Fraction of the puja price refunded (0..1). */
  refundFraction: number;
  label: string;
}

export interface CancelPolicy {
  tiers: CancelPolicyTier[];
  /** Refund when the PANDIT cancels (platform side) — always full + reassignment attempt. */
  panditCancelRefundFraction: number;
  /** Refund when the devotee no-shows after the pandit arrived. */
  noShowRefundFraction: number;
  /** Fraction of the collected devotee cancellation fee passed to the pandit (UC model). */
  cancellationFeeToPriestFraction: number;
  /** Refund timeline promise shown to the user. */
  refundDaysLabel: string;
}

/** The default policy. Snapshotted onto each booking at create/confirm time. */
export const DEFAULT_CANCEL_POLICY: CancelPolicy = {
  tiers: [
    { minHoursBefore: 48, refundFraction: 1.0, label: 'Full refund (48h+ before)' },
    { minHoursBefore: 24, refundFraction: 0.75, label: '75% refund (24–48h before)' },
    { minHoursBefore: 4, refundFraction: 0.5, label: '50% refund (4–24h before)' },
    { minHoursBefore: 0, refundFraction: 0.25, label: '25% refund (<4h before)' },
  ],
  panditCancelRefundFraction: 1.0,
  noShowRefundFraction: 0.0,
  cancellationFeeToPriestFraction: 1.0, // entire devotee fee compensates the pandit (UC norm)
  refundDaysLabel: '5-7 business days',
};

/**
 * LEG-03 / F223 — how close to the slot a DEVOTEE may still cancel.
 *
 * This number was a bare `< 24` literal inside booking.service.cancelBooking
 * and nowhere else, which is what let the published policy and the engine
 * drift apart for four waves. It belongs here, next to the ladder it truncates:
 * because cancelBooking refuses inside this window, the ladder's 50% (4-24h)
 * and 25% (<4h) tiers are UNREACHABLE on the devotee-cancel path, and any
 * surface that quotes them is quoting a refund the product will not pay.
 *
 * The web mirror is `CANCELLATION_CUTOFF_HOURS` in
 * apps/web/lib/cancellation-policy.ts.
 */
export const DEVOTEE_CANCEL_CUTOFF_HOURS = 24;

/**
 * Whether a devotee-initiated cancellation is permitted at all right now.
 *
 * `pending_payment` is exempt for the same reason cancelBooking exempts it:
 * nothing has been collected, so there is no refund to ladder and no reason to
 * strand the devotee with a booking they never paid for.
 */
export function devoteeCancelAllowed(hoursUntilSlot: number, status: string): boolean {
  if (status === 'pending_payment') return true;
  return hoursUntilSlot >= DEVOTEE_CANCEL_CUTOFF_HOURS;
}

export interface RefundComputation {
  policy: CancelPolicy;
  hoursUntilSlot: number;
  refundFraction: number;
  refundAmountInr: number;
  feeAmountInr: number;
  tierLabel: string;
  isPanditFault: boolean;
}

export class CancellationService {
  /** Snapshot the (current default) policy onto a booking. Call at confirm time. */
  async snapshotPolicy(bookingId: string, policy: CancelPolicy = DEFAULT_CANCEL_POLICY) {
    await prisma.pujaBooking.update({
      where: { id: bookingId },
      data: { cancelPolicyJson: policy as never },
    });
    return policy;
  }

  /** Read the booking's policy, falling back to the default for legacy rows. */
  async getPolicy(bookingId: string): Promise<CancelPolicy> {
    const b = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: { cancelPolicyJson: true },
    });
    const snap = b?.cancelPolicyJson as CancelPolicy | null;
    return snap && Array.isArray(snap.tiers) ? snap : DEFAULT_CANCEL_POLICY;
  }

  /**
   * Compute the refund for a DEVOTEE-initiated cancellation at `now`.
   * pujaPriceInr is the base the ladder applies to (excludes platform/prasad fees,
   * which are refunded in full only when the pandit is at fault).
   */
  computeDevoteeRefund(opts: {
    policy: CancelPolicy;
    scheduledDate: Date;
    /**
     * RV-13 (2026-08-10): the tier MUST be measured against the real slot
     * instant. `scheduledDate` is a DATE column (midnight); the time of day is
     * in `scheduledTimeSlot`. Measuring from midnight quoted devotees a tier
     * lower than policy — and, for a same-day slot, a NEGATIVE hoursUntilSlot
     * that fell through every tier. Optional so existing callers keep compiling;
     * when omitted the old midnight behaviour is preserved.
     */
    scheduledTimeSlot?: string | null;
    pujaPriceInr: number;
    totalPaidInr: number;
    now?: Date;
  }): RefundComputation {
    const now = opts.now ?? new Date();
    const hoursUntil = hoursUntilSlot(opts.scheduledDate, opts.scheduledTimeSlot, now);
    const tier =
      opts.policy.tiers.find((t) => hoursUntil >= t.minHoursBefore) ??
      opts.policy.tiers[opts.policy.tiers.length - 1]!;
    const refundAmountInr = Math.round(opts.pujaPriceInr * tier.refundFraction * 100) / 100;
    return {
      policy: opts.policy,
      hoursUntilSlot: Math.round(hoursUntil * 10) / 10,
      refundFraction: tier.refundFraction,
      refundAmountInr,
      feeAmountInr: Math.round((opts.pujaPriceInr - refundAmountInr) * 100) / 100,
      tierLabel: tier.label,
      isPanditFault: false,
    };
  }

  /**
   * PANDIT-side cancellation / no-show: platform bears it (Swiggy/UC/Sri Mandir
   * norm) — the devotee is always made whole. Full refund of everything paid.
   */
  computePanditFaultRefund(opts: { policy: CancelPolicy; totalPaidInr: number }): RefundComputation {
    const fraction = opts.policy.panditCancelRefundFraction;
    const refundAmountInr = Math.round(opts.totalPaidInr * fraction * 100) / 100;
    return {
      policy: opts.policy,
      hoursUntilSlot: 0,
      refundFraction: fraction,
      refundAmountInr,
      feeAmountInr: Math.round((opts.totalPaidInr - refundAmountInr) * 100) / 100,
      tierLabel: 'Full refund — pandit unavailable (our fault)',
      isPanditFault: true,
    };
  }

  /** Devotee no-show after pandit arrived: refund per policy (usually 0). */
  computeNoShowRefund(opts: { policy: CancelPolicy; totalPaidInr: number }): RefundComputation {
    const fraction = opts.policy.noShowRefundFraction;
    const refundAmountInr = Math.round(opts.totalPaidInr * fraction * 100) / 100;
    return {
      policy: opts.policy,
      hoursUntilSlot: 0,
      refundFraction: fraction,
      refundAmountInr,
      feeAmountInr: Math.round((opts.totalPaidInr - refundAmountInr) * 100) / 100,
      tierLabel: 'No-show (pandit arrived)',
      isPanditFault: false,
    };
  }

  /**
   * PANDIT cancels a booking: re-queue the booking for reassignment and, if a
   * replacement can't be found within the tier SLA, the caller escalates to a
   * full pandit-fault refund. Always: notify the devotee, hit the pandit's
   * acceptance rate, and clear the assignment. Never throws on notify.
   */
  async panditCancel(bookingId: string, priestId: string, reason?: string) {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: { id: true, priestId: true, status: true },
    });
    if (!booking) throw new Error('Booking not found.');
    if (booking.priestId && booking.priestId !== priestId) {
      throw new Error('This booking is assigned to a different priest.');
    }
    if (!['confirmed', 'priest_assigned'].includes(booking.status)) {
      throw new Error(`Cannot cancel in "${booking.status}" status.`);
    }

    // Release back to confirmed for re-dispatch; record the reason.
    await prisma.pujaBooking.update({
      where: { id: bookingId },
      data: {
        priestId: null,
        status: 'confirmed',
        cancellationReason: reason ? `[pandit-cancelled] ${reason}` : '[pandit-cancelled]',
        offerExpiresAt: new Date(), // trigger immediate re-broadcast on next sweep
      },
    });

    // Notify the devotee we're re-matching; penalize the pandit's rate.
    const full = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      include: {
        pujaType: { select: { name: true } },
        temple: { select: { name: true } },
        user: { select: { id: true, fullName: true, phone: true } },
      },
    });
    if (full) void notifyDevotee('reassigned', buildBookingCtx(full as never)).catch(() => undefined);

    // NOTIF-10: "immediate" has to mean immediate.
    //
    // The `offerExpiresAt: new Date()` above is annotated "trigger immediate
    // re-broadcast on next sweep", but the next sweep was tick 13 of an 18-tick
    // chain on a 30-minute cadence — so a pandit dropping a booking left the
    // devotee unassigned and unre-offered for up to half an hour before anyone
    // else was even asked. Drive the sweep for THIS booking now. Dynamic import
    // keeps the module graph acyclic (dispatch.service already imports
    // booking.service, which this file sits alongside); fire-and-forget because
    // the requeue itself has already committed and the cron sweep remains the
    // safety net if this call fails.
    void import('./dispatch.service.js')
      .then((m) => m.dispatchService.sweepBookingOffers(bookingId))
      .catch((err) => console.warn('[cancellation] immediate re-broadcast failed:', err));

    return { requeued: true, bookingId };
  }
}

export const cancellationService = new CancellationService();
