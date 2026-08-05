import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import {
  setAstrologerOnline,
  getAstrologerPresence,
  ASTROLOGER_SHARE,
} from '../services/astrologer.service.js';

const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  specialties: z.array(z.string().max(50)).max(20).optional(),
  experience: z.number().int().min(0).max(80).optional(),
  languages: z.array(z.string().max(30)).max(20).optional(),
  // P0 #AP-09 (2026-07-09): floor at ₹1/min, not 0. The old .min(0) let an
  // astrologer save ₹0/min; devotees then hit /consultation/book's "Minimum
  // consultation amount is ₹50" 400 with no hint that the rate was the cause.
  // ₹1/min × the shortest slot still clears ₹50 for any reasonable duration;
  // the booking endpoint enforces the absolute ₹50 floor independently.
  pricePerMinute: z.number().min(1, 'Per-minute rate must be at least ₹1.').max(100000).optional(),
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

    // P0 #AP-04/05 (2026-07-09): astrologer attribution. astrologer_consultations.
    // astrologer_id is TEXT and has been written as several forms over time —
    // the mock slug ('astro-001'), the AstrologerProfile.id (UUID), and (legacy)
    // the User UUID. Filtering on a single value (the User UUID) missed every
    // row stored under the profile id, so a real astrologer saw 0 consultations
    // / 0 earnings / 0 upcoming forever. Match on BOTH the profile id and the
    // User UUID so all attribution forms resolve. (Mock-slug demo rows still
    // won't match — correct, they aren't a real astrologer's bookings.)
    const astrologerIdValues = [profile?.id, userId].filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    );

    // Surface real bookings from raw-SQL astrologer_consultations table.
    // Safe-default empty arrays on table miss.
    let consultationsToday = 0;
    let earningsTodayInr = 0;
    let earningsMonthInr = 0;
    let totalEarningsInr = 0;
    let upcomingSessions: unknown[] = [];
    try {
      if (astrologerIdValues.length > 0) {
        // Build an IN-list placeholder per value ($2, $3, ...) — $1 is the count
        // for Postgres ANY-array isn't needed; use ANY($1::text[]) instead so we
        // pass a single array param regardless of how many ids resolved.
        const idArray = astrologerIdValues;
        const today = await prisma.$queryRawUnsafe<Array<{ count: string; sum: string | null }>>(
          `SELECT COUNT(*)::text AS count, COALESCE(SUM(amount_inr),0)::text AS sum
           FROM astrologer_consultations
           WHERE astrologer_id = ANY($1::text[]) AND status = 'confirmed'
             AND paid_at::date = CURRENT_DATE`,
          idArray,
        );
        consultationsToday = Number(today[0]?.count ?? 0);
        earningsTodayInr = Number(today[0]?.sum ?? 0);

        const month = await prisma.$queryRawUnsafe<Array<{ sum: string | null }>>(
          `SELECT COALESCE(SUM(amount_inr),0)::text AS sum
           FROM astrologer_consultations
           WHERE astrologer_id = ANY($1::text[]) AND status = 'confirmed'
             AND date_trunc('month', paid_at) = date_trunc('month', CURRENT_DATE)`,
          idArray,
        );
        earningsMonthInr = Number(month[0]?.sum ?? 0);

        const all = await prisma.$queryRawUnsafe<Array<{ sum: string | null }>>(
          `SELECT COALESCE(SUM(amount_inr),0)::text AS sum
           FROM astrologer_consultations
           WHERE astrologer_id = ANY($1::text[]) AND status = 'confirmed'`,
          idArray,
        );
        totalEarningsInr = Number(all[0]?.sum ?? 0);

        upcomingSessions = await prisma.$queryRawUnsafe<unknown[]>(
          `SELECT id, reference, user_id, minutes, amount_inr, scheduled_at, room_name, status, created_at
           FROM astrologer_consultations
           WHERE astrologer_id = ANY($1::text[]) AND status = 'confirmed'
             AND (scheduled_at IS NULL OR scheduled_at >= now() - interval '1 hour')
           ORDER BY COALESCE(scheduled_at, created_at) ASC
           LIMIT 20`,
          idArray,
        );
      }
    } catch (err) {
      server.log.warn({ err }, 'astrologer_consultations query failed (table may not exist yet)');
    }

    return reply.send({
      profile,
      stats: {
        totalConsultations: profile?.totalConsultations ?? 0,
        rating: profile?.rating ?? 0,
        pricePerMinute: profile ? Number(profile.pricePerMinute) : 0,
        approved: profile?.approved ?? false,
        consultationsToday,
        earningsTodayInr,
        earningsMonthInr,
        totalEarningsInr,
        activeClients: upcomingSessions.length,
      },
      upcomingSessions,
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

  // ─── POST /online — the astrologer's go-online/offline presence toggle ──────
  // Astrologer revamp (2026-08-05): the portal had NO live presence toggle —
  // devotees couldn't tell who was online, and the booking flow couldn't gate
  // on it. This is the Uber/AstroTalk "go online" switch. Presence is in-memory
  // (15-min heartbeat decay); a future migration can persist isOnline.
  server.post('/online', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('ASTROLOGER')) {
      return reply.code(403).send({ error: 'ASTROLOGER role required' });
    }
    const body = z
      .object({
        online: z.boolean(),
        chat: z.boolean().optional(),
        call: z.boolean().optional(),
      })
      .parse(request.body ?? {});
    const presence = setAstrologerOnline(userId, body.online, { chat: body.chat, call: body.call });
    return reply.send({
      ok: true,
      online: presence.online,
      mode: presence.mode,
      message: presence.online ? 'You are now online.' : 'You are now offline.',
    });
  });

  // ─── GET /online — read the caller's current presence ───────────────────────
  server.get('/online', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const presence = getAstrologerPresence(userId);
    return reply.send({ online: presence.online, mode: presence.mode });
  });

  // ─── GET /earnings — the astrologer's OWN earnings (fixes the dead /admin/me)
  // Before: the Earnings page called /admin/commissions?providerId=me, an
  // admin-only route that 403'd every real astrologer — the page was dead.
  // This returns the caller's commission rows + derived payout (their 80%
  // share) so the portal Earnings panel actually works.
  server.get('/earnings', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('ASTROLOGER')) {
      return reply.code(403).send({ error: 'ASTROLOGER role required' });
    }
    const rows = await prisma.commission.findMany({
      where: { providerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const data = rows.map((c) => {
      const platformAmount = Number(c.amount);
      // Commission.amount is the PLATFORM cut; the astrologer's earning is the
      // remainder of the gross. gross = platform / platformRate.
      const rate = Number(c.percentage) || 0.2;
      const gross = rate > 0 ? platformAmount / rate : 0;
      const astrologerAmount = Math.round((gross - platformAmount) * 100) / 100;
      return {
        id: c.id,
        bookingId: c.bookingId,
        status: c.status,
        createdAt: c.createdAt,
        grossAmountInr: Math.round(gross * 100) / 100,
        platformCutInr: platformAmount,
        earningsInr: astrologerAmount,
        astrologerShare: ASTROLOGER_SHARE,
      };
    });
    const totalEarnings = data.reduce((s, r) => s + r.earningsInr, 0);
    const pending = data.filter((r) => r.status === 'PENDING').reduce((s, r) => s + r.earningsInr, 0);
    const paid = data.filter((r) => r.status === 'PAID').reduce((s, r) => s + r.earningsInr, 0);
    return reply.send({
      data,
      summary: {
        totalEarningsInr: Math.round(totalEarnings * 100) / 100,
        pendingInr: Math.round(pending * 100) / 100,
        paidInr: Math.round(paid * 100) / 100,
        astrologerShare: ASTROLOGER_SHARE,
      },
    });
  });
}
