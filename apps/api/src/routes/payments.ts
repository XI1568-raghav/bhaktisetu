import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { paymentService } from '../services/payment.service.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

const createOrderSchema = z.object({
  bookingId: z.string().uuid(),
});

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1, 'Razorpay order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay payment ID is required'),
  razorpaySignature: z.string().min(1, 'Razorpay signature is required'),
});

const paramsWithId = z.object({
  id: z.string().uuid(),
});

// ─── Routes ─────────────────────────────────────────────────────────────────────

export async function paymentRoutes(server: FastifyInstance) {
  // POST /create-order - Create a Razorpay order for a booking
  server.post(
    '/create-order',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const body = createOrderSchema.parse(request.body);
        const userId = request.currentUser!.id;

        const order = await paymentService.createRazorpayOrder(
          body.bookingId,
          userId
        );

        return reply.status(201).send(order);
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
        server.log.error(error, 'Failed to create payment order');
        return reply.status(400).send({
          error: error.message || 'Failed to create payment order',
        });
      }
    }
  );

  // POST /verify - Verify Razorpay payment signature
  server.post(
    '/verify',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const body = verifyPaymentSchema.parse(request.body);

        const result = await paymentService.verifyPayment(
          body.razorpayOrderId,
          body.razorpayPaymentId,
          body.razorpaySignature
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
          return reply.status(400).send({
            error: error.message,
            verified: false,
          });
        }
        if (error.message?.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        server.log.error(error, 'Failed to verify payment');
        return reply.status(400).send({
          error: error.message || 'Failed to verify payment',
          verified: false,
        });
      }
    }
  );

  // POST /webhook - Razorpay webhook handler (no auth — uses webhook signature)
  server.post(
    '/webhook',
    { config: { rawBody: true } },
    async (request, reply) => {
      try {
        const signature = request.headers['x-razorpay-signature'] as string;

        if (!signature) {
          return reply.status(400).send({
            error: 'Missing x-razorpay-signature header.',
          });
        }

        const payload = request.body as Record<string, any>;

        const result = await paymentService.handleWebhook(payload, signature);

        return reply.status(200).send(result);
      } catch (error: any) {
        if (error.message?.includes('signature verification failed')) {
          server.log.warn('Webhook signature verification failed');
          return reply.status(400).send({
            error: 'Webhook signature verification failed.',
          });
        }
        server.log.error(error, 'Failed to process webhook');
        // Always return 200 to Razorpay to prevent retries for server errors
        // that aren't signature-related
        return reply.status(200).send({
          handled: false,
          error: 'Internal processing error',
        });
      }
    }
  );

  // GET /:id - Get payment details for a booking
  server.get(
    '/:id',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const { id } = paramsWithId.parse(request.params);

        const payments = await paymentService.getPaymentByBookingId(id);

        if (!payments) {
          return reply.status(404).send({
            error: 'No payments found for this booking.',
          });
        }

        return { payments };
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Invalid booking ID format.',
          });
        }
        server.log.error(error, 'Failed to fetch payment');
        return reply.status(500).send({
          error: 'Failed to fetch payment details',
        });
      }
    }
  );

  // POST /:id/refund - Process refund for a booking (admin only)
  server.post(
    '/:id/refund',
    { preHandler: [authenticateUser, requireRole('admin')] },
    async (request, reply) => {
      try {
        const { id } = paramsWithId.parse(request.params);
        const adminId = request.currentUser!.id;

        const result = await paymentService.processRefund(id, adminId);

        return {
          message: 'Refund processed successfully',
          ...result,
        };
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Invalid booking ID format.',
          });
        }
        if (error.message?.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        if (error.message?.includes('No captured payment')) {
          return reply.status(409).send({ error: error.message });
        }
        server.log.error(error, 'Failed to process refund');
        return reply.status(400).send({
          error: error.message || 'Failed to process refund',
        });
      }
    }
  );
}
