import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BookingStatus, Prisma } from '@prisma/client';
import {
  bookingService,
  BOOKING_STATUS_RESPONSE_INCLUDE,
  PLATFORM_FEE_INR,
  PRASAD_DELIVERY_FEE_INR,
  DEFAULT_PRIEST_SHARE,
  MY_BOOKINGS_VIEWS,
  type MyBookingsView,
} from '../services/booking.service.js';
import { cancellationService } from '../services/cancellation.service.js';
import { paymentService } from '../services/payment.service.js';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import { priestSlotKey, lockPriestSlot } from '../lib/priest-slot.js';
import { hoursUntilSlot } from '../lib/slot-time.js';
import { REFUND_REQUESTED_MARKER } from '../lib/refund-marker.js';
import { platformRateOf } from '../lib/commission-math.js';
import { localizedError, pickLang } from '../lib/error-i18n.js';
import {
  deliveryAddressSchema,
  deliveryCountryName,
  type DeliveryAddress,
} from '@poojly/shared';

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

// CM-06 (2026-08-13, P0): the prasad delivery address used to be validated
// inline, twice, with two India-only regexes — /^\d{6}$/ for pincode and
// /^[6-9]\d{9}$/ for phone. A Hoboken ZIP and a US mobile each returned HTTP
// 400, so the NRI cohort the pricing doctrine is built on could not check out.
// Both call sites now share `deliveryAddressSchema` from @poojly/shared, which
// the web form validates against too — one source of truth so the two layers
// cannot drift apart again.
//
// This changes the ADDRESS contract only. Billing is still `const currency =
// 'INR'` through Razorpay for every country; no foreign-currency path is
// reintroduced here (see RV-01).
//
// Builds the UserAddress row for a prasad delivery. UserAddress has no
// recipient/phone columns, so the recipient name + a canonical E.164 number are
// packed into `label` — previously as a hardcoded `+91-` literal, which
// stamped an Indian dial code onto a Dubai number.
function buildPrasadAddressRow(userId: string, addr: DeliveryAddress) {
  return {
    userId,
    label: `${addr.fullName} (${addr.phone})`,
    line1: addr.line1,
    line2: addr.line2 ?? null,
    city: addr.city,
    state: addr.state,
    pincode: addr.pincode,
    country: deliveryCountryName(addr.country),
  };
}

