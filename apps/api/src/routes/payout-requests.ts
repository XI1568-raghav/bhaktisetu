/**
 * payout-requests.ts — provider self-serve payout endpoints (cross-cutting
 * Phase 2, 2026-08-06).
 *
 *  GET  /api/v1/payouts/balance   → withdrawable balance (available/pending/paid)
 *  POST /api/v1/payouts/request   → request a payout of the full balance
 *  GET  /api/v1/payouts/my        → the provider's own payout request history
 *
 * Any provider role may call these (pandit, astrologer, wellness, store owner,
 * temple manager, gaushala). Request is gated on verified KYC + bank on file.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser } from '../middlewares/auth.js';
import {
  getPayoutBalance,
  getKycStatus,
  requestPayout,
  listMyPayouts,
  // Hoisted into the service so the weekly settlement cron resolves roles the
  // same way this route does (it used to stamp every provider 'PANDIT').
  resolveProviderRole,
} from '../services/payout.service.js';

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
}
