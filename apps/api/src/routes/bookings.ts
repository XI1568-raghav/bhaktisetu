import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BookingStatus, Prisma } from '@prisma/client';
import { bookingService } from '../services/booking.service.js';
import { cancellationService } from '../services/cancellation.service.js';
import { paymentService } from '../services/payment.service.js';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

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
const VIDEO_PROOF_FIELDS = z.object({
  videoProofUrl: z.string().url().max(2000).optional(),
  videoUploadedAt: z.string().datetime().optional(),
}).strict();

// No user-mutable fields for these transitions — strict empty object rejects
// any client-supplied data keys (replaces the old wide-open z.record(z.any())).
const EMPTY_DATA = z.object({}).strict();

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
  z.object({ status: z.literal('cancelled'), priestId: z.string().uuid().optional(), data: z.object({ cancelReason: z.string().max(500).optional() }).optional() }),
  z.object({ status: z.literal('refunded'), priestId: z.string().uuid().optional(), data: z.object({ refundReason: z.string().max(500).optional() }).optional() }),
]);

const updateBookingStatusSchema = updateBookingStatusDataSchema;

const rescheduleBookingSchema = z.object({
  newDate: z.coerce.date(),
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
 */
type BookingTx = Prisma.TransactionClient;

function priestSlotKey(priestId: string, scheduledDate: Date, slot: string): string {
  return `puja-priest-slot:${priestId}:${scheduledDate.toISOString().slice(0, 10)}:${slot}`;
}

async function lockPriestSlot(tx: BookingTx, key: string): Promise<void> {
  try {
    await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', key);
  } catch (err) {
    console.warn('[bookings.route] priest slot advisory lock unavailable:', err);
  }
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
        server.log.error(error, 'Failed to create booking');
        return reply.status(400).send({
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
        const { status, dateFrom, dateTo, page, limit } = request.query as {
          status?: string;
          dateFrom?: string;
          dateTo?: string;
          page?: string;
          limit?: string;
        };

        const result = await bookingService.getUserBookings(userId, {
          status: status as BookingStatus | undefined,
          dateFrom,
          dateTo,
          page: Number(page) || 1,
          limit: Math.min(Number(limit) || 20, 100),
        });

        return result;
      } catch (error: any) {
        server.log.error(error, 'Failed to fetch user bookings');
        return reply.status(500).send({
          error: error.message || 'Failed to fetch bookings',
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
        return reply.status(500).send({
          error: error.message || 'Failed to check availability',
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
          await prisma.$transaction(async (tx) => {
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
                status: { notIn: ['cancelled', 'refunded'] },
                id: { not: id },
              },
              select: { bookingNumber: true },
            });
            if (conflict) {
              throw new SlotConflictError(
                `That pandit already has booking ${conflict.bookingNumber} at this date and time slot.`,
              );
            }
            await tx.pujaBooking.update({
              where: { id },
              data: { priestId: newPriestId },
            });
          });
        }

        const updated = await bookingService.updateBookingStatus(
          id,
          body.status as BookingStatus,
          body.data as Record<string, any> | undefined,
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
          body.newDate,
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
  // status='cancelled' + cancellationReason='[refund-requested] <reason>'
  // and let processAutoRefunds (master-cron) pick it up after 1h.
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

        // Cancellation must be >24h before scheduled time.
        const slotHour = Number((booking.scheduledTimeSlot ?? '00:00').split(':')[0] ?? 0);
        const slotMin = Number((booking.scheduledTimeSlot ?? '00:00').split(':')[1] ?? 0);
        const scheduledAt = new Date(booking.scheduledDate);
        scheduledAt.setHours(slotHour, slotMin, 0, 0);
        const cutoff = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);
        if (Date.now() >= cutoff.getTime()) {
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
            cancellationReason: `[refund-requested] ${reason}`.slice(0, 500),
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
          status: { notIn: ['cancelled', 'refunded'] },
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

  // POST /create-order - Used by the web booking wizard
  // (apps/web/app/pujas/[slug]/book/page.tsx). Combines the existing
  // createBooking + paymentService.createRazorpayOrder steps so the client
  // makes ONE round-trip to launch checkout. Body shape mirrors the web
  // form rather than the legacy POST /book schema.
  const createOrderBodySchema = z.object({
    pujaSlug: z.string().min(1),
    templeOfferingId: z.string().uuid(),
    // Past-date guard mirrors createBookingSchema. Without it, the web
    // wizard / Stripe NRI path would happily create a Razorpay order for
    // yesterday's puja, which the booking service never validates again
    // — payment captures, ledger writes, then ops gets a confused devotee.
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
        { message: 'Cannot book a past date.' },
      ),
    scheduledTime: z.string().min(1),
    devotees: z
      .array(
        z.object({
          name: z.string().min(1),
          gotra: z.string().optional(),
          nakshatra: z.string().optional(),
        }),
      )
      .min(1)
      .max(5),
    sankalp: z.string().optional(),
    specialInstructions: z.string().optional(),
    prasadDelivery: z.boolean().optional().default(false),
    deliveryAddress: z
      .object({
        fullName: z.string().min(1),
        line1: z.string().min(1),
        line2: z.string().optional(),
        city: z.string().min(1),
        state: z.string().min(1),
        pincode: z.string().regex(/^\d{6}$/),
        phone: z.string().regex(/^[6-9]\d{9}$/),
      })
      .optional(),
  });

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

        // 2. Optional: persist a delivery address if prasad requested.
        let prasadAddressId: string | undefined;
        if (body.prasadDelivery && body.deliveryAddress) {
          // UserAddress has no dedicated recipient/phone columns. We pack
          // them into `label` so the priest can still reach the devotee
          // when the prasad is dispatched. Schema cleanup is tracked but
          // this row keeps the data round-trippable.
          const addr = await prisma.userAddress.create({
            data: {
              userId,
              label: `${body.deliveryAddress.fullName} (+91-${body.deliveryAddress.phone})`,
              line1: body.deliveryAddress.line1,
              line2: body.deliveryAddress.line2 ?? null,
              city: body.deliveryAddress.city,
              state: body.deliveryAddress.state,
              pincode: body.deliveryAddress.pincode,
            },
            select: { id: true },
          }).catch(() => null);
          prasadAddressId = addr?.id;
        }

        // 3. Create the booking (status pending_payment).
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
          prasadDeliveryRequested: body.prasadDelivery,
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
        server.log.error(error, 'Failed to create booking order (web shape)');
        return reply.status(400).send({
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
  // NRI flow (rule #2): if user.isNri is true (or country override sent),
  // bill in USD via Stripe at basePrice * 9. Otherwise INR via Razorpay.
  //
  // Slot capacity (S2C-13, corrected 2026-08-10): if offering.availableSlots
  // is set, the scheduledTime must match one of the slots. INDEPENDENTLY of
  // that — availableSlots is nullable and unset by default — the pandit must
  // be free at (date, slot) and the offering must be under
  // maxBookingsPerSlot; both are re-checked under an advisory lock inside the
  // create transaction. See the block at step 6.
  const fromOfferingBodySchema = z.object({
    offeringId: z.string().uuid(),
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
        { message: 'Cannot book a past date.' },
      ),
    scheduledTime: z.string().min(1),
    devotees: z
      .array(
        z.object({
          name: z.string().min(1),
          gotra: z.string().optional(),
          nakshatra: z.string().optional(),
        }),
      )
      .min(1)
      .max(5),
    sankalp: z.string().optional(),
    specialInstructions: z.string().optional(),
    prasadDelivery: z.boolean().optional().default(false),
    // Force the NRI/USD path even when user.isNri is false. Lets the web
    // booking page expose a "Pay in USD" toggle for travellers without
    // flipping the persistent profile flag.
    currency: z.enum(['INR', 'USD']).optional(),
    deliveryAddress: z
      .object({
        fullName: z.string().min(1),
        line1: z.string().min(1),
        line2: z.string().optional(),
        city: z.string().min(1),
        state: z.string().min(1),
        pincode: z.string().regex(/^\d{6}$/),
        phone: z.string().regex(/^[6-9]\d{9}$/),
      })
      .optional(),
  });
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
        const basePrice = new Prisma.Decimal(offering.basePrice.toString());
        const priceAmount = basePrice;
        const currency = 'INR';
        // Honour the pandit's own commissionRate (their share); default 80/20
        // (booking revamp take-rate cut — see booking.service DEFAULT_PRIEST_SHARE).
        const share =
          offering.priest.commissionRate > 0 && offering.priest.commissionRate <= 1
            ? offering.priest.commissionRate
            : 0.8;
        const priestPayoutAmount = priceAmount.mul(new Prisma.Decimal(share.toString()));
        const platformCommission = priceAmount.mul(new Prisma.Decimal((1 - share).toString()));

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

        // 4. Optional prasad delivery address (mirrors /create-order).
        let prasadAddressId: string | undefined;
        if (body.prasadDelivery && body.deliveryAddress) {
          const addr = await prisma.userAddress
            .create({
              data: {
                userId,
                label: `${body.deliveryAddress.fullName} (+91-${body.deliveryAddress.phone})`,
                line1: body.deliveryAddress.line1,
                line2: body.deliveryAddress.line2 ?? null,
                city: body.deliveryAddress.city,
                state: body.deliveryAddress.state,
                pincode: body.deliveryAddress.pincode,
              },
              select: { id: true },
            })
            .catch(() => null);
          prasadAddressId = addr?.id;
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
        for (let i = 0; i < 5; i++) {
          const existing = await prisma.pujaBooking.findUnique({
            where: { bookingNumber },
            select: { id: true },
          });
          if (!existing) break;
          bookingNumber = generateBookingNumber();
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
              status: { notIn: ['cancelled', 'refunded'] },
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
        // devotees). NRI bookings are priced 9x in INR above and charged here
        // exactly like a domestic booking, so there is no second gateway and no
        // currency branch to get wrong.
        const order = await paymentService.createRazorpayOrder(booking.id, userId);

        return reply.status(201).send({
          orderId: booking.id,
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          razorpayOrderId: order.orderId,
          amount: order.amount,
          currency: order.currency,
          razorpayKeyId: order.razorpayKeyId,
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
  priestSlotKey,
  SlotConflictError,
  updateBookingStatusSchema,
  normalizePriestSlots,
  evaluatePriestSlot,
  VIDEO_PROOF_REQUIRED_STATUSES,
  PRIEST_REASSIGNABLE_STATUSES,
};
