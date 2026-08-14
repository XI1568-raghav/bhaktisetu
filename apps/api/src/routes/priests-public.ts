import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

// R-Q1-E-013: zod query schema — optional specialization + deity strings,
// trimmed + lowercased once at parse time so the Prisma where clause below
// is exact-match deterministic. Empty string after trim is treated as
// absent so `?specialization=&deity=ganesh` filters only on deity.
export const publicPriestsQuerySchema = z.object({
  specialization: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((v) => (v && v.length > 0 ? v.toLowerCase() : undefined)),
  deity: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

// PJ-07: `Priest.id` is a uuid column. Anything else — `/priests/me`, a slug,
// a typo — reached `prisma.priest.findFirst` and came back as a 500 whose body
// named the ORM, the model, the query method and the source path to any
// unauthenticated caller. An id that cannot exist is a 404, decided before the
// query runs.
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isPriestId(id: string): boolean {
  return UUID_RE.test(id);
}

export const __testing = { publicPriestsQuerySchema, isPriestId };

// Public, unauthenticated reads of verified+active priests and their
// pandit-owned puja offerings. Mirror of priestRoutes' pandit-side CRUD
// in routes/priest.ts but read-only and scoped to:
//   isVerified = true AND status = 'active'
//   offerings: isActive = true
//
// Decimal serialisation: match the admin commissions pattern — toString()
// to preserve precision across JSON.

type OfferingRow = {
  id: string;
  priestId: string;
  name: string;
  description: string | null;
  deity: string;
  basePrice: { toString(): string };
  durationMinutes: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function serializeOffering(o: OfferingRow) {
  return {
    id: o.id,
    priestId: o.priestId,
    name: o.name,
    description: o.description,
    deity: o.deity,
    basePrice: o.basePrice.toString(),
    durationMinutes: o.durationMinutes,
    isActive: o.isActive,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

type PriestRow = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  languages: string[];
  specializations: string[];
  experienceYears: number;
  ratingAvg: number;
  ratingCount: number;
  isVerified: boolean;
};

function serializePriest(p: PriestRow, offeringCount: number) {
  return {
    id: p.id,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    bio: p.bio,
    languages: p.languages,
    specializations: p.specializations,
    experienceYears: p.experienceYears,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    isVerified: p.isVerified,
    offeringCount,
  };
}

export async function priestsPublicRoutes(server: FastifyInstance) {
  // PJ-07: this is a fully public, unauthenticated surface — nothing thrown
  // inside it may reach the caller. Fastify's default serialiser echoed
  // `err.message`, which for a Prisma failure is a multi-line dump containing
  // the absolute server path, the model and the query method. Scoped to this
  // plugin so the rest of the API keeps its own handling.
  server.setErrorHandler((err, request, reply) => {
    request.log.error({ err }, 'public priests route failed');
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 400 && status < 500) {
      return reply.code(status).send({ error: 'Invalid request' });
    }
    return reply.code(500).send({ error: 'Something went wrong' });
  });

  // GET / — list verified active priests with active-offering counts.
  // Optional filters: ?specialization=marriage&deity=ganesh — applied
  // server-side so clients don't pull the full list and post-filter (E10).
  // R-Q1-E-013: zod-validated query + 5-min Cache-Control on the response
  // so CF edge + browser cache can absorb the directory-style traffic
  // without hammering Prisma on every page load.
  server.get('/', async (request, reply) => {
    const parsed = publicPriestsQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid query parameters',
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      });
    }
    const q = parsed.data;
    const where: Record<string, unknown> = { isVerified: true, status: 'active' };
    if (q.specialization) {
      where.specializations = { has: q.specialization };
    }
    if (q.deity) {
      where.offerings = {
        some: { isActive: true, deity: { equals: q.deity, mode: 'insensitive' } },
      };
    }
    // 5-minute public cache (matches getPublicPriests next.revalidate=300).
    reply.header('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
    const priests = await prisma.priest.findMany({
      where,
      orderBy: { ratingAvg: 'desc' },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        languages: true,
        specializations: true,
        experienceYears: true,
        ratingAvg: true,
        ratingCount: true,
        isVerified: true,
      },
    });

    if (priests.length === 0) return reply.send({ priests: [] });

    // Batch the active-offering count to avoid an N+1.
    const counts = await prisma.priestPujaOffering.groupBy({
      by: ['priestId'],
      where: { isActive: true, priestId: { in: priests.map((p) => p.id) } },
      _count: { _all: true },
    });
    const countByPriest = new Map<string, number>(
      counts.map((c) => [c.priestId, c._count._all])
    );

    return reply.send({
      priests: priests.map((p) => serializePriest(p, countByPriest.get(p.id) ?? 0)),
    });
  });

  // GET /:id — single priest profile + active offerings
  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!isPriestId(id)) return reply.code(404).send({ error: 'Priest not found' });
    const priest = await prisma.priest.findFirst({
      where: { id, isVerified: true, status: 'active' },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        languages: true,
        specializations: true,
        experienceYears: true,
        ratingAvg: true,
        ratingCount: true,
        isVerified: true,
      },
    });
    if (!priest) return reply.code(404).send({ error: 'Priest not found' });

    const offerings = await prisma.priestPujaOffering.findMany({
      where: { priestId: id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({
      ...serializePriest(priest, offerings.length),
      offerings: offerings.map(serializeOffering),
    });
  });

  // GET /:id/pujas — active offerings only
  server.get('/:id/pujas', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!isPriestId(id)) return reply.code(404).send({ error: 'Priest not found' });
    const priest = await prisma.priest.findFirst({
      where: { id, isVerified: true, status: 'active' },
      select: { id: true },
    });
    if (!priest) return reply.code(404).send({ error: 'Priest not found' });

    const offerings = await prisma.priestPujaOffering.findMany({
      where: { priestId: id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ offerings: offerings.map(serializeOffering) });
  });
}
