import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import { paymentService } from '../services/payment.service.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { checkAndRecord } from '../lib/webhook-idempotency.js';

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

const createOrderSchema = z.object({
  bookingId: z.string().uuid(),
});

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1, 'Razorpay order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay payment ID is required'),
  razorpaySignature: z.string().min(1, 'Razorpay signature is required'),
});

// Store-order verify accepts the same Razorpay handler payload but resolves
// to a StoreOrder rather than a PujaBooking. Schema is identical; kept as a
// separate symbol so future divergence (e.g. UPI intent flow) is local.
const verifyStoreOrderSchema = verifyPaymentSchema;

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
          body.razorpaySignature,
          request.currentUser!.id,
          request.currentUser!.roles
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

  // POST /store-orders/:id/razorpay — create a Razorpay order for a
  // store-order checkout. Owner-gated. Mirrors /create-order.
  server.post(
    '/store-orders/:id/razorpay',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        const { id } = paramsWithId.parse(request.params);
        const userId = request.currentUser!.id;
        const order = await paymentService.createStoreOrderRazorpay(id, userId);
        return reply.status(201).send(order);
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid order id', details: error.errors });
        }
        if (error.message?.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        if (error.message?.includes('not authorized')) {
          return reply.status(403).send({ error: error.message });
        }
        if (error.message?.includes('PENDING')) {
          return reply.status(409).send({ error: error.message });
        }
        server.log.error(error, 'Failed to create store-order payment');
        return reply.status(400).send({
          error: error.message || 'Failed to create store-order payment',
        });
      }
    },
  );

  // POST /store-orders/:id/verify — verify Razorpay signature for a
  // store-order checkout, mark Payment captured + flip StoreOrder
  // PENDING→CONFIRMED. Owner-gated; the :id is for routing/clarity only —
  // ownership check is done against the resolved StoreOrder inside the
  // service so a forged id can't confirm someone else's order.
  server.post(
    '/store-orders/:id/verify',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      try {
        paramsWithId.parse(request.params);
        const body = verifyStoreOrderSchema.parse(request.body);
        const userId = request.currentUser!.id;
        const result = await paymentService.verifyStoreOrderPayment(
          body.razorpayOrderId,
          body.razorpayPaymentId,
          body.razorpaySignature,
          userId,
        );
        return result;
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Validation Error', details: error.errors });
        }
        if (error.message?.includes('invalid signature')) {
          return reply.status(400).send({ error: error.message, verified: false });
        }
        if (error.message?.includes('not authorized')) {
          return reply.status(403).send({ error: error.message });
        }
        if (error.message?.includes('not found')) {
          return reply.status(404).send({ error: error.message });
        }
        server.log.error(error, 'Failed to verify store-order payment');
        return reply.status(400).send({
          error: error.message || 'Failed to verify store-order payment',
          verified: false,
        });
      }
    },
  );

  // GET /config - Publishable Razorpay key for the client checkout modal.
  // Returns ONLY the KEY_ID (public, safe to expose — Razorpay's checkout.js
  // requires it in the browser). The KEY_SECRET is never sent. Lets the web
  // client read the same key the API uses (single source of truth) instead of
  // a separately-baked NEXT_PUBLIC_RAZORPAY_KEY_ID build arg that can drift.
  server.get('/config', async (_request, reply) => {
    return reply.send({
      keyId: process.env.RAZORPAY_KEY_ID || null,
      isDemo: !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_demo',
    });
  });

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

        // Idempotency (TD16): Razorpay retries 2-3x on slow ack. Header
        // `x-razorpay-event-id` is the canonical id when present; for older
        // payloads we fall back to a SHA-256 over the rawBody (or stringified
        // payload). Failure of the lookup must NEVER drop the event — better
        // to double-process than miss.
        const headerEventId = (request.headers['x-razorpay-event-id'] as string | undefined) ?? '';
        const fallbackId = crypto
          .createHash('sha256')
          .update(rawBody ?? JSON.stringify(payload ?? {}))
          .digest('hex');
        const eventId = headerEventId || fallbackId;
        try {
          const dedupe = await checkAndRecord('razorpay', eventId);
          if (dedupe.alreadyProcessed) {
            server.log.info({ eventId }, 'Razorpay webhook duplicate — skipping');
            return reply.status(200).send({ handled: true, duplicate: true });
          }
        } catch (idemErr) {
          server.log.warn({ err: idemErr }, 'Razorpay idempotency check failed — falling through');
        }

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

        // Idempotency (TD16): Stripe gives event.id natively (evt_*). We
        // parse rawBody for the id before signature verification — using the
        // id as a cache key is safe even if forged because a hit just makes
        // us skip processing, which is the correct response to a forgery too.
        // If parsing fails, fall through; signature check below will still
        // reject invalid bodies.
        try {
          const parsed = JSON.parse(rawBody) as { id?: unknown };
          const stripeEventId = typeof parsed.id === 'string' ? parsed.id : '';
          if (stripeEventId) {
            const dedupe = await checkAndRecord('stripe', stripeEventId);
            if (dedupe.alreadyProcessed) {
              server.log.info({ eventId: stripeEventId }, 'Stripe webhook duplicate — skipping');
              return reply.status(200).send({ handled: true, duplicate: true });
            }
          }
        } catch (idemErr) {
          server.log.warn({ err: idemErr }, 'Stripe idempotency check failed — falling through');
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
  //
  // RV-12 (2026-08-10): this route took NO body, so it could only ever request a
  // 100% refund — `paymentService.processRefund` grew an options bag for partial
  // amounts and the cancellation ladder, but nothing reached it. Two consequences,
  // both fixed here:
  //   1. the headline defect — an admin could not issue a partial refund at all;
  //   2. a regression introduced with the options bag — with no opts the service
  //      falls through to its ladder branch, which (correctly) refuses to guess on
  //      a booking that was never cancelled, so every dispute/goodwill refund
  //      started throwing instead of paying.
  // The body is optional so existing callers keep working: no body on a cancelled
  // booking still means "apply the snapshotted ladder", which is the intended
  // default. `amountInr` and `fullRefund` are mutually exclusive — accepting both
  // would leave the precedence rule (amount wins) as a silent trap.
  const refundBodySchema = z
    .object({
      amountInr: z.number().positive().finite().optional(),
      fullRefund: z.boolean().optional(),
      reason: z.string().max(500).optional(),
    })
    .strict()
    .refine((b) => !(b.amountInr !== undefined && b.fullRefund), {
      message: 'Pass either amountInr or fullRefund, not both.',
    });

  server.post(
    '/:id/refund',
    { preHandler: [authenticateUser, requireRole('admin')] },
    async (request, reply) => {
      try {
        const { id } = paramsWithId.parse(request.params);
        const adminId = request.currentUser!.id;
        // Body is optional — an empty POST keeps the pre-existing behaviour.
        const body = refundBodySchema.parse(request.body ?? {});

        const result = await paymentService.processRefund(id, adminId, {
          ...(body.amountInr !== undefined ? { amountInr: body.amountInr } : {}),
          ...(body.fullRefund ? { fullRefund: true } : {}),
          ...(body.reason ? { reason: body.reason } : {}),
        });

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
