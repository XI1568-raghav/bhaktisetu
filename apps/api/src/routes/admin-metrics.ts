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

/** One funnel stage's count for one UTC day. */
type DayCountRow = { day: string; n: number | bigint | null };

export type FunnelStages = {
  landing: number;
  signup: number;
  kyc: number;
  booking: number;
  payment_success: number;
};

function toCount(n: number | bigint | null | undefined): number {
  if (n == null) return 0;
  return typeof n === 'bigint' ? Number(n) : n;
}

/**
 * Per-day funnel counts, aggregated by Postgres.
 *
 * SCAL-04 (2026-08-13): this used to be four unbounded `findMany` calls whose
 * rows were bucketed by day in a JS loop — 15,040 kB for the users query and
 * 13,282 kB for the bookings query at 200k rows, measured with EXPLAIN
 * (ANALYZE, SERIALIZE). The daily funnel-drop-analyzer cron hits this endpoint,
 * so that was ~28 MB into a 512 MB container on a schedule. `date_trunc` gives
 * back at most `days` rows per table (30 max) — the same numbers, ~99.9% less
 * wire.
 *
 * The day key is UTC, matching `dayKey()`: created_at is `timestamp` and Prisma
 * writes UTC, so `date_trunc('day', created_at)` truncates on the same boundary
 * `toISOString().slice(0, 10)` reads.
 *
 * Each query degrades to an empty result independently, exactly as the four
 * `.catch(() => [])` calls did — a missing table must not 500 the whole feed.
 * Days with no rows simply keep the zero floor seeded by the caller.
 */
export async function loadFunnelDaily(since: Date): Promise<Record<string, FunnelStages>> {
  const [leadRows, userRows, bookingRows, paymentRows] = await Promise.all([
    prisma.$queryRaw<DayCountRow[]>`
      SELECT to_char(date_trunc('day', "created_at"), 'YYYY-MM-DD') AS day, count(*)::int AS n
      FROM "leads" WHERE "created_at" >= ${since} GROUP BY 1
    `.catch(() => [] as DayCountRow[]),
    prisma.$queryRaw<Array<DayCountRow & { kyc: number | bigint | null }>>`
      SELECT to_char(date_trunc('day', "created_at"), 'YYYY-MM-DD') AS day,
             count(*)::int AS n,
             count(*) FILTER (WHERE "phone" IS NOT NULL OR "email" IS NOT NULL)::int AS kyc
      FROM "users" WHERE "created_at" >= ${since} GROUP BY 1
    `.catch(() => [] as Array<DayCountRow & { kyc: number | bigint | null }>),
    prisma.$queryRaw<DayCountRow[]>`
      SELECT to_char(date_trunc('day', "created_at"), 'YYYY-MM-DD') AS day, count(*)::int AS n
      FROM "puja_bookings" WHERE "created_at" >= ${since} GROUP BY 1
    `.catch(() => [] as DayCountRow[]),
    prisma.$queryRaw<DayCountRow[]>`
      SELECT to_char(date_trunc('day', "created_at"), 'YYYY-MM-DD') AS day, count(*)::int AS n
      FROM "payments" WHERE "created_at" >= ${since} AND "status"::text = 'captured' GROUP BY 1
    `.catch(() => [] as DayCountRow[]),
  ]);

  const out: Record<string, FunnelStages> = {};
  const row = (day: string): FunnelStages =>
    (out[day] ??= { landing: 0, signup: 0, kyc: 0, booking: 0, payment_success: 0 });

  for (const r of leadRows ?? []) row(r.day).landing = toCount(r.n);
  for (const r of userRows ?? []) {
    const s = row(r.day);
    s.signup = toCount(r.n);
    s.kyc = toCount(r.kyc);
  }
  for (const r of bookingRows ?? []) row(r.day).booking = toCount(r.n);
  for (const r of paymentRows ?? []) row(r.day).payment_success = toCount(r.n);
  return out;
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

    // Distinct paying users.
    //
    // SCAL-04 (2026-08-13): this was `payment.findMany({ select: { userId },
    // distinct: ['userId'] })` — every paying user's id materialised in Node
    // just to read `.length`, measured at 16,016 kB by EXPLAIN (ANALYZE,
    // SERIALIZE) at 200k rows. Then that whole id array went back to Postgres
    // as an `IN (...)` list for the NRI count. Two counts over the relation
    // answer both questions and transfer two integers.
    const paidUsers = await prisma.user.count({
      where: { payments: { some: { status: 'captured' } } },
    }).catch(() => 0);

    // NRI mix — share of paying users with isNri=true
    let nriMixPct: number | null = null;
    if (paidUsers > 0) {
      const nriCount = await prisma.user.count({
        where: { isNri: true, payments: { some: { status: 'captured' } } },
      }).catch(() => 0);
      nriMixPct = nriCount / paidUsers;
    }

    // Signups this week + active users (any payment or booking in 30d)
    const signupsThisWeek = await prisma.user.count({
      where: { createdAt: { gte: since7 } },
    }).catch(() => 0);

    // SCAL-04: "distinct users with a payment OR a booking in 30 days" was two
    // more full id transfers de-duplicated in a JS Set. It is one count with an
    // OR over the two relations — same number, no rows on the wire.
    const activeUsers = await prisma.user.count({
      where: {
        OR: [
          { payments: { some: { createdAt: { gte: since30 } } } },
          { bookings: { some: { createdAt: { gte: since30 } } } },
        ],
      },
    }).catch(() => 0);

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

    // Aggregated by day in SQL — at most `days` rows per table (see
    // loadFunnelDaily). Was four unbounded row reads bucketed in JS.
    const counted = await loadFunnelDaily(since);

    // Seed each day key so the agent baseline median has a zero floor.
    const daily: Record<string, FunnelStages> = {};
    for (let i = 0; i < days; i++) {
      const k = dayKey(daysAgo(i));
      daily[k] = counted[k] ?? { landing: 0, signup: 0, kyc: 0, booking: 0, payment_success: 0 };
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
