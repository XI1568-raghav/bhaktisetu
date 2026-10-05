import { Prisma, BookingStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { platformRateOf } from '../lib/commission-math.js';
import { mintProviderEarningForBooking } from './provider-earning-mint.js';
// OPS-05 — the durable money trail. Post-commit only; never inside a tx.
import { recordProviderEarningMinted } from '../lib/audit-money-callsites.js';
import { hoursUntilSlot } from '../lib/slot-time.js';
// LEG-03/F223 — the cancellation cutoff lives with the refund ladder it
// truncates, not as a literal here. cancellation.service.ts imports only
// prisma, slot-time and booking-notify.service, so this is not a cycle.
import { DEVOTEE_CANCEL_CUTOFF_HOURS } from './cancellation.service.js';
import { REFUND_REQUESTED_MARKER } from '../lib/refund-marker.js';
// RV-03: imported for this module's OWN use — a bare `export … from` re-export
// exposes the name to importers but does not bind it in local scope.
import { writeTemplePayoutOnConfirm } from './temple-payout.service.js';
import { notifyUser } from '../routes/notifications.js';
import { notifyBookingEvent, notifyVideoReady } from './booking-notify.service.js';
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

/**
 * The four tabs the devotee's My Bookings page renders. DB-01 (2026-08-12):
 * these used to be computed in the browser from whatever page of rows the API
 * happened to return, so "All" showed 20 when the devotee had 81 bookings.
 * The server owns both the filter and the count now, so a chip can never
 * disagree with the list under it.
 */
export const MY_BOOKINGS_VIEWS = ['all', 'upcoming', 'completed', 'cancelled'] as const;
export type MyBookingsView = (typeof MY_BOOKINGS_VIEWS)[number];

/** Terminal success states — what a devotee reads as "done". */
export const COMPLETED_BOOKING_STATUSES: BookingStatus[] = [
  'completed',
  'video_uploaded',
  'delivered',
];

/**
 * Anything in here can never be "upcoming", whatever the date says.
 *
 * DB-03 (2026-08-12): `pending_payment` used to be missing, so every abandoned
 * or failed checkout — each of which mints a real booking row BEFORE the
 * gateway opens — showed up under Upcoming as if it were a paid puja. One
 * seeded devotee carried 8 such ghosts. The customer is told "You have NOT
 * been charged" and then sees the un-charged row listed among their upcoming
 * pujas; the tab has to mean "booked and paid for" or it means nothing.
 * `refunded` was missing for the same reason — it is as terminal as cancelled.
 */
export const NON_UPCOMING_BOOKING_STATUSES: BookingStatus[] = [
  'pending_payment',
  'cancelled',
  'refunded',
  ...COMPLETED_BOOKING_STATUSES,
];

export interface UserBookingsFilters {
  status?: BookingStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  view?: MyBookingsView;
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
// pandit supply. Research basis: Sri Mandir takes 20-25% from temples; the old
// hardcoded 30% (with Priest.commissionRate ignored) was both uncompetitive for
// supply acquisition AND inconsistent. The pandit's Priest.commissionRate
// (their SHARE) is the source of truth, falling back to DEFAULT_PRIEST_SHARE
// when it is outside (0,1]. Confirmed with founder.
//
// PJ-03 (opened 2026-08-11, CLOSED 2026-08-13). The schema default really did
// disagree with this constant: `Priest.commissionRate` carried `@default(0.70)`,
// the pre-revamp 30/70 split, so a pandit onboarded through the normal flow was
// paid Rs 7,000 instead of Rs 8,000 on a Rs 10,000 booking and the Commission
// row recorded a 30% platform take on a product advertised at 20%. All three
// halves have shipped:
//   - schema.prisma now declares `commissionRate Float @default(0.80)`;
//   - migration 20260812000000_priest_commission_rate_80 moves the column
//     default AND backfills the existing 0.70 rows (no live money had moved);
//   - PATCH /admin/priests/:id/commission-rate (routes/admin.ts) is the
//     authenticated, audit-logged write path for a genuinely negotiated rate.
// A stored 0.70 is therefore honoured as a deliberate negotiation, never
// silently treated as "unset" — which was the trap in the alternative fix.
// booking.service.commission-doctrine.pj03.test.ts pins this comment to the
// schema so the two cannot drift apart again.
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
 * S3-04 (2026-08-11): an UNPAID booking must not hold a slot forever.
 *
 * Every conflict/capacity predicate in this domain was
 * `status: { notIn: ['cancelled','refunded'] }` with no age bound, and there is
 * no expiry job for puja bookings (jobs/consultation-expire.ts covers
 * consultations only). A `pending_payment` row therefore occupied its slot
 * permanently. That row is created BEFORE the Razorpay order exists
 * (routes/bookings.ts /create-order creates the booking, then calls
 * createRazorpayOrder), so every abandoned checkout and every failed
 * order-creation silently burned one of the offering's slots with no recovery
 * path. The hostile version is worse and free: POST /bookings/from-offering
 * against a competitor pandit for every slot of the next 30 days, never pay,
 * and that pandit's calendar is permanently full — PriestPujaOffering
 * .maxBookingsPerSlot defaults to 1, so one unpaid row per slot is enough.
 *
 * Query-side only, deliberately: no cron and no sweep. The free-tier budget has
 * no room for another scheduled job and an age predicate needs none. The row
 * stays `pending_payment` in the table; it simply stops counting against
 * capacity once it is older than the hold. A real payment flips the status
 * inside payment.service's capture transaction, so a booking that was actually
 * paid is unaffected no matter how long the capture took.
 */
export const UNPAID_HOLD_MINUTES = 30;

/**
 * DB-07: thrown when a devotee already holds an unpaid booking on the exact
 * offering + date + slot they are asking for again.
 *
 * Its own class so routes/bookings.ts can answer 409 (a state conflict the
 * caller can resolve by paying or cancelling) rather than the generic 400 the
 * message-sniffing classifier would otherwise give a bare Error.
 */
export class SlotHoldConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlotHoldConflictError';
  }
}

