import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  specialties: z.array(z.string().max(50)).max(20).optional(),
  experience: z.number().int().min(0).max(80).optional(),
  languages: z.array(z.string().max(30)).max(20).optional(),
  pricePerMinute: z.number().min(0).max(100000).optional(),
  bio: z.string().max(2000).optional(),
});

// Availability is intentionally free-form JSON so the portal can iterate on
// the slot shape without a migration. Cap at 64KB to prevent abuse.
const availabilityUpdateSchema = z.object({
  availability: z.unknown().refine((v) => {
    try {
      return JSON.stringify(v).length <= 64 * 1024;
    } catch {
      return false;
    }
  }, 'availability JSON exceeds 64KB cap'),
});

export const __testing = { profileUpdateSchema, availabilityUpdateSchema };

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

  server.patch('/profile', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('ASTROLOGER')) {
      return reply.code(403).send({ error: 'ASTROLOGER role required' });
    }
    const parsed = profileUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const existing = await prisma.astrologerProfile.findUnique({ where: { userId } });
    if (!existing) {
      const profile = await prisma.astrologerProfile.create({
        data: {
          userId,
          displayName: parsed.data.displayName ?? 'Astrologer',
          specialties: parsed.data.specialties ?? [],
          languages: parsed.data.languages ?? [],
          experience: parsed.data.experience ?? 0,
          pricePerMinute: parsed.data.pricePerMinute ?? 10,
          bio: parsed.data.bio,
        },
      });
      return reply.send({ profile });
    }
    const profile = await prisma.astrologerProfile.update({
      where: { userId },
      data: parsed.data,
    });
    return reply.send({ profile });
  });

  // ─── PATCH /availability ────────────────────────────────────────────────────
  // Free-form weekly availability blob (see schema.prisma comment). Replaces
  // the previous value wholesale — partial merging is a UI concern.

  server.patch('/availability', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('ASTROLOGER')) {
      return reply.code(403).send({ error: 'ASTROLOGER role required' });
    }
    const parsed = availabilityUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const existing = await prisma.astrologerProfile.findUnique({ where: { userId } });
    if (!existing) {
      // Mirror PATCH /profile's auto-create behaviour so a fresh astrologer
      // can set availability before completing profile onboarding.
      const profile = await prisma.astrologerProfile.create({
        data: {
          userId,
          displayName: 'Astrologer',
          specialties: [],
          languages: [],
          experience: 0,
          pricePerMinute: 10,
          availability: parsed.data.availability as object,
        },
      });
      return reply.send({ availability: profile.availability });
    }
    const profile = await prisma.astrologerProfile.update({
      where: { userId },
      data: { availability: parsed.data.availability as object },
    });
    return reply.send({ availability: profile.availability });
  });
}
