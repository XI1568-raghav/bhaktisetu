import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  specialties: z.array(z.string().max(50)).max(20).optional(),
  certifications: z.array(z.string().max(100)).max(20).optional(),
  experience: z.number().int().min(0).max(80).optional(),
  pricePerSession: z.number().min(0).max(1000000).optional(),
  bio: z.string().max(2000).optional(),
});

export async function wellnessPortalRoutes(server: FastifyInstance) {
  server.get('/dashboard', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('WELLNESS_INSTRUCTOR')) {
      return reply.code(403).send({ error: 'WELLNESS_INSTRUCTOR role required' });
    }

    const profile = await prisma.wellnessProfile.findUnique({ where: { userId } });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalSessions, upcomingSessions, completedSessions, paidEnrollments, monthEnrollments, recent] = await Promise.all([
      prisma.wellnessSession.count({ where: { instructorId: userId } }),
      prisma.wellnessSession.findMany({
        where: { instructorId: userId, scheduledAt: { gte: now }, status: { in: ['SCHEDULED', 'LIVE'] } },
        orderBy: { scheduledAt: 'asc' },
        take: 10,
        include: { _count: { select: { enrollments: { where: { status: { in: ['PAID', 'ATTENDED'] } } } } } },
      }),
      prisma.wellnessSession.findMany({
        where: { instructorId: userId, status: 'COMPLETED' },
        select: { id: true, priceInr: true },
      }),
      prisma.wellnessEnrollment.findMany({
        where: { session: { instructorId: userId }, status: { in: ['PAID', 'ATTENDED'] } },
        select: { userId: true, session: { select: { priceInr: true } } },
      }),
      prisma.wellnessEnrollment.findMany({
        where: {
          session: { instructorId: userId },
          status: { in: ['PAID', 'ATTENDED'] },
          enrolledAt: { gte: monthStart },
        },
        select: { session: { select: { priceInr: true } } },
      }),
      prisma.wellnessSession.findMany({
        where: { instructorId: userId },
        orderBy: { scheduledAt: 'desc' },
        take: 10,
        select: {
          id: true, title: true, scheduledAt: true, durationMinutes: true,
          capacity: true, priceInr: true, status: true,
          _count: { select: { enrollments: { where: { status: { in: ['PAID', 'ATTENDED'] } } } } },
        },
      }),
    ]);

    const totalEarnings = paidEnrollments.reduce((sum, e) => sum + Number(e.session.priceInr), 0);
    const monthEarnings = monthEnrollments.reduce((sum, e) => sum + Number(e.session.priceInr), 0);
    const uniqueStudents = new Set(paidEnrollments.map((e) => e.userId)).size;

    return reply.send({
      profile,
      stats: {
        totalSessions,
        upcomingSessions: upcomingSessions.length,
        completedSessions: completedSessions.length,
        totalStudents: uniqueStudents,
        totalEarningsInr: totalEarnings,
        monthEarningsInr: monthEarnings,
      },
      upcomingSessions: upcomingSessions.map((s) => ({
        id: s.id,
        title: s.title,
        scheduledAt: s.scheduledAt,
        durationMinutes: s.durationMinutes,
        capacity: s.capacity,
        priceInr: Number(s.priceInr),
        enrolled: s._count.enrollments,
      })),
      recentSessions: recent.map((s) => ({
        id: s.id,
        title: s.title,
        scheduledAt: s.scheduledAt,
        status: s.status,
        priceInr: Number(s.priceInr),
        enrolled: s._count.enrollments,
      })),
    });
  });

  server.patch('/profile', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('WELLNESS_INSTRUCTOR')) {
      return reply.code(403).send({ error: 'WELLNESS_INSTRUCTOR role required' });
    }
    const parsed = profileUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const existing = await prisma.wellnessProfile.findUnique({ where: { userId } });
    if (!existing) {
      const profile = await prisma.wellnessProfile.create({
        data: {
          userId,
          displayName: parsed.data.displayName ?? 'Instructor',
          specialties: parsed.data.specialties ?? [],
          certifications: parsed.data.certifications ?? [],
          experience: parsed.data.experience ?? 0,
          pricePerSession: parsed.data.pricePerSession ?? 500,
          bio: parsed.data.bio,
        },
      });
      return reply.send({ profile });
    }
    const profile = await prisma.wellnessProfile.update({
      where: { userId },
      data: parsed.data,
    });
    return reply.send({ profile });
  });
}
