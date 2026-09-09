import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

const createCowSchema = z.object({
 tagNumber: z.string().min(1).max(20),
 name: z.string().min(1).max(100),
 breed: z.string().max(50).optional(),
 ageYears: z.number().int().min(0).max(40).optional(),
 gender: z.enum(['female', 'male']).optional(),
 healthStatus: z.enum(['healthy', 'treatment', 'pregnant', 'recovering']).optional(),
 notes: z.string().max(500).optional(),
});

const updateCowSchema = createCowSchema.partial();

const healthRecordSchema = z.object({
 recordType: z.enum(['checkup', 'vaccination', 'treatment', 'vet_visit']),
 notes: z.string().min(1).max(1000),
 vetName: z.string().max(100).optional(),
});

// CT-API-1: `Cow.id` is `@db.Uuid`, so every `:id` handler below handed a
// non-uuid path segment straight to Prisma, which raised P2023 and surfaced as a
// 500. Measured on the public sibling of this defect against api.darshya.online
// on 2026-09-09: `/gaushala/not-a-uuid` -> 500 where the well-formed but absent
// `/gaushala/00000000-0000-4000-8000-000000000000` -> 404. Unlike the public
// route there are no fixture ids here — every cow this portal can reach is a DB
// row — so an id that cannot be a uuid is simply a cow this manager does not
// have, which is the 404 the lookup would have produced anyway.
// Same regex as routes/gaushala.ts and routes/priests-public.ts:42.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 404 for an id no `cows` row can carry. Returns true when it answered, so the
 * caller can bail before the query.
 */
function rejectUnstorableCowId(id: string, reply: any): boolean {
 if (UUID_RE.test(id)) return false;
 reply.code(404).send({ error: 'Cow not found' });
 return true;
}

async function requireGaushalaManager(request: any, reply: any): Promise<string | null> {
 const roles = request.currentUser?.roles ?? [];
 if (!roles.includes('GAUSHALA_MANAGER')) {
 reply.code(403).send({ error: 'GAUSHALA_MANAGER role required' });
 return null;
 }
 return request.currentUser.id;
}

async function syncCowCount(gaushalaUserId: string) {
 const count = await prisma.cow.count({ where: { gaushalaId: gaushalaUserId } });
 await prisma.gaushalaProfile.updateMany({
 where: { userId: gaushalaUserId },
 data: { totalCows: count },
 });
}

export async function gaushalaCowsRoutes(server: FastifyInstance) {
 // List cows
 server.get('/cows', { preHandler: [authenticateUser] }, async (request, reply) => {
 const gaushalaUserId = await requireGaushalaManager(request, reply);
 if (!gaushalaUserId) return;
 const cows = await prisma.cow.findMany({
 where: { gaushalaId: gaushalaUserId },
 orderBy: { createdAt: 'desc' },
 });
 return reply.send({ cows });
 });

 // Register a cow
 server.post('/cows', { preHandler: [authenticateUser] }, async (request, reply) => {
 const gaushalaUserId = await requireGaushalaManager(request, reply);
 if (!gaushalaUserId) return;
 const parsed = createCowSchema.safeParse(request.body);
 if (!parsed.success) {
 return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
 }
 try {
 const cow = await prisma.cow.create({
 data: { gaushalaId: gaushalaUserId, ...parsed.data },
 });
 await syncCowCount(gaushalaUserId);
 return reply.code(201).send({ cow });
 } catch (e: any) {
 if (e?.code === 'P2002') {
 return reply.code(409).send({ error: 'Tag number already exists' });
 }
 throw e;
 }
 });

 // Get single cow with health records
 server.get('/cows/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
 const gaushalaUserId = await requireGaushalaManager(request, reply);
 if (!gaushalaUserId) return;
 const { id } = request.params as { id: string };
 if (rejectUnstorableCowId(id, reply)) return;
 const cow = await prisma.cow.findFirst({
 where: { id, gaushalaId: gaushalaUserId },
 include: {
 healthRecords: { orderBy: { recordedAt: 'desc' }, take: 50 },
 },
 });
 if (!cow) return reply.code(404).send({ error: 'Cow not found' });
 return reply.send({ cow });
 });

 // Update cow
 server.patch('/cows/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
 const gaushalaUserId = await requireGaushalaManager(request, reply);
 if (!gaushalaUserId) return;
 const { id } = request.params as { id: string };
 const parsed = updateCowSchema.safeParse(request.body);
 if (!parsed.success) {
 return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
 }
 if (rejectUnstorableCowId(id, reply)) return;
 const existing = await prisma.cow.findFirst({ where: { id, gaushalaId: gaushalaUserId } });
 if (!existing) return reply.code(404).send({ error: 'Cow not found' });
 const cow = await prisma.cow.update({ where: { id }, data: parsed.data });
 return reply.send({ cow });
 });

 // Delete cow
 server.delete('/cows/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
 const gaushalaUserId = await requireGaushalaManager(request, reply);
 if (!gaushalaUserId) return;
 const { id } = request.params as { id: string };
 if (rejectUnstorableCowId(id, reply)) return;
 const existing = await prisma.cow.findFirst({ where: { id, gaushalaId: gaushalaUserId } });
 if (!existing) return reply.code(404).send({ error: 'Cow not found' });
 await prisma.cow.delete({ where: { id } });
 await syncCowCount(gaushalaUserId);
 return reply.send({ ok: true });
 });

 // Add health record
 server.post('/cows/:id/health', { preHandler: [authenticateUser] }, async (request, reply) => {
 const gaushalaUserId = await requireGaushalaManager(request, reply);
 if (!gaushalaUserId) return;
 const { id } = request.params as { id: string };
 const parsed = healthRecordSchema.safeParse(request.body);
 if (!parsed.success) {
 return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
 }
 if (rejectUnstorableCowId(id, reply)) return;
 const cow = await prisma.cow.findFirst({ where: { id, gaushalaId: gaushalaUserId } });
 if (!cow) return reply.code(404).send({ error: 'Cow not found' });
 const record = await prisma.cowHealthRecord.create({
 data: { cowId: id, ...parsed.data },
 });
 return reply.code(201).send({ record });
 });
}
