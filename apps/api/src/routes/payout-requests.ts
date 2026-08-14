/**
 * payout-requests.ts — provider self-serve payout endpoints (cross-cutting
 * Phase 2, 2026-08-06).
 *
 *  GET  /api/v1/payouts/balance   → withdrawable balance (available/pending/paid)
 *  POST /api/v1/payouts/request   → request a payout of the full balance
 *  GET  /api/v1/payouts/my        → the provider's own payout request history
 *  GET  /api/v1/payouts/commissions → the provider's own commission ledger
 *
 * Any provider role may call these (pandit, astrologer, wellness, store owner,
 * temple manager, gaushala). Request is gated on verified KYC + bank on file.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import { commissionGross, commissionPlatformCut } from '../lib/commission-math.js';
import {
  getPayoutBalance,
  getKycStatus,
  requestPayout,
  listMyPayouts,
  // Hoisted into the service so the weekly settlement cron resolves roles the
  // same way this route does (it used to stamp every provider 'PANDIT').
  resolveProviderRole,
} from '../services/payout.service.js';

/**
 * When `Commission.amount` changed meaning from the platform's cut to the
 * provider's earning (RV-04, and the consultation writer corrected with it).
 * Rows older than this may carry either convention, so nothing derived from
 * them can be trusted. See apps/api/src/lib/commission-math.ts.
 */
const COMMISSION_CONVENTION_CUTOVER = new Date('2026-08-11T00:00:00.000Z');

const requestSchema = z.object({
  method: z.enum(['upi', 'bank']).default('upi'),
});

export async function payoutRequestRoutes(server: FastifyInstance) {
  // GET /balance — withdrawable balance for the signed-in provider.
  server.get('/balance', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    const role = resolveProviderRole(roles);
    if (!role) return reply.code(403).send({ error: 'Provider role required' });
    const [balance, kyc] = await Promise.all([getPayoutBalance(userId), getKycStatus(userId)]);
    return reply.send({ ...balance, kycVerified: kyc.verified, kycOnFile: kyc.hasBank });
  });

  // POST /request — request a payout of the full available balance.
  server.post('/request', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    const role = resolveProviderRole(roles);
    if (!role) return reply.code(403).send({ error: 'Provider role required' });
    const parsed = requestSchema.safeParse(request.body ?? {});
    const method = parsed.success ? parsed.data.method : 'upi';
    try {
      const request0 = await requestPayout(userId, role, method);
      return reply.code(201).send({
        ok: true,
        payout: { id: request0.id, amount: request0.amount.toString(), status: request0.status },
      });
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Could not request payout' });
    }
  });

  // GET /my — the provider's payout request history.
  server.get('/my', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const rows = await listMyPayouts(userId);
    return reply.send({
      payouts: rows.map((r) => ({
        id: r.id,
        amount: r.amount.toString(),
        status: r.status,
        method: r.method,
        reference: r.reference,
        requestedAt: r.requestedAt,
        processedAt: r.processedAt,
      })),
    });
  });

  /**
   * GET /commissions — the signed-in provider's OWN commission ledger.
   *
   * Deliberately not the admin route with a `providerId` filter: that one is
   * admin-gated, so a wellness instructor or astrologer calling it gets a 403
   * no matter what query string is attached. `/wellness-portal/earnings` was
   * dead for exactly that reason.
   *
   * Scoped hard to `providerId = the caller's own User.id` — a provider must
   * never be able to read another's ledger by guessing an id.
   */
  const listSchema = z.object({
    status: z.enum(['PENDING', 'PAID', 'REVERSED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  });

  server.get('/commissions', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!resolveProviderRole(roles)) {
      return reply.code(403).send({ error: 'Provider role required' });
    }

    const parsed = listSchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }
    const { status, page, pageSize } = parsed.data;

    const where: Prisma.CommissionWhereInput = {
      providerId: userId,
      ...(status ? { status } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.commission.count({ where }),
      prisma.commission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return reply.send({
      data: rows.map((c) => {
        // `amount` is authoritative — it is what getPayoutBalance pays out, so
        // it is always safe to show. The DERIVED figures are not: the ledger is
        // deliberately mixed (the owner declined a backfill), and rows written
        // before the convention landed carry the platform's cut in `amount`
        // instead of the provider's. Deriving gross from those would state a
        // confidently wrong number. So derived fields are emitted only for rows
        // written on or after the cutover, and are null before it — a blank
        // cell is honest, a wrong rupee figure is not.
        const derivable = c.createdAt >= COMMISSION_CONVENTION_CUTOVER;
        return {
          id: c.id,
          bookingId: c.bookingId,
          payoutRequestId: c.payoutRequestId,
          providerId: c.providerId,
          amount: c.amount.toString(),
          grossAmount: derivable ? commissionGross(c.amount, c.percentage).toString() : null,
          platformCut: derivable ? commissionPlatformCut(c.amount, c.percentage).toString() : null,
          ratePercent: derivable ? new Prisma.Decimal(c.percentage).mul(100).toNumber() : null,
          status: c.status,
          createdAt: c.createdAt,
        };
      }),
      total,
      page,
      pageSize,
    });
  });
}
