import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BookingStatus, Prisma } from '@prisma/client';
import { bookingService } from '../services/booking.service.js';
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
        const booking = await prisma.pujaBooking.findUnique({
          where: { id },
          select: {
            userId: true,
            priestId: true,
            status: true,
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

  // POST /create-stripe-order - NRI / USD checkout via Stripe.
  //
  // Mirror of /create-order but bills in USD using PujaType.nriPrice. The
  // server picks gateway based on the request body's `currency` field —
  // 'INR' (default, omitted) → Razorpay; 'USD' → Stripe. Web booking
  // page flips this when the user toggles "Pay in USD" or when their
  // session profile flag isNri is set.
  const createStripeOrderBodySchema = createOrderBodySchema.extend({
    currency: z.literal('USD').optional(),
  });

  server.post(
    '/create-stripe-order',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const body = createStripeOrderBodySchema.parse(request.body);
        const userId = request.currentUser!.id;

        // Resolve puja + offering as in /create-order.
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

        let prasadAddressId: string | undefined;
        if (body.prasadDelivery && body.deliveryAddress) {
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

        const order = await paymentService.createStripeOrder(booking.id, userId);

        return reply.status(201).send({
          orderId: booking.id,
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          stripePaymentIntentId: order.paymentIntentId,
          clientSecret: order.clientSecret,
          amount: order.amount,
          currency: order.currency,
          stripePublishableKey: order.publishableKey,
          demo: order.demo,
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation Error',
            details: error.errors,
          });
        }
        server.log.error(error, 'Failed to create Stripe NRI booking order');
        return reply.status(400).send({
          error: error.message || 'Failed to create Stripe booking order',
        });
      }
    },
  );

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
  // Slot capacity: if offering.availableSlots is set, the scheduledTime
  // must match one of the slots and that slot must not exceed
  // offering.maxBookingsPerSlot for the requested date.
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
  const NRI_USD_MULTIPLIER = 9;

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

        // 3. Resolve pricing. Business rule #2: NRI pay 9-10× domestic.
        // The booking row's priceAmount/currency reflects the actual amount
        // we will bill (INR via Razorpay or USD via Stripe). The commission
        // ledger ratios (30/70) stay the same regardless of currency since
        // the priest payout is settled in the same currency the devotee
        // paid in (handled downstream).
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { isNri: true },
        });
        if (!user) {
          return reply.status(404).send({ error: 'User not found.' });
        }
        const wantsUsd = body.currency === 'USD' || (!body.currency && user.isNri);
        const basePrice = new Prisma.Decimal(offering.basePrice.toString());
        // basePrice * 9 for NRI USD. Decimal arithmetic so we never lose
        // precision; .toDecimalPlaces(2) trims any fractional rounding.
        const usdAmount = wantsUsd
          ? basePrice.mul(new Prisma.Decimal(NRI_USD_MULTIPLIER)).toDecimalPlaces(2)
          : null;
        const priceAmount = wantsUsd ? usdAmount! : basePrice;
        const currency = wantsUsd ? 'USD' : 'INR';
        const platformCommission = priceAmount.mul(new Prisma.Decimal('0.30'));
        const priestPayoutAmount = priceAmount.mul(new Prisma.Decimal('0.70'));

        // 3b. Slot capacity enforcement. Skip when the priest hasn't
        // configured availableSlots — back-compat with offerings created
        // before the slot-capacity migration. When configured, the
        // scheduledTime must match a defined slot, and that slot's booking
        // count for the day must be below maxBookingsPerSlot.
        const rawSlots = offering.availableSlots as unknown;
        const slotTimes: string[] = Array.isArray(rawSlots)
          ? (rawSlots as unknown[]).map((s) =>
              typeof s === 'string' ? s : ((s as { time?: string })?.time ?? ''),
            ).filter((t) => t.length > 0)
          : [];
        if (slotTimes.length > 0) {
          if (!slotTimes.includes(body.scheduledTime)) {
            return reply.status(409).send({
              error: `Slot ${body.scheduledTime} is not offered. Available slots: ${slotTimes.join(', ')}.`,
            });
          }
          const slotBooked = await prisma.pujaBooking.count({
            where: {
              priestPujaOfferingId: offering.id,
              scheduledDate: new Date(body.scheduledDate),
              scheduledTimeSlot: body.scheduledTime,
              status: { notIn: ['cancelled', 'refunded'] },
            },
          });
          if (slotBooked >= offering.maxBookingsPerSlot) {
            return reply.status(409).send({
              error: `Slot ${body.scheduledTime} is fully booked (${slotBooked}/${offering.maxBookingsPerSlot}).`,
            });
          }
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
        const booking = await prisma.pujaBooking.create({
          data: {
            bookingNumber,
            userId,
            templeId: anchorOffering.templeId,
            pujaTypeId: anchorOffering.pujaTypeId,
            templePujaOfferingId: anchorOffering.id,
            priestPujaOfferingId: offering.id,
            priestId: offering.priest.id,
            scheduledDate: new Date(body.scheduledDate),
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

        // 7. Create the payment order. USD → Stripe; INR → Razorpay.
        // createStripeOrder normally reads PujaType.nriPrice; we pass an
        // explicit USD override so it bills basePrice * 9 instead of the
        // anchor temple-puja's nriPrice.
        if (wantsUsd) {
          const stripe = await paymentService.createStripeOrder(
            booking.id,
            userId,
            { usdAmountOverride: Number(usdAmount) },
          );
          return reply.status(201).send({
            orderId: booking.id,
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            stripePaymentIntentId: stripe.paymentIntentId,
            clientSecret: stripe.clientSecret,
            amount: stripe.amount,
            currency: stripe.currency,
            stripePublishableKey: stripe.publishableKey,
            demo: stripe.demo,
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
        }

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