/**
 * DB-08: the states in which the puja has demonstrably been performed and a
 * devotee may therefore rate it.
 *
 * `completed` is the pandit's "puja performed" transition; video_uploaded and
 * delivered follow it. Anything earlier has delivered nothing to rate, and
 * cancelled/refunded never will.
 */
export const REVIEWABLE_BOOKING_STATUSES: readonly string[] = [
  'completed',
  'video_uploaded',
  'delivered',
];

/** The instant before which an unpaid hold stops counting against capacity. */
export function unpaidHoldCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - UNPAID_HOLD_MINUTES * 60_000);
}

/**
 * The single "this row occupies the slot" predicate.
 *
 * Exported because the same predicate is hand-copied into six places across the
 * domain (routes/bookings.ts GET /slots, the PATCH reassign conflict check and
 * the from-offering `held` count; dispatch.service.accept's conflict check) and
 * the copies had already drifted. Callers must not pass their own `status` or
 * `AND` alongside it — this owns both.
 */
export function activeSlotHoldWhere(now: Date = new Date()): Prisma.PujaBookingWhereInput {
  return {
    AND: [
      { status: { notIn: ['cancelled', 'refunded'] } },
      // An unpaid hold older than the TTL is abandoned inventory, not a booking.
      { NOT: { status: 'pending_payment', createdAt: { lt: unpaidHoldCutoff(now) } } },
    ],
  };
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
    where: { ...where, ...activeSlotHoldWhere() },
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

// Exported for tests only. RV-17 was a mismatch between this table and
// routes/bookings.ts's PRIEST_REASSIGNABLE_STATUSES that no test could catch,
// because no test could see both. Now one can.
export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
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

/**
 * Transitions after which an assigned pandit has an earning on this booking.
 *
 * DI-05: deliberately EXCLUDES 'confirmed' (the confirm branch mints its own
 * row) and every terminal state — a cancelled or refunded booking must never
 * mint a new payable.
 */
const EARNING_ATTACH_STATUSES = new Set<BookingStatus>([
  'priest_assigned',
  'in_progress',
  'completed',
  'video_uploaded',
  'delivered',
]);

/**
 * How many times one booking may be moved (S3-25). `PujaBooking.rescheduleCount`
 * was added to bound this and was never incremented or read, so the cap did not
 * exist. Exported so the web wizard and admin tooling can show the same number.
 */
export const MAX_RESCHEDULES = 2;

/**
 * The relation shape `updateBookingStatus` returns, and therefore the shape
 * `PATCH /bookings/:id` answers with. Exported because routes/bookings.ts has a
 * second path to that same response (RV-17: a pure pandit reassignment, which
 * moves no status and so never calls this service) and the two must not drift
 * into returning differently-shaped bookings for the same endpoint.
 */
export const BOOKING_STATUS_RESPONSE_INCLUDE = {
  temple: { select: { id: true, name: true, slug: true } },
  pujaType: { select: { id: true, name: true, slug: true } },
  priest: { select: { id: true, displayName: true } },
  user: { select: { id: true } },
} satisfies Prisma.PujaBookingInclude;

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
    // Existence check only. `isNri` used to be read here to swap in the NRI
    // price behind the quote — see the pricing note below for why it no longer
    // is, and why a self-settable flag can never drive a charged amount.
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    const basePrice = offering.priceOverride ?? offering.pujaType.basePrice;

    // S3-09 (2026-08-11): the devotee is charged the price the wizard QUOTED.
    //
    // This was `user.isNri ? offering.pujaType.nriPrice : basePrice`, and three
    // separate things were wrong with it — only one of them about revenue:
    //  1. the web wizard (apps/web/app/pujas/book/page.tsx) quotes
    //     `priceOverride ?? basePrice` (+ fees) and never renders an NRI
    //     figure at all — its `nriUsdPrice` memo is computed and dropped. With
    //     the repo's own fixtures (basePrice 1100 / nriPrice 5100) the page and
    //     the Pay button said Rs 1,151 while the booking row and the Razorpay
    //     order were Rs 5,151: a 4.5x quote/charge mismatch at the payment
    //     sheet. That is the RV-01 failure mode, and the /from-offering path
    //     already refuses to create it in so many words ("applying a
    //     server-side multiplier the UI cannot see would charge an NRI devotee
    //     Rs 9,900 against a Rs 1,100 quote — a worse failure than the one
    //     being fixed"). The temple path had never been brought into line.
    //  2. `isNri` is self-settable — PATCH /users/me accepts `isNri` — so the
    //     rule this enforced was bypassable in a single request and can never
    //     be a server-side pricing switch.
    //  3. it jumped straight to PujaType.nriPrice, discarding BOTH the
    //     temple's `priceOverride` and the temple manager's offering-level
    //     override (TemplePujaOffering.nriPrice, written by temple-portal and
    //     read by no booking path) — so a temple that configured Rs 6,000 for
    //     NRIs was ignored.
    //
    // Business rule 2 (NRI 9-10x) is NOT abandoned: it comes back as a
    // server-QUOTED unit price resolved as `offering.nriPrice ??
    // offering.pujaType.nriPrice`, returned in the create-order response and
    // rendered/confirmed by the client before checkout. Until that quote exists
    // in the UI, displayed price === charged price.
    const pujaPrice = basePrice;

    // Resolve the priest's actual share. The booking may already have a priest
    // pinned (temple-pin / from-offering); when it does, read that priest's
    // commissionRate so per-pandit negotiated splits are honoured. Otherwise
    // fall back to the platform default (now 80% priest / 20% platform).
    //
    // S3-24: `assignedPriestId` is read ONLY to resolve that rate. createBooking
    // never writes `priestId` onto the row (see the create payload below), so a
    // temple-path booking cannot participate in a priest-slot collision and
    // needs no priest-slot lock — the offering-scoped `slotKeyFor` lock is the
    // correct key for the row this actually writes. If a future change starts
    // pinning the priest at create time, take the shared priest-slot lock here
    // too and run the same conflict check dispatch/priest/admin do.
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
    //
    // S3-07: the platform multiplier used to be `new Prisma.Decimal((1 -
    // priestShare).toString())` — the subtraction ran in JS float FIRST, so the
    // 0.8 default produced the literal string '0.19999999999999996'. Decimal(10,2)
    // rounds that away on write today, so no rupee is currently wrong, but it
    // breaks the project's own money rule and the error becomes real the moment
    // anyone sums the un-rounded value or widens the column. Subtract in Decimal.
    const shareDec = new Prisma.Decimal(priestShare.toString());
    const pujaPriceDec = new Prisma.Decimal(pujaPrice.toString());
    const priestPayoutAmount = pujaPriceDec.mul(shareDec);
    const platformCommission = pujaPriceDec.mul(new Prisma.Decimal(1).sub(shareDec));

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

      // ── RES-05 (2026-08-12): IDEMPOTENT ON THE NATURAL BOOKING KEY ────────
      //
      // Three byte-identical POSTs to /create-order in the same tick returned
      // [201,201,201] with three distinct bookings and three distinct payable
      // Razorpay orders for one puja. Capacity was never oversold (this lock
      // and maxBookingsPerSlot hold), so it is duplicate INTENT: a devotee
      // whose response is lost to a mobile handover retries and now owns two
      // live orders — two charges to reverse, or one paid booking plus a
      // phantom hold burning 1 of the 5 slot places for the whole hold window.
      //
      // The lookup runs INSIDE the advisory lock, which is the only place
      // racers are already serialised, so it closes the parallel case as well
      // as the sequential retry. `createRazorpayOrder` is already idempotent
      // per booking (it returns an existing initiated/authorized order), so
      // reusing the booking makes the whole endpoint idempotent end to end
      // without the caller doing anything.
      //
      // Deliberately NARROW: only a hold for the SAME devotee, offering, date
      // and slot, still inside UNPAID_HOLD_MINUTES, AND carrying the same
      // charged amount and the same devotees. A different prasad choice or a
      // different sankalp party is a genuinely different booking, and handing
      // back the earlier one would charge this devotee for something they did
      // not ask for.
      const holdCutoff = new Date(Date.now() - UNPAID_HOLD_MINUTES * 60 * 1000);
      const liveHold = await tx.pujaBooking.findFirst({
        where: {
          userId: data.userId,
          templePujaOfferingId: data.templePujaOfferingId,
          scheduledDate: scheduledDate,
          scheduledTimeSlot: data.scheduledTimeSlot,
          status: 'pending_payment',
          createdAt: { gte: holdCutoff },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          priceAmount: true,
          currency: true,
          scheduledDate: true,
          scheduledTimeSlot: true,
          createdAt: true,
          devoteeNames: true,
          prasadDeliveryRequested: true,
        },
      });
      if (
        liveHold &&
        liveHold.prasadDeliveryRequested === data.prasadDeliveryRequested &&
        new Prisma.Decimal(liveHold.priceAmount as Prisma.Decimal).equals(priceAmount) &&
        JSON.stringify(liveHold.devoteeNames ?? null) === JSON.stringify(data.devoteeNames ?? null)
      ) {
        const { devoteeNames: _dn, prasadDeliveryRequested: _pd, ...reused } = liveHold;
        return reused;
      }

      // ── DB-07 (prod sweep 2026-08-12): ONE live hold per devotee per slot ──
      //
      // The lookup above is deliberately narrow — a different devotee party, a
      // different amount or a different prasad choice is a genuinely different
      // booking, and silently handing back the earlier one would charge this
      // devotee for something they did not ask for. That narrowness is also the
      // hole: the sweep varied the devotee name and got FIVE 201s on one
      // offering+date+slot from a single unpaid user, taking the slot from
      // {remaining:5} to {remaining:0} for the whole hold window with nothing
      // paid. maxBookingsPerSlot counts rows, not people, so capacity was never
      // oversold and never noticed.
      //
      // So the two rules compose: an identical repeat REUSES (above), and a
      // different request for a slot this devotee is already holding is
      // REFUSED (here). The refusal names the booking they hold so the answer
      // is "go pay the one you have", not a dead end — /bookings/pay resumes it.
      //
      // Inside the advisory lock, so two parallel racers cannot both pass.
      if (liveHold) {
        throw new SlotHoldConflictError(
          `You already have an unpaid booking (${liveHold.bookingNumber}) for this puja at this date and time. ` +
            'Complete or cancel that booking before making another.',
        );
      }

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
          // RV-01 residual (found 2026-08-11 by adversarial review): this said
          // `user.isNri ? 'USD' : 'INR'` while priceAmount is INR throughout —
          // nriPrice is an INR column (schema.prisma: "9-10x INR"). The value
          // flowed straight into razorpay.orders.create as the order currency,
          // so an NRI's Rs 10,000 booking asked Razorpay for $10,000: the exact
          // ~83x overcharge Batch 1 closed on the /from-offering path and
          // missed here. isNri is self-settable via PATCH /users/me.
          currency: 'INR',
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
      // S3-03 (2026-08-11): the server stamps `videoUploadedAt` in
      // uploadVideoProof. It was client-settable through the route's
      // VIDEO_PROOF_FIELDS whitelist and passed the video-proof gate (which
      // only inspects the URL), so the booking OWNER could rewrite the
      // server-stamped evidence timestamp to any value on a booking that
      // already carried genuine proof. GET /bookings/:id/video then served the
      // forged timestamp, destroying the one artefact that settles "was the
      // puja performed on the booked day" in a chargeback.
      'videoUploadedAt',
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
    // OPS-05: carried out of the transaction — the mint is recorded only after
    // it commits, because recordMoneyEvent must never join the caller's tx.
    let mintOutcome = 'no-provider-on-booking';
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.pujaBooking.update({
        where: { id: bookingId },
        data: updateData,
        include: BOOKING_STATUS_RESPONSE_INCLUDE,
      });

      if (newStatus === 'confirmed') {
        // ── P0 S3-08 (2026-08-11): no captured payment, no confirm ──────────
        //
        // `confirmed` is where this method MINTS MONEY: the Commission row
        // below, whose `amount` is precisely what payout.service.getPayoutBalance
        // pays a provider, plus the temple's TemplePayout. Nothing upstream
        // required the booking to have been paid, and PATCH /bookings/:id
        // authorizes the booking OWNER for every transition — so a plain
        // devotee could book a Rs 10,000 puja via /bookings/from-offering
        // (which pins priestId at create), never pay, PATCH
        // {"status":"confirmed"}, and mint Rs 8,000 of withdrawable balance
        // for the pandit. Unbounded, and free.
        //
        // The guard is here rather than only at the route because this service
        // is the shared chokepoint (priest.service reaches it too) and because
        // it must roll the status flip back with it — throwing inside the
        // transaction does exactly that, so an unpaid booking does not even
        // become `confirmed`.
        //
        // The legitimate paths are unaffected: payment.service flips the
        // status to `confirmed` INLINE inside its own capture transaction and
        // never calls this method, and it sets Payment.status = 'captured' in
        // that same transaction.
        const capturedPayments = await tx.payment.count({
          where: { bookingId: row.id, status: 'captured' },
        });
        if (capturedPayments === 0) {
          throw new Error(
            'Cannot confirm a booking that has no captured payment. ' +
              'Payment capture confirms the booking automatically.',
          );
        }

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
          // RV-04 (fixed 2026-08-11, owner-approved): this writer used to store
          // `providerId: row.priestId` (a Priest.id, where every payout read
          // passes a User.id) and `amount: row.platformCommission` (the
          // PLATFORM's 20%, in the field the payout engine reads as the
          // PROVIDER's net earning). Both are fixed here in the same change as
          // payment.service.writePujaCommissionOnConfirm — see the full
          // rationale there. Moving one writer without the other would desync
          // the ledger, and fixing the key alone would turn an inert orphan row
          // into a live 75% underpayment.
          //
          // The Priest → User hop is a separate read rather than an addition to
          // BOOKING_STATUS_RESPONSE_INCLUDE, so the PATCH response shape does
          // not start carrying the pandit's user id.
          const priestUser = await tx.priest.findUnique({
            where: { id: row.priestId },
            select: { userId: true },
          });
          if (priestUser?.userId) {
            // amount = provider's earning, percentage = PLATFORM's rate.
            // See lib/commission-math.ts — one column, one meaning.
            const price = new Prisma.Decimal(row.priceAmount as Prisma.Decimal);
            const providerEarning = new Prisma.Decimal(row.priestPayout as Prisma.Decimal);
            const percentage = platformRateOf(price.sub(providerEarning), price);
            // DI-06 (F367): ON CONFLICT DO NOTHING, not a bare INSERT. This
            // runs inside the confirm `$transaction` and shares the unique key
            // `commissions_booking_id_key` (migration 20260824000000) with
            // payment.service's writer — a PATCH-confirm racing a
            // verify-payment would otherwise raise P2002 and abort the whole
            // transaction, rolling back the confirm. Rationale in full at
            // payment.service.writePujaCommissionOnConfirm.
            await tx.commission.createMany({
              data: [
                {
                  bookingId: row.id,
                  providerId: priestUser.userId,
                  amount: providerEarning,
                  percentage,
                  status: 'PENDING',
                },
              ],
              skipDuplicates: true,
            });
          }
        }

        // RV-03: the temple's 5% share, in the same transaction as the confirm.
        await writeTemplePayoutOnConfirm(row.id, tx);
      }

      // ── DI-05 (2026-08-12): MINT THE EARNING WHEN THE PANDIT IS ATTACHED ──
      //
      // Commission rows are minted at CONFIRM time keyed to whoever is on the
      // booking then. On the temple booking path nobody is: the pandit is
      // attached later by a PATCH, so `writePujaCommissionOnConfirm` hit its
      // `if (!booking.priestId) return` and nothing ever re-ran it. The
      // reassignment block in routes/bookings.ts only calls
      // `commission.updateMany`, which matches ZERO rows when none was minted.
      //
      // Driven end to end 2026-08-12: create-order -> verify-payment ->
      // priest_assigned -> in_progress -> completed, all 200, and `commissions`
      // stayed empty for that booking while `priest_payout` read Rs 770. The
      // pandit's own /payouts/balance answered {availableInr: 0}. He is owed
      // money and the product's own payout page tells him he has none.
      //
      // Safe to run here because it is idempotent on bookingId — the same
      // findFirst guard both minting writers use — and gated on a CAPTURED
      // payment, so it can never mint withdrawable balance for an unpaid
      // booking (the S3-08 hole, on the transition instead of the confirm).
      //
      // The guard triple used to be hand-copied here. It now lives in
      // provider-earning-mint.ts, shared with the two assignment paths that
      // bypass this function entirely (dispatch.service.accept and
      // priest.service.acceptBooking) — hand-copied guards are precisely what
      // let those two drift out of sync and keep the finding's Rs 0 screen
      // reachable. Moving it there also CLOSED THE DOUBLE-PAYABLE: the copy
      // checked commission + captured payment but never PriestPayout, so the
      // rail exclusion was one-way. payment.service.createPriestPayout already
      // refuses to write the sidecar row when a live Commission exists; the
      // mint did not refuse the reverse, and `video_uploaded -> delivered` (both
      // in EARNING_ATTACH_STATUSES) is a legal transition that minted a second
      // payable onto a booking already carrying a legacy one.
      if (EARNING_ATTACH_STATUSES.has(newStatus)) {
        mintOutcome = await mintProviderEarningForBooking(tx, {
          id: row.id,
          priestId: row.priestId ?? null,
          priceAmount: row.priceAmount ?? 0,
          priestPayout: row.priestPayout ?? 0,
        });
      }

      return row;
    });

    // OPS-05: the temple-path re-mint — a pandit attached to an already-paid
    // booking after the fact. Recorded here, post-commit, and a no-op unless a
    // row was actually minted (the four guards in provider-earning-mint.ts
    // decline far more often than they mint).
    await recordProviderEarningMinted({
      bookingId,
      outcome: mintOutcome,
      rail: `booking-status-${newStatus}`,
      actorType: 'system',
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

    // NOTIF-05 (2026-08-12): the video-proof fan-out.
    //
    // Video proof is business rule #1 and the whole justification for 9-10x NRI
    // pricing, and we promise its delivery in writing — by email in the booking
    // confirmation, by WhatsApp on /nri-pujas. Neither was implemented: the only
    // thing that fired here was the bare `notifyUser` push below, which needs a
    // desktop browser with granted permission, i.e. essentially nobody in that
    // cohort. notifyVideoReady owns the whole fan-out (push + WhatsApp + email),
    // so the generic push leg is skipped for this status rather than firing a
    // second, duplicate push.
    if (newStatus === 'video_uploaded') {
      void notifyVideoReady(updated.id).catch((err) =>
        console.warn('[booking.service] video-ready notify failed:', err),
      );
    }

    // NOTIF-06 (2026-08-14): the middle of the lifecycle finally has a producer.
    //
    // `in_progress` and `completed` are written ONLY here, and pushMessageFor
    // returns null for both — so a devotee whose puja started and finished was
    // told nothing on any channel, while the `puja_started` / `puja_completed`
    // WhatsApp templates and their push copy sat written and unreachable in
    // booking-notify.service. `cancelled` was one step better and still wrong:
    // the devotee-initiated route (POST /bookings/:id/cancel) fans out, but the
    // two paths that reach `cancelled` through THIS method — the admin PATCH and
    // the unpaid-hold expiry sweep — only fired a bare web push, i.e. a desktop
    // browser with granted permission or nothing.
    //
    // No double-send: cancelBooking writes `cancelled` with its own raw
    // `pujaBooking.update` and never enters this method, so the route's fan-out
    // and this one are on disjoint paths.
    const FAN_OUT_EVENT = {
      in_progress: 'in_progress',
      completed: 'completed',
      cancelled: 'cancelled',
    } as const;
    const fanOutEvent = FAN_OUT_EVENT[newStatus as keyof typeof FAN_OUT_EVENT];
    if (fanOutEvent) {
      void notifyBookingEvent(updated.id, fanOutEvent).catch((err) =>
        console.warn(`[booking.service] ${fanOutEvent} notify failed:`, err),
      );
    }

    // Push notification on key transitions. Fire-and-forget — push failure
    // must never break booking flow. notifyUser no-ops if VAPID is unset
    // or the user has no subscriptions.
    //
    // Statuses owned by a fan-out above are skipped here rather than pushed a
    // second time: notifyVideoReady / notifyBookingEvent each carry their own
    // push leg, so leaving `cancelled` on this path would send two identical
    // pushes for one cancellation.
    const message =
      newStatus === 'video_uploaded' || fanOutEvent
        ? null
        : pushMessageFor(newStatus, updated.pujaType.name, updated.temple.name);
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
    //
    // LEG-03/F223: the `24` is no longer a literal here. It is
    // DEVOTEE_CANCEL_CUTOFF_HOURS in cancellation.service.ts, next to the
    // ladder it truncates, so GET /bookings/:id/cancel-quote and this refusal
    // cannot disagree about where the window closes. They previously did:
    // the quote happily priced the ladder's 50%/25% tiers for a booking inside
    // 24h and this line then refused the cancel, so a devotee was shown
    // "You get Rs 4,000 back (50% refund)" and received nothing.
    if (booking.status !== 'pending_payment') {
      const hoursUntilPuja = hoursUntilSlot(booking.scheduledDate, booking.scheduledTimeSlot);

      if (hoursUntilPuja < DEVOTEE_CANCEL_CUTOFF_HOURS) {
        throw new Error(
          `Cancellation is not allowed within ${DEVOTEE_CANCEL_CUTOFF_HOURS} hours of the scheduled puja time.`,
        );
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
   * CURRENT scheduled slot, and at most MAX_RESCHEDULES times. When a priest is
   * already assigned we reset to `confirmed` + clear priestId so the new slot
   * re-enters the assignment queue (the old priest may not be free at the new
   * time) — and, since 2026-08-11, void his unclaimed earning and supersede his
   * offers along with it, so the pandit who actually performs is the one paid.
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
        rescheduleCount: true,
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

    // S3-25 (2026-08-11): `PujaBooking.rescheduleCount` exists in the schema
    // precisely to bound this, and nothing ever incremented it or read it — the
    // column was 0 on every row. Unbounded reschedules are not just an ops blind
    // spot: each move re-locks and re-counts a slot and detaches the pandit (see
    // the re-queue block below), so a loop of them churns assignments and
    // dispatch broadcasts at zero cost to the devotee. The message carries
    // "cannot be rescheduled" so the route's existing catch maps it to 409.
    if (booking.rescheduleCount >= MAX_RESCHEDULES) {
      throw new Error(
        `This booking cannot be rescheduled again — the limit of ${MAX_RESCHEDULES} reschedules has been reached. Please contact support.`,
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

    // S3-06b (2026-08-11): normalise to UTC MIDNIGHT before anything reads it.
    //
    // `scheduledDate` is a `@db.Date` column and every other path in the domain
    // produces UTC midnight (`new Date('YYYY-MM-DD')`). The reschedule route
    // parses its input with `z.coerce.date()`, which happily accepts
    // '2026-09-15T10:30:00+05:30' or an epoch number and yields a Date with a
    // time component. Two things then break together: the capacity query below
    // filters `scheduledDate: newDate`, which matches ZERO existing rows and so
    // passes trivially, and the row it writes is invisible to every availability
    // reader (checkSlotAvailability, GET /bookings/slots) because they all query
    // UTC midnight. One reschedule silently oversells a 5-capacity slot to 6 —
    // the invisible-oversell failure RV-10 closed for the slot STRING and left
    // open for the date. Fixing the route's zod shape is the other half (that
    // file is owned elsewhere); normalising here makes the service correct for
    // every caller regardless.
    const targetDate = new Date(
      Date.UTC(newDate.getUTCFullYear(), newDate.getUTCMonth(), newDate.getUTCDate()),
    );

    const effectiveSlot = newTimeSlot ?? booking.scheduledTimeSlot;
    if (newTimeSlot !== undefined && newTimeSlot.trim() === '') {
      throw new Error('New time slot must not be empty.');
    }

    const isPriestOffering = !!booking.priestPujaOfferingId;
    const offering = isPriestOffering
      ? await prisma.priestPujaOffering.findUnique({
          where: { id: booking.priestPujaOfferingId! },
          select: { id: true, isActive: true, availableSlots: true, maxBookingsPerSlot: true },
        })
      : await prisma.templePujaOffering.findUnique({
          where: { id: booking.templePujaOfferingId },
          select: { id: true, isActive: true, availableSlots: true, maxBookingsPerSlot: true },
        });

    if (!offering) {
      throw new Error('The puja offering for this booking no longer exists.');
    }

    // S3-06a (2026-08-11): `isActive` was not even SELECTED here, so a move onto
    // a deactivated offering was neither blocked nor consciously allowed.
    // Deciding it deliberately: refuse. An inactive offering means the temple
    // (or pandit) has stopped performing this puja — no availability page can
    // show it, createBooking hard-refuses it, and parking a PAID booking on a
    // future date there sells a service that will not be delivered and ends at
    // the 72h SLA escalation. Refusing costs the devotee the difference between
    // a reschedule and a cancellation, which is the smaller harm and is
    // recoverable by support; the alternative is not. "cannot be rescheduled"
    // keeps the route's existing 409 mapping.
    if (!offering.isActive) {
      throw new Error(
        'This puja is no longer offered, so the booking cannot be rescheduled. Please cancel it for a refund or contact support.',
      );
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
    if (hoursUntilSlot(targetDate, effectiveSlot) <= 0) {
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
      scheduledDate: targetDate,
      scheduledTimeSlot: effectiveSlot,
      id: { not: bookingId },
    };

    const updated = await prisma.$transaction(async (tx) => {
      await lockSlot(tx, slotKeyFor(offering.id, targetDate, effectiveSlot));
      await assertSlotCapacity(tx, capacityWhere, offering.maxBookingsPerSlot);

      if (hadPriest) {
        // ── S3-10 (2026-08-11): move the earning with the work ──────────────
        //
        // Detaching the pandit below used to leave the Commission row minted
        // for him at confirm time completely untouched. The PATCH reassignment
        // path in routes/bookings.ts handles exactly this and reschedule had
        // none of it, so: Rs 10,000 booking confirmed with Pandit A mints
        // Commission{providerId: A.userId, amount: Rs 8,000, PENDING};
        // devotee reschedules; Pandit B is matched and performs the puja; at
        // video_uploaded createPriestPayout REFUSES to mint B's payout because
        // a Commission already owns the booking (the mutual-exclusion guard in
        // payment.service). A withdraws Rs 8,000 for work he did not do and B
        // is paid Rs 0 for work he did — reachable from the plain devotee
        // reschedule button.
        //
        // Only unclaimed rows may move. A commission that is already PAID (or
        // sitting inside a PayoutRequest) represents money that has left or is
        // mid-transfer; silently voiding it would corrupt a live payout
        // request, so the reschedule is refused instead of half-applied.
        const settled = await tx.commission.findFirst({
          where: {
            bookingId,
            OR: [{ status: { not: 'PENDING' } }, { payoutRequestId: { not: null } }],
          },
          select: { id: true },
        });
        if (settled) {
          throw new Error(
            'This booking cannot be rescheduled: the pandit’s earning has already been paid out or is inside a payout request. Please contact support.',
          );
        }

        // REVERSE, never delete. A money ledger must keep its history: a row
        // that was minted and then voided is an accounting event, and deleting
        // it leaves no trace that this booking ever carried an earning — which
        // is precisely what an auditor (or a disputed payout) needs to see.
        //
        // The earlier pass deleted deliberately, and its reasoning was sound at
        // the time: createPriestPayout's guard matched ANY commission row, so a
        // REVERSED row would have blocked the replacement pandit from being
        // paid by EITHER rail. That guard is now status-aware (it ignores
        // REVERSED — see payment.service.createPriestPayout), so reversing is
        // both safe and correct: balances already exclude non-PENDING rows, the
        // replacement pandit is payable, and the void is on the record.
        await tx.commission.updateMany({
          where: { bookingId, status: 'PENDING', payoutRequestId: null },
          data: { status: 'REVERSED' },
        });

        // The dispatch trail belongs to the OLD date/slot. Leaving `sent`
        // offers live lets a pandit accept an offer for a puja that has moved,
        // and `assignedVia` would keep claiming the booking was assigned.
        await tx.dispatchOffer.updateMany({
          where: { bookingId, state: 'sent' },
          data: { state: 'superseded', respondedAt: new Date() },
        });
      }

      return tx.pujaBooking.update({
        where: { id: bookingId },
        data: {
          scheduledDate: targetDate,
          ...(newTimeSlot ? { scheduledTimeSlot: newTimeSlot } : {}),
          // S3-25: bound the loop. The column existed and was never written.
          rescheduleCount: { increment: 1 },
          // Re-queue if a priest was attached — they may not be free at the new time.
          ...(hadPriest
            ? {
                priestId: null,
                status: 'confirmed',
                assignedVia: null,
                // dispatch.service.accept sets offerExpiresAt to NULL on
                // assignment, and sweepExpiredOffers only sees bookings with
                // `offerExpiresAt: { lt: now }`. Leaving it null meant
                // `requeuedForAssignment: true` was a lie — the booking was
                // detached from its pandit and then never re-broadcast to
                // anyone. An already-elapsed window puts it back in the sweep's
                // sights on its next run.
                offerExpiresAt: new Date(),
              }
            : {}),
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
    const { status, dateFrom, dateTo, page = 1, limit = 20, view = 'all' } = filters ?? {};

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

    // DB-01: the view predicate always rides in `AND` so it composes with an
    // explicit `status`/date filter instead of overwriting `where.status`.
    const viewPredicate = (v: MyBookingsView): Prisma.PujaBookingWhereInput | null => {
      switch (v) {
        case 'upcoming': {
          // scheduledDate is a @db.Date (UTC midnight); compare against the
          // start of today so a puja later TODAY still reads as upcoming.
          const startOfToday = new Date();
          startOfToday.setUTCHours(0, 0, 0, 0);
          return {
            status: { notIn: NON_UPCOMING_BOOKING_STATUSES },
            scheduledDate: { gte: startOfToday },
          };
        }
        case 'completed':
          return { status: { in: COMPLETED_BOOKING_STATUSES } };
        case 'cancelled':
          return { status: 'cancelled' };
        default:
          return null;
      }
    };

    const whereForView = (v: MyBookingsView): Prisma.PujaBookingWhereInput => {
      const predicate = viewPredicate(v);
      return predicate ? { ...where, AND: [predicate] } : where;
    };

    // One count per tab, over the WHOLE filtered set — never over the page.
    // These are indexed `userId` counts; the page query dominates the cost.
    const [bookings, allCount, upcomingCount, completedCount, cancelledCount] =
      await Promise.all([
      prisma.pujaBooking.findMany({
        where: whereForView(view),
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
        // Newest puja first, then a UNIQUE tiebreaker. `scheduledDate` alone
        // is not a total order — this devotee has dozens of bookings on the
        // same date — so Postgres could order ties differently per query and
        // a row would fall through the seam between two pages. Measured on
        // the seeded account: walking all 5 pages yielded 80 distinct rows of
        // 81 before `id` was added here.
        orderBy: [{ scheduledDate: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.pujaBooking.count({ where: whereForView('all') }),
      prisma.pujaBooking.count({ where: whereForView('upcoming') }),
      prisma.pujaBooking.count({ where: whereForView('completed') }),
      prisma.pujaBooking.count({ where: whereForView('cancelled') }),
    ]);

    const counts = {
      all: allCount,
      upcoming: upcomingCount,
      completed: completedCount,
      cancelled: cancelledCount,
    };

    // `total` paginates the ACTIVE view. For the default 'all' view this is
    // exactly the number the endpoint returned before, so existing callers
    // (and their tests) are unaffected.
    const total = counts[view];

    return {
      bookings,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      counts,
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

    // Flow is Start -> upload proof -> Complete. While the puja is in progress
    // the link is only stored (status unchanged, nothing paid, devotee not yet
    // notified); completePuja then moves the booking on. `completed` is kept
    // for bookings that reached it before proof became a prerequisite.
    if (booking.status === 'in_progress') {
      return prisma.pujaBooking.update({
        where: { id: bookingId },
        data: { videoProofUrl: videoUrl, videoUploadedAt: new Date() },
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          videoProofUrl: true,
          videoUploadedAt: true,
        },
      });
    }

    if (booking.status !== 'completed') {
      throw new Error(
        `Video proof can only be uploaded once the puja has been started. Current: "${booking.status}".`,
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

    // PF-02 (2026-08-12, P0): mint the pandit's payout.
    //
    // This is the SECOND path that sets `video_uploaded`. The other —
    // updateBookingStatus — mints the PriestPayout on that transition (see the
    // P0 #pp-02 hook), but this one wrote the status with a raw update and
    // skipped it entirely. Since the pandit portal's proof upload comes through
    // HERE, the pandit did the puja, filed the proof, got a 200 reading "Video
    // proof uploaded successfully" — and their earnings stayed Rs 0 forever.
    // The platform's own books also held no record of what it owed. That is the
    // fastest possible way to lose supply: the first payout cycle produces
    // nothing and every pandit churns.
    //
    // Why this is duplicated rather than delegated to updateBookingStatus: that
    // method's FORBIDDEN_DATA_KEYS denylist strips `videoUploadedAt` (S3-03, so
    // a client cannot forge the evidence timestamp), so routing through it
    // would silently drop the server stamp this method exists to write.
    //
    // Same contract as the other call site: createPriestPayout is idempotent,
    // Aadhaar-gated, refuses when the unified Commission ledger already owns the
    // booking, and is fire-and-forget — a payout write must never fail the proof
    // upload the pandit just completed.
    void paymentService
      .createPriestPayout(updated.id)
      .catch((err) =>
        console.warn('[booking.service] priest payout write failed after video proof:', err),
      );

    // NOTIF-05 (2026-08-12): tell the devotee their video is ready.
    //
    // This is the path the pandit portal actually uses, and it was silent —
    // it did not even fire the web-push that updateBookingStatus managed,
    // because it writes `video_uploaded` with a raw update and bypasses that
    // method entirely (see the payout note above, same root cause). The devotee
    // who paid a premium specifically for video proof could not learn it
    // existed until they logged in and looked.
    //
    // Same contract as the payout write: fire-and-forget, never fails the
    // upload the pandit just completed.
    void notifyVideoReady(updated.id).catch((err) =>
      console.warn('[booking.service] video-ready notify failed:', err),
    );

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

    // DB-08 (prod sweep 2026-08-12): `completed` was missing from this set, so
    // the one terminal state a customer recognises could never be rated. The
    // devotee's list held three bookings sitting in it, all rendered under the
    // pill "Completed", none of them reviewable — a bare 409 for anyone who
    // tried. `completed` is the pandit's own "puja performed" transition and
    // precedes video_uploaded/delivered, so the work being rated has already
    // happened, which is the only precondition a review has.
    //
    // Derived from one list rather than a literal in the predicate and another
    // in the message: the old message named two states and the caller had no
    // way to discover the third.
    if (!REVIEWABLE_BOOKING_STATUSES.includes(booking.status)) {
      throw new Error(
        `Reviews can only be submitted for bookings in ${REVIEWABLE_BOOKING_STATUSES.map(
          (s) => `"${s}"`,
        ).join(', ')} status. Current: "${booking.status}".`,
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
    //
    // S3-22 (2026-08-11): the whole expression is cast to `numeric` before
    // ROUND. `Priest.ratingAvg` is a Prisma `Float`, i.e. Postgres `double
    // precision`: float8 * int4 is float8, float8 + numeric resolves to float8,
    // float8 / int4 is float8 — and Postgres has NO `round(double precision,
    // integer)` (only `round(dp)` and `round(numeric, int)`, and float8→numeric
    // is assignment-only so it is not eligible in function resolution). Every
    // review on a booking with an assigned pandit therefore raised `function
    // round(double precision, integer) does not exist`. The booking's own
    // rating/reviewText update above had ALREADY committed as a separate
    // statement, so the devotee saw "Failed to submit review" on a review that
    // was in fact saved, and the retry hit "A review has already been
    // submitted". Consequence downstream: ratingAvg never moved off 0 for any
    // pandit, and dispatch.selectCandidates orders by that column. Never caught
    // because the suite mocks $executeRawUnsafe — hence the SQL-text assertion
    // in the test rather than an execution check.
    if (booking.priestId) {
      await prisma.$executeRawUnsafe(
        `UPDATE priests
         SET rating_count = rating_count + 1,
             rating_avg = ROUND((((rating_avg * rating_count) + $1::numeric) / (rating_count + 1))::numeric, 2)
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
        // S3-04: same occupancy predicate as the capacity check, so what this
        // endpoint shows and what createBooking enforces cannot disagree.
        ...activeSlotHoldWhere(),
      },
      _count: { id: true },
    });

    const bookingCountBySlot = new Map(
      existingBookings.map((b) => [b.scheduledTimeSlot, b._count.id]),
    );

    // S3-18 (2026-08-11): this was `(offering.availableSlots as string[])` — a
    // cast, not a conversion. `availableSlots` is free-form JSON and the API
    // accepts `{ time, label }` objects (routes/temple-portal.ts takes
    // `z.array(z.unknown())`; routes/priest.ts documents both shapes; GET
    // /bookings/slots already handles both). The moment a temple manager saved
    // object-shaped slots this endpoint reported `booked: 0, remaining: max` for
    // every slot forever — the Map key was the groupBy's STRING and the lookup
    // key was an object, so nothing ever matched — and `time` serialised as an
    // object the client cannot render. Devotees were shown 5/5 free on a full
    // slot and then hit the hard "No availability" error at createBooking.
    // normalizeSlots is the same helper createBooking and rescheduleBooking use.
    const slots: SlotAvailability[] = normalizeSlots(offering.availableSlots).map((slot) => {
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
    const now = new Date();
    const cutoff = new Date(now.getTime() - staleHours * 60 * 60 * 1000);

    // S3-12 (2026-08-11): the DB filter is deliberately one day LOOSER than the
    // real test, and the real test runs in JS against the slot INSTANT.
    // `scheduledDate` is a DATE column (midnight); the actual puja time lives in
    // `scheduledTimeSlot` and is IST, so the true instant sits anywhere from
    // -5h30m to +18h30m either side of that midnight. Filtering on the date
    // alone escalated some bookings early and missed others. lib/slot-time.ts is
    // the only correct way to compare a booking date+slot, and its null-slot
    // fallback keeps the old (midnight) behaviour for unparseable legacy rows.
    const stale = await prisma.pujaBooking.findMany({
      where: {
        status: 'priest_assigned',
        videoProofUrl: null,
        scheduledDate: { lt: new Date(cutoff.getTime() + 24 * 60 * 60 * 1000) },
      },
      select: { id: true, scheduledDate: true, scheduledTimeSlot: true, priestId: true },
    });

    const escalated: string[] = [];
    for (const b of stale) {
      if (hoursUntilSlot(b.scheduledDate, b.scheduledTimeSlot, now) > -staleHours) continue;

      // S3-12: this used to be a bare `pujaBooking.update({ status:
      // 'cancelled' })` — no `cancelledAt`, no `cancellationReason`, and no push
      // to the devotee, because it bypassed updateBookingStatus entirely. The
      // exact scenario this method exists for (devotee paid, pandit never
      // uploaded proof, 72h past the slot) therefore ended with the booking
      // silently flipped to `cancelled` and the devotee neither told nor
      // refunded. Going through updateBookingStatus restores the notification
      // and the transition check; the timestamp and reason make the row usable
      // in GET /admin/bookings/refunds/pending, which orders by cancelledAt.
      //
      // ⚠ DELIBERATELY NOT writing REFUND_REQUESTED_MARKER here, despite this
      // being exactly the paid-cancellation shape that marker exists for.
      // refund.service.processAutoRefunds applies the DEVOTEE ladder
      // (cancellation.service.computeDevoteeRefund) to every marked row, and
      // that ladder's `find(hoursUntil >= minHoursBefore)` matches no tier for a
      // slot 72h in the PAST, so it falls through to the last tier: 25%. This is
      // a PANDIT-fault cancellation, which computePanditFaultRefund defines as
      // 100% of everything paid. Writing the marker would auto-refund 25% within
      // the hour and flip the booking to `refunded`, removing it from the admin
      // queue — turning "devotee is owed Rs 10,000 and an admin can see it" into
      // "devotee silently received Rs 2,500 and has no claim left". refund
      // .service must learn to branch on pandit fault BEFORE this path can mark
      // rows for the cron; until then the admin queue is the honest destination.
      try {
        await this.updateBookingStatus(b.id, 'cancelled', {
          cancelledAt: now,
          cancellationReason:
            `SLA escalation — no video proof ${staleHours}h after the scheduled slot. Pandit-fault: devotee is owed a full refund.`.slice(
              0,
              500,
            ),
        });
        escalated.push(b.id);
      } catch (err) {
        // One un-escalatable booking (already moved on by an admin, notification
        // backend down) must not abort the rest of the cron sweep.
        console.warn('[booking.service] stale-booking escalation failed:', b.id, err);
      }
    }
    return { escalated, scanned: stale.length };
  }
}

export const bookingService = new BookingService();
