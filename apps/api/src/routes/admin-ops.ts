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
}
