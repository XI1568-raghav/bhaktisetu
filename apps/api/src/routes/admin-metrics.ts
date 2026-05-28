import type { FastifyInstance, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

/**
 * Real-numbers founder dashboard — token OR admin-Bearer gated.
 *
 *   GET /api/v1/admin/metrics/investor?token=… → investor-weekly-digest-v2 agent
 *   GET /api/v1/admin/metrics/funnel?days=7&token=… → funnel-drop-analyzer agent
 *   GET /api/v1/admin/metrics/dashboard (Bearer admin) → /admin/metrics web page
 *
 * Auth: either ?token=<CRON_AUTH_TOKEN> OR Authorization: Bearer <admin JWT>.
 * Single helper so the same handler serves both agents + the web dashboard.
 */

const cronToken = process.env.CRON_AUTH_TOKEN ?? '';

function tokenAuthorised(provided: string | undefined): boolean {
  if (!cronToken || !provided) return false;
  if (provided.length !== cronToken.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(cronToken));
  } catch {
    return false;
  }
}

async function authorised(request: FastifyRequest, query: { token?: string }): Promise<boolean> {
  if (tokenAuthorised(query.token)) return true;
  // Fallback: admin Bearer. authenticateUser returns by writing the reply on
  // failure, so we shadow the reply with a stub to keep the failure silent.
  const stubReply = {
    code: () => stubReply,
    send: () => stubReply,
  } as unknown as Parameters<typeof authenticateUser>[1];
  try {
    await authenticateUser(request, stubReply);
  } catch {
    return false;
  }
  return request.currentUser?.roles?.includes('ADMIN') === true;
}

interface TokenQuery {
  token?: string;
}

interface FunnelQuery extends TokenQuery {
  days?: string;
}

// Daily window helpers. UTC midnight boundaries — agents read in UTC too.
function startOfDayUtc(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 3600_000);
}

