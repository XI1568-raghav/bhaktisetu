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

  server.get('/volunteers', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('GAUSHALA_MANAGER')) {
      return reply.code(403).send({ error: 'GAUSHALA_MANAGER role required' });
    }
    const volunteers = await prisma.volunteer.findMany({
      where: { gaushalaId: userId, active: true },
      orderBy: { joinedAt: 'desc' },
      take: 100,
    });
    return reply.send({
      volunteers: volunteers.map((v) => ({
        id: v.id,
        name: v.fullName,
        phone: v.phone ?? undefined,
        skill: v.role,
        joinedAt: v.joinedAt,
        // No hours-tracking table yet — omit field, mobile shows '—'.
      })),
    });
  });

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
