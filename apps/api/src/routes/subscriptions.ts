import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import { authenticateUser } from '../middlewares/auth.js';
import { subscriptionService, PaymentRequiredError } from '../services/subscription.service.js';
import { checkAndRecord } from '../lib/webhook-idempotency.js';

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

const subscribeSchema = z.object({
  planId: z.string().min(1, 'planId is required'),
  role: z.enum([
    'PANDIT', 'STORE_OWNER', 'ASTROLOGER',
    'WELLNESS_INSTRUCTOR', 'GAUSHALA_MANAGER', 'TEMPLE_MANAGER',
    // DEVOTEE is included so the AI-astrologer paywall (M3) can target the
    // devotee subscribing to astro_session / astro_monthly without piggy-
    // backing on a marketplace role.
    'DEVOTEE',
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
      // PM-04 (prod sweep 2026-08-12): this endpoint granted a priced plan for
      // ₹0 — no Razorpay order, no signature check, no paid gate — and wrote a
      // COMPLETED Transaction for the price that admin revenue reporting then
      // counted as earned. The service now refuses a priced plan outright;
      // answer 402 so the caller fails loudly and is pointed at the rail that
      // can actually take the money, instead of a generic 400 that reads like
      // a validation slip.
      if (err instanceof PaymentRequiredError) {
        return reply.code(402).send({ error: message, code: err.code, payWith: '/api/v1/subscriptions/create' });
      }
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

      // Idempotency (TD16): Razorpay retries the same event 2-3x. Use the
      // header-supplied id when present; otherwise hash the rawBody. On any
      // DB error, fall through — better to double-process than miss.
      const headerEventId = (request.headers['x-razorpay-event-id'] as string | undefined) ?? '';
      const fallbackId = crypto.createHash('sha256').update(rawBody).digest('hex');
      const eventId = headerEventId || fallbackId;
      try {
        const dedupe = await checkAndRecord('razorpay', eventId);
        if (dedupe.alreadyProcessed) {
          server.log.info({ event, eventId }, 'Subscription webhook duplicate — skipping');
          return { received: true, event, duplicate: true };
        }
      } catch (idemErr) {
        server.log.warn({ err: idemErr }, 'Subscription idempotency check failed — falling through');
      }

      server.log.info({ event }, 'Subscription webhook verified');

      if (event.startsWith('subscription.')) {
        try {
          const r = await subscriptionService.handleSubscriptionEvent(event, payload);
          return { received: true, event, handled: r.handled, reason: r.reason };
        } catch (err) {
          server.log.error({ err, event }, 'Subscription event handler threw');
          return { received: true, event, handled: false, reason: 'handler error' };
        }
      }

      return { received: true, event };
    }
  );

  // ─── POST /create — Create auto-renewing Razorpay subscription ─────────────

  const createSchema = z.object({
    planId: z.string().min(1),
    role: z.enum([
      'PANDIT', 'STORE_OWNER', 'ASTROLOGER',
      'WELLNESS_INSTRUCTOR', 'GAUSHALA_MANAGER', 'TEMPLE_MANAGER', 'DEVOTEE',
    ]),
  });

  server.post('/create', { preHandler: [authenticateUser] }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: parsed.error.flatten() });
    }
    const userId = request.currentUser!.id;
    try {
      const result = await subscriptionService.createRazorpaySubscription({
        userId,
        planId: parsed.data.planId,
        role: parsed.data.role,
      });
      return { subscription: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create subscription';
      return reply.code(400).send({ error: message });
    }
  });

  // POST /create-stripe-annual — REMOVED 2026-08-11 with the Stripe rail
  // (owner directive). It was the NRI annual plan billed in USD via Stripe
  // Checkout. Razorpay is the only gateway and INR the only currency; the
  // Razorpay annual path above (`POST /create-order`) is the sole subscription
  // rail until PayPal-via-Razorpay lands for international buyers.

  // ─── GET /is-premium — Premium gate check (AR) ─────────────────────────────

  server.get('/is-premium', { preHandler: [authenticateUser] }, async (request) => {
    const userId = request.currentUser!.id;
    const isPremium = await subscriptionService.isPremium(userId);
    return { isPremium };
  });

  // ─── GET /entitlements — server truth for what the holder may receive ──────
  //
  // TC-04. `/is-premium` answers a boolean, which every consumer then has to
  // reinterpret into "so does that mean no ads, or no surcharge, or both?" —
  // and the one web consumer that shipped
  // (apps/web/components/useIsPremium.ts) skipped the server entirely and
  // tested a client-side tier string against a hardcoded set the NRI Premium
  // tier is never written into. This endpoint answers by CAPABILITY, and it
  // lists only capabilities that something actually enforces, so a consumer
  // can never conclude that an unenforced benefit is live.

  server.get('/entitlements', { preHandler: [authenticateUser] }, async (request) => {
    const userId = request.currentUser!.id;
    return subscriptionService.getEntitlements(userId);
  });

  // ─── POST /cancel-auto-renew — Cancel future renewals ──────────────────────

  server.post('/cancel-auto-renew', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    try {
      const r = await subscriptionService.cancelRazorpaySubscription(userId);
      if (!r.cancelled) return reply.code(404).send({ error: r.message });
      return r;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
      return reply.code(500).send({ error: message });
    }
  });
}