// Decimal → paise. Prisma Decimal serialises as string in JSON; coerce safely.
function decToPaise(d: unknown): number {
  if (d == null) return 0;
  const n = Number(d);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export async function adminMetricsRoutes(server: FastifyInstance) {
  // ── Investor digest feed ─────────────────────────────────────────────
  server.get<{ Querystring: TokenQuery }>('/investor', async (request, reply) => {
    if (!(await authorised(request, request.query))) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const since30 = daysAgo(30);
    const since7 = daysAgo(7);

    // MRR — last-30d successful Payments
    const mrr = await prisma.payment.aggregate({
      where: { status: 'captured', createdAt: { gte: since30 } },
      _sum: { amount: true },
    }).catch(() => null);

    // GMV cumulative — all-time successful Payments
    const gmv = await prisma.payment.aggregate({
      where: { status: 'captured' },
      _sum: { amount: true },
    }).catch(() => null);

    // Distinct paying users
    const paidUserRows = await prisma.payment.findMany({
      where: { status: 'captured' },
      select: { userId: true },
      distinct: ['userId'],
    }).catch(() => [] as Array<{ userId: string }>);
    const paidUsers = paidUserRows.length;

    // NRI mix — share of paying users with isNri=true
    let nriMixPct: number | null = null;
    if (paidUsers > 0) {
      const nriCount = await prisma.user.count({
        where: { isNri: true, id: { in: paidUserRows.map((r) => r.userId) } },
      }).catch(() => 0);
      nriMixPct = nriCount / paidUsers;
    }

    // Signups this week + active users (any payment or booking in 30d)
    const signupsThisWeek = await prisma.user.count({
      where: { createdAt: { gte: since7 } },
    }).catch(() => 0);

    const activeFromPayments = await prisma.payment.findMany({
      where: { createdAt: { gte: since30 } },
      select: { userId: true },
      distinct: ['userId'],
    }).catch(() => [] as Array<{ userId: string }>);
    const activeFromBookings = await prisma.pujaBooking.findMany({
      where: { createdAt: { gte: since30 } },
      select: { userId: true },
      distinct: ['userId'],
    }).catch(() => [] as Array<{ userId: string }>);
    const activeUsers = new Set([
      ...activeFromPayments.map((r) => r.userId),
      ...activeFromBookings.map((r) => r.userId),
    ]).size;

    // Line breakdown — bookings + donations + (store via Payment.metadata gap, omit)
    const bookingAgg = await prisma.pujaBooking.aggregate({
      _count: { _all: true },
      _sum: { priceAmount: true, platformCommission: true },
      where: { status: { in: ['confirmed', 'priest_assigned', 'in_progress', 'completed'] } },
    }).catch(() => null);

    const donationAgg = await prisma.donation.aggregate({
      _count: { _all: true },
      _sum: { amountInr: true },
      where: { status: 'paid' },
    }).catch(() => null);

    const donationGmvPaise = decToPaise(donationAgg?._sum?.amountInr ?? null);
    const lineBreakdown = [
      {
        name: 'Puja bookings',
        count: bookingAgg?._count?._all ?? 0,
        gmvPaise: decToPaise(bookingAgg?._sum?.priceAmount ?? null),
        netPaise: decToPaise(bookingAgg?._sum?.platformCommission ?? null),
      },
      {
        name: 'Donations',
        count: donationAgg?._count?._all ?? 0,
        gmvPaise: donationGmvPaise,
        // 5-10% commission per project pricing. Use 7.5% midpoint.
        netPaise: Math.round(donationGmvPaise * 0.075),
      },
    ];

    return reply.send({
      mrrPaise: decToPaise(mrr?._sum?.amount ?? null),
      gmvCumulativePaise: decToPaise(gmv?._sum?.amount ?? null),
      paidUsers,
      nriMixPct,
      signupsThisWeek,
      activeUsers,
      // Sprint-4+ — needs CAC source + cohort retention table. Null placeholder.
      cacPaise: null,
      d7Retention: null,
      d30Retention: null,
      lineBreakdown,
      topFunnelLeaks: [],
      generatedAt: new Date().toISOString(),
    });
  });

  // ── Funnel-drop feed ─────────────────────────────────────────────────
  server.get<{ Querystring: FunnelQuery }>('/funnel', async (request, reply) => {
    if (!(await authorised(request, request.query))) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const days = Math.min(Math.max(Number(request.query.days) || 7, 2), 30);
    const since = startOfDayUtc(daysAgo(days));

    // Pull raw rows; bucket in app. Cheap on free-tier DB — caps ~3k rows/day.
    const [leads, users, bookings, payments] = await Promise.all([
      prisma.lead.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, status: true },
      }).catch(() => [] as Array<{ createdAt: Date; status: string }>),
      prisma.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, phone: true, email: true },
      }).catch(() => [] as Array<{ createdAt: Date; phone: string | null; email: string | null }>),
      prisma.pujaBooking.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }).catch(() => [] as Array<{ createdAt: Date }>),
      prisma.payment.findMany({
        where: { createdAt: { gte: since }, status: 'captured' },
        select: { createdAt: true },
      }).catch(() => [] as Array<{ createdAt: Date }>),
    ]);

    // Seed each day key so the agent baseline median has a zero floor.
    type Stages = { landing: number; signup: number; kyc: number; booking: number; payment_success: number };
    const daily: Record<string, Stages> = {};
    for (let i = 0; i < days; i++) {
      const k = dayKey(daysAgo(i));
      daily[k] = { landing: 0, signup: 0, kyc: 0, booking: 0, payment_success: 0 };
    }

    for (const l of leads) {
      const row = daily[dayKey(l.createdAt)];
      if (row) row.landing += 1;
    }
    for (const u of users) {
      const row = daily[dayKey(u.createdAt)];
      if (row) {
        row.signup += 1;
        if (u.phone || u.email) row.kyc += 1;
      }
    }
    for (const b of bookings) {
      const row = daily[dayKey(b.createdAt)];
      if (row) row.booking += 1;
    }
    for (const p of payments) {
      const row = daily[dayKey(p.createdAt)];
      if (row) row.payment_success += 1;
    }

    return reply.send({
      daily: Object.entries(daily)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stages]) => ({ date, stages })),
      generatedAt: new Date().toISOString(),
    });
  });

  // ── Combined dashboard payload (web /admin/metrics convenience) ─────
  server.get<{ Querystring: TokenQuery }>('/dashboard', async (request, reply) => {
    if (!(await authorised(request, request.query))) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const since30 = daysAgo(30);
    const sinceToday = startOfDayUtc(new Date());

    const [todayPayments, todayBookings, todaySignups, mrrAgg, gmvAgg] = await Promise.all([
      prisma.payment.aggregate({
        _count: { _all: true },
        _sum: { amount: true },
        where: { status: 'captured', createdAt: { gte: sinceToday } },
      }).catch(() => null),
      prisma.pujaBooking.count({ where: { createdAt: { gte: sinceToday } } }).catch(() => 0),
      prisma.user.count({ where: { createdAt: { gte: sinceToday } } }).catch(() => 0),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'captured', createdAt: { gte: since30 } },
      }).catch(() => null),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'captured' },
      }).catch(() => null),
    ]);

    return reply.send({
      today: {
        date: dayKey(new Date()),
        gmvPaise: decToPaise(todayPayments?._sum?.amount ?? null),
        successfulPayments: todayPayments?._count?._all ?? 0,
        bookings: todayBookings,
        signups: todaySignups,
      },
      mrrPaise: decToPaise(mrrAgg?._sum?.amount ?? null),
      gmvCumulativePaise: decToPaise(gmvAgg?._sum?.amount ?? null),
      generatedAt: new Date().toISOString(),
    });
  });
}
