import { Prisma, BookingStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { hoursUntilSlot } from '../lib/slot-time.js';
import { REFUND_REQUESTED_MARKER } from '../lib/refund-marker.js';
// RV-03: imported for this module's OWN use — a bare `export … from` re-export
// exposes the name to importers but does not bind it in local scope.
import { writeTemplePayoutOnConfirm } from './temple-payout.service.js';
import { notifyUser } from '../routes/notifications.js';
import { ensureConversationForBooking } from './conversation.service.js';
import { paymentService } from './payment.service.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface CreateBookingInput {
  userId: string;
  templeId: string;
  pujaTypeId: string;
  templePujaOfferingId: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTimeSlot: string;
  devoteeNames: Array<{ name: string; gotra?: string; nakshatra?: string }>;
  sankalpDetails?: string;
  specialInstructions?: string;
  prasadDeliveryRequested: boolean;
  prasadDeliveryAddressId?: string;
  dispatchTier?: 'instant' | 'one_hour' | 'senior' | 'scheduled';
}

export interface UserBookingsFilters {
  status?: BookingStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// P0 #PBO-3 (2026-07-09): fees that the booking wizard shows but previously
// never COLLECTED — the charged total was only the base puja price, so the
// ₹51 platform fee and the ₹150 prasad-delivery fee (when requested) leaked.
// These are the single source of truth for the amounts; the web price
// breakdown should mirror them. The Razorpay order is created from
// priceAmount (see /bookings/create-order), so folding the fees in here is
// what actually charges them at checkout.
export const PLATFORM_FEE_INR = 51;
export const PRASAD_DELIVERY_FEE_INR = 150;

// Booking revamp (2026-08-04): platform take-rate cut from 30% to 20% to win
// pandit supply. Research basis: Sri Mandir takes 20-25% from temples; the
// current hardcoded 30% (with Priest.commissionRate 0.70 ignored) is both
// uncompetitive for supply acquisition AND inconsistent. The pandit's
// Priest.commissionRate (their share, default 0.80) is now the source of truth,
// falling back to DEFAULT_PRIEST_SHARE when unset. Confirmed with founder.
export const DEFAULT_PRIEST_SHARE = 0.8;
export const DEFAULT_PLATFORM_SHARE = 0.2;

// RV-03 (2026-08-10): the temple trust's slice of a puja, separate from the
// uniform 20/80 platform/provider split. Kept as an env knob so a deployment
// can tune it without a release; the default is the 5% the temple MoU promises.

/**
 * The prisma client OR an open interactive-transaction client. Mirrors the
 * `TxClient` alias in payment.service so the ledger writers below can run
 * INSIDE a caller's `$transaction` — P1-12 doctrine: a ledger row must commit
 * or roll back WITH the confirm that earned it, never after it.
 */
type BookingTxClient = Prisma.TransactionClient | typeof prisma;

/**
 * `availableSlots` is free-form JSON and has historically held both bare
 * "HH:MM" strings and `{ time, label }` objects (see routes/bookings.ts
 * from-offering, which already normalises both shapes). Reading it through one
 * helper keeps the create path and the reschedule path from disagreeing about
 * what a valid slot is.
 */
function normalizeSlots(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .map((s) => (typeof s === 'string' ? s : ((s as { time?: string })?.time ?? '')))
    .filter((t) => typeof t === 'string' && t.length > 0);
}

/**
 * RV-15 (2026-08-10): serialize everyone racing for the SAME offering+date+slot.
 *
 * Slot capacity was a count-then-create TOCTOU with 2-4 DB round-trips between
 * the count and the create, so two devotees could both read 4/5 and both
 * insert. Wrapping count+create in a plain `$transaction` does NOT fix that on
 * its own: under READ COMMITTED (Postgres' default, and Prisma passes no
 * isolation level) both transactions still see the pre-insert count. A
 * transaction-scoped advisory lock keyed on the slot identity is the fix that
 * needs no schema change — the second racer blocks until the first COMMITs,
 * then re-counts and sees the new row. `pg_advisory_xact_lock` is released at
 * COMMIT, so it is safe under Supabase's transaction-mode pooler (a
 * session-level lock would leak across pooled clients).
 *
 * Best-effort by design: if the statement cannot run we log and fall through to
 * the re-count. Degrading to the old (racy) behaviour is strictly better than
 * failing every booking, and the re-count inside the transaction still closes
 * the wide 15-100ms window that made the race reachable at all.
 */
async function lockSlot(tx: BookingTxClient, slotKey: string): Promise<void> {
  try {
    await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', slotKey);
  } catch (err) {
    console.warn('[booking.service] slot advisory lock unavailable:', err);
  }
}

/**
 * Authoritative capacity check. Must be called inside the same transaction (and
 * after `lockSlot`) as the write it guards.
 */
async function assertSlotCapacity(
  tx: BookingTxClient,
  where: Prisma.PujaBookingWhereInput,
  maxBookingsPerSlot: number,
): Promise<void> {
  const booked = await tx.pujaBooking.count({
    where: { ...where, status: { notIn: ['cancelled', 'refunded'] } },
  });
  if (booked >= maxBookingsPerSlot) {
    throw new Error(
      `No availability for the selected slot. Maximum ${maxBookingsPerSlot} bookings allowed.`,
    );
  }
}

/** Stable advisory-lock key for one offering's date+slot bucket. */
function slotKeyFor(offeringId: string, scheduledDate: Date, slot: string): string {
  return `puja-slot:${offeringId}:${scheduledDate.toISOString().slice(0, 10)}:${slot}`;
}

/**
 * RV-03 (2026-08-10): read TEMPLE_SHARE_RATE as an exact Decimal.
 *
 * The old inline `Number(process.env.TEMPLE_SHARE_RATE ?? '0.05')` turned a
 * typo'd env var into NaN, which silently produced a NaN amount (and therefore
 * either a rejected write or a ₹0 temple share) with no signal at all. Anything
 * that is not a fraction in [0,1] now falls back to the documented default and
 * says so in the log.
 */

/**
 * RV-03 (2026-08-10): write the temple's share of a confirmed booking.
 *
 * WHY THIS IS EXPORTED. The TemplePayout writer used to live inline in
 * `updateBookingStatus`'s `confirmed` branch, but none of the real payment
 * confirm paths go through `updateBookingStatus` — payment.service flips the
 * status inline inside its capture transaction. So the only bookings that could
 * ever mint a TemplePayout were UNPAID ones (a PATCH straight from
 * pending_payment to confirmed), and temples received ₹0.00 on 100% of PAID
 * bookings — a perfect inversion of the intent, and a direct breach of the MoU
 * revenue-share promise. Hoisting it to a free function with the same
 * `(bookingId, tx?)` shape as payment.service's `writePujaCommissionOnConfirm`
 * lets every confirm path call the SAME writer inside its own transaction.
 *
 * Two latent defects fixed while moving it:
 *  - the base is now the PUJA price, not `priceAmount`. priceAmount also
 *    carries the ₹51 platform fee and the ₹150 prasad-delivery fee, neither of
 *    which the temple has a claim on. The puja price is recoverable exactly
 *    from the split createBooking wrote: priestPayout + platformCommission.
 *  - the arithmetic is Prisma.Decimal end to end. The old
 *    `Math.round(Number(priceAmount) * rate * 100) / 100` float-coerced money,
 *    which the commission ledger explicitly forbids.
 *
 * Errors PROPAGATE (the old inline version swallowed them into a console.warn).
 * Callers run it inside the confirm transaction, so a failed temple ledger row
 * rolls the confirm back rather than silently under-paying a temple forever.
 */
// RV-03: the temple-share writer moved to services/temple-payout.service.ts so
// payment.service can call it too (importing booking.service from there would
// be a module cycle). Re-exported for existing callers.
export { writeTemplePayoutOnConfirm, resolveTempleShareRate, DEFAULT_TEMPLE_SHARE_RATE } from './temple-payout.service.js';

function pushMessageFor(
  status: BookingStatus,
  pujaName: string,
  templeName: string,
): { title: string; body: string } | null {
  switch (status) {
    case 'confirmed':
      return {
        title: 'Booking confirmed',
        body: `Your ${pujaName} at ${templeName} is confirmed. We'll send video proof after the puja.`,
      };
    case 'priest_assigned':
      return {
        title: 'Priest assigned',
        body: `A priest has been assigned for your ${pujaName} at ${templeName}.`,
      };
    case 'video_uploaded':
      return {
        title: 'Video proof ready',
        body: `Your ${pujaName} video is ready to view.`,
      };
    case 'cancelled':
      return {
        title: 'Booking cancelled',
        body: `Your ${pujaName} at ${templeName} has been cancelled.`,
      };
    default:
      return null;
  }
}

export interface SlotAvailability {
  time: string;
  booked: number;
  remaining: number;
  available: boolean;
}

// ─── Valid state transitions ────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['priest_assigned', 'cancelled', 'refunded'],
  priest_assigned: ['in_progress', 'cancelled', 'refunded'],
  in_progress: ['completed', 'refunded'],
  completed: ['video_uploaded', 'refunded'],
  video_uploaded: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: ['refunded'],
  refunded: [],
};

