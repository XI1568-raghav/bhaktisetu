import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BookingStatus } from '@prisma/client';
import { bookingService } from '../services/booking.service.js';
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

const submitReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(2000).optional(),
});

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
