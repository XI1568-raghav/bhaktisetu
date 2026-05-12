import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

// Donation.gaushalaId is a stringified user_id (no FK — see schema.prisma:1056-1059
// for the rationale). All aggregates here filter on `gaushalaId = currentUser.id`.

export async function gaushalaPortalRoutes(server: FastifyInstance) {
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
      });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const baseWhere = { gaushalaId: userId, status: 'paid' as const };

    const [donorRows, totalSum, monthSum, recent] = await Promise.all([
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
    });
  });
}