// Statuses that allow cancellation by the user
const CANCELLABLE_STATUSES: BookingStatus[] = ['pending_payment', 'confirmed', 'priest_assigned'];

// ─── BookingService ─────────────────────────────────────────────────────────────

export class BookingService {
  /**
   * Generate a booking number in BS-YYYYMMDD-XXXXX format.
   */
  private generateBookingNumber(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let random = '';
    for (let i = 0; i < 5; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `BS-${yyyy}${mm}${dd}-${random}`;
  }

  /**
   * Create a new puja booking.
   * Validates offering, slot availability, calculates pricing, and persists.
   */
  async createBooking(data: CreateBookingInput) {
    // 0. Past-date guard. Zod at the route layer also enforces this, but
    // the service is reachable from cron/admin/test paths that bypass Zod,
    // so we re-check here. Compare against today at 00:00 local — same-day
    // bookings remain allowed.
    const requested = new Date(`${data.scheduledDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(requested.getTime()) || requested < today) {
      throw new Error('Cannot book a past date.');
    }

    // 1. Validate the temple puja offering exists and is active
    const offering = await prisma.templePujaOffering.findUnique({
      where: { id: data.templePujaOfferingId },
      include: {
        pujaType: true,
        temple: { select: { id: true, name: true, isVerified: true } },
      },
    });

    if (!offering) {
      throw new Error('Temple puja offering not found.');
    }

    if (!offering.isActive) {
      throw new Error('This puja offering is currently inactive.');
    }

    // RV-09 (2026-08-10): business rule 6 — "temples must be verified before
    // going live" — was enforced NOWHERE on the temple-anchored path. A temple
    // sitting at isVerified=false was listed, detail-served and bookable end to
    // end, and then accrued a TemplePayout: real devotee money routed to an
    // unvetted venue while the platform carried the whole refund/chargeback
    // liability. The priest-anchored path already hard-fails the same way
    // (routes/bookings.ts requires a verified temple binding); this is the
    // matching gate for the temple path. `status` is a SEPARATE column from
    // `isVerified` and is deliberately not gated here — see the note filed with
    // the owner.
    if (!offering.temple?.isVerified) {
      throw new Error('This temple has not been verified yet.');
    }

    // Verify temple and puja IDs match the offering
    if (offering.templeId !== data.templeId || offering.pujaTypeId !== data.pujaTypeId) {
      throw new Error('Offering does not match the specified temple and puja type.');
    }

    // 2. Validate the slot is one of the available slots for this offering
    const availableSlots = normalizeSlots(offering.availableSlots);
    if (!availableSlots.includes(data.scheduledTimeSlot)) {
      throw new Error(
        `Invalid time slot "${data.scheduledTimeSlot}". Available slots: ${availableSlots.join(', ')}`,
      );
    }

    // 3. Cheap pre-check on slot availability so an already-full slot fails
    // before we do the pricing lookups. RV-15: this read is ADVISORY ONLY — the
    // authoritative capacity check is re-run under an advisory lock inside the
    // create transaction at step 7. Keeping it here preserves the fast failure
    // for the overwhelmingly common non-contended case.
    const scheduledDate = new Date(data.scheduledDate);
    const slotWhere: Prisma.PujaBookingWhereInput = {
      templePujaOfferingId: data.templePujaOfferingId,
      scheduledDate: scheduledDate,
      scheduledTimeSlot: data.scheduledTimeSlot,
    };
    await assertSlotCapacity(prisma, slotWhere, offering.maxBookingsPerSlot);

    // 4. Determine pricing
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { isNri: true },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    const basePrice = offering.priceOverride ?? offering.pujaType.basePrice;
    const pujaPrice = user.isNri ? offering.pujaType.nriPrice : basePrice;

    // Resolve the priest's actual share. The booking may already have a priest
    // pinned (temple-pin / from-offering); when it does, read that priest's
    // commissionRate so per-pandit negotiated splits are honoured. Otherwise
    // fall back to the platform default (now 80% priest / 20% platform).
    let priestShare = DEFAULT_PRIEST_SHARE;
    const pinnedPriestId = offering.assignedPriestId ?? null;
    if (pinnedPriestId) {
      const priest = await prisma.priest.findUnique({
        where: { id: pinnedPriestId },
        select: { commissionRate: true },
      });
      if (priest && priest.commissionRate > 0 && priest.commissionRate <= 1) {
        priestShare = priest.commissionRate;
      }
    }

    // P0 #PBO-3 (2026-07-09): collect the platform + prasad fees shown in the
    // wizard. The charged total (priceAmount) is the puja price + platform fee
    // + prasad-delivery fee (when requested). Commission + priest payout are
    // computed on the PUJA price only — the fees are platform revenue / prasad
    // pass-through, not part of the priest's earned split.
    const platformFee = new Prisma.Decimal(PLATFORM_FEE_INR);
    const prasadFee = data.prasadDeliveryRequested
      ? new Prisma.Decimal(PRASAD_DELIVERY_FEE_INR)
      : new Prisma.Decimal(0);
    const priceAmount = new Prisma.Decimal(pujaPrice.toString()).add(platformFee).add(prasadFee);

    // Split on the PUJA price using the priest's actual share (default 80/20 —
    // see DEFAULT_PRIEST_SHARE). Platform keeps the remainder.
    const priestPayoutAmount = new Prisma.Decimal(pujaPrice.toString()).mul(
      new Prisma.Decimal(priestShare.toString()),
    );
    const platformCommission = new Prisma.Decimal(pujaPrice.toString()).mul(
      new Prisma.Decimal((1 - priestShare).toString()),
    );

    // 5. Generate booking number (retry on collision)
    let bookingNumber = this.generateBookingNumber();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.pujaBooking.findUnique({
        where: { bookingNumber },
        select: { id: true },
      });
      if (!existing) break;
      bookingNumber = this.generateBookingNumber();
      attempts++;
    }
    if (attempts >= 5) {
      throw new Error('Failed to generate a unique booking number. Please try again.');
    }

    // 6. Validate prasad delivery address if requested
    if (data.prasadDeliveryRequested && data.prasadDeliveryAddressId) {
      const address = await prisma.userAddress.findFirst({
        where: {
          id: data.prasadDeliveryAddressId,
          userId: data.userId,
        },
        select: { id: true },
      });
      if (!address) {
        throw new Error('Prasad delivery address not found or does not belong to user.');
      }
    }

    // 7. Create the booking.
    //
    // RV-15 (2026-08-10): the capacity count and the create used to sit 2-4 DB
    // round-trips apart (user lookup, pinned-priest lookup, up to 5
    // booking-number collision checks, address lookup) on the top-level client
    // with no transaction and no lock — a ~15-100ms window in which two racers
    // both passed the count at 4/5 and both inserted, overselling the slot. The
    // oversold booking is undeliverable (video proof is mandatory), so it ends
    // as a full refund on which the platform has already eaten a
    // non-refundable Razorpay MDR. Lock the slot, re-count authoritatively, and
    // insert — all inside one transaction.
    const booking = await prisma.$transaction(async (tx) => {
      await lockSlot(
        tx,
        slotKeyFor(data.templePujaOfferingId, scheduledDate, data.scheduledTimeSlot),
      );
      await assertSlotCapacity(tx, slotWhere, offering.maxBookingsPerSlot);
      return tx.pujaBooking.create({
        data: {
          bookingNumber,
          userId: data.userId,
          templeId: data.templeId,
          pujaTypeId: data.pujaTypeId,
          templePujaOfferingId: data.templePujaOfferingId,
          scheduledDate: scheduledDate,
          scheduledTimeSlot: data.scheduledTimeSlot,
          devoteeNames: data.devoteeNames as Prisma.InputJsonValue,
          sankalpDetails: data.sankalpDetails ?? null,
          specialInstructions: data.specialInstructions ?? null,
          priceAmount,
          currency: user.isNri ? 'USD' : 'INR',
          platformCommission,
          priestPayout: priestPayoutAmount,
          status: 'pending_payment',
          prasadDeliveryRequested: data.prasadDeliveryRequested,
          prasadDeliveryAddressId: data.prasadDeliveryAddressId ?? null,
          dispatchTier: data.dispatchTier ?? 'scheduled',
        },
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          priceAmount: true,
          currency: true,
          scheduledDate: true,
          scheduledTimeSlot: true,
          createdAt: true,
        },
      });
    });

    return booking;
  }

  /**
   * Transition a booking to a new status following the state machine rules.
   */
  async updateBookingStatus(
    bookingId: string,
    newStatus: BookingStatus,
    data?: Record<string, any>,
  ) {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    const currentStatus = booking.status as BookingStatus;
    const allowed = VALID_TRANSITIONS[currentStatus];

    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition from "${currentStatus}" to "${newStatus}".`);
    }

    // P0 #pp-01 (2026-07-09): defense-in-depth denylist. The route layer
    // already whitelists fields per-status, but this service is a shared
    // chokepoint (also called by priest.service paths), so strip the
    // financial/identity fields here too — they are server-authoritative and
    // must never be client-settable via a status PATCH.
    const FORBIDDEN_DATA_KEYS = new Set([
      'priestPayout',
      'platformCommission',
      'priceAmount',
      'userId',
      'priestId',
      'id',
    ]);
    const sanitizedData: Record<string, any> | undefined = data
      ? Object.fromEntries(Object.entries(data).filter(([k]) => !FORBIDDEN_DATA_KEYS.has(k)))
      : undefined;

    const updateData: Prisma.PujaBookingUpdateInput = {
      status: newStatus,
      ...(sanitizedData && Object.keys(sanitizedData).length > 0 ? sanitizedData : {}),
    };

    // RV-14 / RV-03 (2026-08-10): the status flip and both ledger writes now run
    // in ONE transaction.
    //
    // Before: `pujaBooking.update` ran on the top-level client, then the
    // Commission write ran after it on the top-level client too, wrapped in a
    // `try/catch` that logged and continued. A DB error therefore left a
    // CONFIRMED, PAID booking with no ledger row at all while the API returned
    // 200 — the exact failure mode P1-12 already remediated on the
    // payment.service side (payment.service.ts:193-198) and which was never
    // applied here. The `findFirst`-then-`create` idempotency check was also a
    // TOCTOU against the payment-path writer with no unique constraint behind
    // it; running inside a transaction narrows that window (the DB-level fix is
    // a UNIQUE index on commissions.booking_id — owner-gated schema change).
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.pujaBooking.update({
        where: { id: bookingId },
        data: updateData,
        include: {
          temple: { select: { id: true, name: true, slug: true } },
          pujaType: { select: { id: true, name: true, slug: true } },
          priest: { select: { id: true, displayName: true } },
          user: { select: { id: true } },
        },
      });

      if (newStatus === 'confirmed') {
        // Commission ledger row so /admin/commissions has a single source of
        // truth for payout reconciliation. Idempotent via findFirst on
        // bookingId, so a double-confirm or webhook retry never double-writes.
        const existing = await tx.commission.findFirst({
          where: { bookingId: row.id },
          select: { id: true },
        });
        if (!existing && row.priestId) {
          // Decimal division — `percentage` is a Decimal(5,4) column and the
          // input must be exact rational division, not float (matches
          // payment.service's writer).
          //
          // RV-04: `providerId: row.priestId` writes a Priest.id where every
          // payout read passes a User.id, and `amount` carries the PLATFORM's
          // cut into the field the payout engine reads as the PROVIDER's net
          // share. Both defects are mirrored verbatim from
          // payment.service.writePujaCommissionOnConfirm and are deliberately
          // left untouched here: changing one writer without the other would
          // desync the ledger. They must be fixed in the same change.
          const price = new Prisma.Decimal(row.priceAmount as Prisma.Decimal);
          const commission = new Prisma.Decimal(row.platformCommission as Prisma.Decimal);
          const percentage = price.gt(0) ? commission.div(price) : new Prisma.Decimal(0);
          await tx.commission.create({
            data: {
              bookingId: row.id,
              providerId: row.priestId,
              amount: commission,
              percentage,
              status: 'PENDING',
            },
          });
        }

        // RV-03: the temple's 5% share, in the same transaction as the confirm.
        await writeTemplePayoutOnConfirm(row.id, tx);
      }

      return row;
    });

    // P0 #pp-02 (2026-07-09): when a booking reaches video_uploaded/delivered,
    // write the PriestPayout row so the priest Earnings + Payouts dashboards
    // are not permanently ₹0. paymentService.createPriestPayout is idempotent
    // (guards on an existing payout + Aadhaar KYC) and only mints a row when
    // a priest is assigned — exactly the completion transitions it was built
    // for but never wired into. Fire-and-forget: a payout write failure must
    // never block the booking status flip (admin can reconcile from the
    // ledger). The commission row above already captured the platform cut at
    // confirm time; this is the priest's share. (The TEMPLE's share is written
    // by writeTemplePayoutOnConfirm inside the transaction above — see RV-03.)
    if (newStatus === 'video_uploaded' || newStatus === 'delivered') {
      void paymentService
        .createPriestPayout(updated.id)
        .catch((err) => console.warn('[booking.service] priest payout write failed:', err));
    }

    // Push notification on key transitions. Fire-and-forget — push failure
    // must never break booking flow. notifyUser no-ops if VAPID is unset
    // or the user has no subscriptions.
    const message = pushMessageFor(newStatus, updated.pujaType.name, updated.temple.name);
    if (message) {
      void notifyUser(updated.user.id, {
        ...message,
        url: `/dashboard/bookings/${updated.id}`,
      }).catch(() => undefined);
    }

    // Auto-create the chat thread between devotee and assigned priest the
    // moment the priest is assigned. This is the post-payment service-delivery
    // handoff: devotee gets an inbox thread, priest sees it in their portal.
    if (newStatus === 'priest_assigned' && updated.priest) {
      const priestUser = await prisma.priest.findUnique({
        where: { id: updated.priest.id },
        select: { userId: true, displayName: true },
      });
      if (priestUser) {
        void ensureConversationForBooking({
          bookingId: updated.id,
          devoteeId: updated.user.id,
          providerId: priestUser.userId,
          kind: 'puja_booking',
          systemMessage: `Namaste! I'm ${priestUser.displayName}. I'll be performing your ${updated.pujaType.name} at ${updated.temple.name}. Feel free to share any sankalp details or questions here.`,
        }).catch((err) => {
          console.warn('[booking.service] ensureConversationForBooking failed:', err);
        });
      }
    }

    return updated;
  }

  /**
   * Cancel a booking on behalf of a user.
   * Validates ownership, cancellability, and the 24-hour window.
   */
  async cancelBooking(bookingId: string, userId: string, reason?: string) {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          where: { status: 'captured' },
          select: { id: true, amount: true },
        },
      },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    if (booking.userId !== userId) {
      throw new Error('You are not authorized to cancel this booking.');
    }

    if (!CANCELLABLE_STATUSES.includes(booking.status as BookingStatus)) {
      throw new Error(`Booking cannot be cancelled in its current status "${booking.status}".`);
    }

    // Check 24-hour cancellation window (only if not pending_payment).
    //
    // RV-11 (2026-08-10): this measured from `scheduledDate` alone, which is a
    // DATE column and therefore MIDNIGHT — the slot time lives in
    // `scheduledTimeSlot`. Business rule 5 is "up to 24h before the scheduled
    // TIME", so an 18:00 puja must stay cancellable until 18:00 on D-1; the old
    // maths cut it off at 00:00 on D-1 and wrongly refused the entire
    // 00:00–18:00 window. The lost window equalled the slot's hour-of-day (6h
    // for an 06:00 puja, 18h for an 18:00 one). resolveSlotInstant falls back to
    // the raw date when a legacy slot string cannot be parsed, so unparseable
    // data keeps the old, stricter behaviour rather than widening the window.
    if (booking.status !== 'pending_payment') {
      const hoursUntilPuja = hoursUntilSlot(booking.scheduledDate, booking.scheduledTimeSlot);

      if (hoursUntilPuja < 24) {
        throw new Error('Cancellation is not allowed within 24 hours of the scheduled puja time.');
      }
    }

    // RV-07 (2026-08-10): a paid cancellation now actually ENTERS the refund
    // queue. `processAutoRefunds` selects cancelled bookings whose
    // cancellationReason startsWith REFUND_REQUESTED_MARKER — but nothing in the
    // codebase ever wrote that marker, so the query matched zero rows and no
    // devotee was ever auto-refunded. `requiresRefund` was returned to the
    // caller and then dropped on the floor: the money simply stayed with the
    // platform until an admin happened to notice the booking in
    // GET /admin/bookings/refunds/pending and refunded it by hand.
    const requiresRefund = booking.payments.length > 0;
    const cancelReason = reason ?? null;
    const storedReason = requiresRefund
      ? `${REFUND_REQUESTED_MARKER} ${cancelReason ?? 'Devotee cancellation'}`.slice(0, 500)
      : cancelReason;

    const updated = await prisma.pujaBooking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: storedReason,
      },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        cancelledAt: true,
        cancellationReason: true,
      },
    });

    return {
      ...updated,
      requiresRefund,
      capturedPaymentId: requiresRefund ? booking.payments[0]!.id : null,
    };
  }

  /**
   * D7: Reschedule a booking to a new date (and optional new time slot).
   * Previously there was NO reschedule anywhere — grep for 'reschedul' across
   * apps/api returned zero matches; cancel+rebook was the only path, which both
   * loses the booking and forces a refund round-trip. Competitors (SmartPuja,
   * Aastha, Mangalnath) all offer reschedule precisely because it cuts
   * cancellations. Allowed from confirmed/priest_assigned, up to 24h before the
   * CURRENT scheduled slot. When a priest is already assigned we reset to
   * `confirmed` + clear priestId so the new slot re-enters the assignment queue
   * (the old priest may not be free at the new time).
   */
  async rescheduleBooking(
    bookingId: string,
    userId: string,
    newDate: Date,
    newTimeSlot?: string,
  ) {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        status: true,
        priestId: true,
        scheduledDate: true,
        scheduledTimeSlot: true,
        templePujaOfferingId: true,
        priestPujaOfferingId: true,
      },
    });

    if (!booking) throw new Error('Booking not found.');
    if (booking.userId !== userId) {
      throw new Error('You are not authorized to reschedule this booking.');
    }
    if (booking.status !== 'confirmed' && booking.status !== 'priest_assigned') {
      throw new Error(
        `Booking cannot be rescheduled in its current status "${booking.status}".`
      );
    }

    // 24h notice window against the CURRENT slot (matches the cancel window).
    //
    // RV-11 (2026-08-10): this measured from `scheduledDate` alone, which is a
    // DATE column and therefore MIDNIGHT — the time of day lives in
    // `scheduledTimeSlot`. cancelBooking was already moved onto the slot-aware
    // helper; reschedule was left behind, so it refused up to 23h59m of the
    // devotee's entitled window (the lost span equals the slot's hour-of-day).
    const hoursUntilCurrent = hoursUntilSlot(booking.scheduledDate, booking.scheduledTimeSlot);
    if (hoursUntilCurrent < 24) {
      throw new Error('Rescheduling is not allowed within 24 hours of the scheduled puja time.');
    }

    // RV-10 (2026-08-10): the new date/slot used to be written STRAIGHT THROUGH
    // with no validation at all — not the availableSlots whitelist, not
    // maxBookingsPerSlot, not even futurity. Three consequences, all reachable
    // from the plain devotee UI (which posts a free-text slot string):
    //   1. off-whitelist slots ('evening', '10:30', '') produce a booking that
    //      no availability endpoint can ever see — both group counts by the
    //      exact slot string and iterate the whitelist, so the row is never
    //      subtracted from any slot's `remaining`. Invisible oversell.
    //   2. no capacity check — for a priest offering (maxBookingsPerSlot
    //      defaults to 1) a single reschedule double-books the pandit.
    //   3. the futurity guard compared DATE only against LOCAL midnight while
    //      `newDate` is UTC midnight, so a booking could be moved to today at
    //      06:00 while it is already 14:00. Once the slot is in the past ALL
    //      THREE self-service exits close (cancel, reschedule and
    //      request-refund all reject), trapping the devotee's money.
    //
    // The whitelist + capacity live on DIFFERENT offerings depending on how the
    // booking was created: a pandit-direct booking (priestPujaOfferingId set)
    // carries an unrelated "anchor" templePujaOfferingId (see
    // routes/bookings.ts from-offering), so validating it against the temple
    // offering would reject legitimate slots. Resolve the real one first.
    if (Number.isNaN(newDate.getTime())) {
      // An Invalid Date makes every comparison below silently false (NaN <= 0
      // is false), so it would sail past the futurity guard and only blow up at
      // the write.
      throw new Error('New date is not a valid date.');
    }

    const effectiveSlot = newTimeSlot ?? booking.scheduledTimeSlot;
    if (newTimeSlot !== undefined && newTimeSlot.trim() === '') {
      throw new Error('New time slot must not be empty.');
    }

    const isPriestOffering = !!booking.priestPujaOfferingId;
    const offering = isPriestOffering
      ? await prisma.priestPujaOffering.findUnique({
          where: { id: booking.priestPujaOfferingId! },
          select: { id: true, availableSlots: true, maxBookingsPerSlot: true },
        })
      : await prisma.templePujaOffering.findUnique({
          where: { id: booking.templePujaOfferingId },
          select: { id: true, availableSlots: true, maxBookingsPerSlot: true },
        });

    if (!offering) {
      throw new Error('The puja offering for this booking no longer exists.');
    }

    // Whitelist. Skipped when the offering has no slots configured — that is
    // back-compat for offerings created before the slot-capacity migration
    // (routes/bookings.ts makes the same allowance), and an empty whitelist must
    // not trap an already-paid devotee on a booking they cannot move.
    const allowedSlots = normalizeSlots(offering.availableSlots);
    if (allowedSlots.length > 0 && !allowedSlots.includes(effectiveSlot)) {
      throw new Error(
        `Invalid time slot "${effectiveSlot}". Available slots: ${allowedSlots.join(', ')}`,
      );
    }

    // Futurity against the real slot INSTANT, not the date. Rescheduling into
    // the past (or into a slot that has already started today) is what closes
    // every self-service exit, so this is the guard that matters.
    if (hoursUntilSlot(newDate, effectiveSlot) <= 0) {
      throw new Error('New date and time slot must be in the future.');
    }

    const hadPriest = !!booking.priestId;
    // Same lock-then-count-then-write shape as createBooking (RV-15): the new
    // slot's capacity must be checked against the same serialized view the
    // write lands in, and this booking excludes itself from its own count.
    const capacityWhere: Prisma.PujaBookingWhereInput = {
      ...(isPriestOffering
        ? { priestPujaOfferingId: offering.id }
        : { templePujaOfferingId: offering.id }),
      scheduledDate: newDate,
      scheduledTimeSlot: effectiveSlot,
      id: { not: bookingId },
    };

    const updated = await prisma.$transaction(async (tx) => {
      await lockSlot(tx, slotKeyFor(offering.id, newDate, effectiveSlot));
      await assertSlotCapacity(tx, capacityWhere, offering.maxBookingsPerSlot);
      return tx.pujaBooking.update({
        where: { id: bookingId },
        data: {
          scheduledDate: newDate,
          ...(newTimeSlot ? { scheduledTimeSlot: newTimeSlot } : {}),
          // Re-queue if a priest was attached — they may not be free at the new time.
          ...(hadPriest ? { priestId: null, status: 'confirmed' } : {}),
        },
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          scheduledDate: true,
          scheduledTimeSlot: true,
        },
      });
    });

    return { ...updated, requeuedForAssignment: hadPriest };
  }

  /**
   * Get a booking by ID with all related data.
   * Optionally verify ownership by userId.
   */
  async getBookingById(bookingId: string, userId?: string) {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      include: {
        temple: {
          select: {
            id: true,
            name: true,
            nameLocal: true,
            slug: true,
            city: true,
            state: true,
            images: true,
          },
        },
        pujaType: {
          select: {
            id: true,
            name: true,
            nameLocal: true,
            slug: true,
            description: true,
            category: true,
            deity: true,
            durationMinutes: true,
            images: true,
          },
        },
        priest: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            ratingAvg: true,
            ratingCount: true,
            specializations: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            paymentGateway: true,
            gatewayPaymentId: true,
            method: true,
            refundAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        prasadAddress: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    if (userId && booking.userId !== userId) {
      throw new Error('You are not authorized to view this booking.');
    }

    return booking;
  }

  /**
   * Get a paginated list of bookings for a user with optional filters.
   */
  async getUserBookings(userId: string, filters?: UserBookingsFilters) {
    const { status, dateFrom, dateTo, page = 1, limit = 20 } = filters ?? {};

    const where: Prisma.PujaBookingWhereInput = {
      userId,
    };

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.scheduledDate = {};
      if (dateFrom) {
        (where.scheduledDate as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.scheduledDate as Prisma.DateTimeFilter).lte = new Date(dateTo);
      }
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      prisma.pujaBooking.findMany({
        where,
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          scheduledDate: true,
          scheduledTimeSlot: true,
          priceAmount: true,
          currency: true,
          devoteeNames: true,
          videoProofUrl: true,
          rating: true,
          prasadDeliveryRequested: true,
          createdAt: true,
          temple: {
            select: {
              id: true,
              name: true,
              nameLocal: true,
              slug: true,
              city: true,
              state: true,
              images: true,
            },
          },
          pujaType: {
            select: {
              id: true,
              name: true,
              nameLocal: true,
              slug: true,
              deity: true,
              images: true,
            },
          },
          priest: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { scheduledDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pujaBooking.count({ where }),
    ]);

    return {
      bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Upload video proof for a completed booking.
   * Only the assigned priest can upload.
   */
  async uploadVideoProof(bookingId: string, priestId: string, videoUrl: string) {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, priestId: true },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    if (booking.priestId !== priestId) {
      throw new Error('Only the assigned priest can upload video proof for this booking.');
    }

    if (booking.status !== 'completed') {
      throw new Error(
        `Video proof can only be uploaded for bookings in "completed" status. Current: "${booking.status}".`,
      );
    }

    const updated = await prisma.pujaBooking.update({
      where: { id: bookingId },
      data: {
        videoProofUrl: videoUrl,
        videoUploadedAt: new Date(),
        status: 'video_uploaded',
      },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        videoProofUrl: true,
        videoUploadedAt: true,
      },
    });

    return updated;
  }

  /**
   * Submit a review for a completed/delivered booking.
   * Updates both the booking and the priest's aggregate rating.
   */
  async submitReview(bookingId: string, userId: string, rating: number, reviewText?: string) {
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new Error('Rating must be an integer between 1 and 5.');
    }

    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        status: true,
        priestId: true,
        rating: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    if (booking.userId !== userId) {
      throw new Error('You are not authorized to review this booking.');
    }

    if (!['delivered', 'video_uploaded'].includes(booking.status)) {
      throw new Error(
        `Reviews can only be submitted for bookings in "delivered" or "video_uploaded" status. Current: "${booking.status}".`,
      );
    }

    if (booking.rating !== null) {
      throw new Error('A review has already been submitted for this booking.');
    }

    // Update the booking with the review
    const updated = await prisma.pujaBooking.update({
      where: { id: bookingId },
      data: {
        rating,
        reviewText: reviewText ?? null,
      },
      select: {
        id: true,
        bookingNumber: true,
        rating: true,
        reviewText: true,
      },
    });

    // Update the priest's aggregate rating atomically. The previous
    // read-modify-write (findUnique then update) raced under concurrent
    // reviews: two reviews both read ratingCount=5, both wrote 6, one
    // rating was lost. A single atomic SQL UPDATE with the running
    // average computed inside the statement serializes correctly.
    if (booking.priestId) {
      await prisma.$executeRawUnsafe(
        `UPDATE priests
         SET rating_count = rating_count + 1,
             rating_avg = ROUND(((rating_avg * rating_count) + $1::numeric) / (rating_count + 1), 2)
         WHERE id = $2::uuid`,
        rating,
        booking.priestId,
      );
    }

    return updated;
  }

  /**
   * Check slot availability for a specific temple, puja type, and date.
   * Returns each slot with booking counts and remaining capacity.
   */
  async checkSlotAvailability(templeId: string, pujaTypeId: string, date: string) {
    const offering = await prisma.templePujaOffering.findUnique({
      where: {
        templeId_pujaTypeId: {
          templeId,
          pujaTypeId,
        },
      },
      include: {
        temple: { select: { name: true, slug: true } },
        pujaType: { select: { name: true, slug: true, durationMinutes: true } },
      },
    });

    if (!offering || !offering.isActive) {
      return {
        available: false,
        message: 'This puja is not offered at the selected temple.',
        slots: [],
      };
    }

    const scheduledDate = new Date(date);

    // Count existing non-cancelled bookings per slot for the given date
    const existingBookings = await prisma.pujaBooking.groupBy({
      by: ['scheduledTimeSlot'],
      where: {
        templePujaOfferingId: offering.id,
        scheduledDate: scheduledDate,
        status: { notIn: ['cancelled', 'refunded'] },
      },
      _count: { id: true },
    });

    const bookingCountBySlot = new Map(
      existingBookings.map((b) => [b.scheduledTimeSlot, b._count.id]),
    );

    const slots: SlotAvailability[] = (offering.availableSlots as string[]).map((slot) => {
      const booked = bookingCountBySlot.get(slot) ?? 0;
      const remaining = offering.maxBookingsPerSlot - booked;
      return {
        time: slot,
        booked,
        remaining: Math.max(0, remaining),
        available: remaining > 0,
      };
    });

    const hasAvailableSlots = slots.some((s) => s.available);

    return {
      available: hasAvailableSlots,
      temple: offering.temple,
      pujaType: offering.pujaType,
      date,
      offeringId: offering.id,
      maxBookingsPerSlot: offering.maxBookingsPerSlot,
      slots,
    };
  }

  /**
   * SLA escalation (issue #179): bookings stuck `priest_assigned` more than
   * `staleHours` past their scheduled date with no `videoProofUrl` are a
   * broken service promise — the devotee paid, the priest never delivered
   * proof. Flag each for cancel + refund review.
   *
   * `BookingStatus` has no `refund_pending` member, so we cannot transition
   * the row to a literal "refund_pending" state within the enum. The
   * state machine already allows `priest_assigned -> cancelled` and
   * `* -> refunded`, so the honest, schema-safe action is: transition the
   * stale booking to `cancelled` (refund path) and return it in `escalated`
   * so ops/founder reviews the refund. Money movement itself is
   * founder/finance-adjacent and stays out of this service.
   *
   * Returns { escalated: string[], scanned: number }.
   */
  async escalateStaleBookings(staleHours = 72) {
    const cutoff = new Date(Date.now() - staleHours * 60 * 60 * 1000);
    const stale = await prisma.pujaBooking.findMany({
      where: {
        status: 'priest_assigned',
        videoProofUrl: null,
        scheduledDate: { lt: cutoff },
      },
      select: { id: true, scheduledDate: true, priestId: true },
    });

    const escalated: string[] = [];
    for (const b of stale) {
      // priest_assigned -> cancelled is a VALID_TRANSITION (refund review path).
      await prisma.pujaBooking.update({
        where: { id: b.id },
        data: { status: 'cancelled' },
      });
      escalated.push(b.id);
    }
    return { escalated, scanned: stale.length };
  }
}

export const bookingService = new BookingService();
