import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BookingStatus } from '@prisma/client';
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
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
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

const updateBookingStatusSchema = z.object({
  status: z.enum([
    'pending_payment',
    'confirmed',
    'priest_assigned',
    'in_progress',
    'completed',
    'video_uploaded',
    'delivered',
    'cancelled',
    'refunded',
  ]),
  priestId: z.string().uuid().optional(),
  data: z.record(z.any()).optional(),
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
  server.patch(
    '/:id',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const { id } = paramsWithId.parse(request.params);
        const body = updateBookingStatusSchema.parse(request.body);

        const updated = await bookingService.updateBookingStatus(
          id,
          body.status,
          body.data
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
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