const createBookingSchema = z.object({
  templeId: z.string().uuid(),
  pujaTypeId: z.string().uuid(),
  templePujaOfferingId: z.string().uuid(),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(
      (d) => {
        const requested = new Date(`${d}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return !Number.isNaN(requested.getTime()) && requested >= today;
      },
      { message: 'Cannot book a past date.' }
    ),
  scheduledTimeSlot: z.string().min(1, 'Time slot is required'),
  devoteeNames: z
    .array(
      z.object({
        name: z.string().min(1, 'Devotee name is required'),
        gotra: z.string().optional(),
        nakshatra: z.string().optional(),
      })
    )
    .min(1, 'At least one devotee name is required'),
  sankalpDetails: z.string().optional(),
  specialInstructions: z.string().optional(),
  prasadDeliveryRequested: z.boolean().default(false),
  prasadDeliveryAddressId: z.string().uuid().optional(),
  // Booking revamp: the devotee's chosen speed tier. Defaults to 'scheduled'
  // (today's self-accept behaviour). instant/one_hour/senior trigger the
  // dispatch engine on payment confirm.
  dispatchTier: z.enum(['instant', 'one_hour', 'senior', 'scheduled']).default('scheduled'),
});

// P0 #pp-01 (2026-07-09): the old schema accepted `data: z.record(z.any())`
// and the route spread it raw into the Prisma update, letting any caller set
// financial/identity fields (priestPayout, platformCommission, priceAmount,
// userId) and self-assign as priest. Now `data` is a strict per-status
// allowlist — only the fields relevant to each transition are accepted, and
// the financial/identity denylist is never client-settable.
// `videoUploadedAt` was in this allowlist and was client-settable (2026-08-11).
// checkVideoProofGate below only ever inspects `videoProofUrl`, and
// booking.service's FORBIDDEN_DATA_KEYS lists only the financial/identity
// fields — so a devotee (who passes the isOwner branch of the authz check) on a
// booking that already carried genuine proof could send
// `{"status":"delivered","data":{"videoUploadedAt":"2020-01-01T00:00:00.000Z"}}`
// and rewrite the server-stamped evidence timestamp to anything. GET
// /bookings/:id/video then served the forged value, destroying the one artefact
// that answers "was the puja performed on the booked day" in a chargeback.
// The server already stamps it in booking.service.uploadVideoProof, so no
// legitimate client ever needs to send it.
const VIDEO_PROOF_FIELDS = z.object({
  videoProofUrl: z.string().url().max(2000).optional(),
}).strict();

// No user-mutable fields for these transitions — strict empty object rejects
// any client-supplied data keys (replaces the old wide-open z.record(z.any())).
const EMPTY_DATA = z.object({}).strict();

/**
 * The cancel/refund reason, normalised onto the column that actually exists.
 *
 * These variants used to accept `cancelReason` / `refundReason`. Neither is a
 * PujaBooking column — the field is `cancellationReason` — and neither is in
 * booking.service's FORBIDDEN_DATA_KEYS, so both survived sanitisation and were
 * spread raw into `tx.pujaBooking.update`. The documented capability (an admin
 * cancelling a booking WITH a reason) therefore threw a
 * PrismaClientValidationError, the generic catch turned it into a 400, and the
 * cancellation did not happen at all. The 400 body echoed `error.message`,
 * which for a Prisma validation error is a multi-line dump of the PujaBooking
 * model — internal schema disclosure on a trivially reachable path.
 *
 * Both legacy names are still accepted (older admin clients post them) and
 * mapped onto `cancellationReason`, so nothing that worked before breaks and
 * nothing that was silently discarded stays discarded. `refundReason` has no
 * column of its own; it folds into the same field.
 */
const CANCELLATION_REASON_FIELDS = z
  .object({
    cancellationReason: z.string().max(500).optional(),
    cancelReason: z.string().max(500).optional(),
    refundReason: z.string().max(500).optional(),
  })
  .transform((v) => {
    const reason = v.cancellationReason ?? v.cancelReason ?? v.refundReason;
    return reason === undefined ? {} : { cancellationReason: reason };
  });

const updateBookingStatusDataSchema = z.discriminatedUnion('status', [
  // No user-mutable fields for these transitions.
  z.object({ status: z.literal('pending_payment'), priestId: z.string().uuid().optional(), data: EMPTY_DATA.optional() }),
  z.object({ status: z.literal('confirmed'), priestId: z.string().uuid().optional(), data: EMPTY_DATA.optional() }),
  // priest_assigned: priestId may move with the assignment (admin only — enforced
  // in the route handler; non-admins cannot reach a priest-assigned transition
  // for a booking they don't own/haven't been assigned to).
  z.object({ status: z.literal('priest_assigned'), priestId: z.string().uuid().optional(), data: EMPTY_DATA.optional() }),
  z.object({ status: z.literal('in_progress'), priestId: z.string().uuid().optional(), data: EMPTY_DATA.optional() }),
  // completed / video_uploaded / delivered: only video-proof fields.
  z.object({ status: z.literal('completed'), priestId: z.string().uuid().optional(), data: VIDEO_PROOF_FIELDS.optional() }),
  z.object({ status: z.literal('video_uploaded'), priestId: z.string().uuid().optional(), data: VIDEO_PROOF_FIELDS.optional() }),
  z.object({ status: z.literal('delivered'), priestId: z.string().uuid().optional(), data: VIDEO_PROOF_FIELDS.optional() }),
  z.object({ status: z.literal('cancelled'), priestId: z.string().uuid().optional(), data: CANCELLATION_REASON_FIELDS.optional() }),
  z.object({ status: z.literal('refunded'), priestId: z.string().uuid().optional(), data: CANCELLATION_REASON_FIELDS.optional() }),
]);

const updateBookingStatusSchema = updateBookingStatusDataSchema;

/**
 * `newDate` was `z.coerce.date()` while every create path uses the YYYY-MM-DD
 * regex, so the two normalised differently (2026-08-11).
 *
 * `z.coerce.date()` happily accepts '2026-09-15T10:30:00+05:30' and epoch
 * numbers, producing a NON-midnight Date. `scheduledDate` is `@db.Date`, and
 * rescheduleBooking's capacity query filters on `scheduledDate: newDate` — so a
 * non-midnight value matches zero existing rows, passes capacity trivially, and
 * then writes a row that every availability reader misses (they all query
 * `new Date('YYYY-MM-DD')` = UTC midnight). One reschedule silently oversells a
 * 5-capacity slot to 6. This is the invisible-oversell failure the RV-10 note
 * in booking.service says it closed for the slot STRING but left open for the
 * date. Same shape as createBookingSchema now, converted with
 * `new Date('YYYY-MM-DD')` in the handler so both paths land on UTC midnight.
 */
const rescheduleBookingSchema = z.object({
  newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  newTimeSlot: z.string().max(50).optional(),
});

const cancelBookingSchema = z.object({
  reason: z.string().max(500).optional(),
});

// Accept either `reviewText` (legacy) or `text` (new bookings/[id] UI). The
// frontend stars input has a 200-char comment limit per the AV.1 spec; we
// keep the upper bound at 2000 to remain backwards-compatible with mobile
// clients that may still post longer text.
const submitReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    reviewText: z.string().max(2000).optional(),
    text: z.string().max(2000).optional(),
  })
  .transform((v) => ({ rating: v.rating, reviewText: v.reviewText ?? v.text }));

const paramsWithId = z.object({
  id: z.string().uuid(),
});

/** Default page size for GET /bookings/my — also the devotee page's page size. */
export const MY_BOOKINGS_PAGE_SIZE = 20;
/** Hard ceiling so one client cannot pull an entire booking history in a page. */
export const MY_BOOKINGS_MAX_LIMIT = 100;

/**
 * DB-01 (2026-08-12): GET /bookings/my read `page`/`limit` straight off the
 * query string (`Number(limit) || 20`) and had no notion of which tab the
 * caller was on. The devotee page sent neither, so it always received page 1
 * of 20 and then presented those 20 rows as the devotee's whole history — 81
 * bookings on the seeded account. Normalisation lives here as a pure function
 * so the contract is unit-testable without booting Fastify.
 */
function parseMyBookingsQuery(query: {
  view?: string;
  page?: string;
  limit?: string;
}): { view: MyBookingsView; page: number; limit: number } {
  const view = (MY_BOOKINGS_VIEWS as readonly string[]).includes(query.view ?? '')
    ? (query.view as MyBookingsView)
    : 'all';

  const rawPage = Math.floor(Number(query.page));
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawLimit = Math.floor(Number(query.limit));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, MY_BOOKINGS_MAX_LIMIT)
    : MY_BOOKINGS_PAGE_SIZE;

  return { view, page, limit };
}

// ─── Guards ─────────────────────────────────────────────────────────────────────
//
// Hoisted to module scope so the pure decision helpers are unit-testable via
// __testing without booting Fastify (same pattern as routes/priest.ts).
// See the __testing export at the bottom of this file.

type GateResult =
  | { ok: true }
  | { ok: false; status: number; error: string; message: string };

/**
 * RV-08 (2026-08-10): business rule 1 — "video proof is MANDATORY for puja
 * bookings" — was enforced nowhere on this endpoint.
 *
 * `data` is optional on the completed/video_uploaded/delivered variants above
 * and `videoProofUrl` is optional inside it, while booking.service's
 * VALID_TRANSITIONS allowlist is status-only with no videoProofUrl predicate.
 * So `PATCH {"status":"video_uploaded"}` with no body at all walked
 * completed -> video_uploaded -> delivered on a booking whose videoProofUrl was
 * null — and video_uploaded/delivered is precisely where booking.service calls
 * paymentService.createPriestPayout to mint the pandit's 80% payout. The
 * devotee had paid in full for a puja with no evidence it happened, and the
 * admin's only remediation (POST /video-proof/flag) returns 409 when
 * videoProofUrl is null, so the row could not even be reverted afterwards.
 *
 * Two gates, both enforcing the same rule:
 *  1. video_uploaded / delivered require a videoProofUrl — either already on
 *     the booking (written by the safe path, booking.service.uploadVideoProof)
 *     or supplied in this same request.
 *  2. only the assigned pandit or an admin may ATTACH proof here. Without this
 *     the devotee — who passes the owner branch of the authz check below —
 *     could self-attest any URL and mint the pandit's payout, leaving gate 1
 *     satisfiable by exactly the party it is meant to protect against. The
 *     safe path already requires priest ownership; this makes PATCH match it.
 */
const VIDEO_PROOF_REQUIRED_STATUSES: readonly BookingStatus[] = ['video_uploaded', 'delivered'];

function checkVideoProofGate(input: {
  newStatus: BookingStatus;
  existingVideoProofUrl: string | null;
  suppliedVideoProofUrl?: string | null;
  isAssignedPriest: boolean;
  isAdmin: boolean;
}): GateResult {
  const supplied = input.suppliedVideoProofUrl?.trim() || null;

  if (supplied && !input.isAssignedPriest && !input.isAdmin) {
    return {
      ok: false,
      status: 403,
      error: 'Forbidden',
      message: 'Only the assigned pandit or an admin may attach video proof to a booking.',
    };
  }

  if (!VIDEO_PROOF_REQUIRED_STATUSES.includes(input.newStatus)) {
    return { ok: true };
  }

  const existing = input.existingVideoProofUrl?.trim() || null;
  if (existing || supplied) {
    return { ok: true };
  }

  return {
    ok: false,
    status: 409,
    error: 'Video proof required',
    message:
      `Video proof is mandatory before a booking can move to "${input.newStatus}". ` +
      'Upload the recording first (POST /priest/bookings/:id/video) or send ' +
      'data.videoProofUrl with this request.',
  };
}

/**
 * P0 (2026-08-11): who may drive WHICH transition, not just who may PATCH.
 *
 * The authz check below asked only `isOwner || isAdmin || isAssignedPriest` and
 * then let every one of them request every status. The booking OWNER is a plain
 * devotee, and `pending_payment -> confirmed` is a legal transition — which is
 * precisely where booking.service.updateBookingStatus MINTS the Commission row
 * and the TemplePayout. So:
 *
 *   1. book a Rs 10,000 puja via POST /bookings/from-offering (which pins
 *      priestId at create time),
 *   2. never pay,
 *   3. `PATCH {"status":"confirmed"}`.
 *
 * updateBookingStatus writes Commission{ providerId: the pandit's User.id,
 * amount: priestPayout = Rs 8,000, status: PENDING } — and per this project's
 * ledger invariant `Commission.amount` is exactly what
 * payout.service.getPayoutBalance pays out. A pandit colluding with (or
 * identical to) the devotee mints Rs 8,000 of withdrawable balance per unpaid
 * booking, unbounded, plus a TemplePayout for the temple on the same unpaid
 * booking. The `-> refunded` variant is the mirror image: it marks a booking
 * refunded with no Razorpay refund and no commission reversal (refund.service
 * is the only writer that sets REVERSED), leaving a live PENDING commission on
 * a booking the reports call refunded.
 *
 * The gate below is deliberately narrow rather than "devotees cannot PATCH":
 *   • owner  → `cancelled` (their own exit) and `delivered` (acknowledging the
 *     video they received; the proof gate above already forbids them attaching
 *     the proof, and `delivered` is only reachable from `video_uploaded`, which
 *     the pandit or an admin must have set, so no new payout is minted here).
 *   • assigned pandit → the delivery statuses they actually perform.
 *   • everything else — confirmed, priest_assigned, refunded, pending_payment —
 *     is admin-only. Money-minting hops are not self-service.
 *
 * No shipping client is affected: the web/mobile devotee surfaces use
 * /cancel, /reschedule, /request-refund and /review, and the pandit portal uses
 * /priest/bookings/:id/*. Only the admin console PATCHes this endpoint.
 */
const OWNER_ALLOWED_TRANSITIONS: readonly BookingStatus[] = ['cancelled', 'delivered'];
const ASSIGNED_PRIEST_ALLOWED_TRANSITIONS: readonly BookingStatus[] = [
  'in_progress',
  'completed',
  'video_uploaded',
  'delivered',
  'cancelled',
];

function checkTransitionRole(input: {
  newStatus: BookingStatus;
  isOwner: boolean;
  isAssignedPriest: boolean;
  isAdmin: boolean;
}): GateResult {
  if (input.isAdmin) return { ok: true };
  if (input.isAssignedPriest && ASSIGNED_PRIEST_ALLOWED_TRANSITIONS.includes(input.newStatus)) {
    return { ok: true };
  }
  if (input.isOwner && OWNER_ALLOWED_TRANSITIONS.includes(input.newStatus)) {
    return { ok: true };
  }
  return {
    ok: false,
    status: 403,
    error: 'Forbidden',
    message:
      `You are not allowed to move this booking to "${input.newStatus}". ` +
      'Devotees may cancel a booking (or confirm delivery); the assigned pandit ' +
      'may record the puja through to delivery. Anything else is handled by the ' +
      'Darshya team — contact support@darshya.online.',
  };
}

/**
 * RV-17 (2026-08-10): admin priest reassignment was accepted and silently
 * discarded. `body.priestId` had exactly one consumer — the admin-only 403
 * branch below — and was never passed to updateBookingStatus, which strips
 * priestId in its own denylist anyway. The endpoint answered 200 carrying the
 * OLD priest, so the documented capability (see the priest_assigned schema
 * variant) did not exist while appearing to succeed. dispatch.service
 * designates admin as the T4 escalation owner, and that escalation had no
 * working assignment tool anywhere in the product.
 *
 * The write now happens in the route (booking.service's denylist is a
 * deliberate defence-in-depth boundary and stays untouched), but only in the
 * window where it cannot rewrite settled money: once a booking reaches
 * completed the puja has been performed by the pandit on record, and at
 * video_uploaded/delivered a PriestPayout has already been minted for them.
 */
const PRIEST_REASSIGNABLE_STATUSES: readonly BookingStatus[] = [
  'pending_payment',
  'confirmed',
  'priest_assigned',
  'in_progress',
];

function checkPriestReassignable(currentStatus: BookingStatus): GateResult {
  if (PRIEST_REASSIGNABLE_STATUSES.includes(currentStatus)) {
    return { ok: true };
  }
  return {
    ok: false,
    status: 409,
    error: 'Conflict',
    message:
      `Cannot reassign the pandit on a booking in "${currentStatus}" status — ` +
      'the puja has already been performed or settled. Cancel and rebook instead.',
  };
}

/**
 * RV-17, second pass (2026-08-11): the reassignment above committed and then
 * the request died on the status flip below, so the endpoint answered
 * `409 Invalid status transition` on a write it had already applied.
 *
 * Every variant of the PATCH schema requires a `status`, and VALID_TRANSITIONS
 * (booking.service.ts) has no self-edges — `confirmed -> confirmed` is not a
 * legal transition. The only way to express "swap the pandit, leave the booking
 * where it is" was therefore to echo the current status back, which reached
 * updateBookingStatus and threw. That is the dominant case, not an edge one:
 * dispatch.service escalates T4 to an admin so the admin can put a different
 * pandit on a booking that is *staying* confirmed/priest_assigned.
 *
 * A status PATCH that does not move the status is a no-op, not an illegal
 * transition, so the transition step is skipped rather than validated. Scoped
 * deliberately: only when a reassignment actually happened (so the request did
 * something) and no `data` rides along (so nothing is silently dropped). A
 * same-status PATCH that carries neither still falls through to the service and
 * still 409s — that shape is unchanged, since it genuinely asks for nothing.
 */
function isPureReassignment(input: {
  currentStatus: BookingStatus;
  requestedStatus: BookingStatus;
  reassignmentApplied: boolean;
  hasData: boolean;
}): boolean {
  return (
    input.reassignmentApplied &&
    input.requestedStatus === input.currentStatus &&
    !input.hasData
  );
}

/**
 * Tell everyone an admin reassignment affects (2026-08-11).
 *
 * Adversarial review found the reassignment landing silently: the devotee's app
 * still named the old pandit (who might still turn up), the new pandit only
 * discovered the job by opening the portal, and the old one was never told they
 * had lost it. Every other assignment path already notifies — priest.service on
 * accept/release, dispatch.service on match — so this closes the one path that
 * did not.
 *
 * Fire-and-forget by contract: a notification failure must never undo a
 * committed reassignment.
 */
async function notifyReassignment(args: {
  booking: { id: string; priestId: string | null };
  previousPriestId: string | null;
}): Promise<void> {
  const { booking, previousPriestId } = args;

  const full = await prisma.pujaBooking.findUnique({
    where: { id: booking.id },
    include: {
      user: { select: { id: true, fullName: true, phone: true, email: true } },
      pujaType: { select: { name: true } },
      temple: { select: { name: true } },
      priest: { select: { displayName: true } },
    },
  });
  if (!full) return;

  const { notifyDevotee, buildBookingCtx } = await import(
    '../services/booking-notify.service.js'
  );
  const { notifyUser } = await import('../routes/notifications.js');

  await notifyDevotee('assigned', buildBookingCtx(full as never)).catch(() => undefined);

  const priestIds = [booking.priestId, previousPriestId].filter(
    (p): p is string => !!p && p !== undefined,
  );
  if (!priestIds.length) return;

  const priests = await prisma.priest.findMany({
    where: { id: { in: priestIds } },
    select: { id: true, userId: true },
  });

  for (const p of priests) {
    if (!p.userId) continue;
    const isNew = p.id === booking.priestId;
    await notifyUser(p.userId, {
      title: isNew ? 'New puja assigned to you' : 'A puja was reassigned',
      body: isNew
        ? `You have been assigned booking ${full.bookingNumber}. Check the details in your portal.`
        : `Booking ${full.bookingNumber} has been reassigned to another pandit by the Darshya team.`,
      url: isNew ? '/priest/bookings' : '/priest',
    }).catch(() => undefined);
  }
}

/**
 * S2C-13 / RV-17 (2026-08-10): a pandit cannot be in two places at once.
 *
 * `POST /from-offering` wrote `priestId` straight into `pujaBooking.create`
 * with no conflict query at all — the third priestId-write path and the only
 * unguarded one (priest.service and dispatch.service both check
 * (priestId, scheduledDate, scheduledTimeSlot) before assigning). Two devotees
 * could book the SAME pandit at the same 09:00 slot through two different
 * offerings, both pay, and only one puja could physically happen; the other is
 * undeliverable (video proof is mandatory) and must be refunded after the
 * platform has already eaten a non-refundable Razorpay MDR.
 *
 * Serialize on (priest, date, slot) exactly the way booking.service serializes
 * on (offering, date, slot): a transaction-scoped advisory lock, released at
 * COMMIT so it is safe under Supabase's transaction-mode pooler (a
 * session-level lock would leak across pooled clients). Best-effort by design —
 * if the statement cannot run we log and fall through to the re-check inside
 * the transaction, which still closes the multi-round-trip TOCTOU window that
 * made the plain count-then-create race reachable.
 *
 * MOVED to lib/priest-slot.ts (2026-08-11). Both functions lived here, so only
 * this file's two callers took the lock while dispatch.service.accept — the
 * pandit tapping the WhatsApp accept link — ran its identical conflict query
 * with no lock at all. A lock only serialises the callers that agree to take
 * it, so admin-vs-pandit was unserialised and both transactions could commit
 * the same slot. Every priestId writer must now import the SAME key function;
 * a lock on a re-derived key is the same as no lock.
 */

/**
 * The unpaid-hold TTL (2026-08-11).
 *
 * Every conflict/capacity predicate in this domain was
 * `status: { notIn: ['cancelled','refunded'] }` with no age bound, and there is
 * no expiry job for puja bookings (jobs/consultation-expire.ts covers only
 * consultations) — so a `pending_payment` row held inventory forever. Two
 * consequences, one hostile and one routine:
 *
 *   • Zero-cost calendar squatting. POST /from-offering against a competitor
 *     pandit for every slot for the next 30 days, never pay, and that pandit's
 *     calendar is permanently full (maxBookingsPerSlot defaults to 1) — a Rs 0
 *     denial-of-supply against someone earning ~Rs 4,000 a booking.
 *   • Every abandoned checkout. /create-order creates the booking BEFORE
 *     createRazorpayOrder, so a closed tab or a failed order permanently burns
 *     one of the offering's slots with no recovery path.
 *
 * Query-side only — no cron, no scheduled sweep (free-tier budget). A stale
 * unpaid hold simply stops counting; the row is left alone so payment capture
 * on a late webhook still finds it.
 */
const UNPAID_HOLD_MINUTES = 30;

function unpaidHoldCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - UNPAID_HOLD_MINUTES * 60_000);
}

/**
 * "This booking still holds its slot." Use INSTEAD of a bare
 * `status: { notIn: [...] }` in every capacity/conflict predicate.
 */
function activeSlotHoldWhere(now?: Date): Prisma.PujaBookingWhereInput {
  return {
    AND: [
      { status: { notIn: ['cancelled', 'refunded'] } },
      { NOT: { status: 'pending_payment', createdAt: { lt: unpaidHoldCutoff(now) } } },
    ],
  };
}

/**
 * The pandit's share of a puja price, and the split it implies.
 *
 * Two defects folded into one helper (2026-08-11):
 *
 *  1. FLOAT SUBTRACTION ON MONEY. The from-offering path computed the platform
 *     side as `new Prisma.Decimal((1 - share).toString())` — for the 0.8 default
 *     that string is literally '0.19999999999999996'. Decimal(10,2) rounds it
 *     away on write today, so no rupee is currently wrong, but it violates the
 *     project's own money rule and the moment anyone sums the un-rounded value
 *     (or the column widens) the error becomes real. The subtraction is now done
 *     in Decimal.
 *  2. THE TWO SIDES DID NOT HAVE TO ADD UP. Computing each side independently
 *     lets rounding drift them apart. The platform side is now the exact
 *     complement, so priestPayout + platformCommission is always the puja price
 *     — which matters because that sum is how writeTemplePayoutOnConfirm and
 *     GET /:id/cancel-quote recover the fee-exclusive base.
 */
function resolvePriestShare(commissionRate: number | null | undefined): number {
  return typeof commissionRate === 'number' && commissionRate > 0 && commissionRate <= 1
    ? commissionRate
    : DEFAULT_PRIEST_SHARE;
}

function splitPujaPrice(
  pujaPrice: Prisma.Decimal,
  share: number,
): { priestPayout: Prisma.Decimal; platformCommission: Prisma.Decimal } {
  const priestPayout = pujaPrice
    .mul(new Prisma.Decimal(share.toString()))
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  return { priestPayout, platformCommission: pujaPrice.sub(priestPayout) };
}

/**
 * Give a booking-create failure a status the wizard can act on (2026-08-11).
 *
 * POST /book and POST /create-order both answered a flat 400 for every
 * non-Zod error, so "No availability for the selected slot", "This temple has
 * not been verified yet" and "Invalid time slot" were indistinguishable from a
 * malformed body. The web wizard therefore could not tell "retry with another
 * slot" (recoverable in-page) from "your input is broken", and a devotee who
 * lost a slot race got a generic validation toast and abandoned a checkout a
 * slot re-pick would have saved.
 *
 * The five translated TEMPLE_NOT_VERIFIED strings in lib/error-i18n.ts had zero
 * emitters anywhere in apps/api; this is the first one.
 *
 * String matching, reluctantly: booking.service throws bare `Error`s and lives
 * in another module. The right shape is typed errors (SlotConflictError /
 * CapacityError / TempleNotVerifiedError) thrown from the service and caught by
 * `instanceof` here — this function is the seam that becomes those branches
 * without changing either caller. Matching is anchored on the fixed prefix of
 * each message, never on interpolated content.
 */
type BookingCreateFailure = {
  status: 400 | 404 | 409;
  code?: 'TEMPLE_NOT_VERIFIED' | 'SLOT_UNAVAILABLE' | 'PUJA_UNAVAILABLE';
};

function classifyCreateBookingError(message: string | undefined): BookingCreateFailure {
  const m = message ?? '';
  if (m.startsWith('This temple has not been verified yet')) {
    return { status: 409, code: 'TEMPLE_NOT_VERIFIED' };
  }
  if (m.startsWith('No availability for the selected slot') || m.startsWith('Invalid time slot')) {
    return { status: 409, code: 'SLOT_UNAVAILABLE' };
  }
  if (m.startsWith('This puja offering is currently inactive')) {
    return { status: 409, code: 'PUJA_UNAVAILABLE' };
  }
  // DB-07: the devotee already holds an unpaid booking on this exact
  // offering + date + slot. A state conflict they can resolve themselves, so
  // 409 rather than the default 400 — and deliberately WITHOUT a `code`, so
  // the handler forwards booking.service's own message, which names the
  // booking number they should go pay. A localised code would have to drop
  // that number, and "which one?" is the whole answer here.
  if (m.startsWith('You already have an unpaid booking')) {
    return { status: 409 };
  }
  if (m.includes('not found')) return { status: 404 };
  return { status: 400 };
}

/** Thrown inside a slot transaction so the handler can answer 409, not a bare 400. */
class SlotConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SlotConflictError';
  }
}

/**
 * PriestPujaOffering.availableSlots is `Json?` and accepts either "HH:MM"
 * strings or {time,label} objects (see routes/priest.ts). An empty/absent list
 * means the pandit has not published a slot whitelist.
 */
function normalizePriestSlots(rawSlots: unknown): string[] {
  if (!Array.isArray(rawSlots)) return [];
  return (rawSlots as unknown[])
    .map((s) => (typeof s === 'string' ? s : ((s as { time?: string })?.time ?? '')))
    .filter((t) => t.length > 0);
}

/**
 * S2C-13 decision, split out from the transaction so it is unit-testable.
 *
 * `held` is every non-cancelled booking the pandit already holds in the
 * requested (date, slot), whichever offering it came through.
 */
function evaluatePriestSlot(input: {
  held: readonly { bookingNumber: string; priestPujaOfferingId: string | null }[];
  offeringId: string;
  maxBookingsPerSlot: number;
  scheduledDate: string;
  scheduledTime: string;
}): { ok: true } | { ok: false; message: string } {
  // One body, one puja: a booking from a DIFFERENT offering (or from the
  // temple path, where priestPujaOfferingId is NULL) is a hard block.
  const clash = input.held.find((b) => b.priestPujaOfferingId !== input.offeringId);
  if (clash) {
    return {
      ok: false,
      message:
        `This pandit already has booking ${clash.bookingNumber} at ${input.scheduledTime} ` +
        `on ${input.scheduledDate}. Please pick another time.`,
    };
  }
  // Everything left is same-offering, so `held.length` is that count and the
  // pandit's own configured capacity governs it.
  if (input.held.length >= input.maxBookingsPerSlot) {
    return {
      ok: false,
      message: `Slot ${input.scheduledTime} is fully booked (${input.held.length}/${input.maxBookingsPerSlot}).`,
    };
  }
  return { ok: true };
}

// ─── Order-creation bodies ──────────────────────────────────────────────────
//
// Both checkout entry points (`POST /create-order` for the temple wizard and
// `POST /from-offering` for the pandit-direct flow) charge money, so their
// bodies live at module scope and are exported through `__testing`: the
// contract is pinned by unit tests instead of only by a booted server.

const orderDevoteesSchema = z
  .array(
    z.object({
      name: z.string().min(1),
      gotra: z.string().optional(),
      nakshatra: z.string().optional(),
    }),
  )
  .min(1)
  .max(5);

/**
 * DB-07 (prod sweep 2026-08-12), second half: how far ahead a booking may sit.
 *
 * There was no upper bound of any kind. `scheduledDate: "2031-01-01"` returned
 * 201 and the resulting booking rendered on My Bookings as "1 Jan 2031" — a row
 * five years out that no pandit will ever be assigned to and that sits in
 * Upcoming forever. The web picker caps itself at +30 days, so the only way to
 * reach this was a mistyped year or a non-browser client.
 *
 * The bound is 365 days, NOT the picker's 30, and that gap is deliberate: the
 * offering checkout (apps/web/app/checkout/offering/page.tsx) passes `min` with
 * no `max`, and the sweep itself probed slots 45 days out and found them open.
 * A server bound of 30 would start refusing dates the product currently sells.
 * A year still refuses every mistyped year, which is the failure this closes.
 * Narrowing it to exactly the wizard's window is a product decision, not a bug
 * fix, and is left to the owner.
 */
export const MAX_BOOKING_HORIZON_DAYS = 365;

// Past-date guard mirrors createBookingSchema. Without it, the web wizard
// would happily create a Razorpay order for yesterday's puja, which the
// booking service never validates again — payment captures, ledger writes,
// then ops gets a confused devotee.
const futureBookingDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine(
    (d) => {
      const requested = new Date(`${d}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return !Number.isNaN(requested.getTime()) && requested >= today;
    },
    { message: 'Cannot book a past date.' },
  )
  .refine(
    (d) => {
      const requested = new Date(`${d}T00:00:00`);
      if (Number.isNaN(requested.getTime())) return true; // the past-date rule owns this
      const horizon = new Date();
      horizon.setHours(0, 0, 0, 0);
      horizon.setDate(horizon.getDate() + MAX_BOOKING_HORIZON_DAYS);
      return requested <= horizon;
    },
    {
      message: `That date is too far ahead — bookings open up to ${MAX_BOOKING_HORIZON_DAYS} days from today.`,
    },
  );

/**
 * DB-05 (prod sweep 2026-08-12): `prasadDelivery: true` with no
 * `deliveryAddress` used to parse cleanly. The route only persisted an address
 * `if (body.prasadDelivery && body.deliveryAddress)`, while
 * booking.service.createBooking adds PRASAD_DELIVERY_FEE_INR on the boolean
 * alone — so the devotee was charged ₹150 for a prasad courier with
 * `prasadDeliveryAddressId = null`. Reproduced live against a booted API:
 * a create-order body with `prasadDelivery: true` and no address key returned
 * 201 / amount 130100 (₹1,100 + ₹51 + ₹150) and a booking row with a null
 * address id. The web wizard validates the address client-side, so this was
 * only reachable from the mobile app, a retried request, or any direct client.
 *
 * Money can never be taken for a delivery with nowhere to ship it, so the
 * pairing is enforced in the schema — the request is rejected before any
 * booking row or Razorpay order exists.
 */
function requirePrasadDeliveryAddress(
  body: { prasadDelivery?: boolean; deliveryAddress?: unknown },
  ctx: z.RefinementCtx,
): void {
  if (body.prasadDelivery && body.deliveryAddress == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['deliveryAddress'],
      message: 'A delivery address is required when prasad delivery is selected.',
    });
  }
}

// POST /create-order - Used by the web booking wizard
// (apps/web/app/pujas/book/page.tsx). Combines the existing createBooking +
// paymentService.createRazorpayOrder steps so the client makes ONE round-trip
// to launch checkout. Body shape mirrors the web form rather than the legacy
// POST /book schema.
const createOrderBodySchema = z
  .object({
    pujaSlug: z.string().min(1),
    templeOfferingId: z.string().uuid(),
    scheduledDate: futureBookingDateSchema,
    scheduledTime: z.string().min(1),
    devotees: orderDevoteesSchema,
    sankalp: z.string().optional(),
    specialInstructions: z.string().optional(),
    prasadDelivery: z.boolean().optional().default(false),
    // CM-06: country-aware, shared with the web form. Was India-only.
    deliveryAddress: deliveryAddressSchema.optional(),
  })
  .superRefine(requirePrasadDeliveryAddress);

// Slot capacity (S2C-13, corrected 2026-08-10): if offering.availableSlots
// is set, the scheduledTime must match one of the slots. INDEPENDENTLY of
// that — availableSlots is nullable and unset by default — the pandit must
// be free at (date, slot) and the offering must be under
// maxBookingsPerSlot; both are re-checked under an advisory lock inside the
// create transaction. See the block at step 6 of POST /from-offering.
const fromOfferingBodySchema = z
  .object({
    offeringId: z.string().uuid(),
    scheduledDate: futureBookingDateSchema,
    scheduledTime: z.string().min(1),
    devotees: orderDevoteesSchema,
    sankalp: z.string().optional(),
    specialInstructions: z.string().optional(),
    prasadDelivery: z.boolean().optional().default(false),
    // Accepted for backwards compatibility with older clients that still post
    // 'USD'; it is an analytics hint only. It never changes the amount and
    // never changes the gateway currency — `const currency = 'INR'` below is
    // unconditional. The old comment here described this enum as a switch that
    // "forces the NRI/USD path", which is an invitation to wire it back into
    // the order currency; that path was RV-01 and is gone.
    currency: z.enum(['INR', 'USD']).optional(),
    // CM-06: country-aware, shared with the web form. Was India-only.
    deliveryAddress: deliveryAddressSchema.optional(),
  })
  .superRefine(requirePrasadDeliveryAddress);

// ─── Routes ─────────────────────────────────────────────────────────────────────

export async function bookingRoutes(server: FastifyInstance) {
  // POST /book - Create a new puja booking
  server.post(
    '/book',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const body = createBookingSchema.parse(request.body);
        const userId = request.currentUser!.id;

        const booking = await bookingService.createBooking({
          userId,
          ...body,
        });

        return reply.status(201).send({ booking });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation Error',
            details: error.errors,
          });
        }
        // A lost slot race is a 409 the wizard can recover from in-page; a
        // malformed body is a 400 it cannot. See classifyCreateBookingError.
        const failure = classifyCreateBookingError(error?.message);
        if (failure.code) {
          const lang = pickLang(
            request.headers['accept-language'],
            (request.query as Record<string, unknown> | undefined)?.lang as string | undefined,
          );
          const message = localizedError(failure.code, lang);
          // `error` stays a STRING: shipping clients render it directly
          // (`${body.error}`), so the standard `{error:{code,message}}` envelope
          // would render "[object Object]" to a devotee. `code` carries the
          // machine-readable half alongside it.
          return reply.status(failure.status).send({ error: message, code: failure.code, message });
        }
        server.log.error(error, 'Failed to create booking');
        return reply.status(failure.status).send({
          error: error.message || 'Failed to create booking',
        });
      }
    }
  );

  // GET /my - Get current user's bookings (must be before /:id)
  server.get(
    '/my',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const userId = request.currentUser!.id;
        const query = request.query as {
          status?: string;
          dateFrom?: string;
          dateTo?: string;
          page?: string;
          limit?: string;
          view?: string;
        };
        const { status, dateFrom, dateTo } = query;
        const { view, page, limit } = parseMyBookingsQuery(query);

        // Returns { bookings, total, page, limit, totalPages, counts } — the
        // per-tab `counts` are what the devotee page's chips render, so the
        // list and its own header can no longer contradict each other.
        const result = await bookingService.getUserBookings(userId, {
          status: status as BookingStatus | undefined,
          dateFrom,
          dateTo,
          page,
          limit,
          view,
        });

        return result;
      } catch (error: any) {
        server.log.error(error, 'Failed to fetch user bookings');
        // SEC-04: never echo error.message to the client. server.setErrorHandler
        // sanitises 5xx bodies in production, but it only fires for errors that
        // PROPAGATE — this site catches and replies directly, so the guard never
        // ran and a raw Prisma/driver message reached the caller. The detail is
        // already in the log line above; the client gets a fixed string.
        return reply.status(500).send({
          error: 'Failed to fetch bookings',
        });
      }
    }
  );

  // GET /availability - Check slot availability
  server.get(
    '/availability',
    async (request, reply) => {
      try {
        const { templeId, pujaTypeId, date } = request.query as {
          templeId?: string;
          pujaTypeId?: string;
          date?: string;
        };

        if (!templeId || !pujaTypeId || !date) {
          return reply.status(400).send({
            error: 'templeId, pujaTypeId, and date query parameters are required.',
          });
        }

        // Shape first, then validity. `new Date('2026-08-15T10:00:00')` and
        // `new Date('Aug 15 2026')` both parse — in SERVER-LOCAL time — so the
        // resulting instant does not equal the UTC-midnight values stored in
        // the `@db.Date` column. checkSlotAvailability's groupBy then matches
        // nothing and every slot is reported fully available, which is the same
        // wrong-number-to-the-devotee failure by a different door. GET /slots
        // already enforces this shape; this endpoint did not.
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return reply.status(400).send({
            error: 'Invalid date format. Use YYYY-MM-DD.',
          });
        }
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          return reply.status(400).send({
            error: 'Invalid date format. Use YYYY-MM-DD.',
          });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsedDate < today) {
          return reply.status(400).send({
            error: 'Cannot check availability for past dates.',
          });
        }

        const result = await bookingService.checkSlotAvailability(
          templeId,
          pujaTypeId,
          date
        );

        return result;
      } catch (error: any) {
        server.log.error(error, 'Failed to check slot availability');
        // SEC-04: see the note on the sibling handler above — this catch also
        // replies directly, bypassing the global sanitiser.
        return reply.status(500).send({
          error: 'Failed to check availability',
        });
      }
    }
  );

  // GET /:id - Get booking details
  server.get(
    '/:id',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const { id } = paramsWithId.parse(request.params);
        const userId = request.currentUser!.id;

        const booking = await bookingService.getBookingById(id, userId);

        return { booking };
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Invalid booking ID format.',
          });
        }
        if (error.message?.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        if (error.message?.includes('not authorized')) {
          return reply.status(403).send({ error: error.message });
        }
        server.log.error(error, 'Failed to fetch booking');
        return reply.status(500).send({
          error: 'Failed to fetch booking details',
        });
      }
    }
  );

  // PATCH /:id - Update booking status
  // P0 #pp-01 (2026-07-09): added ownership/role authorization. The old
  // handler ran only authenticateUser, so any logged-in user (even a plain
  // devotee) could drive ANY booking through the state machine and set
  // financial fields. Now only the booking owner, the assigned priest, or an
  // admin may PATCH; financial/identity fields are blocked by the schema
  // whitelist + the service denylist.
  server.patch(
    '/:id',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const { id } = paramsWithId.parse(request.params);
        const body = updateBookingStatusSchema.parse(request.body);
        const me = request.currentUser!;

        // Authorization: fetch the booking's owner + assigned priest.
        // videoProofUrl (RV-08) and scheduledDate/scheduledTimeSlot (RV-17)
        // are read here because both guards below need them.
        const booking = await prisma.pujaBooking.findUnique({
          where: { id },
          select: {
            userId: true,
            priestId: true,
            status: true,
            videoProofUrl: true,
            scheduledDate: true,
            scheduledTimeSlot: true,
            priest: { select: { userId: true } },
          },
        });
        if (!booking) {
          return reply.status(404).send({ error: 'Booking not found.' });
        }

        const isOwner = booking.userId === me.id;
        const isAdmin = me.roles.includes('ADMIN');
        const isAssignedPriest = !!booking.priestId && booking.priest?.userId === me.id;

        if (!isOwner && !isAdmin && !isAssignedPriest) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Not your booking.',
          });
        }

        // Only an admin may reassign the priest via this endpoint; a priest
        // self-assigning to someone else's booking is the IDOR we're closing.
        if (body.priestId && body.priestId !== booking.priestId && !isAdmin) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Only an admin may reassign the priest.',
          });
        }

        // P0 (2026-08-11): being ALLOWED to PATCH is not being allowed to make
        // every move. The `confirmed` hop mints the pandit's Commission and the
        // temple's TemplePayout; the `refunded` hop rewrites refund reporting.
        // Neither is a devotee action. See checkTransitionRole.
        const roleGate = checkTransitionRole({
          newStatus: body.status as BookingStatus,
          isOwner,
          isAssignedPriest,
          isAdmin,
        });
        if (!roleGate.ok) {
          return reply
            .status(roleGate.status)
            .send({ error: roleGate.error, message: roleGate.message });
        }

        // RV-08: business rule 1. Reject the transition before anything is
        // written — booking.service mints the pandit payout on the way through
        // video_uploaded/delivered, so an unproven flip is unrecoverable there.
        const proofGate = checkVideoProofGate({
          newStatus: body.status as BookingStatus,
          existingVideoProofUrl: booking.videoProofUrl,
          suppliedVideoProofUrl: (body.data as Record<string, any> | undefined)
            ?.videoProofUrl,
          isAssignedPriest,
          isAdmin,
        });
        if (!proofGate.ok) {
          return reply
            .status(proofGate.status)
            .send({ error: proofGate.error, message: proofGate.message });
        }

        // RV-17: land the admin's reassignment for real, BEFORE the status
        // flip, so the ledger rows booking.service writes during that flip
        // (the Commission row minted on `confirmed`, the PriestPayout minted on
        // video_uploaded/delivered) key off the NEW pandit rather than the one
        // being replaced. If the status transition that follows is itself
        // illegal the caller gets a 409 with the reassignment already applied —
        // recoverable, because retrying with a legal status is then a no-op for
        // this block (priestId already equals the target).
        let reassigned: Prisma.PujaBookingGetPayload<{
          include: typeof BOOKING_STATUS_RESPONSE_INCLUDE;
        }> | null = null;

        if (isAdmin && body.priestId && body.priestId !== booking.priestId) {
          const reassignGate = checkPriestReassignable(booking.status as BookingStatus);
          if (!reassignGate.ok) {
            return reply
              .status(reassignGate.status)
              .send({ error: reassignGate.error, message: reassignGate.message });
          }

          const target = await prisma.priest.findUnique({
            where: { id: body.priestId },
            select: { id: true, isVerified: true, status: true },
          });
          if (!target) {
            return reply.status(404).send({ error: 'Priest not found.' });
          }
          if (!target.isVerified || target.status !== 'active') {
            return reply.status(409).send({
              error: 'Conflict',
              message: 'That pandit is not currently available for assignment.',
            });
          }

          const newPriestId = body.priestId;
          reassigned = await prisma.$transaction(async (tx) => {
            await lockPriestSlot(
              tx,
              priestSlotKey(newPriestId, booking.scheduledDate, booking.scheduledTimeSlot),
            );
            // Same double-booking guard as priest.service / dispatch.service —
            // an admin must not be able to create the collision those paths
            // refuse to create.
            const conflict = await tx.pujaBooking.findFirst({
              where: {
                priestId: newPriestId,
                scheduledDate: booking.scheduledDate,
                scheduledTimeSlot: booking.scheduledTimeSlot,
                // An abandoned, never-paid hold must not block a real
                // assignment — see UNPAID_HOLD_MINUTES.
                ...activeSlotHoldWhere(),
                id: { not: id },
              },
              select: { bookingNumber: true },
            });
            if (conflict) {
              throw new SlotConflictError(
                `That pandit already has booking ${conflict.bookingNumber} at this date and time slot.`,
              );
            }

            // ── Move the earning with the work ────────────────────────────
            //
            // Found by adversarial review 2026-08-11. The Commission row is
            // minted at `confirmed` keyed to the pandit on record at that
            // instant, and its writer is idempotent on bookingId — so a
            // reassignment left the OLD pandit holding the whole 80% for a puja
            // the NEW pandit performs. On a Rs 5,000 booking: A can withdraw
            // Rs 4,000 for work he never did, and B, who did it, sees Rs 0.
            //
            // Only rows that are still unclaimed may move. A commission that is
            // already PAID or linked to a PayoutRequest represents money that
            // has left, or is mid-transfer — silently re-pointing it would
            // corrupt a live payout request (and trip processPayout's own
            // sum assertion). Those need a finance decision, so the
            // reassignment is refused instead of half-applied.
            const settled = await tx.commission.findFirst({
              where: {
                bookingId: id,
                OR: [{ status: { not: 'PENDING' } }, { payoutRequestId: { not: null } }],
              },
              select: { id: true, status: true },
            });
            if (settled) {
              throw new SlotConflictError(
                'This booking’s pandit earning has already been paid out or is inside a ' +
                  'payout request, so the pandit cannot be changed. Reverse the payout first.',
              );
            }

            const newPriestUser = await tx.priest.findUnique({
              where: { id: newPriestId },
              select: { userId: true, commissionRate: true },
            });

            // ── ...and re-price it for the pandit who will actually earn it ──
            //
            // Second-pass finding (2026-08-11): the block above repointed
            // `Commission.providerId` but left `amount` and `percentage` at the
            // OLD pandit's numbers, and never touched the booking's own
            // priestPayout / platformCommission. Both writers derive the split
            // from the INDIVIDUAL pandit's commissionRate (booking.service
            // createBooking and /from-offering below), so those numbers are
            // pandit-specific by design.
            //
            // Rs 10,000 booking confirmed with Pandit A on a negotiated 0.85
            // share → amount Rs 8,500, percentage 0.1500. Reassign to Pandit B
            // on 0.70 and B is credited Rs 8,500 instead of Rs 7,000: the
            // platform is Rs 1,500 short and the ledger claims a 15% take rate
            // that matches no party. Reversed rates under-pay the new pandit by
            // the same mechanism.
            //
            // The base is the FEE-EXCLUSIVE puja price, recovered exactly the
            // way writeTemplePayoutOnConfirm recovers it: priestPayout +
            // platformCommission. priceAmount also carries the Rs 51 platform
            // fee and the Rs 150 prasad fee, which no pandit has a claim on.
            const money = await tx.pujaBooking.findUnique({
              where: { id },
              select: { priestPayout: true, platformCommission: true, priceAmount: true },
            });
            const pujaPrice = new Prisma.Decimal(money?.priestPayout ?? 0).add(
              new Prisma.Decimal(money?.platformCommission ?? 0),
            );
            const split = splitPujaPrice(
              pujaPrice,
              resolvePriestShare(newPriestUser?.commissionRate),
            );

            if (newPriestUser?.userId) {
              const moved = await tx.commission.updateMany({
                where: { bookingId: id, status: 'PENDING', payoutRequestId: null },
                data: {
                  providerId: newPriestUser.userId,
                  // amount = the PROVIDER's earning, percentage = the PLATFORM's
                  // take rate. lib/commission-math.ts — one column, one meaning;
                  // never back-solved inline.
                  amount: split.priestPayout,
                  // `percentage` MUST use the same denominator the minting
                  // writers use — the fee-INCLUSIVE priceAmount
                  // (booking.service updateBookingStatus and
                  // payment.service.writePujaCommissionOnConfirm both do).
                  // Using the fee-exclusive puja price here made a no-op
                  // reassignment silently restate the row: on a Rs 1,100 puja
                  // + Rs 51 fee the rate moved 0.2354 -> 0.2000, and since
                  // commission-math derives gross and platformCut FROM this
                  // rate, /admin/commissions and platform revenue both dropped
                  // ~Rs 51 (19%) for that booking. `amount` was never wrong, so
                  // nobody was mispaid — but it broke "one column, one meaning".
                  //
                  // The SPLIT still runs on the fee-exclusive puja price above:
                  // no pandit has a claim on the platform fee or the prasad
                  // pass-through. Only the reported rate is expressed against
                  // the same base as the mint.
                  percentage: platformRateOf(
                    new Prisma.Decimal(money?.priceAmount ?? 0).sub(split.priestPayout),
                    new Prisma.Decimal(money?.priceAmount ?? 0),
                  ),
                },
              });

              // ── DI-05 residue: MOVING nothing is not the same as moving it ──
              //
              // `updateMany` above re-points an existing earning at the new
              // pandit. On the TEMPLE booking path there is no earning to
              // re-point: nobody is on the booking at confirm time, so
              // writePujaCommissionOnConfirm returns early and the ledger stays
              // empty. `count` is then 0 and this transaction — which RETURNS
              // EARLY on a pure reassignment, never reaching
              // updateBookingStatus and its EARNING_ATTACH mint — used to
              // commit the pandit onto the booking while leaving him with
              // nothing. That is the finding's own screen: /payouts answering
              // {availableInr: 0} to a pandit who is genuinely owed money.
              //
              // So mint it here, with the same three guards the other writers
              // use, in this order for a reason:
              //   1. count === 0 — never a SECOND row on one booking; two rows
              //      is a double payable, which is worse than the bug.
              //   2. a CAPTURED payment exists — otherwise this becomes the
              //      S3-08 hole (withdrawable balance on an unpaid booking)
              //      relocated onto the reassignment path.
              //   3. the same split/percentage the update above writes, so
              //      whichever branch runs produces an identical row.
              if (moved.count === 0) {
                const capturedForEarning = await tx.payment.count({
                  where: { bookingId: id, status: 'captured' },
                });
                if (capturedForEarning > 0) {
                  await tx.commission.create({
                    data: {
                      bookingId: id,
                      providerId: newPriestUser.userId,
                      // amount = PROVIDER earning, percentage = PLATFORM rate.
                      // lib/commission-math.ts — one column, one meaning.
                      amount: split.priestPayout,
                      percentage: platformRateOf(
                        new Prisma.Decimal(money?.priceAmount ?? 0).sub(split.priestPayout),
                        new Prisma.Decimal(money?.priceAmount ?? 0),
                      ),
                      status: 'PENDING',
                    },
                  });
                }
              }
            }

            return tx.pujaBooking.update({
              where: { id },
              data: {
                priestId: newPriestId,
                priestPayout: split.priestPayout,
                platformCommission: split.platformCommission,
              },
              include: BOOKING_STATUS_RESPONSE_INCLUDE,
            });
          });
        }

        // RV-17 second pass: a reassignment that moves no status is complete
        // here. Falling through would ask the state machine for a self-edge it
        // does not have and 409 on work already committed.
        //
        // The predicate is "the booking now carries the requested pandit", not
        // "we wrote it on THIS call" — otherwise an identical retry (the admin
        // UI resending after a timed-out but committed request) finds
        // priestId already equal, skips the block, and gets the very
        // `409 Invalid status transition` this fix exists to remove. Idempotent
        // now: the same request twice gives the same 200.
        const suppliedData = body.data as Record<string, any> | undefined;
        const targetPandit = body.priestId;
        const panditAlreadyTarget =
          isAdmin && !!targetPandit && (reassigned?.priestId ?? booking.priestId) === targetPandit;

        // Tell everyone a REAL reassignment affects — on BOTH paths.
        //
        // This call used to sit inside the pure-reassignment branch below, so it
        // only fired when the PATCH did not move the status. The commonest admin
        // action is `PATCH {status:'priest_assigned', priestId: X}` on a
        // `confirmed` booking — a legal transition — which sets `reassigned` and
        // then falls through to updateBookingStatus, where the notifier never
        // ran. That is exactly the silent swap the notifier was written to close:
        // the outgoing pandit is never told he lost the job and may still turn up
        // at the devotee's home, while the incoming one only finds out by opening
        // the portal. Hoisted here so it fires once per real reassignment
        // regardless of whether the status also moved. Fire-and-forget by
        // contract — a notification failure must never undo a committed write.
        if (reassigned) {
          void notifyReassignment({
            booking: reassigned,
            previousPriestId: booking.priestId,
          }).catch(() => undefined);
        }

        if (
          panditAlreadyTarget &&
          isPureReassignment({
            currentStatus: booking.status as BookingStatus,
            requestedStatus: body.status as BookingStatus,
            reassignmentApplied: true,
            hasData: !!suppliedData && Object.keys(suppliedData).length > 0,
          })
        ) {
          if (reassigned) return { booking: reassigned };
          // Retry of an already-applied reassignment: re-read so the response
          // shape matches the first call exactly.
          const current = await prisma.pujaBooking.findUnique({
            where: { id },
            include: BOOKING_STATUS_RESPONSE_INCLUDE,
          });
          if (current) return { booking: current };
        }

        const updated = await bookingService.updateBookingStatus(
          id,
          body.status as BookingStatus,
          suppliedData,
        );

        return { booking: updated };
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation Error',
            details: error.errors,
          });
        }
        // RV-17: a reassignment that would double-book the pandit. Checked
        // before the message-sniffing branches below so it can never be
        // misclassified as a 404/400.
        if (error instanceof SlotConflictError) {
          return reply.status(409).send({ error: 'Conflict', message: error.message });
        }
        if (error.message?.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        if (error.message?.includes('Invalid status transition')) {
          return reply.status(409).send({ error: error.message });
        }
        // A Prisma validation error's `message` is a multi-line dump of the
        // model's available arguments. Echoing it (which the generic branch
        // below does) leaks the PujaBooking schema to any caller who can
        // provoke one — the `cancelReason` bug above did exactly that. Fixed
        // message here; the detail goes to the log, where it belongs.
        if (
          error instanceof Prisma.PrismaClientValidationError ||
          error?.name === 'PrismaClientValidationError'
        ) {
          server.log.error(error, 'Rejected booking update payload');
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'That update could not be applied. Please check the fields you sent.',
          });
        }
        server.log.error(error, 'Failed to update booking status');
        return reply.status(400).send({
          error: error.message || 'Failed to update booking',
        });
      }
    }
  );

  // POST /:id/cancel - Cancel a booking
  server.post(
    '/:id/cancel',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const { id } = paramsWithId.parse(request.params);
        const body = cancelBookingSchema.parse(request.body ?? {});
        const userId = request.currentUser!.id;

        const result = await bookingService.cancelBooking(
          id,
          userId,
          body.reason
        );

        // D6: devotee cancelled — tell them the cancellation registered (and a
        // refund, if any, is being reviewed). Fire-and-forget.
        void (async () => {
          try {
            const b = await prisma.pujaBooking.findUnique({
              where: { id },
              include: {
                user: { select: { id: true, fullName: true, phone: true } },
                pujaType: { select: { name: true } },
                temple: { select: { name: true } },
              },
            });
            if (b) {
              const { notifyDevotee, buildBookingCtx } = await import(
                '../services/booking-notify.service.js'
              );
              await notifyDevotee('cancelled', buildBookingCtx(b as never));
            }
          } catch {
            /* notification must never break cancel */
          }
        })();

        return {
          message: 'Booking cancelled successfully',
          ...result,
        };
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation Error',
            details: error.errors,
          });
        }
        if (error.message?.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        if (error.message?.includes('not authorized')) {
          return reply.status(403).send({ error: error.message });
        }
        if (
          error.message?.includes('cannot be cancelled') ||
          error.message?.includes('not allowed within 24 hours')
        ) {
          return reply.status(409).send({ error: error.message });
        }
        server.log.error(error, 'Failed to cancel booking');
        return reply.status(400).send({
          error: error.message || 'Failed to cancel booking',
        });
      }
    }
  );

  // POST /:id/reschedule - D7: move a booking to a new date/slot. Previously
  // zero reschedule support existed anywhere in the API or UI; cancel+rebook
  // (with a refund round-trip) was the only path. Re-queues the assignment if
  // a priest was attached.
  server.post(
    '/:id/reschedule',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const { id } = paramsWithId.parse(request.params);
        const body = rescheduleBookingSchema.parse(request.body ?? {});
        const userId = request.currentUser!.id;

        const result = await bookingService.rescheduleBooking(
          id,
          userId,
          // UTC midnight, exactly like the create paths — see the schema note.
          new Date(body.newDate),
          body.newTimeSlot
        );

        return { message: 'Booking rescheduled successfully', ...result };
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Validation Error', details: error.errors });
        }
        if (error.message?.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        if (error.message?.includes('not authorized')) {
          return reply.status(403).send({ error: error.message });
        }
        if (
          error.message?.includes('cannot be rescheduled') ||
          error.message?.includes('within 24 hours') ||
          error.message?.includes('must be in the future')
        ) {
          return reply.status(409).send({ error: error.message });
        }
        server.log.error(error, 'Failed to reschedule booking');
        return reply.status(400).send({ error: error.message || 'Failed to reschedule booking' });
      }
    }
  );

  // POST /:id/request-refund - Devotee-initiated refund request.
  //
  // Eligibility:
  //   • booking must be paid (any non-pending_payment, non-cancelled,
  //     non-refunded status — BookingStatus enum has no `paid` value, see
  //     schema.prisma:71)
  //   • now < scheduledDate - 24h
  //
  // Schema gap: no REFUND_REQUESTED status. We tag the booking with
  // status='cancelled' + cancellationReason=`${REFUND_REQUESTED_MARKER} <reason>`
  // (lib/refund-marker.ts — shared with the consumer) and let processAutoRefunds
  // (master-cron) pick it up after 1h.
  server.post(
    '/:id/request-refund',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const { id } = paramsWithId.parse(request.params);
        const body = z
          .object({ reason: z.string().min(1).max(500).optional() })
          .parse(request.body ?? {});
        const userId = request.currentUser!.id;

        const booking = await prisma.pujaBooking.findUnique({
          where: { id },
          select: {
            id: true,
            userId: true,
            status: true,
            scheduledDate: true,
            scheduledTimeSlot: true,
            cancellationReason: true,
          },
        });
        if (!booking) return reply.status(404).send({ error: 'Booking not found' });
        if (booking.userId !== userId) {
          return reply.status(403).send({ error: 'Not authorized for this booking' });
        }
        if (booking.status === 'refunded' || booking.status === 'cancelled') {
          return reply
            .status(409)
            .send({ error: `Booking already ${booking.status}; cannot re-request refund.` });
        }
        if (booking.status === 'pending_payment') {
          return reply
            .status(409)
            .send({ error: 'Booking has not been paid yet.' });
        }

        // Cancellation must be >24h before the scheduled slot INSTANT.
        //
        // This was hand-rolled here (2026-08-11 fix): `Number(slot.split(':')[0])`
        // fed into `setHours`, which is SERVER-LOCAL — UTC on Render — applied to
        // a UTC-midnight DATE column while slots are IST. An 18:00 IST slot
        // resolved to 18:00 UTC = 23:30 IST, putting the cutoff 5.5 hours late,
        // so a devotee could open a refund request 5.5h INSIDE the no-refund
        // window (on a Rs 10,000 booking, the difference between the 50% tier and
        // being refused, after the pandit was already dispatched).
        //
        // Worse, `scheduledTimeSlot` is attacker-controlled: POST /from-offering
        // accepts `scheduledTime: z.string().min(1)` and skips the whitelist
        // entirely when the offering has no availableSlots, so 'anytime' is
        // storable. `Number('anytime')` is NaN, `Date.now() >= NaN` is false, and
        // the 24h guard NEVER fired — a `delivered` booking could be force-
        // cancelled by the devotee after the puja was performed.
        //
        // lib/slot-time.ts is the only correct way to compare a booking
        // date+slot (cancelBooking and rescheduleBooking both already use it),
        // and its null-slot fallback keeps the strict midnight behaviour for
        // unparseable legacy data instead of disabling the guard.
        if (hoursUntilSlot(booking.scheduledDate, booking.scheduledTimeSlot) < 24) {
          return reply
            .status(409)
            .send({ error: 'Refund requests are not allowed within 24 hours of scheduled time.' });
        }

        const reason = body.reason ?? 'Devotee requested refund';
        const updated = await prisma.pujaBooking.update({
          where: { id },
          data: {
            status: 'cancelled' satisfies BookingStatus,
            cancelledAt: new Date(),
            // The marker is shared with refund.service's `startsWith` query via
            // lib/refund-marker.ts. It was a string literal here: identical
            // today, but changing the constant would silently stop this
            // endpoint's rows from ever being picked up — a fresh recurrence of
            // RV-07, where that query matched zero rows for months.
            cancellationReason: `${REFUND_REQUESTED_MARKER} ${reason}`.slice(0, 500),
          },
          select: { id: true, status: true, cancellationReason: true, cancelledAt: true },
        });

        return {
          message: 'Refund requested. It will be processed within 1 hour.',
          booking: updated,
          schemaNote:
            'BookingStatus enum has no REFUND_REQUESTED — using cancelled + cancellationReason marker.',
        };
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Validation Error', details: error.errors });
        }
        server.log.error(error, 'Failed to request refund');
        return reply.status(500).send({ error: 'Failed to request refund' });
      }
    }
  );

  // GET /:id/video - Get video proof URL
  server.get(
    '/:id/video',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const { id } = paramsWithId.parse(request.params);
        const userId = request.currentUser!.id;

        const booking = await bookingService.getBookingById(id, userId);

        return {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          videoProofUrl: booking.videoProofUrl ?? null,
          videoUploadedAt: booking.videoUploadedAt ?? null,
          status: booking.videoProofUrl ? 'available' : 'not_available',
        };
      } catch (error: any) {
        if (error.message?.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        if (error.message?.includes('not authorized')) {
          return reply.status(403).send({ error: error.message });
        }
        server.log.error(error, 'Failed to fetch video proof');
        return reply.status(500).send({
          error: 'Failed to fetch video proof',
        });
      }
    }
  );

  // GET /:id/cancel-quote - D-policy: preview the refund for cancelling this
  // booking right now, from its snapshotted policy. Lets the UI show "you'll
  // get back ₹X (75%)" before the devotee confirms — the trust differentiator.
  server.get(
    '/:id/cancel-quote',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const { id } = paramsWithId.parse(request.params);
        const userId = request.currentUser!.id;
        const booking = await bookingService.getBookingById(id, userId);
        const policy = await cancellationService.getPolicy(id);
        const quote = cancellationService.computeDevoteeRefund({
          policy,
          scheduledDate: booking.scheduledDate,
          // RV-13: without the slot the tier is measured from midnight, quoting
          // a worse tier than policy (and a negative hoursUntilSlot for a
          // same-day slot, which falls through every tier to the 25% floor).
          scheduledTimeSlot: booking.scheduledTimeSlot,
          // ⚠ OWNER DECISION PENDING — do not change this in isolation.
          //
          // cancellation.service documents the ladder as applying to the PUJA
          // price, excluding the Rs 51 platform fee and Rs 150 prasad fee
          // ("refunded in full only when the pandit is at fault"). By that
          // contract this should pass priestPayout + platformCommission, and a
          // 2026-08-11 pass changed it to exactly that.
          //
          // It was reverted the same day because it moved ONLY the quote. The
          // two paths that actually move money still bill the ladder against
          // `priceAmount`:
          //     services/refund.service.ts  (processAutoRefunds cron)
          //     services/payment.service.ts (admin ladder refund)
          // so the devotee was QUOTED Rs 825 and PAID Rs 975.75 on a Rs 1,100
          // puja + Rs 201 of fees — the quote and the payout disagreeing by
          // Rs 150.75, which is the one thing a refund screen must never do.
          //
          // Aligning the executors instead would have been the other way to
          // restore agreement, but that SILENTLY REDUCES every customer's
          // refund by the fee component. That is a policy call with real
          // customer-trust consequences and belongs to the founder, not to a
          // refactor. Quoting on `priceAmount` keeps quote == payout and keeps
          // today's (more generous) behaviour until that call is made.
          //
          // To action it later: change this line AND both executors above in
          // ONE commit, and update the refunds policy page copy with it.
          pujaPriceInr: Number(booking.priceAmount),
          totalPaidInr: Number(booking.priceAmount),
        });
        return {
          bookingId: id,
          refundFraction: quote.refundFraction,
          refundAmountInr: quote.refundAmountInr,
          feeAmountInr: quote.feeAmountInr,
          tierLabel: quote.tierLabel,
          hoursUntilSlot: quote.hoursUntilSlot,
          refundDaysLabel: policy.refundDaysLabel,
        };
      } catch (error: any) {
        if (error.message?.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        if (error.message?.includes('not authorized')) {
          return reply.status(403).send({ error: error.message });
        }
        server.log.error(error, 'Failed to compute cancel quote');
        return reply.status(400).send({ error: error.message || 'Failed to compute quote' });
      }
    }
  );

  // GET /slots - Slot availability for a temple offering on a date.
  //
  // Web booking page (apps/web/app/pujas/[slug]/book/page.tsx) calls this
  // with templeId=<offering uuid>. We accept the offering id directly and
  // return {slots:[{time,label,remaining,total}]} which the page renders.
  // Public — no auth so the page can show availability before login.
  server.get('/slots', async (request, reply) => {
    try {
      const { templeId, date } = request.query as { templeId?: string; date?: string };
      if (!templeId || !date) {
        return reply.status(400).send({ error: 'templeId and date are required.' });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return reply.status(400).send({ error: 'date must be YYYY-MM-DD.' });
      }

      // templeId may be either an offering id (preferred, what web sends) or
      // a real Temple id (legacy). Resolve to a TemplePujaOffering either way.
      // Validate UUID shape first — Prisma's findUnique throws P2023 on
      // malformed uuids (cf. TD15 prod smoke 2026-05-04 surfacing 500s when
      // legacy mobile clients sent slug-style ids).
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRe.test(templeId)) {
        return { slots: [] };
      }
      let offering = await prisma.templePujaOffering.findUnique({
        where: { id: templeId },
      });
      if (!offering) {
        // Fall back: maybe a real Temple uuid was sent — pick its first active offering.
        offering = await prisma.templePujaOffering.findFirst({
          where: { templeId, isActive: true },
        });
      }
      if (!offering || !offering.isActive) {
        return { slots: [] };
      }

      const scheduledDate = new Date(date);
      const counts = await prisma.pujaBooking.groupBy({
        by: ['scheduledTimeSlot'],
        where: {
          templePujaOfferingId: offering.id,
          scheduledDate,
          // Abandoned checkouts stop consuming inventory after
          // UNPAID_HOLD_MINUTES — /create-order creates the booking BEFORE the
          // Razorpay order, so every closed tab used to burn a slot forever.
          ...activeSlotHoldWhere(),
        },
        _count: { id: true },
      });
      const used = new Map(counts.map((c) => [c.scheduledTimeSlot, c._count.id]));

      const slotLabel = (slot: string): string => {
        const [hStr, mStr] = slot.split(':');
        const h = Number(hStr ?? 0);
        const m = Number(mStr ?? 0);
        const period = h < 12 ? 'AM' : 'PM';
        const h12 = h % 12 === 0 ? 12 : h % 12;
        const time12 = `${h12}:${String(m).padStart(2, '0')} ${period}`;
        const window = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
        return `${window} (${time12})`;
      };

      const max = offering.maxBookingsPerSlot;
      const raw = (offering.availableSlots as unknown[]) ?? [];
      const slots = raw.map((s) => {
        const time = typeof s === 'string'
          ? s
          : (s as { time?: string }).time ?? String(s);
        const booked = used.get(time) ?? 0;
        return {
          time,
          label: typeof s === 'object' && s && 'label' in (s as object)
            ? (s as { label: string }).label
            : slotLabel(time),
          remaining: Math.max(0, max - booked),
          total: max,
        };
      });
      return { slots };
    } catch (error: any) {
      server.log.error(error, 'Failed to fetch slot availability (web shape)');
      return reply.status(500).send({ error: 'Failed to fetch availability' });
    }
  });

  // POST /create-order — body schema is `createOrderBodySchema` at module
  // scope (exported through `__testing`).
  server.post(
    '/create-order',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const body = createOrderBodySchema.parse(request.body);
        const userId = request.currentUser!.id;

        // 1. Resolve puja + offering. The offering already binds templeId +
        // pujaTypeId so we re-derive both server-side and never trust the
        // client to tell us which puja/temple combination it is.
        const pujaType = await prisma.pujaType.findUnique({
          where: { slug: body.pujaSlug },
          select: { id: true },
        });
        if (!pujaType) {
          return reply.status(404).send({ error: 'Puja type not found.' });
        }

        const offering = await prisma.templePujaOffering.findUnique({
          where: { id: body.templeOfferingId },
          select: { id: true, templeId: true, pujaTypeId: true, isActive: true },
        });
        if (!offering) {
          return reply.status(404).send({ error: 'Temple offering not found.' });
        }
        if (offering.pujaTypeId !== pujaType.id) {
          return reply.status(400).send({
            error: 'Selected temple does not offer this puja.',
          });
        }

        // 2. Persist the delivery address if prasad was requested. The schema
        // has already guaranteed an address is present whenever
        // body.prasadDelivery is true (requirePrasadDeliveryAddress).
        let prasadAddressId: string | undefined;
        if (body.prasadDelivery && body.deliveryAddress) {
          // UserAddress has no dedicated recipient/phone columns. We pack
          // them into `label` so the priest can still reach the devotee
          // when the prasad is dispatched. Schema cleanup is tracked but
          // this row keeps the data round-trippable. See
          // buildPrasadAddressRow — it also persists the real country, which
          // used to be silently left at the "India" column default.
          const addr = await prisma.userAddress.create({
            data: buildPrasadAddressRow(userId, body.deliveryAddress),
            select: { id: true },
          }).catch(() => null);
          // DB-05: the write used to be allowed to fail silently, and the
          // booking was still created with prasadDeliveryRequested = true —
          // which is what booking.service charges PRASAD_DELIVERY_FEE_INR on.
          // The ₹150 would have been taken with nowhere to ship to. Fail the
          // request instead: no booking row, no Razorpay order, no charge.
          if (!addr) {
            return reply.status(500).send({
              error: 'Could not save your prasad delivery address. Please try again.',
            });
          }
          prasadAddressId = addr.id;
        }

        // 3. Create the booking (status pending_payment). The prasad fee rides
        // on `prasadDeliveryRequested`, so it is only ever true alongside a
        // persisted address id.
        const booking = await bookingService.createBooking({
          userId,
          templeId: offering.templeId,
          pujaTypeId: offering.pujaTypeId,
          templePujaOfferingId: offering.id,
          scheduledDate: body.scheduledDate,
          scheduledTimeSlot: body.scheduledTime,
          devoteeNames: body.devotees,
          sankalpDetails: body.sankalp,
          specialInstructions: body.specialInstructions,
          prasadDeliveryRequested: body.prasadDelivery && !!prasadAddressId,
          prasadDeliveryAddressId: prasadAddressId,
        });

        // 4. Create the Razorpay order. In demo mode (no RAZORPAY_KEY_ID)
        // payment.service returns a synthetic order_demo_* id and the web
        // page falls back to its demo-payment button.
        const order = await paymentService.createRazorpayOrder(booking.id, userId);

        return reply.status(201).send({
          orderId: booking.id,
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          razorpayOrderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          razorpayKeyId: order.razorpayKeyId,
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation Error',
            details: error.errors,
          });
        }
        // Same classification as POST /book — this is the path the web wizard
        // actually uses, so it is the one that most needs a distinguishable 409.
        const failure = classifyCreateBookingError(error?.message);
        if (failure.code) {
          const lang = pickLang(
            request.headers['accept-language'],
            (request.query as Record<string, unknown> | undefined)?.lang as string | undefined,
          );
          const message = localizedError(failure.code, lang);
          return reply.status(failure.status).send({ error: message, code: failure.code, message });
        }
        server.log.error(error, 'Failed to create booking order (web shape)');
        return reply.status(failure.status).send({
          error: error.message || 'Failed to create booking order',
        });
      }
    },
  );

  // POST /create-stripe-order — REMOVED 2026-08-10.
  //
  // Stripe is no longer a payment rail (PayPal via Razorpay replaces it for
  // international devotees). This route was also the delivery vehicle for the
  // RV-01 defect: it billed an INR figure as USD. Every booking now goes
  // through /create-order or /from-offering on Razorpay, in INR.

  // POST /from-offering - Book a PriestPujaOffering (priest-authored catalog,
  // distinct from the temple-anchored TemplePujaOffering used by /create-order).
  //
  // PujaBooking schema requires templeId + pujaTypeId + templePujaOfferingId
  // (all non-null FKs) — PriestPujaOffering has none of them. We resolve the
  // priest's first verified TemplePriest binding to anchor templeId + use any
  // active TemplePujaOffering at that temple for templePujaOfferingId. The
  // real PriestPujaOffering id is persisted on the new
  // priestPujaOfferingId FK (migration 20260520020000) so the priest portal
  // + admin can read it back without parsing JSON markers.
  //
  // Pricing: INR via Razorpay for everyone. The NRI branch that used to sit
  // here — "bill in USD via Stripe at basePrice * 9" — was RV-01, the P0 that
  // charged NRI devotees 83.5× by applying a price-level multiplier as if it
  // were an FX rate. It is deleted, not disabled (Batch 1, 2026-08-10): Stripe
  // is not a rail on this path and USD is not a currency here. The accurate
  // note lives with the pricing block below; this comment is kept only to stop
  // the deleted behaviour being re-implemented from a stale instruction.
  //
  // Body schema is `fromOfferingBodySchema` at module scope (exported through
  // `__testing`); the slot-capacity rules it pairs with are enforced at step 6.
  // NRI multiplier for priest-offering pricing. Business rule #2 (NRI
  // pricing 9-10× domestic) — we pick 9x as the lower bound; temple-side
  // offerings already use PujaType.nriPrice which is set explicitly.
  // (An NRI price multiplier lived here. Removed 2026-08-10 with the Stripe/USD
  // path — it was being applied as if it were an FX rate. NRI premium pricing
  // returns with the PayPal rail as a server-quoted amount the client renders.)

  server.post(
    '/from-offering',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const body = fromOfferingBodySchema.parse(request.body);
        const userId = request.currentUser!.id;

        // 1. Resolve offering + priest (must be active + verified priest).
        const offering = await prisma.priestPujaOffering.findUnique({
          where: { id: body.offeringId },
          include: {
            priest: {
              select: {
                id: true,
                isVerified: true,
                status: true,
                commissionRate: true,
                temples: {
                  where: { temple: { isVerified: true } },
                  orderBy: [{ isPrimary: 'desc' }, { joinedAt: 'asc' }],
                  select: {
                    templeId: true,
                    temple: { select: { id: true, isVerified: true } },
                  },
                  take: 1,
                },
              },
            },
          },
        });
        if (!offering) {
          return reply.status(404).send({ error: 'Priest puja offering not found.' });
        }
        if (!offering.isActive) {
          return reply
            .status(409)
            .send({ error: 'This puja offering is currently inactive.' });
        }
        if (
          !offering.priest.isVerified ||
          offering.priest.status !== 'active'
        ) {
          return reply
            .status(409)
            .send({ error: 'Priest is not currently available for bookings.' });
        }

        // 2. Resolve the priest's anchor temple + any active TemplePujaOffering.
        const templeBinding = offering.priest.temples[0];
        if (!templeBinding) {
          return reply.status(409).send({
            error:
              'This pandit is not yet associated with a verified temple; ' +
              'priest-direct bookings require a temple binding for payouts. ' +
              'Please contact support@darshya.online.',
          });
        }
        const anchorOffering = await prisma.templePujaOffering.findFirst({
          where: { templeId: templeBinding.templeId, isActive: true },
          select: { id: true, templeId: true, pujaTypeId: true },
        });
        if (!anchorOffering) {
          return reply.status(409).send({
            error:
              'Pandit\'s home temple has no active puja offerings to anchor ' +
              'this booking. Please contact support@darshya.online.',
          });
        }

        // 3. Resolve pricing. Everything bills in INR via Razorpay — see the
        // pricing note below. (The old comment here claimed a 30/70 commission
        // split; the real take-rate is 80/20 in favour of the pandit, honouring
        // priest.commissionRate — see DEFAULT_PRIEST_SHARE.)
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        if (!user) {
          return reply.status(404).send({ error: 'User not found.' });
        }
        // PRICING — single currency, single price. (2026-08-10)
        //
        // Was: `basePrice * 9` labelled 'USD' and handed to Stripe, so a
        // Rs 1,100 puja billed $9,900 instead of ~$118 — an 83.5x overcharge
        // (RV-01). The author had conflated business rule 2 ("NRI pricing is
        // 9-10x domestic", a PRICE-LEVEL rule) with an FX conversion.
        //
        // Stripe is removed (PayPal via Razorpay replaces it). We deliberately
        // do NOT re-apply the 9x here: the web checkout displays `basePrice`,
        // and applying a server-side multiplier the UI cannot see would charge
        // an NRI devotee Rs 9,900 against a Rs 1,100 quote — a worse failure
        // than the one being fixed. Displayed price MUST equal charged price.
        //
        // NRI premium pricing is re-introduced with the PayPal rail, as an
        // explicit server-quoted amount the client renders before payment.
        // `body.currency` is still accepted (older clients post 'USD') but is
        // now only an NRI hint for analytics — it never changes the amount.
        //
        // FEES (2026-08-11). This path set `priceAmount = basePrice` while
        // accepting `prasadDelivery` and a full delivery address, and persisting
        // prasadDeliveryRequested — so every pandit-direct booking with prasad
        // requested promised a physical dispatch and collected Rs 0 for it: the
        // platform absorbed Rs 150 of shipping plus the Rs 51 platform fee on
        // every such order. Worse, the whole fee-free amount was then split
        // 80/20, so the pandit was paid a share of money that was supposed to be
        // platform revenue. Same leak P0 #PBO-3 fixed on the temple path
        // (booking.service createBooking), never applied here. Both constants
        // are imported from booking.service, which documents them as the single
        // source of truth for the amounts.
        //
        // The 80/20 split stays on `basePrice` ONLY — the fees are platform
        // revenue / prasad pass-through, not part of the pandit's earned split.
        //
        // ⚠ "Displayed price MUST equal charged price" (above) still holds and
        // is now a SHIP BLOCKER on this path: apps/web/app/checkout/offering/
        // page.tsx renders `offering.basePrice` alone, so it must render the
        // `priceBreakdown` this endpoint returns (base + Rs 51 + Rs 150) before
        // this goes live — exactly the breakdown the temple wizard already
        // shows. A Rs 51 surprise at the Razorpay sheet is nothing like RV-01's
        // 83.5x, but it is the same class of defect and must not ship.
        const basePrice = new Prisma.Decimal(offering.basePrice.toString());
        const platformFee = new Prisma.Decimal(PLATFORM_FEE_INR);
        const prasadFee = body.prasadDelivery
          ? new Prisma.Decimal(PRASAD_DELIVERY_FEE_INR)
          : new Prisma.Decimal(0);
        const priceAmount = basePrice.add(platformFee).add(prasadFee);
        const currency = 'INR';
        // Honour the pandit's own commissionRate (their share); default 80/20
        // (booking revamp take-rate cut — see booking.service DEFAULT_PRIEST_SHARE).
        // splitPujaPrice does the platform side in Decimal: `1 - 0.8` in JS float
        // is 0.19999999999999996, and money is never JS float here.
        const share = resolvePriestShare(offering.priest.commissionRate);
        const { priestPayout: priestPayoutAmount, platformCommission } = splitPujaPrice(
          basePrice,
          share,
        );

        // 3b. Slot whitelist. Skipped when the priest hasn't configured
        // availableSlots — back-compat with offerings created before the
        // slot-capacity migration, and with pandits who deliberately leave the
        // list empty. This is a pure validation of the requested string; the
        // COLLISION and CAPACITY checks are no longer conditional on it and now
        // run under a lock inside the create transaction at step 6 (S2C-13).
        const scheduledDate = new Date(body.scheduledDate);
        const slotTimes = normalizePriestSlots(offering.availableSlots);
        if (slotTimes.length > 0 && !slotTimes.includes(body.scheduledTime)) {
          return reply.status(409).send({
            error: `Slot ${body.scheduledTime} is not offered. Available slots: ${slotTimes.join(', ')}.`,
          });
        }

        // 4. Prasad delivery address (mirrors /create-order). The schema has
        // already guaranteed one is present whenever prasadDelivery is true;
        // DB-05: a failed write must not leave the ₹150 prasadFee charged
        // above against a null address, so it aborts before any booking row.
        let prasadAddressId: string | undefined;
        if (body.prasadDelivery && body.deliveryAddress) {
          const addr = await prisma.userAddress
            .create({
              data: buildPrasadAddressRow(userId, body.deliveryAddress),
              select: { id: true },
            })
            .catch(() => null);
          if (!addr) {
            return reply.status(500).send({
              error: 'Could not save your prasad delivery address. Please try again.',
            });
          }
          prasadAddressId = addr.id;
        }

        // 5. Generate booking number (retry on collision, same pattern as
        // booking.service.generateBookingNumber).
        const generateBookingNumber = (): string => {
          const now = new Date();
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let r = '';
          for (let i = 0; i < 5; i++) {
            r += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return `BS-${yyyy}${mm}${dd}-${r}`;
        };
        let bookingNumber = generateBookingNumber();
        let bookingNumberAttempts = 0;
        while (bookingNumberAttempts < 5) {
          const existing = await prisma.pujaBooking.findUnique({
            where: { bookingNumber },
            select: { id: true },
          });
          if (!existing) break;
          bookingNumber = generateBookingNumber();
          bookingNumberAttempts++;
        }
        // The loop used to fall through and create with the last COLLIDING
        // number, so a 5-collision run violated the `bookingNumber @unique`
        // constraint inside the transaction and the caller got a raw Prisma
        // message instead of an actionable retry. booking.service throws in the
        // same situation; match it.
        if (bookingNumberAttempts >= 5) {
          throw new Error('Failed to generate a unique booking number. Please try again.');
        }

        // 6. Persist the booking. The PriestPujaOffering FK
        // (migration 20260520020000) replaces the previous JSON marker.
        //
        // S2C-13 (2026-08-10): this create used to run naked on the top-level
        // client with the pandit pinned via `priestId` and NO conflict query of
        // any kind — the only unguarded one of the three priestId-write paths.
        // Two failure modes, both now closed inside one locked transaction:
        //
        //  (i) CROSS-OFFERING collision. A pandit listing two pujas could be
        //      booked for both at the same date+slot: the old capacity count
        //      was scoped to `priestPujaOfferingId`, so every offering kept an
        //      independent counter. Any booking the pandit already holds in
        //      this slot from a DIFFERENT offering is a hard block — one body,
        //      one puja. Same-offering demand stays governed by the pandit's
        //      own maxBookingsPerSlot (one ceremony may legitimately seat
        //      several households), so their configured capacity is unchanged.
        //
        //  (ii) UNCONFIGURED slots. The whole capacity check sat behind
        //      `if (slotTimes.length > 0)`, and availableSlots is nullable and
        //      unset by default — so for most pandits N devotees could book the
        //      same offering at the same instant, unbounded. The count now runs
        //      unconditionally; only the slot-string whitelist above remains
        //      conditional, which is the part that is genuinely back-compat.
        //
        // The lock also closes the TOCTOU: the old count and create were
        // several round-trips apart with no transaction, so concurrent racers
        // both read 0/1 and both inserted.
        const booking = await prisma.$transaction(async (tx) => {
          await lockPriestSlot(
            tx,
            priestSlotKey(offering.priest.id, scheduledDate, body.scheduledTime),
          );

          // One read answers both questions. `take` is capacity + 1 — enough to
          // decide `>= maxBookingsPerSlot`, and enough to surface a
          // cross-offering row whenever the same-offering rows have not already
          // filled the slot (in which case we reject on capacity anyway).
          const held = await tx.pujaBooking.findMany({
            where: {
              priestId: offering.priest.id,
              scheduledDate,
              scheduledTimeSlot: body.scheduledTime,
              // Stale, never-paid holds stop occupying the pandit's calendar —
              // otherwise an attacker books every slot for 30 days, never pays,
              // and that pandit is permanently unbookable at zero cost. See
              // UNPAID_HOLD_MINUTES.
              ...activeSlotHoldWhere(),
            },
            select: { bookingNumber: true, priestPujaOfferingId: true },
            take: offering.maxBookingsPerSlot + 1,
          });

          // Compared in JS rather than via a Prisma `not` filter because
          // priestPujaOfferingId is nullable — temple-path bookings pinned to
          // this pandit carry NULL and must count as a collision.
          const verdict = evaluatePriestSlot({
            held,
            offeringId: offering.id,
            maxBookingsPerSlot: offering.maxBookingsPerSlot,
            scheduledDate: body.scheduledDate,
            scheduledTime: body.scheduledTime,
          });
          if (!verdict.ok) {
            throw new SlotConflictError(verdict.message);
          }

          return tx.pujaBooking.create({
            data: {
              bookingNumber,
              userId,
              templeId: anchorOffering.templeId,
              pujaTypeId: anchorOffering.pujaTypeId,
              templePujaOfferingId: anchorOffering.id,
              priestPujaOfferingId: offering.id,
              priestId: offering.priest.id,
              scheduledDate,
              scheduledTimeSlot: body.scheduledTime,
              devoteeNames: body.devotees as Prisma.InputJsonValue,
              sankalpDetails: body.sankalp ?? null,
              specialInstructions: body.specialInstructions ?? null,
              priceAmount,
              currency,
              platformCommission,
              priestPayout: priestPayoutAmount,
              status: 'pending_payment',
              prasadDeliveryRequested: body.prasadDelivery,
              prasadDeliveryAddressId: prasadAddressId ?? null,
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

        // 7. Create the payment order. Razorpay is the ONLY rail — Stripe was
        // removed 2026-08-10 (PayPal via Razorpay replaces it for international
        // devotees), so there is no second gateway and no currency branch to
        // get wrong.
        //
        // The charged amount is `offering.basePrice` + the Rs 51 platform fee +
        // the Rs 150 prasad-delivery fee when requested, all in INR. There is NO
        // NRI multiplier anywhere on this path.
        //
        // This comment previously read "NRI bookings are priced 9x in INR above
        // and charged here exactly like a domestic booking" — false, and the
        // most dangerous kind of false: it sits directly on the Razorpay call
        // and tells a maintainer a 9x multiplier is already applied upstream.
        // The natural repair when NRI pricing returns is to "restore" it here,
        // which recreates RV-01 — the P0 that billed Rs 1,100 as $9,900. NRI
        // premium pricing returns as a SERVER-QUOTED amount on the PayPal rail,
        // rendered by the client before payment; never as a multiplier applied
        // behind a quote the UI has already shown.
        const order = await paymentService.createRazorpayOrder(booking.id, userId);

        return reply.status(201).send({
          orderId: booking.id,
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          razorpayOrderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          razorpayKeyId: order.razorpayKeyId,
          // Displayed price MUST equal charged price. The pandit-direct checkout
          // page renders `offering.basePrice`, so the fees this path now
          // collects are itemised here for the client to show — the same
          // breakdown apps/web/app/pujas/book/page.tsx already renders on the
          // temple path (base + Rs 51 + Rs 150).
          priceBreakdown: {
            basePriceInr: basePrice.toString(),
            platformFeeInr: platformFee.toString(),
            prasadDeliveryFeeInr: prasadFee.toString(),
            totalInr: priceAmount.toString(),
          },
          booking: {
            id: booking.id,
            bookingNumber: booking.bookingNumber,
            status: booking.status,
            priceAmount: booking.priceAmount.toString(),
            currency: booking.currency,
            scheduledDate: booking.scheduledDate,
            scheduledTimeSlot: booking.scheduledTimeSlot,
            offeringId: offering.id,
            offeringName: offering.name,
            priestId: offering.priest.id,
          },
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation Error',
            details: error.errors,
          });
        }
        // S2C-13: the pandit is already taken for this date+slot, or the slot
        // is at capacity. A conflict, not a malformed request.
        if (error instanceof SlotConflictError) {
          return reply.status(409).send({ error: error.message });
        }
        server.log.error(error, 'Failed to create offering-based booking');
        return reply.status(400).send({
          error: error.message || 'Failed to create offering-based booking',
        });
      }
    },
  );

  // POST /verify-payment - Verify Razorpay signature and confirm booking.
  // Web booking wizard calls this from the Razorpay handler after a
  // successful client-side checkout. Returns {bookingNumber} so the
  // success screen can display BS-YYYYMMDD-XXXXX.
  const verifyPaymentBodySchema = z.object({
    orderId: z.string().uuid(),
    razorpayPaymentId: z.string().min(1),
    razorpayOrderId: z.string().min(1),
    razorpaySignature: z.string().min(1),
  });

  server.post(
    '/verify-payment',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const body = verifyPaymentBodySchema.parse(request.body);
        const result = await paymentService.verifyPayment(
          body.razorpayOrderId,
          body.razorpayPaymentId,
          body.razorpaySignature,
          request.currentUser!.id,
          request.currentUser!.roles,
        );
        return result;
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation Error',
            details: error.errors,
          });
        }
        if (error.message?.includes('invalid signature')) {
          return reply.status(400).send({ error: error.message, verified: false });
        }
        if (error.message?.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        server.log.error(error, 'Failed to verify payment (web shape)');
        return reply.status(400).send({
          error: error.message || 'Failed to verify payment',
          verified: false,
        });
      }
    },
  );

  // POST /:id/review - Submit a review for a completed booking
  server.post(
    '/:id/review',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const { id } = paramsWithId.parse(request.params);
        const body = submitReviewSchema.parse(request.body);
        const userId = request.currentUser!.id;

        const result = await bookingService.submitReview(
          id,
          userId,
          body.rating,
          body.reviewText
        );

        return {
          message: 'Review submitted successfully',
          review: result,
        };
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation Error',
            details: error.errors,
          });
        }
        if (error.message?.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        if (error.message?.includes('not authorized')) {
          return reply.status(403).send({ error: error.message });
        }
        if (error.message?.includes('already been submitted')) {
          return reply.status(409).send({ error: error.message });
        }
        if (error.message?.includes('can only be submitted')) {
          return reply.status(409).send({ error: error.message });
        }
        server.log.error(error, 'Failed to submit review');
        return reply.status(400).send({
          error: error.message || 'Failed to submit review',
        });
      }
    }
  );
}

