import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { notifyBookingEvent } from '../services/booking-notify.service.js';
import { getMoneyTrail } from '../lib/audit-money.js';

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

// ─── P0-17 SLA-breach bulk-resolve ─────────────────────────────────────────
// Founder-gated companion to GET /sla-overdue-bookings. The GET feed lists
// overdue puja bookings; this POST lets the founder resolve them in bulk
// (refund / fulfill / cancel) for record-keeping. It ONLY mutates booking
// state — it does NOT move money. The founder must process the actual
// Razorpay refund in the Razorpay dashboard (see comment on the route).
//
// BookingStatus has no REFUND_REQUESTED / REFUND_APPROVED states (see
// admin-bookings.ts header comment) so we follow the project convention:
// refund + cancel → status `cancelled` with a `cancellationReason`
// annotation; fulfill → status `completed` with the same annotation field
// (PujaBooking has no dedicated notes/Json column, so cancellationReason
// doubles as the free-text ops audit trail, mirroring the
// `[video-flagged] …` pattern in admin-bookings.ts).
const resolveSchema = z.object({
  bookingIds: z.array(z.string().min(1).max(64)).min(1).max(200),
  action: z.enum(['refund', 'fulfill', 'cancel']),
  note: z.string().min(1).max(500),
});

// ─── OPS-05 money-trail read ───────────────────────────────────────────────
// `lib/audit-money.getMoneyTrail` shipped with the writer and had ZERO
// production callers — grepping `apps/api` for it returned the declaration and
// its own unit test and nothing else. So every money event was being recorded
// and none of it could be READ by anyone without a psql session against the
// production database. For a solo operator answering a chargeback that is the
// same as having no trail: the finding is "a disputed booking or refund cannot
// be reconstructed", and reconstruction that requires DIRECT_URL is not
// reconstruction the product supports.
//
// This is the read surface. Deliberately narrow:
//   - exactly one handle per call, so it can never become a bulk export;
//   - the same admin gate as the destructive SLA-resolve route below, NOT the
//     ?token= cron gate — a money trail carries actor ids, IPs and amounts, and
//     the cron token is pasted into agent scripts;
//   - `available:false` is passed through verbatim rather than rendered as an
//     empty list, because "the log could not be read" and "nothing happened"
//     must never look identical to an operator.
const moneyTrailSchema = z
  .object({
    bookingId: z.string().min(1).max(200).optional(),
    paymentId: z.string().min(1).max(200).optional(),
    commissionId: z.string().min(1).max(200).optional(),
    payoutId: z.string().min(1).max(200).optional(),
    // The polymorphic handle. Donations, consultations and store orders write
    // no Payment row, so none of the four ids above can ever reach them.
    subjectId: z.string().min(1).max(200).optional(),
    subjectType: z.string().min(1).max(64).optional(),
    limit: z.coerce.number().int().min(1).max(1000).optional(),
  })
  .refine(
    (q) => !!(q.bookingId || q.paymentId || q.commissionId || q.payoutId || q.subjectId),
    { message: 'Provide one of bookingId, paymentId, commissionId, payoutId or subjectId.' },
  );

export const __testing = { resolveSchema, moneyTrailSchema };

