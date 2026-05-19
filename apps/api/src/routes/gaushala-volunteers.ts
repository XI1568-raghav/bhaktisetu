import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

const createSchema = z.object({
 fullName: z.string().min(1).max(100),
 phone: z.string().max(20).optional(),
 email: z.string().email().optional(),
 role: z.enum(['general', 'feeding', 'medical', 'cleaning']).optional(),
 active: z.boolean().optional(),
 notes: z.string().max(500).optional(),
});

const updateSchema = createSchema.partial();

async function requireGaushalaManager(request: any, reply: any): Promise<string | null> {
 const roles = request.currentUser?.roles ?? [];
 if (!roles.includes('GAUSHALA_MANAGER')) {
 reply.code(403).send({ error: 'GAUSHALA_MANAGER role required' });
 return null;
 }
 return request.currentUser.id;
}

export async function gaushalaVolunteersRoutes(server: FastifyInstance) {
 server.get('/volunteers', { preHandler: [authenticateUser] }, async (request, reply) => {
 const gaushalaUserId = await requireGaushalaManager(request, reply);
 if (!gaushalaUserId) return;
 const volunteers = await prisma.volunteer.findMany({
 where: { gaushalaId: gaushalaUserId },
 orderBy: [{ active: 'desc' }, { joinedAt: 'desc' }],
 });
 return reply.send({ volunteers });
 });

 server.post('/volunteers', { preHandler: [authenticateUser] }, async (request, reply) => {
 const gaushalaUserId = await requireGaushalaManager(request, reply);
 if (!gaushalaUserId) return;
 const parsed = createSchema.safeParse(request.body);
 if (!parsed.success) {
 return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
 }
 const v = await prisma.volunteer.create({
 data: { gaushalaId: gaushalaUserId, ...parsed.data },
 });
 return reply.code(201).send({ volunteer: v });
 });

 server.patch('/volunteers/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
 const gaushalaUserId = await requireGaushalaManager(request, reply);
 if (!gaushalaUserId) return;
 const { id } = request.params as { id: string };
 const parsed = updateSchema.safeParse(request.body);
 if (!parsed.success) {
 return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
 }
 const existing = await prisma.volunteer.findFirst({ where: { id, gaushalaId: gaushalaUserId } });
 if (!existing) return reply.code(404).send({ error: 'Volunteer not found' });
 const v = await prisma.volunteer.update({ where: { id }, data: parsed.data });
 return reply.send({ volunteer: v });
 });

 server.delete('/volunteers/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
 const gaushalaUserId = await requireGaushalaManager(request, reply);
 if (!gaushalaUserId) return;
 const { id } = request.params as { id: string };
 const existing = await prisma.volunteer.findFirst({ where: { id, gaushalaId: gaushalaUserId } });
 if (!existing) return reply.code(404).send({ error: 'Volunteer not found' });
 await prisma.volunteer.delete({ where: { id } });
 return reply.send({ ok: true });
 });
}