// Pure decision helpers exposed for unit tests (see bookings.test.ts). The
// route harness in apps/api is pure-function/Zod only — there is no
// Fastify+Prisma integration scaffolding — so the guards are written as pure
// functions and the DB steps they gate are exercised manually / in staging.
export const __testing = {
  checkVideoProofGate,
  checkPriestReassignable,
  checkTransitionRole,
  isPureReassignment,
  // Re-exported from lib/priest-slot.ts, where they moved so
  // dispatch.service.accept can take the SAME lock on the SAME key.
  priestSlotKey,
  lockPriestSlot,
  SlotConflictError,
  updateBookingStatusSchema,
  rescheduleBookingSchema,
  normalizePriestSlots,
  evaluatePriestSlot,
  classifyCreateBookingError,
  resolvePriestShare,
  splitPujaPrice,
  unpaidHoldCutoff,
  activeSlotHoldWhere,
  UNPAID_HOLD_MINUTES,
  VIDEO_PROOF_REQUIRED_STATUSES,
  PRIEST_REASSIGNABLE_STATUSES,
  OWNER_ALLOWED_TRANSITIONS,
  ASSIGNED_PRIEST_ALLOWED_TRANSITIONS,
  parseMyBookingsQuery,
  // CM-06 — the country-aware delivery address contract, shared with the web
  // form via @poojly/shared. Exported so the schema + the persisted row are
  // pinned by tests without booting Fastify.
  deliveryAddressSchema,
  buildPrasadAddressRow,
  // DB-05 — the two money-taking order bodies. Exported so the
  // prasadDelivery/deliveryAddress pairing is pinned without booting Fastify.
  createOrderBodySchema,
  fromOfferingBodySchema,
  // DB-07 — the server-side booking horizon, so a test can assert the bound
  // rather than a magic date.
  MAX_BOOKING_HORIZON_DAYS,
};
