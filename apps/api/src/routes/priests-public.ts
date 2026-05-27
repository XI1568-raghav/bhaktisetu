import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

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
  // GET / — list verified active priests with active-offering counts.
  // Optional filters: ?specialization=marriage&deity=ganesh — applied
  // server-side so clients don't pull the full list and post-filter (E10).
  server.get('/', async (request, reply) => {
    const q = request.query as { specialization?: string; deity?: string };
    const where: Record<string, unknown> = { isVerified: true, status: 'active' };
    if (q.specialization && q.specialization.trim()) {
      where.specializations = { has: q.specialization.trim().toLowerCase() };
    }
    if (q.deity && q.deity.trim()) {
      where.offerings = {
        some: { isActive: true, deity: { equals: q.deity.trim(), mode: 'insensitive' } },
      };
    }
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
