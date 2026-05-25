import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

function isSyntheticUserId(id: string): boolean {
  return id.startsWith('demo-') || id.startsWith('anon-');
}
function dbDisabled(): boolean { return !process.env.DATABASE_URL; }

const decisionSchema = z.object({
  status: z.enum(['forwarded', 'accepted', 'rejected', 'withdrawn']),
  decisionNote: z.string().max(2000).optional(),
});

export async function gurukulPortalRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticateUser);

  server.get('/applications', async (request, reply) => {
    const userId = request.currentUser!.id;
    if (dbDisabled() || isSyntheticUserId(userId)) return reply.send({ applications: [] });
    const myGurukuls = await prisma.gurukul.findMany({ where: { ownerId: userId }, select: { id: true } });
    if (myGurukuls.length === 0) return reply.send({ applications: [] });
    const programIds = await prisma.gurukulProgram.findMany({
      where: { gurukulId: { in: myGurukuls.map((g) => g.id) } },
      select: { id: true, name: true, gurukulId: true },
    });
    if (programIds.length === 0) return reply.send({ applications: [] });
    const apps = await prisma.gurukulApplication.findMany({
      where: { programId: { in: programIds.map((p) => p.id) } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const programById = new Map(programIds.map((p) => [p.id, p]));
    return reply.send({
      applications: apps.map((a) => ({
        id: a.id, programId: a.programId, programName: programById.get(a.programId)?.name,
        studentName: a.studentName, studentAgeYears: a.studentAgeYears,
        guardianName: a.guardianName, guardianPhone: a.guardianPhone,
        consentSigned: a.consentSigned,
        statement: a.statement, status: a.status,
        decisionNote: a.decisionNote,
        forwardedAt: a.forwardedAt?.toISOString() ?? null,
        decisionAt: a.decisionAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  });

  server.patch<{ Params: { id: string } }>('/applications/:id', async (request, reply) => {
    const userId = request.currentUser!.id;
    if (dbDisabled() || isSyntheticUserId(userId)) {
      return reply.code(503).send({ error: 'Database unavailable.' });
    }
    const parse = decisionSchema.safeParse(request.body);
    if (!parse.success) return reply.code(400).send({ error: 'Bad Request', details: parse.error.flatten() });
    const { id } = request.params;
    const app = await prisma.gurukulApplication.findUnique({
      where: { id },
      include: { program: { include: { gurukul: { select: { ownerId: true } } } } },
    });
    if (!app) return reply.code(404).send({ error: 'Application not found' });
    if (app.program.gurukul.ownerId !== userId) {
      return reply.code(403).send({ error: 'Not owner of this gurukul' });
    }
    const now = new Date();
    const updated = await prisma.gurukulApplication.update({
      where: { id },
      data: {
        status: parse.data.status,
        decisionNote: parse.data.decisionNote ?? null,
        forwardedAt: parse.data.status === 'forwarded' ? now : app.forwardedAt,
        decisionAt: ['accepted', 'rejected', 'withdrawn'].includes(parse.data.status) ? now : app.decisionAt,
      },
    });
    return reply.send({
      success: true,
      application: {
        id: updated.id, status: updated.status, decisionNote: updated.decisionNote,
        forwardedAt: updated.forwardedAt?.toISOString() ?? null,
        decisionAt: updated.decisionAt?.toISOString() ?? null,
      },
    });
  });
}
