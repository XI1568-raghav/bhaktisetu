import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { uuidParamGuard } from '../lib/uuid.js';
import { authenticateUser } from '../middlewares/auth.js';
import { SQL_UTC_NOW } from '../lib/sql-time.js';

/**
 * Service ratings — 1..5 stars + optional text, written by the devotee
 * for the provider, tied to a chat conversation. Surfaced in Inbox after
 * a "Call ended" system message or when a linked PujaBooking flips to
 * `delivered`.
 *
 *   POST /                   write a rating  (devotee only)
 *   GET  /:conversationId    fetch the rating for one conversation
 *   GET  /provider/:userId   list a provider's recent ratings
 *
 * Uses raw SQL because the Prisma client may be one schema-revision
 * behind in dev environments where `prisma generate` is blocked by a
 * locked DLL on Windows. The migration's CHECK constraint plus the Zod
 * schema below are the integrity gates.
 */

const writeSchema = z.object({
  conversationId: z.string().uuid(),
  stars: z.number().int().min(1).max(5),
  body: z.string().max(1000).optional(),
});

type RatingRow = {
  id: string;
  conversation_id: string;
  devotee_id: string;
  provider_id: string;
  stars: number;
  body: string | null;
  created_at: Date;
};

export async function ratingRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticateUser);
  server.addHook('preHandler', uuidParamGuard('conversationId', 'userId'));

  // Devotee writes a rating. Idempotent: re-posting overwrites prior
  // value (devotee may revise within the conversation).
  server.post('/', async (request, reply) => {
    const userId = request.currentUser!.id;
    const parsed = writeSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'BadRequest', issues: parsed.error.issues });
    }
    const { conversationId, stars, body } = parsed.data;

    // Look up the conversation to (a) verify the user is the devotee
    // side, and (b) capture providerId for the row.
    const conv = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { devoteeId: true, providerId: true },
    });
    if (!conv) return reply.code(404).send({ error: 'NotFound' });
    if (conv.devoteeId !== userId) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Only the devotee on this conversation can submit a rating.',
      });
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO service_ratings (conversation_id, devotee_id, provider_id, stars, body, created_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, ${SQL_UTC_NOW})
       ON CONFLICT (conversation_id, devotee_id)
       DO UPDATE SET stars = EXCLUDED.stars, body = EXCLUDED.body, created_at = ${SQL_UTC_NOW}`,
      conversationId,
      userId,
      conv.providerId,
      stars,
      body ?? null,
    );

    return reply.send({ ok: true });
  });

  // Fetch the (possibly absent) rating for one conversation. Either side
  // of the conversation may read it — devotees see their own, providers
  // see what was written about them.
  server.get('/:conversationId', async (request, reply) => {
    const userId = request.currentUser!.id;
    const { conversationId } = request.params as { conversationId: string };

    const conv = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { devoteeId: true, providerId: true },
    });
    if (!conv) return reply.code(404).send({ error: 'NotFound' });
    if (conv.devoteeId !== userId && conv.providerId !== userId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const rows = await prisma.$queryRaw<RatingRow[]>`
      SELECT id, conversation_id, devotee_id, provider_id, stars, body, created_at
        FROM service_ratings
       WHERE conversation_id = ${conversationId}::uuid
       LIMIT 1`;
    return reply.send({ rating: rows[0] ?? null });
  });

  // Public-ish: a provider's recent ratings + average. Used on profile
  // pages. We intentionally do not require auth-gating beyond the
  // top-level authenticateUser hook so logged-in users can comparison-
  // shop providers.
  server.get('/provider/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const rows = await prisma.$queryRawUnsafe<RatingRow[]>(
      `SELECT id, conversation_id, devotee_id, provider_id, stars, body, created_at
       FROM service_ratings
       WHERE provider_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT 50`,
      userId,
    );

    const total = rows.length;
    const avg = total === 0 ? null : rows.reduce((s, r) => s + r.stars, 0) / total;

    return reply.send({
      total,
      average: avg === null ? null : Math.round(avg * 10) / 10,
      ratings: rows.map((r) => ({
        id: r.id,
        stars: r.stars,
        body: r.body,
        createdAt: r.created_at,
      })),
    });
  });
}
