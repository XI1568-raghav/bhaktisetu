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

  // POST /webhook - Razorpay webhook handler (no auth — uses webhook signature).
  //
  // Two verification modes coexist behind RAZORPAY_VERIFY_RAW:
  //   - false (default): legacy JSON.stringify(body) compare. What we've
  //     shipped to date. Works because Razorpay's compact JSON tends to
  //     round-trip through Node, but it is *not* a real HMAC over the
  //     bytes Razorpay signed.
  //   - true: HMAC over request.rawBody, which is what Razorpay actually
  //     signed. This is the correct path. Stays opt-in so we can verify
  //     end-to-end against a Razorpay test-mode webhook before flipping
  //     prod. Procedure: see docs/security-pass-2026-04-27.md task #143.
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

        // Raw-body HMAC is the correct verification path per Razorpay
        // docs (HMAC over the bytes Razorpay sent, not over our JSON
        // re-stringification). Defaults to ON. Set RAZORPAY_VERIFY_RAW=false
        // to fall back to the legacy JSON.stringify path while
        // troubleshooting a specific webhook outage.
        const useRaw = process.env.RAZORPAY_VERIFY_RAW !== 'false';
        const rawBody = (request as unknown as { rawBody?: string }).rawBody;

        const payload = request.body as Record<string, any>;

        if (useRaw) {
          if (!rawBody) {
            server.log.error('RAZORPAY_VERIFY_RAW (default true) requires fastify-raw-body — rawBody missing for this route');
            return reply.status(500).send({ error: 'Webhook configuration error' });
          }
          const result = await paymentService.handleWebhookRaw(rawBody, payload, signature);
          return reply.status(200).send(result);
        }

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

  // POST /webhook/stripe - Stripe webhook handler (no auth — uses
  // stripe-signature header verified via STRIPE_WEBHOOK_SECRET).
  //
  // Always verifies HMAC over the raw bytes Stripe sent (Stripe SDK's
  // constructEvent does this internally with timing-safe compare). We
  // never accept a re-serialised JSON path because Stripe's signing
  // payload is byte-exact.
  server.post(
    '/webhook/stripe',
    { config: { rawBody: true } },
    async (request, reply) => {
      try {
        const signature = request.headers['stripe-signature'] as string | undefined;
        if (!signature) {
          return reply.status(400).send({
            error: 'Missing stripe-signature header.',
          });
        }
        const rawBody = (request as unknown as { rawBody?: string }).rawBody;
        if (!rawBody) {
          server.log.error('Stripe webhook requires fastify-raw-body — rawBody missing for this route');
          return reply.status(500).send({ error: 'Webhook configuration error' });
        }
        const result = await paymentService.handleStripeWebhook(rawBody, signature);
        return reply.status(200).send(result);
      } catch (error: any) {
        if (error.message?.includes('signature verification failed')) {
          server.log.warn('Stripe webhook signature verification failed');
          return reply.status(400).send({
            error: 'Webhook signature verification failed.',
          });
        }
        server.log.error(error, 'Failed to process Stripe webhook');
        // Return 200 so Stripe doesn't retry-storm us on internal errors
        // unrelated to signature validity. Mirrors Razorpay handler.
        return reply.status(200).send({
          handled: false,
          error: 'Internal processing error',
        });
      }
    },
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
