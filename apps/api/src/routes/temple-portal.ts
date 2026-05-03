import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

/**
 * Temple manager self-service routes. Today scoped via ?slug=<temple-slug>
 * — schema does not yet have an explicit Temple ↔ TempleManager relation, so
 * the gate is "user has TEMPLE_MANAGER role". Once a relation exists, lock
 * down to managers of that specific temple.
 */

const HH_MM_RANGE = /^\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\s*$/;

const timingsSchema = z.object({
  regularHours: z.record(z.string().regex(HH_MM_RANGE, 'must be HH:MM - HH:MM')),
  closedOn: z.string().nullable().optional(),
  specialDays: z.string().nullable().optional(),
});

function hasTempleManagerRole(req: { currentUser?: { roles?: string[] } }): boolean {
  return req.currentUser?.roles?.includes('TEMPLE_MANAGER') ?? false;
}

export async function templePortalRoutes(server: FastifyInstance) {
  server.get<{ Querystring: { slug?: string } }>(
    '/schedule',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      if (!hasTempleManagerRole(request)) {
        return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
      }
      const slug = request.query.slug;
      if (!slug) return reply.code(400).send({ error: 'slug required' });
      const temple = await prisma.temple.findUnique({ where: { slug }, select: { id: true, slug: true, name: true, timingInfo: true } });
      if (!temple) return reply.code(404).send({ error: 'Temple not found' });
      return temple;
    },
  );

  server.patch<{ Querystring: { slug?: string }; Body: unknown }>(
    '/schedule',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      if (!hasTempleManagerRole(request)) {
        return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
      }
      const slug = request.query.slug;
      if (!slug) return reply.code(400).send({ error: 'slug required' });
      const parsed = timingsSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
      }
      const next = {
        regularHours: parsed.data.regularHours,
        closedOn: parsed.data.closedOn ?? undefined,
        specialDays: parsed.data.specialDays ?? undefined,
      };
      const temple = await prisma.temple.update({
        where: { slug },
        data: { timingInfo: next as object },
        select: { id: true, slug: true, name: true, timingInfo: true },
      });
      server.log.info({ slug, userId: request.currentUser?.id }, 'temple-portal schedule update');
      return temple;
    },
  );
}
