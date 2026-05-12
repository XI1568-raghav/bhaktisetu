import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

// No persistent Consultation model — Jitsi rooms are ephemeral (see consultation.ts).
// Stats below derive from AstrologerProfile counters maintained elsewhere; sessions
// + earnings remain 0 until a Consultation table lands.

export async function astrologerPortalRoutes(server: FastifyInstance) {
  server.get('/dashboard', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('ASTROLOGER')) {
      return reply.code(403).send({ error: 'ASTROLOGER role required' });
    }

    const profile = await prisma.astrologerProfile.findUnique({ where: { userId } });

    return reply.send({
      profile,
      stats: {
        totalConsultations: profile?.totalConsultations ?? 0,
        rating: profile?.rating ?? 0,
        pricePerMinute: profile ? Number(profile.pricePerMinute) : 0,
        approved: profile?.approved ?? false,
        // Real earnings + active-client counts pending Consultation model.
        consultationsToday: 0,
        earningsTodayInr: 0,
        earningsMonthInr: 0,
        totalEarningsInr: 0,
        activeClients: 0,
      },
      upcomingSessions: [],
    });
  });
}
