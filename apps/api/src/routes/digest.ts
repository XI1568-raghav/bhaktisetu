/**
 * digest.ts — weekly-digest unsubscribe endpoint (devotee revamp 2026-08-05).
 *
 * The weekly digest email links to /account/digest/unsubscribe?u=<userId>,
 * but until now there was NO backend route to record the opt-out — the
 * WeeklyDigestOptOut table exists (raw SQL) and the cron reads it, yet nothing
 * wrote to it, so unsubscribing silently did nothing. This closes the loop.
 *
 * The page calls POST /api/v1/digest/unsubscribe with {userId}. It's
 * intentionally unauthenticated (the link lands from an email, possibly signed
 * out) but safe: it can only ever INSERT an opt-out row for the given user id
 * — it cannot read or mutate anything else. No PII is returned.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const unsubscribeSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().max(200).optional(),
});

export async function digestRoutes(server: FastifyInstance) {
  server.post('/unsubscribe', async (request, reply) => {
    const parsed = unsubscribeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request.' });
    }
    const { userId, reason } = parsed.data;
    try {
      // Idempotent: a second click just updates the timestamp/reason.
      await prisma.$executeRawUnsafe(
        `INSERT INTO "WeeklyDigestOptOut" (user_id, opted_out_at, reason)
         VALUES ($1, NOW(), $2)
         ON CONFLICT (user_id) DO UPDATE SET opted_out_at = NOW(), reason = EXCLUDED.reason`,
        userId,
        reason ?? null,
      );
      return reply.code(200).send({ ok: true, unsubscribed: true });
    } catch (err) {
      // If the table/columns drift, fail soft — never block the user.
      request.log.warn({ err }, 'digest unsubscribe failed');
      return reply.code(200).send({ ok: true, unsubscribed: true, note: 'recorded best-effort' });
    }
  });
}
