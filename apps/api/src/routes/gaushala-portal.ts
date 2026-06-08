import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

const profileUpdateSchema = z.object({
  gaushalaName: z.string().min(1).max(150).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
});

const cowCreateSchema = z.object({
  tagNumber: z.string().min(1).max(50).trim(),
  name: z.string().min(1).max(150).trim(),
  breed: z.string().max(100).trim().optional(),
  ageYears: z.coerce.number().int().min(0).max(40).optional(),
  gender: z.enum(['female', 'male']).default('female'),
  healthStatus: z.enum(['healthy', 'recovering', 'critical', 'quarantine']).default('healthy'),
  notes: z.string().max(2000).optional(),
});

// Donation.gaushalaId is a stringified user_id (no FK — see schema.prisma:1056-1059
// for the rationale). All aggregates here filter on `gaushalaId = currentUser.id`.

export async function gaushalaPortalRoutes(server: FastifyInstance) {
  // Paginated donations list for /gaushala-portal/donations.
  server.get('/donations', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('GAUSHALA_MANAGER')) {
      return reply.code(403).send({ error: 'GAUSHALA_MANAGER role required' });
    }
    const q = request.query as { status?: string; limit?: string };
    const limit = Math.min(Number(q.limit) || 100, 500);
    const statusMap: Record<string, 'created' | 'paid' | 'failed'> = {
      pending: 'created',
      received: 'paid',
      failed: 'failed',
    };
    const mapped = q.status ? statusMap[q.status.toLowerCase()] : undefined;
    const where: any = { gaushalaId: userId, ...(mapped ? { status: mapped } : {}) };
    const donations = await prisma.donation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { fullName: true, email: true } } },
    });
    return reply.send({
      donations: donations.map((d) => ({
        id: d.id,
        donor: d.user?.fullName ?? 'Anonymous',
        email: d.user?.email ?? null,
        amountInr: Number(d.amountInr),
        status: d.status, // created | paid | failed
        receiptNumber: d.receiptNumber ?? null,
        createdAt: d.createdAt,
        paidAt: d.paidAt,
      })),
    });
  });

  server.get('/dashboard', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('GAUSHALA_MANAGER')) {
      return reply.code(403).send({ error: 'GAUSHALA_MANAGER role required' });
    }

    const profile = await prisma.gaushalaProfile.findUnique({ where: { userId } });
    if (!profile) {
      return reply.send({
        profile: null,
        stats: { totalCows: 0, totalDonors: 0, totalDonationsInr: 0, monthDonationsInr: 0 },
        recentDonations: [],
        recentCows: [],
      });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const baseWhere = { gaushalaId: userId, status: 'paid' as const };

    const [donorRows, totalSum, monthSum, recent, recentCows] = await Promise.all([
      prisma.donation.findMany({
        where: baseWhere,
        select: { userId: true },
        distinct: ['userId'],
      }),
      prisma.donation.aggregate({ where: baseWhere, _sum: { amountInr: true } }),
      prisma.donation.aggregate({
        where: { ...baseWhere, paidAt: { gte: monthStart } },
        _sum: { amountInr: true },
      }),
      prisma.donation.findMany({
        where: baseWhere,
        orderBy: { paidAt: 'desc' },
        take: 10,
        include: { user: { select: { fullName: true } } },
      }),
      prisma.cow.findMany({
        where: { gaushalaId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return reply.send({
      profile,
      stats: {
        totalCows: profile.totalCows,
        totalDonors: donorRows.length,
        totalDonationsInr: Number(totalSum._sum.amountInr ?? 0),
        monthDonationsInr: Number(monthSum._sum.amountInr ?? 0),
      },
      recentDonations: recent.map((d) => ({
        id: d.id,
        donor: d.user.fullName ?? 'Anonymous',
        amountInr: Number(d.amountInr),
        paidAt: d.paidAt,
      })),
      recentCows: recentCows.map((c) => ({
        id: c.id,
        tagNumber: c.tagNumber,
        name: c.name,
        breed: c.breed,
        ageYears: c.ageYears,
        healthStatus: c.healthStatus,
      })),
    });
  });

  // GET /cows — list cows for the current gaushala manager.
  server.get('/cows', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('GAUSHALA_MANAGER')) {
      return reply.code(403).send({ error: 'GAUSHALA_MANAGER role required' });
    }
    const profile = await prisma.gaushalaProfile.findUnique({ where: { userId } });
    if (!profile) {
      return reply.send({ cows: [], total: 0 });
    }
    const cows = await prisma.cow.findMany({
      where: { gaushalaId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return reply.send({ cows, total: cows.length });
  });

  // POST /cows — register a new cow. Phase B Gaushala P0-2 fix (2026-06-08).
  server.post('/cows', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('GAUSHALA_MANAGER')) {
      return reply.code(403).send({ error: 'GAUSHALA_MANAGER role required' });
    }
    const parsed = cowCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const profile = await prisma.gaushalaProfile.findUnique({ where: { userId } });
    if (!profile) {
      return reply.code(409).send({
        error: 'Profile required',
        message: 'Create a gaushala profile before registering cows.',
      });
    }
    // Unique tagNumber per gaushala — prevent duplicates.
    const existing = await prisma.cow.findFirst({
      where: { gaushalaId: profile.id, tagNumber: parsed.data.tagNumber },
    });
    if (existing) {
      return reply.code(409).send({ error: 'Tag number already exists in this gaushala.' });
    }
    const cow = await prisma.cow.create({
      data: {
        gaushalaId: profile.id,
        tagNumber: parsed.data.tagNumber,
        name: parsed.data.name,
        breed: parsed.data.breed ?? null,
        ageYears: parsed.data.ageYears ?? null,
        gender: parsed.data.gender,
        healthStatus: parsed.data.healthStatus,
        notes: parsed.data.notes ?? null,
      },
    });
    return reply.code(201).send({ cow });
  });

  // Note: GET/POST/PATCH/DELETE /volunteers live in gaushala-volunteers.ts
  // (registered under the same /gaushala-portal prefix). Keep them there to
  // avoid duplicate route registration at boot.

  server.patch('/profile', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('GAUSHALA_MANAGER')) {
      return reply.code(403).send({ error: 'GAUSHALA_MANAGER role required' });
    }
    const parsed = profileUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const existing = await prisma.gaushalaProfile.findUnique({ where: { userId } });
    if (!existing) {
      const profile = await prisma.gaushalaProfile.create({
        data: {
          userId,
          gaushalaName: parsed.data.gaushalaName ?? 'My Gaushala',
          address: parsed.data.address,
          city: parsed.data.city,
          description: parsed.data.description,
        },
      });
      return reply.send({ profile });
    }
    const profile = await prisma.gaushalaProfile.update({
      where: { userId },
      data: parsed.data,
    });
    return reply.send({ profile });
  });
}
