import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

// Admin gurukul moderation routes, mounted at /api/v1/admin/gurukuls.
// Gated by authenticateUser + requireRole('admin').

const verifyBodySchema = z.object({
  isVerified: z.boolean(),
  note: z.string().max(500).optional(),
});

const activateBodySchema = z.object({
  isActive: z.boolean(),
});

export async function adminGurukulsRoutes(server: FastifyInstance) {
  const adminPreHandlers = [authenticateUser, requireRole('admin')];

  server.get('/', { preHandler: adminPreHandlers }, async (request, _reply) => {
    const { status } = (request.query ?? {}) as { status?: 'pending' | 'verified' | 'all' };
    const where =
      status === 'pending' ? { isVerified: false } :
      status === 'verified' ? { isVerified: true } :
      {};

    // SCAL-04 (2026-08-20): columns pinned, row count deliberately not.
    //
    // No `take` here, and that is the considered answer: the moderation screen
    // renders the complete list and a page size without the paired UI change
    // would truncate an operator's view with nothing on screen saying so.
    //
    // The width was a different question. This was `include`, and `include`
    // without `select` returns EVERY scalar on the model — 20 of them — while
    // the `.map()` below returns 12. Among the 8 discarded was `description`,
    // a required uncapped String holding the directory blurb and the only
    // column here whose size is not bounded by a short identifier. On a
    // whole-table scan that is every gurukul's prose crossing the wire into a
    // 512 MB container for a screen that never renders a character of it.
    // `owner.id` went the same way — selected, never read.
    //
    // The response is built by the explicit `.map()` below, so narrowing the
    // query changes no byte of the JSON; admin-gurukuls.scal04.test.ts pins the
    // body as well as the column list so this cannot be satisfied by answering
    // with less.
    const gurukuls = await prisma.gurukul.findMany({
      where,
      orderBy: [{ isVerified: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        city: true,
        state: true,
        tradition: true,
        isVerified: true,
        isActive: true,
        contactEmail: true,
        contactPhone: true,
        websiteUrl: true,
        createdAt: true,
        owner: { select: { email: true, fullName: true } },
        _count: { select: { programs: true } },
      },
    });

    return {
      gurukuls: gurukuls.map((g) => ({
        id: g.id,
        slug: g.slug,
        name: g.name,
        city: g.city,
        state: g.state,
        tradition: g.tradition,
        isVerified: g.isVerified,
        isActive: g.isActive,
        contactEmail: g.contactEmail,
        contactPhone: g.contactPhone,
        websiteUrl: g.websiteUrl,
        ownerEmail: g.owner?.email ?? null,
        ownerName: g.owner?.fullName ?? null,
        programCount: g._count.programs,
        createdAt: g.createdAt,
      })),
    };
  });

  server.patch<{ Params: { id: string } }>(
    '/:id/verify',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const parsed = verifyBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues });
      }
      const { id } = request.params;
      try {
        const g = await prisma.gurukul.update({
          where: { id },
          data: { isVerified: parsed.data.isVerified },
          select: { id: true, slug: true, name: true, isVerified: true },
        });
        return { gurukul: g };
      } catch {
        return reply.status(404).send({ error: 'Gurukul not found' });
      }
    },
  );

  server.patch<{ Params: { id: string } }>(
    '/:id/active',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const parsed = activateBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues });
      }
      const { id } = request.params;
      try {
        const g = await prisma.gurukul.update({
          where: { id },
          data: { isActive: parsed.data.isActive },
          select: { id: true, slug: true, name: true, isActive: true },
        });
        return { gurukul: g };
      } catch {
        return reply.status(404).send({ error: 'Gurukul not found' });
      }
    },
  );
}
