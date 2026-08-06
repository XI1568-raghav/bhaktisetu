/**
 * recurring.ts — recurring devotional subscription endpoints (cross-cutting
 * Phase 2, 2026-08-06).
 *
 *  GET  /api/v1/recurring/plans      → the recurring plan catalog (public)
 *  POST /api/v1/recurring/subscribe  → create a subscription intent (auth)
 *  GET  /api/v1/recurring/my         → the devotee's subscriptions (auth)
 *
 * All plans ≤ ₹15,000 so UPI Autopay no-PIN recurring works. The Razorpay
 * Subscriptions mandate + webhooks are wired in Phase 2 (activate on
 * subscription.authenticated, charge on .charged).
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser } from '../middlewares/auth.js';
import {
  RECURRING_PLANS,
  createRecurringSubscription,
  listMyRecurring,
} from '../services/recurring.service.js';

const subscribeSchema = z.object({
  planId: z.string().min(1),
  gaushalaId: z.string().optional(),
  templeId: z.string().optional(),
});

export async function recurringRoutes(server: FastifyInstance) {
  server.get('/plans', async (_request, reply) => {
    return reply.send({ plans: RECURRING_PLANS });
  });

  server.post('/subscribe', { preHandler: [authenticateUser] }, async (request, reply) => {
    const parsed = subscribeSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    try {
      const sub = await createRecurringSubscription({
        userId: request.currentUser!.id,
        planId: parsed.data.planId,
        gaushalaId: parsed.data.gaushalaId,
        templeId: parsed.data.templeId,
      });
      return reply.code(201).send({ ok: true, subscription: sub });
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Could not subscribe' });
    }
  });

  server.get('/my', { preHandler: [authenticateUser] }, async (request, reply) => {
    const rows = await listMyRecurring(request.currentUser!.id);
    return reply.send({ subscriptions: rows });
  });
}
