import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';
import { processRefund } from '../services/refund.service.js';
import { listPayoutRequests, processPayout } from '../services/payout.service.js';

// Admin bookings + payouts + refunds ops dashboards.
//
// Mounted at /api/v1/admin/bookings (see server.ts). All routes gated by
// authenticateUser + requireRole('admin').
//
// Schema gaps flagged in this file (do NOT mutate schema here — let user
// refine separately):
//   • Booking has no `payoutPaidAt`. We use the PriestPayout sidecar table
//     for PRIEST bookings only. For ASTROLOGER / WELLNESS_INSTRUCTOR /
//     GAUSHALA_MANAGER there is no payout sidecar yet, so we sum ALL paid
//     bookings ungrouped (no "already paid out" filter possible).
//   • BookingStatus has no REFUND_REQUESTED / REFUND_APPROVED /
//     REFUND_REJECTED. We treat `cancelled` (with refund flag in payment)
//     as "refund requested" and use `refunded` / `cancelled` for terminal
//     states. The list-refunds query returns [] + log when the enum is
//     absent.

const listQuerySchema = z.object({
  status: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const rejectBodySchema = z.object({
  reason: z.string().min(1).max(500),
});

// RV-22 (2026-08-10): the pending-payouts summary scanned the whole booking
// table, the whole completed-payout table, and re-ran an identical unfiltered
// commission scan once per non-priest role. Every scan is now bounded by this
// window (newest first) and the commission fetch happens exactly once.
// `limit` lets an operator widen it for a big settlement run.
const PAYOUT_SCAN_DEFAULT = 500;
const PAYOUT_SCAN_MAX = 2000;
const PAYOUT_SCAN_MIN = 50;

const payoutScanQuerySchema = z.object({
  limit: z.string().optional(),
});

function resolveScanLimit(raw: string | undefined): number {
  const n = Number(raw ?? '');
  if (!Number.isFinite(n) || n <= 0) return PAYOUT_SCAN_DEFAULT;
  return Math.min(PAYOUT_SCAN_MAX, Math.max(PAYOUT_SCAN_MIN, Math.floor(n)));
}

// PRIEST/WELLNESS = 25% commission, ASTROLOGER = 30%, GAUSHALA = 0%.
// NOTE: these predate the uniform 20%/80% take-rate doctrine and are therefore
// inconsistent with booking.service.DEFAULT_PRIEST_SHARE. Left as-is on purpose
// — this endpoint only RENDERS a summary (settlement runs through
// payout.service.processPayout), and correcting the number changes what an
// admin believes a provider is owed, which is an owner decision, not a
// pagination fix.
function payoutMultiplier(role: string): number {
  if (role === 'PRIEST' || role === 'WELLNESS_INSTRUCTOR') return 0.75;
  if (role === 'ASTROLOGER') return 0.7;
  if (role === 'GAUSHALA_MANAGER') return 1.0;
  return 0.75;
}

/** Money aggregation stays in Decimal — a float sum over thousands of rows drifts. */
function multiplyMoney(amount: Prisma.Decimal | number | string, multiplier: number): Prisma.Decimal {
  return new Prisma.Decimal(amount.toString()).mul(new Prisma.Decimal(multiplier.toString()));
}

export const __testing = {
  resolveScanLimit,
  PAYOUT_SCAN_DEFAULT,
  PAYOUT_SCAN_MAX,
  PAYOUT_SCAN_MIN,
};

export async function adminBookingsRoutes(server: FastifyInstance) {
  const adminPreHandlers = [authenticateUser, requireRole('admin')];

  // ─── GET /admin/bookings ──────────────────────────────────────────────────
  server.get('/', { preHandler: adminPreHandlers }, async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }
    const page = Math.max(1, Number(parsed.data.page ?? '1') || 1);
    const limit = Math.min(100, Math.max(1, Number(parsed.data.limit ?? '50') || 50));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (parsed.data.status) where.status = parsed.data.status;

    try {
      const [bookings, total] = await Promise.all([
        prisma.pujaBooking.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            pujaType: { select: { name: true, slug: true } },
            temple: { select: { name: true, slug: true, city: true } },
            user: { select: { fullName: true, phone: true } },
          },
        }),
        prisma.pujaBooking.count({ where }),
      ]);
      return { bookings, page, limit, total };
    } catch (err) {
      request.log.warn({ err }, 'admin bookings list failed');
      return { bookings: [], page, limit, total: 0 };
    }
  });

  // ─── GET /admin/bookings/payouts/pending ──────────────────────────────────
  server.get('/payouts/pending', { preHandler: adminPreHandlers }, async (request) => {
    const roles = ['PRIEST', 'ASTROLOGER', 'WELLNESS_INSTRUCTOR', 'GAUSHALA_MANAGER'];
    const groups: Array<{
      providerId: string;
      providerName: string;
      role: string;
      bookingsCount: number;
      totalPayout: number;
    }> = [];
    const parsedQuery = payoutScanQuerySchema.safeParse(request.query ?? {});
    const scanLimit = resolveScanLimit(parsedQuery.success ? parsedQuery.data.limit : undefined);
    // True when a scan hit its window and older rows were not considered — the
    // summary is then a partial view and the admin must be told, not left to
    // read an under-count as "nothing left to pay".
    let truncated = false;

    try {
      // Paid bookings — status is 'completed', 'video_uploaded', or 'delivered'.
      // Without a payoutPaidAt column we sum every paid booking grouped by
      // priestId. The user can refine the "not yet paid out" filter later.
      const paidStatuses = ['completed', 'video_uploaded', 'delivered'] as const;

      // PRIEST: use priestId on Booking, exclude bookings already in PriestPayout.
      const priestBookings = await prisma.pujaBooking.findMany({
        where: { status: { in: paidStatuses as unknown as never }, priestId: { not: null } },
        select: { id: true, priestId: true, priceAmount: true },
        orderBy: { createdAt: 'desc' },
        take: scanLimit,
      });
      if (priestBookings.length >= scanLimit) truncated = true;
      let alreadyPaidIds = new Set<string>();
      try {
        // Bounded by construction: only the bookings in this window can be
        // marked as already paid, so there is no reason to read the whole
        // PriestPayout table — and NO `take` belongs here. A truncated
        // already-paid set would under-detect settled bookings and re-surface
        // them as pending, which is the one failure mode that can make an
        // admin pay a pandit twice.
        const paid = await prisma.priestPayout.findMany({
          where: { status: 'completed', bookingId: { in: priestBookings.map((b) => b.id) } },
          select: { bookingId: true },
        });
        alreadyPaidIds = new Set(paid.map((p) => p.bookingId));
      } catch (err) {
        request.log.warn({ err }, 'priest payout lookup failed');
      }
      const byPriest = new Map<string, { count: number; total: Prisma.Decimal }>();
      for (const b of priestBookings) {
        if (alreadyPaidIds.has(b.id) || !b.priestId) continue;
        const cur = byPriest.get(b.priestId) ?? { count: 0, total: new Prisma.Decimal(0) };
        cur.count += 1;
        cur.total = cur.total.add(multiplyMoney(b.priceAmount, payoutMultiplier('PRIEST')));
        byPriest.set(b.priestId, cur);
      }
      if (byPriest.size > 0) {
        const priests = await prisma.priest.findMany({
          where: { id: { in: Array.from(byPriest.keys()) } },
          select: { id: true, user: { select: { fullName: true } } },
        });
        for (const p of priests) {
          const agg = byPriest.get(p.id);
          if (!agg) continue;
          groups.push({
            providerId: p.id,
            providerName: p.user?.fullName ?? 'Unknown priest',
            role: 'PRIEST',
            bookingsCount: agg.count,
            totalPayout: agg.total.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toNumber(),
          });
        }
      }

      // ASTROLOGER / WELLNESS_INSTRUCTOR / GAUSHALA_MANAGER:
      // No payout sidecar table. We fall back to summing all paid bookings
      // by the assigned priestId — but bookings only carry priestId, not
      // astrologerId/etc. Until the schema grows a generic providerId we
      // can only report totals per role from CommissionEarning if present.
      // RV-22: the identical PENDING-commission scan used to run once PER ROLE
      // (three serial full-table reads of the same rows). Fetch it once; the
      // per-role difference is only the multiplier applied below.
      let pendingEarnings: Array<{ providerId: string; amount: Prisma.Decimal }> = [];
      try {
        pendingEarnings = await prisma.commission.findMany({
          where: { status: 'PENDING' },
          select: { providerId: true, amount: true },
          orderBy: { createdAt: 'desc' },
          take: scanLimit,
        });
        if (pendingEarnings.length >= scanLimit) truncated = true;
      } catch (err) {
        request.log.warn({ err }, 'pending commission fetch failed (model missing?)');
      }

      for (const role of roles.filter((r) => r !== 'PRIEST')) {
        try {
          const byProvider = new Map<string, { count: number; total: Prisma.Decimal }>();
          for (const e of pendingEarnings) {
            const cur = byProvider.get(e.providerId) ?? { count: 0, total: new Prisma.Decimal(0) };
            cur.count += 1;
            cur.total = cur.total.add(multiplyMoney(e.amount, payoutMultiplier(role)));
            byProvider.set(e.providerId, cur);
          }
          if (byProvider.size === 0) continue;
          const assignments = await prisma.userRoleAssignment.findMany({
            where: { userId: { in: Array.from(byProvider.keys()) }, role: role as never },
            select: { userId: true },
            take: scanLimit,
          });
          const userIds = assignments.map((a) => a.userId);
          if (userIds.length === 0) continue;
          const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true },
            take: scanLimit,
          });
          const userById = new Map(users.map((u) => [u.id, u.fullName] as const));
          for (const a of assignments) {
            const agg = byProvider.get(a.userId);
            if (!agg) continue;
            groups.push({
              providerId: a.userId,
              providerName: userById.get(a.userId) ?? 'Unknown',
              role,
              bookingsCount: agg.count,
              totalPayout: agg.total.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toNumber(),
            });
          }
        } catch (err) {
          request.log.warn({ err, role }, 'payout aggregation skipped (model missing)');
        }
      }

      groups.sort((a, b) => b.totalPayout - a.totalPayout);
      return {
        ok: true,
        groups,
        scanLimit,
        truncated,
        schemaNote: 'payoutPaidAt column missing on Booking; PRIEST uses PriestPayout sidecar, others approximate via CommissionEarning.',
      };
    } catch (err) {
      // RV-22: the failure branch used to be indistinguishable from a genuinely
      // empty payout queue, so a broken query read as "nothing to settle". Keep
      // the 200 (the dashboard renders around it) but say so explicitly.
      request.log.warn({ err }, 'admin payouts pending failed');
      return {
        ok: false,
        groups: [],
        scanLimit,
        truncated: false,
        schemaNote: 'aggregation failed; see server logs',
      };
    }
  });

  // ─── GET /admin/bookings/payout-requests — list payout requests (admin) ──────
  server.get('/payout-requests', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { status } = request.query as { status?: string };
    const requests = await listPayoutRequests(status);
    return reply.send({ requests });
  });

  // ─── POST /admin/bookings/payout-requests/:id/process — settle/release ────────
  // Cross-cutting Phase 2: admin records the real transfer (UPI/bank/Razorpay
  // Route) via reference; completing marks the linked Commissions PAID. Reject
  // /fail releases the balance back to PENDING so the provider doesn't lose it.
  const processPayoutSchema = z.object({
    action: z.enum(['complete', 'reject', 'fail']),
    reference: z.string().max(200).optional(),
    failureReason: z.string().max(500).optional(),
  });
  server.post('/payout-requests/:id/process', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = processPayoutSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    try {
      const updated = await processPayout(
        id,
        parsed.data.action,
        request.currentUser!.id,
        parsed.data.reference,
        parsed.data.failureReason,
      );
      return reply.send({ ok: true, payout: { id: updated.id, status: updated.status } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process payout';
      if (msg.includes('not found')) return reply.code(404).send({ error: msg });
      return reply.code(400).send({ error: msg });
    }
  });

  // ─── GET /admin/bookings/refunds/pending ──────────────────────────────────
  server.get('/refunds/pending', { preHandler: adminPreHandlers }, async (request) => {
    // BookingStatus enum has no REFUND_REQUESTED. We treat `cancelled`
    // bookings whose Payment is still 'captured' (not yet 'refunded') as
    // refund-pending. If the schema later adds REFUND_REQUESTED, swap this
    // filter accordingly.
    try {
      const bookings = await prisma.pujaBooking.findMany({
        where: { status: 'cancelled' },
        orderBy: { cancelledAt: 'desc' },
        take: 200,
        include: {
          pujaType: { select: { name: true, slug: true } },
          temple: { select: { name: true, slug: true, city: true } },
          user: { select: { fullName: true, phone: true } },
          payments: { select: { id: true, status: true, amount: true } },
        },
      });
      const pending = bookings.filter((b) =>
        b.payments.some((p) => p.status === 'captured' || p.status === 'authorized')
      );
      return {
        bookings: pending,
        schemaNote: 'REFUND_REQUESTED status missing — using cancelled bookings with un-refunded captures.',
      };
    } catch (err) {
      request.log.warn({ err }, 'admin refunds pending failed');
      return { bookings: [], schemaNote: 'query failed' };
    }
  });

  // ─── POST /admin/bookings/refunds/:bookingId/approve ──────────────────────
  // Calls refund.service.processRefund which (a) fires the Razorpay refund
  // REST call, (b) updates Payment + PujaBooking rows, (c) sends a refund-
  // success email via sendEmail. Idempotent — already-refunded bookings
  // return `{ skipped: true }` instead of double-charging.
  server.post<{ Params: { bookingId: string }; Body: unknown }>(
    '/refunds/:bookingId/approve',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const { bookingId } = request.params;
      const approveBodySchema = z.object({
        reason: z.string().max(500).optional(),
        refundType: z.enum(['full', 'partial']).optional(),
        amountInr: z.number().positive().optional(),
      });
      const parsed = approveBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
      }
      try {
        const exists = await prisma.pujaBooking.findUnique({
          where: { id: bookingId },
          select: { id: true },
        });
        if (!exists) return reply.code(404).send({ error: 'Booking not found' });

        const result = await processRefund({
          bookingId,
          reason: parsed.data.reason ?? 'Admin-approved refund',
          refundType: parsed.data.refundType ?? 'full',
          amountInr: parsed.data.amountInr,
          initiatedBy: request.currentUser?.id ?? 'admin',
        });

        if (!result.ok) {
          request.log.warn({ bookingId, result }, 'refund failed');
          return reply.code(502).send({ error: result.error ?? 'Refund failed', refund: result });
        }
        request.log.info({ bookingId, refundId: result.refundId, skipped: result.skipped }, 'admin refund approved');
        return { ok: true, refund: result };
      } catch (err) {
        request.log.error({ err, bookingId }, 'admin refund approve failed');
        return reply.code(500).send({ error: 'Failed to approve refund' });
      }
    }
  );

  // ─── POST /admin/bookings/refunds/:bookingId/reject ───────────────────────
  server.post<{ Params: { bookingId: string }; Body: unknown }>(
    '/refunds/:bookingId/reject',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const { bookingId } = request.params;
      const parsed = rejectBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
      }
      try {
        const booking = await prisma.pujaBooking.findUnique({ where: { id: bookingId } });
        if (!booking) return reply.code(404).send({ error: 'Booking not found' });

        // No REFUND_REJECTED status — fall back to leaving status as-is and
        // tagging cancellationReason with the marker. Mirror the rejection
        // reason into Payment.metadata.refundRejectedReason for audit.
        const updated = await prisma.pujaBooking.update({
          where: { id: bookingId },
          data: {
            cancellationReason: `[refund-rejected] ${parsed.data.reason}`.slice(0, 500),
          },
        });
        try {
          const captured = await prisma.payment.findFirst({
            where: { bookingId, status: { in: ['captured', 'partially_refunded'] } },
            orderBy: { createdAt: 'desc' },
          });
          if (captured) {
            await prisma.payment.update({
              where: { id: captured.id },
              data: {
                metadata: {
                  ...((captured.metadata as Record<string, unknown>) ?? {}),
                  refundRejectedReason: parsed.data.reason,
                  refundRejectedAt: new Date().toISOString(),
                  refundRejectedBy: request.currentUser?.id ?? 'admin',
                },
              },
            });
          }
        } catch (err) {
          request.log.warn({ err, bookingId }, 'failed to mirror reject reason into payment.metadata');
        }
        request.log.info({ bookingId, reason: parsed.data.reason }, 'admin refund rejected');
        return { booking: updated };
      } catch (err) {
        request.log.error({ err, bookingId }, 'admin refund reject failed');
        return reply.code(500).send({ error: 'Failed to reject refund' });
      }
    }
  );

  // ─── POST /admin/bookings/:bookingId/video-proof/flag ─────────────────────
  //
  // Flags an uploaded video proof as invalid. Clears videoProofUrl /
  // videoUploadedAt and reverts status to `completed` so the assigned
  // priest can re-upload. Idempotent: flagging an already-empty proof is
  // a no-op (returns the current row).
  server.post<{ Params: { bookingId: string }; Body: unknown }>(
    '/:bookingId/video-proof/flag',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const { bookingId } = request.params;
      const parsed = rejectBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'Invalid body', details: parsed.error.flatten() });
      }
      try {
        const booking = await prisma.pujaBooking.findUnique({
          where: { id: bookingId },
          select: {
            id: true,
            status: true,
            videoProofUrl: true,
            cancellationReason: true,
          },
        });
        if (!booking) {
          return reply.code(404).send({ error: 'Booking not found' });
        }
        if (!booking.videoProofUrl) {
          return reply.code(409).send({
            error: 'No video proof on this booking to flag.',
          });
        }
        const updated = await prisma.pujaBooking.update({
          where: { id: bookingId },
          data: {
            videoProofUrl: null,
            videoUploadedAt: null,
            status: 'completed',
            cancellationReason: `[video-flagged] ${parsed.data.reason}`,
          },
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            videoProofUrl: true,
          },
        });
        request.log.info(
          { bookingId, reason: parsed.data.reason },
          'admin flagged video proof as invalid'
        );
        return { booking: updated };
      } catch (err) {
        request.log.error({ err, bookingId }, 'admin video flag failed');
        return reply.code(500).send({ error: 'Failed to flag video' });
      }
    }
  );
}
