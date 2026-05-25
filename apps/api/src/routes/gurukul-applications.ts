import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

function isSyntheticUserId(id: string): boolean {
  return id.startsWith('demo-') || id.startsWith('anon-');
}
function dbDisabled(): boolean { return !process.env.DATABASE_URL; }

const submitSchema = z.object({
  programId: z.string().uuid(),
  applicantType: z.enum(['self', 'parent']),
  studentName: z.string().min(2).max(120),
  studentAgeYears: z.number().int().min(3).max(80),
  studentEmail: z.string().email().optional(),
  guardianName: z.string().min(2).max(120).optional(),
  guardianRelation: z.string().min(2).max(40).optional(),
  guardianPhone: z.string().min(8).max(20).optional(),
  guardianAadhaarLast4: z.string().regex(/^\d{4}$/).optional(),
  consentSigned: z.boolean(),
  statement: z.string().min(20).max(4000),
}).refine((d) => {
  if (d.studentAgeYears < 18 && d.applicantType !== 'parent') return false;
  if (d.studentAgeYears < 18 || d.applicantType === 'parent') {
    return Boolean(d.guardianName && d.guardianRelation && d.guardianPhone && d.consentSigned);
  }
  return d.consentSigned;
}, { message: 'Minors must apply via parent applicantType with guardian fields + consent.' });

function serializeApp(a: {
  id: string; programId: string; applicantUserId: string;
  applicantType: string; studentName: string; studentAgeYears: number;
  studentEmail: string | null; guardianName: string | null; guardianRelation: string | null;
  guardianPhone: string | null; guardianAadhaarLast4: string | null;
  consentSigned: boolean; consentSignedAt: Date | null;
  statement: string; status: string;
  forwardedAt: Date | null; decisionAt: Date | null; decisionNote: string | null;
  createdAt: Date; updatedAt: Date;
}) {
  return {
    id: a.id, programId: a.programId, applicantUserId: a.applicantUserId,
    applicantType: a.applicantType, studentName: a.studentName, studentAgeYears: a.studentAgeYears,
    studentEmail: a.studentEmail, guardianName: a.guardianName, guardianRelation: a.guardianRelation,
    guardianPhone: a.guardianPhone, guardianAadhaarLast4: a.guardianAadhaarLast4,
    consentSigned: a.consentSigned, consentSignedAt: a.consentSignedAt?.toISOString() ?? null,
    statement: a.statement, status: a.status,
    forwardedAt: a.forwardedAt?.toISOString() ?? null,
    decisionAt: a.decisionAt?.toISOString() ?? null,
    decisionNote: a.decisionNote,
    createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString(),
  };
}

export async function gurukulApplicationsRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticateUser);

  server.post('/', async (request, reply) => {
    const userId = request.currentUser!.id;
    if (dbDisabled() || isSyntheticUserId(userId)) {
      return reply.code(503).send({ error: 'Database unavailable for application submission.' });
    }
    const parse = submitSchema.safeParse(request.body);
    if (!parse.success) return reply.code(400).send({ error: 'Bad Request', details: parse.error.flatten() });
    const d = parse.data;
    const program = await prisma.gurukulProgram.findUnique({ where: { id: d.programId }, include: { gurukul: true } });
    if (!program || !program.isActive || !program.gurukul.isActive) {
      return reply.code(404).send({ error: 'Program not available' });
    }
    if (d.studentAgeYears < 18 && !program.gurukul.acceptsMinors) {
      return reply.code(400).send({ error: 'This gurukul does not accept minors' });
    }
    if (d.studentAgeYears < program.ageMin || (program.ageMax > 0 && d.studentAgeYears > program.ageMax)) {
      return reply.code(400).send({ error: `Age must be between ${program.ageMin} and ${program.ageMax} years` });
    }
    const app = await prisma.gurukulApplication.create({
      data: {
        programId: d.programId, applicantUserId: userId,
        applicantType: d.applicantType, studentName: d.studentName, studentAgeYears: d.studentAgeYears,
        studentEmail: d.studentEmail ?? null,
        guardianName: d.guardianName ?? null, guardianRelation: d.guardianRelation ?? null,
        guardianPhone: d.guardianPhone ?? null, guardianAadhaarLast4: d.guardianAadhaarLast4 ?? null,
        consentSigned: d.consentSigned,
        consentSignedAt: d.consentSigned ? new Date() : null,
        statement: d.statement, status: 'submitted',
      },
    });
    return reply.code(201).send(serializeApp(app));
  });

  server.get('/mine', async (request, reply) => {
    const userId = request.currentUser!.id;
    if (dbDisabled() || isSyntheticUserId(userId)) return reply.send({ applications: [] });
    const rows = await prisma.gurukulApplication.findMany({
      where: { applicantUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: { program: { include: { gurukul: { select: { name: true, slug: true } } } } },
    });
    return reply.send({
      applications: rows.map((a) => ({
        ...serializeApp(a),
        program: { id: a.program.id, name: a.program.name, gurukul: a.program.gurukul },
      })),
    });
  });
}

export const __testing = { submitSchema };
