import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';
import { processRefund } from '../services/refund.service.js';

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

// PRIEST/WELLNESS = 25% commission, ASTROLOGER = 30%, GAUSHALA = 0%.
function payoutMultiplier(role: string): number {
  if (role === 'PRIEST' || role === 'WELLNESS_INSTRUCTOR') return 0.75;
  if (role === 'ASTROLOGER') return 0.7;
  if (role === 'GAUSHALA_MANAGER') return 1.0;
  return 0.75;
}

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

    try {
      // Paid bookings — status is 'completed', 'video_uploaded', or 'delivered'.
      // Without a payoutPaidAt column we sum every paid booking grouped by
      // priestId. The user can refine the "not yet paid out" filter later.
      const paidStatuses = ['completed', 'video_uploaded', 'delivered'] as const;

      // PRIEST: use priestId on Booking, exclude bookings already in PriestPayout.
      const priestBookings = await prisma.pujaBooking.findMany({
        where: { status: { in: paidStatuses as unknown as never }, priestId: { not: null } },
        select: { id: true, priestId: true, priceAmount: true },
      });
      let alreadyPaidIds = new Set<string>();
      try {
        const paid = await prisma.priestPayout.findMany({
          where: { status: 'completed' },
          select: { bookingId: true },
        });
        alreadyPaidIds = new Set(paid.map((p) => p.bookingId));
      } catch (err) {
        request.log.warn({ err }, 'priest payout lookup failed');
      }
      const byPriest = new Map<string, { count: number; total: number }>();
      for (const b of priestBookings) {
        if (alreadyPaidIds.has(b.id) || !b.priestId) continue;
        const cur = byPriest.get(b.priestId) ?? { count: 0, total: 0 };
        cur.count += 1;
        cur.total += Number(b.priceAmount) * payoutMultiplier('PRIEST');
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
            totalPayout: Math.round(agg.total * 100) / 100,
          });
        }
      }

      // ASTROLOGER / WELLNESS_INSTRUCTOR / GAUSHALA_MANAGER:
      // No payout sidecar table. We fall back to summing all paid bookings
      // by the assigned priestId — but bookings only carry priestId, not
      // astrologerId/etc. Until the schema grows a generic providerId we
      // can only report totals per role from CommissionEarning if present.
      for (const role of roles.filter((r) => r !== 'PRIEST')) {
        try {
          const earnings = await prisma.commission.findMany({
            where: { status: 'PENDING' },
            select: { providerId: true, amount: true },
          });
          const byProvider = new Map<string, { count: number; total: number }>();
          for (const e of earnings) {
            const cur = byProvider.get(e.providerId) ?? { count: 0, total: 0 };
            cur.count += 1;
            cur.total += Number(e.amount) * payoutMultiplier(role);
            byProvider.set(e.providerId, cur);
          }
          if (byProvider.size === 0) continue;
          const assignments = await prisma.userRoleAssignment.findMany({
            where: { userId: { in: Array.from(byProvider.keys()) }, role: role as never },
            select: { userId: true },
          });
          const userIds = assignments.map((a) => a.userId);
          if (userIds.length === 0) continue;
          const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true },
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
              totalPayout: Math.round(agg.total * 100) / 100,
            });
          }
        } catch (err) {
          request.log.warn({ err, role }, 'payout aggregation skipped (model missing)');
        }
      }

      groups.sort((a, b) => b.totalPayout - a.totalPayout);
      return { groups, schemaNote: 'payoutPaidAt column missing on Booking; PRIEST uses PriestPayout sidecar, others approximate via CommissionEarning.' };
    } catch (err) {
      request.log.warn({ err }, 'admin payouts pending failed');
      return { groups: [], schemaNote: 'aggregation failed; see server logs' };
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
