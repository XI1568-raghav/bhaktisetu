import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { listGaushalaBalances, recordDisbursement } from '../services/gaushala-disbursement.service.js';

const bodySchema = z.object({
  gaushalaUserId: z.string().uuid(),
  amountInr: z.number().positive().max(10_000_000),
  reference: z.string().trim().min(3).max(200),
  note: z.string().trim().max(500).optional(),
});

export async function adminGaushalaDisbursementRoutes(server: FastifyInstance) {
  const preHandler = [authenticateUser, requireRole('admin')];

  // What each gaushala has received through donations and what has been sent on.
  server.get('/', { preHandler }, async (request, reply) => {
    try {
      return { gaushalas: await listGaushalaBalances() };
    } catch (err) {
      request.log.error({ err }, 'gaushala balances failed');
      return reply.code(500).send({ error: 'Could not load gaushala balances.' });
    }
  });

  // Record a bank transfer the admin has already made. Moves no money itself.
  server.post('/', { preHandler }, async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Enter the gaushala, an amount above zero and the transfer reference (UTR).', details: parsed.error.flatten() });
    }
    try {
      const r = await recordDisbursement({ ...parsed.data, adminId: request.currentUser!.id });
      if (!r.ok) {
        const error =
          r.code === 'exceeds_balance'
            ? `Only ₹${r.owedInr.toFixed(2)} is owed to this gaushala; that is more than was received in donations.`
            : 'A transfer with this reference is already recorded for this gaushala.';
        return reply.code(409).send({ error, code: r.code, owedInr: r.owedInr });
      }
      return { ok: true, id: r.id, owedInr: r.owedInr };
    } catch (err) {
      request.log.error({ err }, 'gaushala disbursement failed');
      return reply.code(500).send({ error: 'Could not record this transfer.' });
    }
  });
}
