import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import { authenticateUser } from '../middlewares/auth.js';
import { subscriptionService } from '../services/subscription.service.js';

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

const subscribeSchema = z.object({
  planId: z.string().min(1, 'planId is required'),
  role: z.enum([
    'PANDIT', 'STORE_OWNER', 'ASTROLOGER',
    'WELLNESS_INSTRUCTOR', 'GAUSHALA_MANAGER', 'TEMPLE_MANAGER',
  ]),
  paymentMethodId: z.string().optional(),
});

// ─── Routes ─────────────────────────────────────────────────────────────────────

export async function subscriptionRoutes(server: FastifyInstance) {

  // ─── GET /plans — List available subscription plans ─────────────────────────

  server.get('/plans', async (request, reply) => {
    const { role } = request.query as { role?: string };
    const plans = subscriptionService.getPlans(role);
    return { plans };
  });

  // ─── POST /subscribe — Create subscription ─────────────────────────────────

  server.post('/subscribe', { preHandler: [authenticateUser] }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }

    const userId = request.currentUser!.id;

    try {
      const subscription = await subscriptionService.subscribe(userId, parsed.data.planId, parsed.data.role);
      return { message: 'Subscription created', subscription };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create subscription';
      return reply.code(400).send({ error: message });
    }
  });

  // ─── GET /my — Get current subscription ─────────────────────────────────────

  server.get('/my', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const subscription = await subscriptionService.getMySubscription(userId);

    if (!subscription) {
      return { subscription: null, message: 'No active subscription' };
    }

    return { subscription };
  });

  // ─── POST /cancel — Cancel subscription ─────────────────────────────────────

  server.post('/cancel', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const result = await subscriptionService.cancel(userId);

    if (!result.cancelled) {
      return reply.code(404).send({ error: result.message });
    }

    return result;
  });

  // ─── POST /webhook — Subscription webhook from Razorpay ─────────────────────
  // Mirrors apps/api/src/routes/payments.ts: HMAC over the literal request
  // bytes (rawBody), timing-safe compare, fail closed if secret missing.
  // Downstream subscription-event handling is still a stub — what this route
  // guarantees today is that no unsigned/forged event is ever acknowledged.

  server.post(
    '/webhook',
    { config: { rawBody: true } },
    async (request, reply) => {
      const signature = request.headers['x-razorpay-signature'] as string | undefined;
      if (!signature) {
        return reply.code(400).send({ error: 'Missing x-razorpay-signature header.' });
      }

      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!webhookSecret) {
        server.log.error('RAZORPAY_WEBHOOK_SECRET not configured — refusing to accept webhook');
        return reply.code(500).send({ error: 'Webhook configuration error' });
      }

      const rawBody = (request as unknown as { rawBody?: string }).rawBody;
      if (!rawBody) {
        server.log.error('rawBody missing on /subscriptions/webhook — fastify-raw-body misconfigured');
        return reply.code(500).send({ error: 'Webhook configuration error' });
      }

      const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      const a = Buffer.from(expected, 'utf8');
      const b = Buffer.from(signature, 'utf8');
      const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
      if (!ok) {
        server.log.warn('Subscription webhook signature mismatch');
        return reply.code(400).send({ error: 'Webhook signature verification failed.' });
      }

      const payload = request.body as Record<string, unknown>;
      const event = typeof payload.event === 'string' ? payload.event : 'unknown';
      server.log.info({ event }, 'Subscription webhook verified');
      // Downstream event dispatch is intentionally deferred until subscription
      // state is wired to the DB. Today: ack the verified event and move on.
      return { received: true, event };
    }
  );
}