export async function adminOpsRoutes(server: FastifyInstance) {
  // GET /api/v1/admin/ops/money-trail?bookingId=…  (or paymentId / commissionId
  // / payoutId / subjectId[&subjectType]). Oldest first — the read a dispute is
  // answered from.
  server.get(
    '/money-trail',
    { preHandler: [authenticateUser, requireRole('admin')] },
    async (request, reply) => {
      const parsed = moneyTrailSchema.safeParse(request.query ?? {});
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Invalid query',
          details: parsed.error.flatten(),
        });
      }
      const trail = await getMoneyTrail(parsed.data);
      if (!trail.available) {
        // 503, not 200-with-[]: the caller is an operator deciding whether to
        // refund. Telling her "no events" when the table was unreachable is the
        // failure mode this whole finding is about.
        return reply.code(503).send({
          ok: false,
          available: false,
          reason: trail.reason ?? 'unavailable',
          message:
            'The money audit trail could not be read. This is NOT the same as "no events" — do not treat it as an empty history.',
        });
      }
      return reply.send({
        ok: true,
        available: true,
        count: trail.events.length,
        events: trail.events,
      });
    },
  );

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

    // Buckets are disjoint time-windows w/ different row sets — can't groupBy.
    // Fan out in parallel: 3 queries × ~50ms = 1 round-trip instead of 3.
    const results = await Promise.all(
      buckets.map((b) =>
        prisma.lead.findMany({
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
        }).catch(() => [] as unknown[]),
      ),
    );
    const out: Record<string, unknown[]> = {};
    buckets.forEach((b, i) => { out[b.name] = results[i]!; });
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

  // ─── POST /sla-overdue-bookings/resolve ───────────────────────────────────
  // Founder-gated bulk-resolve for the SLA-overdue bookings listed by the
  // GET above. Accepts a list of booking ids (UUID or bookingNumber — we
  // resolve either), an action, and a note. Mutates booking state only.
  //
  // IMPORTANT — no money moves here. This endpoint only flips the booking
  // row + writes a `cancellationReason` annotation for the audit trail.
  // The founder MUST process the actual Razorpay refund in the Razorpay
  // dashboard (Dashboard → Payments → select payment → Refund). This route
  // exists so the booking ledger reflects the founder's dashboard action
  // and the SLA-overdue feed stops re-listing already-resolved rows.
  //
  // Auth: authenticateUser + requireRole('admin'). This is a destructive
  // mutation (cancels/completes bookings) so it must NOT share the
  // CRON_AUTH_TOKEN gate the read-only agent feeds use — agents must never
  // be able to mutate booking state. Matches the admin-bookings.ts
  // adminPreHandlers pattern.
  server.post<{ Body: unknown }>(
    '/sla-overdue-bookings/resolve',
    { preHandler: [authenticateUser, requireRole('admin')] },
    async (request, reply) => {
      const parsed = resolveSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'Invalid body', details: parsed.error.flatten() });
      }
      const { bookingIds, action, note } = parsed.data;
      const dateTag = new Date().toISOString().slice(0, 10);

      // action → (status, reasonPrefix). refund/cancel both land on
      // `cancelled`; the prefix is what distinguishes them in the audit
      // trail. fulfill lands on `completed`.
      const plan = action === 'fulfill'
        ? { status: 'completed' as const, prefix: 'SLA breach fulfilled' }
        : action === 'refund'
          ? { status: 'cancelled' as const, prefix: 'SLA breach auto-refund' }
          : { status: 'cancelled' as const, prefix: 'SLA breach cancelled' };
      const reason = `${plan.prefix} ${dateTag} — ${note}`;

      const resolved: { bookingId: string; action: string; status: string }[] = [];
      const errors: { bookingId: string; error: string }[] = [];

      for (const bookingId of bookingIds) {
        try {
          // Resolve either a UUID `id` or a human-readable `bookingNumber`
          // (e.g. BS-20260427-K3HSD). findUnique covers the UUID path; fall
          // back to findFirst on bookingNumber for the BS-… form the SLA
          // feed's consumers typically paste.
          let booking = await prisma.pujaBooking.findUnique({
            where: { id: bookingId },
            select: { id: true, bookingNumber: true, status: true },
          });
          if (!booking) {
            booking = await prisma.pujaBooking.findFirst({
              where: { bookingNumber: bookingId },
              select: { id: true, bookingNumber: true, status: true },
            });
          }
          if (!booking) {
            errors.push({ bookingId, error: 'Booking not found' });
            continue;
          }

          await prisma.pujaBooking.update({
            where: { id: booking.id },
            data: {
              status: plan.status,
              cancellationReason: reason,
              ...(plan.status === 'cancelled' ? { cancelledAt: new Date() } : {}),
            },
            select: { id: true, status: true },
          });

          // NOTIF-06 (2026-08-14): this endpoint is a PRODUCER of `cancelled`
          // and `completed`, and it bypasses BookingService.updateBookingStatus
          // entirely — the raw update above is the whole write. So the lifecycle
          // fan-out wired into that service does not run here, and this is the
          // SLA-BREACH queue: every booking in it already failed the devotee
          // once. An admin resolving her breach as cancelled-with-refund, or
          // stamping the puja `completed`, sent her nothing on any channel; she
          // found out by opening the app, if she opened it.
          //
          // Fire-and-forget after the write has committed: the operator's action
          // is done and an unreachable BSP must not turn a resolved booking into
          // a 500 the operator retries.
          void notifyBookingEvent(
            booking.id,
            plan.status === 'completed' ? 'completed' : 'cancelled',
          ).catch((err) =>
            request.log.warn({ err, bookingId: booking.id }, 'sla-overdue resolve: notify failed'),
          );

          resolved.push({
            bookingId: booking.bookingNumber ?? booking.id,
            action,
            status: plan.status,
          });
        } catch (err) {
          request.log.error({ err, bookingId }, 'sla-overdue resolve: update failed');
          errors.push({
            bookingId,
            error: err instanceof Error ? err.message : 'Update failed',
          });
        }
      }

      return reply.send({ ok: true, resolved, errors });
    },
  );

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
