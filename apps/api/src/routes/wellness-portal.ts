import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';

const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  specialties: z.array(z.string().max(50)).max(20).optional(),
  certifications: z.array(z.string().max(100)).max(20).optional(),
  experience: z.number().int().min(0).max(80).optional(),
  pricePerSession: z.number().min(0).max(1000000).optional(),
  bio: z.string().max(2000).optional(),
});

// ─── instructor LIST schema ─────────────────────────────────────────────────
// Mirrors consultation.ts astrologerListSchema: optional status from the
// WellnessSessionStatus enum + paginated limit/offset (URL query strings
// arrive as strings so use z.coerce). limit capped at 200 to keep payload
// bounded; offset >=0 to prevent negative pagination drift.
const mineQuerySchema = z.object({
  status: z.enum(['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Same regex as routes/astrologer-portal.ts:27 — a value that cannot be a uuid
// cannot match a uuid column, so the honest answer is a miss, not a 22P02.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}

export const __testing = { mineQuerySchema, isUuid };

/**
 * The instructor's settled / unsettled split, straight off the Commission
 * ledger — the same source payout.service.getPayoutBalance and the Earnings
 * page read, so the dashboard cannot state a different number than either.
 *
 * AW-10 (2026-08-12, P2): the dashboard had no such split, so the page
 * hardcoded `pending={null}` ("Pending payout —") and printed the LIFETIME
 * earnings figure under the label "Paid out" — claiming ₹800 had been
 * transferred when /payouts/balance said paidOutInr 0.
 *
 * `Commission.amount` IS the provider's earning and `percentage` IS the
 * platform's take rate (lib/commission-math.ts). Neither is re-derived here.
 * `wellnessEnrollmentId: { not: null }` is the discriminator: without it a
 * dual-role provider's puja or consultation commissions would render as
 * wellness earnings.
 */
async function loadInstructorPayoutSplit(userId: string) {
  if (!isUuid(userId)) return { paidOutInr: 0, pendingPayoutInr: 0, upcomingInr: 0 };
  const rows = await prisma.commission.findMany({
    where: { providerId: userId, wellnessEnrollmentId: { not: null } },
    select: { amount: true, status: true, wellnessEnrollmentId: true },
    take: 500,
  });
  const round2 = (n: number) => Math.round(n * 100) / 100;
  // A REVERSED row is a refunded enrolment. It is not earned, not pending and
  // not paid — it must not appear in either total.
  const live = rows.filter((r) => r.status !== 'REVERSED');
  const sumOf = (status: string) =>
    round2(live.filter((r) => r.status === status).reduce((s, r) => s + Number(r.amount), 0));
  // A PENDING row whose session has not been held yet is earned but not
  // withdrawable (payout.service holds it the same way), so it is reported as
  // `upcomingInr` and kept out of `pendingPayoutInr`.
  const pendingIds = live
    .filter((r) => r.status === 'PENDING' && r.wellnessEnrollmentId)
    .map((r) => r.wellnessEnrollmentId as string);
  const upcoming = pendingIds.length
    ? await prisma.wellnessEnrollment.findMany({
        where: {
          id: { in: pendingIds },
          session: { scheduledAt: { gt: new Date() }, status: { not: 'COMPLETED' } },
        },
        select: { id: true },
        take: 500,
      })
    : [];
  const upcomingSet = new Set(upcoming.map((e) => e.id));
  const pendingOf = (held: boolean) =>
    round2(
      live
        .filter(
          (r) =>
            r.status === 'PENDING' &&
            upcomingSet.has(r.wellnessEnrollmentId as string) === held,
        )
        .reduce((s, r) => s + Number(r.amount), 0),
    );
  return { paidOutInr: sumOf('PAID'), pendingPayoutInr: pendingOf(false), upcomingInr: pendingOf(true) };
}

type WellnessSessionRow = {
  id: string;
  instructor_id: string;
  title: string;
  description: string;
  type: string;
  scheduled_at: Date | null;
  duration_minutes: number;
  capacity: number;
  price_inr: string;
  room_url: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

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

    // Wellness revamp: the dashboard previously showed GROSS (sum of full
    // priceInr), but the instructor's earnings are their (1 - platformRate)
    // share — the same number the Commission ledger writes. Showing gross
    // overstated what they'd actually be paid. Compute the instructor share.
    const platformRate = Number(process.env.WELLNESS_PLATFORM_COMMISSION ?? '0.20');
    const share = 1 - (Number.isFinite(platformRate) ? platformRate : 0.2);
    const grossTotal = paidEnrollments.reduce((sum, e) => sum + Number(e.session.priceInr), 0);
    const grossMonth = monthEnrollments.reduce((sum, e) => sum + Number(e.session.priceInr), 0);
    const totalEarnings = Math.round(grossTotal * share * 100) / 100;
    const monthEarnings = Math.round(grossMonth * share * 100) / 100;
    const uniqueStudents = new Set(paidEnrollments.map((e) => e.userId)).size;

    // AW-10: the settled/unsettled split the "Paid out" and "Pending payout"
    // cards needed. See loadInstructorPayoutSplit.
    const payoutSplit = await loadInstructorPayoutSplit(userId);

    return reply.send({
      profile,
      stats: {
        totalSessions,
        upcomingSessions: upcomingSessions.length,
        completedSessions: completedSessions.length,
        totalStudents: uniqueStudents,
        totalEarningsInr: totalEarnings,
        monthEarningsInr: monthEarnings,
        // AW-10: settled vs unsettled. `totalEarningsInr` above is the
        // instructor's LIFETIME net share and must never again be labelled
        // "Paid out" — only `paidOutInr` describes money that actually moved.
        paidOutInr: payoutSplit.paidOutInr,
        pendingPayoutInr: payoutSplit.pendingPayoutInr,
        // Earned from sessions that have not been held yet: not withdrawable.
        upcomingInr: payoutSplit.upcomingInr,
        instructorShare: share,
        platformRate,
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

  // ─── GET /instructor/mine ───────────────────────────────────────────────
  // Wellness-instructor-side LIST of WellnessSession rows where this user is
  // the instructor. Mirrors consultation.ts GET /astrologer/mine: optional
  // status filter, paginated, ordered by scheduledAt DESC NULLS LAST then
  // createdAt DESC. Raw parameterized SQL keeps the shape consistent with
  // the astrologer endpoint (single query path, NULLS LAST nicely supported)
  // even though WellnessSession is a real Prisma model.
  server.get(
    '/instructor/mine',
    { preHandler: [authenticateUser, requireRole('WELLNESS_INSTRUCTOR')] },
    async (request, reply) => {
      const parsed = mineQuerySchema.safeParse(request.query ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid query', issues: parsed.error.flatten() });
      }
      const { status, limit, offset } = parsed.data;
      const instructorId = request.currentUser!.id;

      // AW-12: an id that cannot be stored in a uuid column cannot match a row
      // in one. Answering an empty page is the true result; sending it to
      // Postgres only earns a 22P02 "invalid input syntax for type uuid" 500.
      if (!isUuid(instructorId)) {
        return reply.send({ total: 0, limit, offset, sessions: [] });
      }

      const params: unknown[] = [instructorId];
      // AW-12: both predicates compare against a NON-text column —
      // wellness_sessions.instructor_id is `uuid` and .status is the
      // `WellnessSessionStatus` enum — and Prisma binds raw params as `text`.
      // Without these casts Postgres refused every single call with
      // `42883 operator does not exist: uuid = text` (and, once the id was
      // cast, `... "WellnessSessionStatus" = text`), so the endpoint 500'd on
      // 100% of requests and leaked the raw SQL error to the caller.
      let whereSql = `WHERE instructor_id = $1::uuid`;
      if (status) {
        params.push(status);
        whereSql += ` AND status = $${params.length}::"WellnessSessionStatus"`;
      }
      params.push(limit);
      params.push(offset);
      const sql = `SELECT * FROM wellness_sessions ${whereSql}
         ORDER BY scheduled_at DESC NULLS LAST, created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length};`;

      const rows = await prisma.$queryRawUnsafe<WellnessSessionRow[]>(sql, ...params);
      const countParams = params.slice(0, params.length - 2);
      const countSql = `SELECT COUNT(*)::int AS total FROM wellness_sessions ${whereSql};`;
      const countRows = await prisma.$queryRawUnsafe<{ total: number }[]>(countSql, ...countParams);
      const total = countRows[0]?.total ?? 0;

      return reply.send({
        total,
        limit,
        offset,
        sessions: rows.map((row) => ({
          id: row.id,
          instructorId: row.instructor_id,
          title: row.title,
          description: row.description,
          type: row.type,
          scheduledAt: row.scheduled_at,
          durationMinutes: row.duration_minutes,
          capacity: row.capacity,
          priceInr: Number(row.price_inr),
          roomUrl: row.room_url,
          zoomUrl: row.room_url,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      });
    },
  );

  // ─── GET /students ──────────────────────────────────────────────────────────
  // Distinct devotees who have paid for any of this instructor's wellness
  // sessions. Empty array OK when there are no paid enrollments yet.

  server.get('/students', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('WELLNESS_INSTRUCTOR')) {
      return reply.code(403).send({ error: 'WELLNESS_INSTRUCTOR role required' });
    }

    const enrollments = await prisma.wellnessEnrollment.findMany({
      where: {
        session: { instructorId: userId },
        status: { in: ['PAID', 'ATTENDED'] },
      },
      orderBy: { enrolledAt: 'desc' },
      take: 500,
      select: {
        userId: true,
        status: true,
        enrolledAt: true,
        attendedAt: true,
        session: { select: { id: true, title: true, scheduledAt: true } },
        user: { select: { id: true, fullName: true, email: true, phone: true } },
      },
    });

    // Collapse to one row per devotee with their most recent session and
    // a session count — UI list wants "student" cards, not raw enrollments.
    const byUser = new Map<string, {
      id: string;
      fullName: string;
      email: string | null;
      phone: string | null;
      sessionCount: number;
      lastEnrolledAt: Date;
      lastSession: { id: string; title: string; scheduledAt: Date };
      hasAttended: boolean;
    }>();
    for (const e of enrollments) {
      const existing = byUser.get(e.userId);
      if (existing) {
        existing.sessionCount += 1;
        existing.hasAttended = existing.hasAttended || e.status === 'ATTENDED';
      } else {
        byUser.set(e.userId, {
          id: e.user.id,
          fullName: e.user.fullName,
          email: e.user.email,
          phone: e.user.phone,
          sessionCount: 1,
          lastEnrolledAt: e.enrolledAt,
          lastSession: e.session,
          hasAttended: e.status === 'ATTENDED',
        });
      }
    }

    const students = Array.from(byUser.values());
    return reply.send({ students, total: students.length });
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
