import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';

/**
 * Token-gated read-only ops feeds for the Sprint-2 Wave-1 agents.
 *
 *   GET /api/v1/admin/ops/kyc-abandoned?token=…       → onboarding-nudge
 *   GET /api/v1/admin/ops/sla-overdue-bookings?token=…→ booking-quality-monitor
 *
 * Both routes are intentionally cheap (single Prisma query, capped LIMIT,
 * no joins beyond what's strictly needed). Agents poll daily/hourly so the
 * route must stay sub-100ms on cold Render.
 *
 * Auth: ?token=<CRON_AUTH_TOKEN>. Same constant-time compare as
 * admin-cron.ts. Fail-closed if env var unset.
 */

const cronToken = process.env.CRON_AUTH_TOKEN ?? '';

function authorisedToken(provided: string | undefined): boolean {
  if (!cronToken || !provided) return false;
  if (provided.length !== cronToken.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(cronToken));
  } catch {
    return false;
  }
}

interface TokenQuery {
  token?: string;
}

export async function adminOpsRoutes(server: FastifyInstance) {
  // KYC-abandoned leads — provider self-onboard rows still NEW after N hours.
  // onboarding-nudge agent fires 24h/72h/7d windows; we return all three
  // buckets in one call so the agent can de-dup per channel.
  server.get<{ Querystring: TokenQuery }>('/kyc-abandoned', async (request, reply) => {
    if (!authorisedToken(request.query.token)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const now = Date.now();
    const buckets = [
      { name: '24h', after: new Date(now - 36 * 3600_000), before: new Date(now - 24 * 3600_000) },
      { name: '72h', after: new Date(now - 96 * 3600_000), before: new Date(now - 72 * 3600_000) },
      { name: '7d', after: new Date(now - 8 * 24 * 3600_000), before: new Date(now - 7 * 24 * 3600_000) },
    ];

    const out: Record<string, unknown[]> = {};
    for (const b of buckets) {
      const rows = await prisma.lead.findMany({
        where: {
          status: 'NEW',
          source: { contains: 'self-onboard' },
          createdAt: { gte: b.after, lt: b.before },
          role: { in: ['PRIEST', 'GAUSHALA', 'TEMPLE', 'ASTROLOGER', 'WELLNESS_INSTRUCTOR'] },
        },
        select: {
          id: true,
          role: true,
          name: true,
          email: true,
          phone: true,
          city: true,
          createdAt: true,
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
      }).catch(() => []);
      out[b.name] = rows;
    }
    return reply.send({ ok: true, buckets: out, generatedAt: new Date().toISOString() });
  });

  // SLA-overdue puja bookings — scheduledDate ≥ 24h ago, still missing
  // video proof, and not cancelled / pending payment / refunded. Caps at
  // 100 rows; pandit gets a hard SLA breach P0 issue filed.
  server.get<{ Querystring: TokenQuery }>('/sla-overdue-bookings', async (request, reply) => {
    if (!authorisedToken(request.query.token)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const cutoff = new Date(Date.now() - 24 * 3600_000);
    const rows = await prisma.pujaBooking.findMany({
      where: {
        scheduledDate: { lte: cutoff },
        videoProofUrl: null,
        status: { in: ['confirmed', 'priest_assigned', 'in_progress', 'completed'] },
      },
      select: {
        id: true,
        bookingNumber: true,
        templeId: true,
        priestId: true,
        scheduledDate: true,
        scheduledTimeSlot: true,
        status: true,
        priceAmount: true,
      },
      take: 100,
      orderBy: { scheduledDate: 'asc' },
    }).catch(() => []);

    return reply.send({
      ok: true,
      count: rows.length,
      bookings: rows,
      cutoff: cutoff.toISOString(),
      generatedAt: new Date().toISOString(),
    });
  });

  // referral-nudge feed: users whose first booking landed 7-8 days ago.
  // Picks the single oldest booking per user; agent DMs the user a referral
  // code + 10% off prompt while the experience is still fresh.
  server.get<{ Querystring: TokenQuery }>('/recent-first-bookings', async (request, reply) => {
    if (!authorisedToken(request.query.token)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const after = new Date(Date.now() - 8 * 24 * 3600_000);
    const before = new Date(Date.now() - 7 * 24 * 3600_000);

    // Raw query: first booking per user inside the window. user_id grouping
    // + min(created_at) keeps it single round trip and avoids N+1.
    const rows = await prisma.$queryRawUnsafe<
      { user_id: string; first_booking: Date; full_name: string; email: string | null; phone: string | null }[]
    >(
      `SELECT u.id AS user_id, fb.first_booking, u.full_name, u.email, u.phone
       FROM (
         SELECT user_id, MIN(created_at) AS first_booking
         FROM puja_bookings
         GROUP BY user_id
       ) fb
       JOIN users u ON u.id = fb.user_id
       WHERE fb.first_booking >= $1::timestamp AND fb.first_booking < $2::timestamp
         AND u.blocked = false
       LIMIT 100;`,
      after,
      before,
    ).catch(() => []);

    return reply.send({
      ok: true,
      count: rows.length,
      users: rows,
      window: { after: after.toISOString(), before: before.toISOString() },
    });
  });

  // dormant-reactivation feed: users whose most recent booking was ≥ N
  // days ago (default 30). Returns up to 80 (sender-quota safe).
  server.get<{ Querystring: TokenQuery & { days?: string } }>('/dormant-users', async (request, reply) => {
    if (!authorisedToken(request.query.token)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const days = Math.min(Math.max(Number(request.query.days) || 30, 7), 180);
    const cutoff = new Date(Date.now() - days * 24 * 3600_000);

    const rows = await prisma.$queryRawUnsafe<
      { user_id: string; last_booking: Date; full_name: string; email: string | null; phone: string | null; nakshatra: string | null }[]
    >(
      `SELECT u.id AS user_id, lb.last_booking, u.full_name, u.email, u.phone, u.nakshatra
       FROM (
         SELECT user_id, MAX(created_at) AS last_booking
         FROM puja_bookings
         GROUP BY user_id
       ) lb
       JOIN users u ON u.id = lb.user_id
       WHERE lb.last_booking < $1::timestamp
         AND u.blocked = false
         AND u.email IS NOT NULL
       ORDER BY lb.last_booking DESC
       LIMIT 80;`,
      cutoff,
    ).catch(() => []);

    return reply.send({
      ok: true,
      count: rows.length,
      users: rows,
      cutoffDays: days,
      cutoffAt: cutoff.toISOString(),
    });
  });

  // cold-temple-outreach feed: NEW Lead rows with role TEMPLE that we
  // discovered via lead-gen or apollo-refresh but have not yet contacted.
  // Agent sends one templated email per run (capped at 25 — anti-spam).
  server.get<{ Querystring: TokenQuery }>('/cold-temples', async (request, reply) => {
    if (!authorisedToken(request.query.token)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const rows = await prisma.lead.findMany({
      where: {
        role: 'TEMPLE',
        status: 'NEW',
        lastContactedAt: null,
        email: { not: null },
      },
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        state: true,
        phone: true,
      },
      take: 25,
      orderBy: { createdAt: 'asc' },
    }).catch(() => []);

    return reply.send({ ok: true, count: rows.length, leads: rows });
  });

  // Mark a lead as contacted (agent calls this after successful send).
  // Increments contact_count and sets last_contacted_at. Idempotent enough
  // for our use case.
  server.post<{ Querystring: TokenQuery; Body: { leadIds: string[] } }>(
    '/mark-contacted',
    async (request, reply) => {
      if (!authorisedToken(request.query.token)) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      const ids = Array.isArray(request.body?.leadIds) ? request.body.leadIds.slice(0, 50) : [];
      if (ids.length === 0) return reply.send({ ok: true, updated: 0 });
      const r = await prisma.lead.updateMany({
        where: { id: { in: ids } },
        data: {
          status: 'EMAILED',
          lastContactedAt: new Date(),
          contactCount: { increment: 1 },
        },
      });
      return reply.send({ ok: true, updated: r.count });
    },
  );
}
