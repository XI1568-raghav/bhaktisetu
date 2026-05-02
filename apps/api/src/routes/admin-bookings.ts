import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

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
  server.post<{ Params: { bookingId: string } }>(
    '/refunds/:bookingId/approve',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const { bookingId } = request.params;
      try {
        const booking = await prisma.pujaBooking.findUnique({
          where: { id: bookingId },
          include: { payments: true },
        });
        if (!booking) return reply.code(404).send({ error: 'Booking not found' });

        // Best-effort Razorpay refund (no-op when env unset).
        const razorpayKey = process.env.RAZORPAY_KEY_ID;
        const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
        let razorpayResult: { skipped?: boolean; refundId?: string; error?: string } = { skipped: true };
        if (razorpayKey && razorpaySecret) {
          try {
            const capturedPayment = booking.payments.find((p) => p.status === 'captured');
            if (capturedPayment?.gatewayPaymentId) {
              const auth = Buffer.from(`${razorpayKey}:${razorpaySecret}`).toString('base64');
              const res = await fetch(
                `https://api.razorpay.com/v1/payments/${capturedPayment.gatewayPaymentId}/refund`,
                {
                  method: 'POST',
                  headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' },
                  body: JSON.stringify({}),
                }
              );
              const json = (await res.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };
              if (res.ok && json.id) razorpayResult = { refundId: json.id };
              else razorpayResult = { error: json.error?.description ?? `HTTP ${res.status}` };
            }
          } catch (err) {
            razorpayResult = { error: err instanceof Error ? err.message : String(err) };
            request.log.warn({ err, bookingId }, 'razorpay refund call failed');
          }
        }

        const updated = await prisma.pujaBooking.update({
          where: { id: bookingId },
          data: {
            status: 'refunded',
            cancelledAt: booking.cancelledAt ?? new Date(),
          },
        });
        request.log.info({ bookingId, razorpayResult }, 'admin refund approved');
        return { booking: updated, razorpay: razorpayResult };
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
        // appending the reject reason into cancellationReason for audit.
        const updated = await prisma.pujaBooking.update({
          where: { id: bookingId },
          data: {
            cancellationReason: `[refund-rejected] ${parsed.data.reason}`,
          },
        });
        request.log.info({ bookingId, reason: parsed.data.reason }, 'admin refund rejected');
        return { booking: updated };
      } catch (err) {
        request.log.error({ err, bookingId }, 'admin refund reject failed');
        return reply.code(500).send({ error: 'Failed to reject refund' });
      }
    }
  );
}
