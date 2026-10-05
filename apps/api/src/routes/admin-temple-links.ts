import { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';
import {
  createTempleFromProfile,
  getLinkedTempleId,
  setTempleManagerLink,
} from '../services/temple-manager-link.service.js';

/**
 * Admin step that connects a converted temple manager to the PUBLIC Temple row
 * devotees book at. Mounted at /api/v1/admin/temple-links.
 *
 *   GET  /temples?q=        dropdown source (id, name, city, state)
 *   GET  /:userId           current state for the leads screen
 *   POST /:userId/link      { templeId }  link to an existing Temple
 *   POST /:userId/create    create an unverified Temple from the profile + link
 */
const paramsSchema = z.object({ userId: z.string().uuid() });
const linkBodySchema = z.object({ templeId: z.string().uuid() });

const TEMPLE_SELECT = { id: true, name: true, slug: true, isVerified: true } as const;

export async function adminTempleLinkRoutes(server: FastifyInstance) {
  const preHandler = [authenticateUser, requireRole('admin')];

  async function requireManager(userId: string, reply: FastifyReply): Promise<boolean> {
    const role = await prisma.userRoleAssignment.findFirst({
      where: { userId, role: 'TEMPLE_MANAGER' },
      select: { userId: true },
    });
    if (!role) {
      reply.code(404).send({ error: 'That user is not a temple manager' });
      return false;
    }
    return true;
  }

  server.get('/temples', { preHandler }, async (request) => {
    const q = String((request.query as { q?: string }).q ?? '').trim();
    const temples = await prisma.temple.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : {},
      select: { id: true, name: true, city: true, state: true, isVerified: true },
      orderBy: { name: 'asc' },
      take: 100,
    });
    return { temples };
  });

  server.get('/:userId', { preHandler }, async (request, reply) => {
    const p = paramsSchema.safeParse(request.params);
    if (!p.success) return reply.code(400).send({ error: 'Invalid user id' });
    const { userId } = p.data;
    if (!(await requireManager(userId, reply))) return;
    const profile = await prisma.templeProfile.findUnique({
      where: { userId },
      select: { templeName: true, city: true, state: true, approved: true },
    });
    const linkedId = await getLinkedTempleId(userId);
    const linked = linkedId
      ? await prisma.temple.findUnique({ where: { id: linkedId }, select: TEMPLE_SELECT })
      : null;
    const name = (profile?.templeName ?? '').trim();
    const nameMatch =
      !linked && name
        ? await prisma.temple.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
            select: TEMPLE_SELECT,
          })
        : null;
    return { profile, linked, nameMatch };
  });

  server.post('/:userId/link', { preHandler }, async (request, reply) => {
    const p = paramsSchema.safeParse(request.params);
    const b = linkBodySchema.safeParse(request.body);
    if (!p.success || !b.success) return reply.code(400).send({ error: 'Invalid request' });
    const { userId } = p.data;
    if (!(await requireManager(userId, reply))) return;
    const temple = await prisma.temple.findUnique({ where: { id: b.data.templeId }, select: TEMPLE_SELECT });
    if (!temple) return reply.code(404).send({ error: 'Temple not found' });
    await setTempleManagerLink(userId, temple.id);
    request.log.info({ userId, templeId: temple.id, adminId: request.currentUser?.id }, 'temple manager linked');
    return { linked: temple };
  });

  server.post('/:userId/create', { preHandler }, async (request, reply) => {
    const p = paramsSchema.safeParse(request.params);
    if (!p.success) return reply.code(400).send({ error: 'Invalid user id' });
    const { userId } = p.data;
    if (!(await requireManager(userId, reply))) return;
    const result = await createTempleFromProfile(userId);
    if (result.kind === 'no_profile') {
      return reply.code(409).send({ error: 'This manager has no temple profile with a temple name yet' });
    }
    const temple = await prisma.temple.findUnique({ where: { id: result.templeId }, select: TEMPLE_SELECT });
    request.log.info(
      { userId, templeId: result.templeId, outcome: result.kind, adminId: request.currentUser?.id },
      'temple manager create-from-profile',
    );
    return reply.code(result.kind === 'created' ? 201 : 200).send({ outcome: result.kind, linked: temple });
  });
}
