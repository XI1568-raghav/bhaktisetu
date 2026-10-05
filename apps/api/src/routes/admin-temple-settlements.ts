import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import {
  listTempleBalances,
  recordDonationTransfer,
  recordPujaShareTransfer,
  type SettlementResult,
} from '../services/temple-settlement.service.js';

const bodySchema = z.object({
  templeId: z.string().uuid(),
  amountInr: z.number().positive().max(10_000_000),
  reference: z.string().trim().min(3).max(200),
  note: z.string().trim().max(500).optional(),
});

const BAD_BODY = 'Enter the temple, an amount above zero and the transfer reference (UTR).';

function refuse(r: Extract<SettlementResult, { ok: false }>, what: string) {
  const messages: Record<typeof r.code, string> = {
    exceeds_balance: `Only ₹${r.owedInr.toFixed(2)} is owed to this temple in ${what}; that is more than was received.`,
    duplicate_reference: 'A transfer with this reference is already recorded for this temple.',
    amount_mismatch: `The puja share payable now is ₹${r.owedInr.toFixed(2)}. Record that exact amount: one transfer settles every payable booking.`,
    nothing_payable: 'No puja share is payable for this temple yet. A share becomes payable once its puja has been performed.',
  };
  return { error: messages[r.code], code: r.code, owedInr: r.owedInr };
}

export async function adminTempleSettlementRoutes(server: FastifyInstance) {
  const preHandler = [authenticateUser, requireRole('admin')];

  // What each temple has earned and been donated, what has been sent, and where to send it.
  server.get('/', { preHandler }, async (request, reply) => {
    try {
      return { temples: await listTempleBalances() };
    } catch (err) {
      request.log.error({ err }, 'temple balances failed');
      return reply.code(500).send({ error: 'Could not load temple balances.' });
    }
  });

  // Record a transfer of the temple's share of performed pujas. Moves no money itself.
  server.post('/puja-share', { preHandler }, async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: BAD_BODY, details: parsed.error.flatten() });
    }
    try {
      const r = await recordPujaShareTransfer(parsed.data);
      if (!r.ok) return reply.code(409).send(refuse(r, 'puja share'));
      request.log.info({ templeId: parsed.data.templeId, adminId: request.currentUser!.id, rows: r.settled }, 'temple puja share settled');
      return { ok: true, settled: r.settled };
    } catch (err) {
      request.log.error({ err }, 'temple puja-share settlement failed');
      return reply.code(500).send({ error: 'Could not record this transfer.' });
    }
  });

  // Record a transfer of donations received for the temple. Moves no money itself.
  server.post('/donations', { preHandler }, async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: BAD_BODY, details: parsed.error.flatten() });
    }
    try {
      const r = await recordDonationTransfer({ ...parsed.data, adminId: request.currentUser!.id });
      if (!r.ok) return reply.code(409).send(refuse(r, 'donations'));
      return { ok: true, owedInr: r.owedInr };
    } catch (err) {
      request.log.error({ err }, 'temple donation transfer failed');
      return reply.code(500).send({ error: 'Could not record this transfer.' });
    }
  });
}
