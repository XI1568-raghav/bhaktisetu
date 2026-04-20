import { FastifyInstance } from 'fastify';
import { z } from 'zod';
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

  // ─── POST /webhook — Subscription webhook from payment gateway ──────────────

  server.post('/webhook', async (request, reply) => {
    const payload = request.body as Record<string, unknown>;
    const signature = request.headers['x-razorpay-signature'] as string;
    // TODO: verify webhook signature, handle subscription events
    return { received: true };
  });
}
