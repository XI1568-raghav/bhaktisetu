import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { payoutRequestRoutes } from './payout-requests.js';

/**
 * Pandit-side payout LIST surface — mirror of /consultation/astrologer/mine.
 *
 * Read-only. Filters PriestPayout rows where the calling priest's
 * Priest.id === payout.priestId (resolved via Priest.userId === currentUser.id).
 *
 * NOTE on PriestPayout schema gaps vs typical payout dashboards:
 *   - No `commission` column (currently the priest service computes net of
 *     commission elsewhere and stores only the payable `amount`).
 *   - No `batchId` column (no batch-payout grouping shipped yet).
 *   - No `paymentMethod` column distinct from `payoutMethod` (single string
 *     field already covers UPI/IMPS/bank-transfer).
 * Fields surfaced match the underlying Prisma model 1:1.
 */

const panditPayoutsListSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const __testing = { panditPayoutsListSchema };

export async function payoutsRoutes(server: FastifyInstance) {
  // ─── GET /pandit/mine ────────────────────────────────────────────────────
  // Pandit-side LIST of PriestPayout rows owned by the calling user.
  // Resolves Priest row via Priest.userId === currentUser.id (matches the
  // existing getPriestId pattern in routes/priest.ts). If the caller has no
  // Priest record yet, returns an empty list (not 404) — same graceful
  // degradation as consultation /astrologer/mine when slug↔UUID is unmapped.
  server.get(
    '/pandit/mine',
    { preHandler: [authenticateUser, requireRole('priest')] },
    async (request, reply) => {
      const parsed = panditPayoutsListSchema.safeParse(request.query ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid query', issues: parsed.error.flatten() });
      }
      const { status, limit, offset } = parsed.data;
      const userId = request.currentUser!.id;

      const priest = await prisma.priest.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!priest) {
        return reply.send({ total: 0, limit, offset, payouts: [] });
      }

      const where = status ? { priestId: priest.id, status } : { priestId: priest.id };

      const [payouts, total] = await Promise.all([
        prisma.priestPayout.findMany({
          where,
          select: {
            id: true,
            bookingId: true,
            amount: true,
            status: true,
            payoutMethod: true,
            payoutReference: true,
            processedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.priestPayout.count({ where }),
      ]);

      return reply.send({
        total,
        limit,
        offset,
        payouts: payouts.map((p) => ({
          id: p.id,
          bookingId: p.bookingId,
          amount: Number(p.amount),
          status: p.status,
          payoutMethod: p.payoutMethod,
          payoutReference: p.payoutReference,
          processedAt: p.processedAt,
          createdAt: p.createdAt,
        })),
      });
    },
  );

  // Cross-cutting Phase 2: unified provider payout self-serve endpoints.
  // Registered here under /api/v1/payouts so all roles share one payout surface:
  //   GET  /api/v1/payouts/balance
  //   POST /api/v1/payouts/request
  //   GET  /api/v1/payouts/my
  await payoutRequestRoutes(server);
}
