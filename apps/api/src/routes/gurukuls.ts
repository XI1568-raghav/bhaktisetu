import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { httpUrl } from '../lib/http-url.js';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

function isSyntheticUserId(id: string): boolean {
  return id.startsWith('demo-') || id.startsWith('anon-');
}
function dbDisabled(): boolean { return !process.env.DATABASE_URL; }

const listQuerySchema = z.object({
  state: z.string().optional(),
  city: z.string().optional(),
  tradition: z.string().optional(),
  residential: z.enum(['true', 'false']).optional(),
  online: z.enum(['true', 'false']).optional(),
  acceptsMinors: z.enum(['true', 'false']).optional(),
  q: z.string().optional(),
});

const createSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(120),
  description: z.string().min(20).max(4000),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  country: z.string().min(2).max(2).default('IN'),
  websiteUrl: httpUrl('websiteUrl').optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  tradition: z.string().min(2).max(80),
  isResidential: z.boolean().default(false),
  isOnline: z.boolean().default(false),
  acceptsMinors: z.boolean().default(false),
  programs: z.array(z.object({
    name: z.string().min(2).max(120),
    durationMonths: z.number().int().min(1).max(240),
    modeOfStudy: z.string().min(2).max(80),
    ageMin: z.number().int().min(0).max(120),
    ageMax: z.number().int().min(0).max(120),
    description: z.string().min(10).max(2000),
    feeAnnualInr: z.number().int().min(0).optional(),
  })).default([]),
});

function serializeGurukul(g: {
  id: string; slug: string; name: string; description: string;
  city: string; state: string; country: string;
  websiteUrl: string | null; contactEmail: string;
  contactVerified: boolean; contactPhone: string | null;
  tradition: string; isResidential: boolean; isOnline: boolean;
  acceptsMinors: boolean; isVerified: boolean; isActive: boolean;
  ownerId: string | null; createdAt: Date;
}) {
  return {
    id: g.id, slug: g.slug, name: g.name, description: g.description,
    city: g.city, state: g.state, country: g.country,
    websiteUrl: g.websiteUrl, contactEmail: g.contactEmail,
    contactVerified: g.contactVerified, contactPhone: g.contactPhone,
    tradition: g.tradition, isResidential: g.isResidential, isOnline: g.isOnline,
    acceptsMinors: g.acceptsMinors, isVerified: g.isVerified, isActive: g.isActive,
    ownerId: g.ownerId, createdAt: g.createdAt.toISOString(),
  };
}

export async function gurukulsRoutes(server: FastifyInstance) {
  server.get('/', async (request, reply) => {
    if (dbDisabled()) return reply.send({ gurukuls: [] });
    const parse = listQuerySchema.safeParse(request.query);
    if (!parse.success) return reply.code(400).send({ error: 'Bad Request', details: parse.error.flatten() });
    const f = parse.data;
    const rows = await prisma.gurukul.findMany({
      where: {
        isActive: true,
        ...(f.state ? { state: f.state } : {}),
        ...(f.city ? { city: f.city } : {}),
        ...(f.tradition ? { tradition: f.tradition } : {}),
        ...(f.residential ? { isResidential: f.residential === 'true' } : {}),
        ...(f.online ? { isOnline: f.online === 'true' } : {}),
        ...(f.acceptsMinors ? { acceptsMinors: f.acceptsMinors === 'true' } : {}),
        ...(f.q ? { OR: [
          { name:        { contains: f.q, mode: 'insensitive' as const } },
          { description: { contains: f.q, mode: 'insensitive' as const } },
          { tradition:   { contains: f.q, mode: 'insensitive' as const } },
        ] } : {}),
      },
      orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
      take: 200,
    });
    return reply.send({ gurukuls: rows.map(serializeGurukul) });
  });

  server.get<{ Params: { slug: string } }>('/:slug', async (request, reply) => {
    if (dbDisabled()) return reply.code(404).send({ error: 'Not found' });
    const { slug } = request.params;
    const g = await prisma.gurukul.findUnique({ where: { slug } });
    if (!g || !g.isActive) return reply.code(404).send({ error: 'Not found' });
    const programs = await prisma.gurukulProgram.findMany({
      where: { gurukulId: g.id, isActive: true },
      orderBy: { ageMin: 'asc' },
    });
    return reply.send({
      ...serializeGurukul(g),
      programs: programs.map((p) => ({
        id: p.id, name: p.name, durationMonths: p.durationMonths, modeOfStudy: p.modeOfStudy,
        ageMin: p.ageMin, ageMax: p.ageMax, description: p.description, feeAnnualInr: p.feeAnnualInr,
      })),
    });
  });

  server.post('/', { preHandler: authenticateUser }, async (request, reply) => {
    const userId = request.currentUser!.id;
    if (dbDisabled() || isSyntheticUserId(userId)) {
      return reply.code(503).send({ error: 'Database unavailable for create operations.' });
    }
    const parse = createSchema.safeParse(request.body);
    if (!parse.success) return reply.code(400).send({ error: 'Bad Request', details: parse.error.flatten() });
    const d = parse.data;
    const dupe = await prisma.gurukul.findUnique({ where: { slug: d.slug } });
    if (dupe) return reply.code(409).send({ error: 'Slug already in use' });
    const g = await prisma.gurukul.create({
      data: {
        slug: d.slug, name: d.name, description: d.description,
        city: d.city, state: d.state, country: d.country,
        websiteUrl: d.websiteUrl ?? null,
        contactEmail: d.contactEmail, contactPhone: d.contactPhone ?? null,
        tradition: d.tradition,
        isResidential: d.isResidential, isOnline: d.isOnline,
        acceptsMinors: d.acceptsMinors,
        ownerId: userId,
        programs: d.programs.length ? { create: d.programs.map((p) => ({
          name: p.name, durationMonths: p.durationMonths, modeOfStudy: p.modeOfStudy,
          ageMin: p.ageMin, ageMax: p.ageMax, description: p.description,
          feeAnnualInr: p.feeAnnualInr ?? null,
        })) } : undefined,
      },
    });
    return reply.code(201).send(serializeGurukul(g));
  });

  server.get('/mine/list', { preHandler: authenticateUser }, async (request, reply) => {
    const userId = request.currentUser!.id;
    if (dbDisabled() || isSyntheticUserId(userId)) return reply.send({ gurukuls: [] });
    const rows = await prisma.gurukul.findMany({ where: { ownerId: userId }, orderBy: { createdAt: 'desc' } });
    return reply.send({ gurukuls: rows.map(serializeGurukul) });
  });
}
