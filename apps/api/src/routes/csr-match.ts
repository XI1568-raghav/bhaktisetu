import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { uuidParamGuard } from '../lib/uuid.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';

/**
 * Layer AX — Corporate CSR donation match.
 *
 * Corporate accounts opt in to match individual devotee donations 1:1 (or
 * configurable ratio) up to a monthly cap. Encourages devotees to donate
 * by doubling impact. Corporate gets 80G receipt + brand visibility.
 *
 * Tables (raw SQL — no Prisma migration):
 *   csr_corporate_accounts: id, name, contact_email, contact_phone, gstin,
 *     match_ratio (1.0 = 1:1), monthly_cap_inr, monthly_used_inr,
 *     reset_date, gaushala_filter (JSON list of gaushala_ids),
 *     is_active, created_at
 *   csr_match_records: id, corporate_id, donation_id, match_amount_inr,
 *     status (pending|paid|skipped_capped), created_at, paid_at
 *
 * Flow:
 *   1. Devotee donation succeeds → check active CSR sponsors for that gaushala.
 *   2. If sponsor has remaining cap, create csr_match_records row, increment
 *      sponsor's monthly_used_inr.
 *   3. Cron daily settlement: sponsors get invoiced for accumulated matches.
 *   4. 80G receipt issued to sponsor for their match contribution.
 */

async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS csr_corporate_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT,
      gstin TEXT,
      pan TEXT,
      match_ratio NUMERIC(5,2) DEFAULT 1.0,
      monthly_cap_inr NUMERIC(12,2) DEFAULT 100000,
      monthly_used_inr NUMERIC(12,2) DEFAULT 0,
      reset_date DATE DEFAULT date_trunc('month', now() + interval '1 month')::date,
      gaushala_filter JSONB DEFAULT '[]'::jsonb,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS csr_match_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      corporate_id UUID NOT NULL,
      donation_id UUID NOT NULL,
      donor_user_id UUID,
      gaushala_id UUID,
      original_amount_inr NUMERIC(10,2) NOT NULL,
      match_amount_inr NUMERIC(10,2) NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT now(),
      paid_at TIMESTAMPTZ
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS csr_match_records_corp_idx ON csr_match_records (corporate_id);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS csr_match_records_status_idx ON csr_match_records (status) WHERE status = 'pending';`);
}

/**
 * Called by donations route after successful donation. Best-effort — never throws.
 */
export async function maybeMatchDonation(args: {
  donationId: string;
  donorUserId: string | null;
  gaushalaId: string;
  amountInr: number;
}): Promise<{ matched: boolean; matchAmountInr?: number }> {
  try {
    const sponsors = await prisma.$queryRawUnsafe<Array<{
      id: string;
      match_ratio: string;
      monthly_cap_inr: string;
      monthly_used_inr: string;
      gaushala_filter: unknown;
    }>>(
      `SELECT id, match_ratio, monthly_cap_inr, monthly_used_inr, gaushala_filter
       FROM csr_corporate_accounts WHERE is_active = true
       ORDER BY (monthly_cap_inr - monthly_used_inr) DESC LIMIT 1`,
    );
    if (sponsors.length === 0) return { matched: false };
    const sponsor = sponsors[0]!;

    // Filter check: empty array means "all gaushalas". Else must include.
    const filter = Array.isArray(sponsor.gaushala_filter) ? sponsor.gaushala_filter : [];
    if (filter.length > 0 && !filter.includes(args.gaushalaId)) return { matched: false };

    const cap = Number(sponsor.monthly_cap_inr);
    const used = Number(sponsor.monthly_used_inr);
    const remaining = cap - used;
    if (remaining <= 0) return { matched: false };

    const ratio = Number(sponsor.match_ratio);
    const matchAmount = Math.min(remaining, args.amountInr * ratio);
    if (matchAmount < 1) return { matched: false };

    await prisma.$executeRawUnsafe(
      `INSERT INTO csr_match_records (corporate_id, donation_id, donor_user_id, gaushala_id, original_amount_inr, match_amount_inr)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6)`,
      sponsor.id, args.donationId, args.donorUserId, args.gaushalaId, args.amountInr, matchAmount,
    );
    await prisma.$executeRawUnsafe(
      `UPDATE csr_corporate_accounts SET monthly_used_inr = monthly_used_inr + $1 WHERE id = $2::uuid`,
      matchAmount, sponsor.id,
    );
    return { matched: true, matchAmountInr: matchAmount };
  } catch {
    return { matched: false };
  }
}

const enrollSchema = z.object({
  name: z.string().min(2).max(200),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(8).max(20).optional(),
  gstin: z.string().min(15).max(15).optional(),
  pan: z.string().min(10).max(10).optional(),
  matchRatio: z.number().min(0.5).max(5).optional(),
  monthlyCapInr: z.number().int().min(10000).max(10000000).optional(),
  gaushalaFilter: z.array(z.string()).optional(),
});

export async function csrMatchRoutes(server: FastifyInstance) {
  await ensureTables().catch((err) => server.log.warn({ err }, 'csr tables init failed'));

  // Public corporate enroll (lead form). Admin reviews + approves.
  server.post('/enroll', async (request, reply) => {
    const parsed = enrollSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO csr_corporate_accounts (name, contact_email, contact_phone, gstin, pan,
       match_ratio, monthly_cap_inr, gaushala_filter, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, false)`,
      parsed.data.name, parsed.data.contactEmail, parsed.data.contactPhone ?? null,
      parsed.data.gstin ?? null, parsed.data.pan ?? null,
      parsed.data.matchRatio ?? 1.0, parsed.data.monthlyCapInr ?? 100000,
      JSON.stringify(parsed.data.gaushalaFilter ?? []),
    );
    server.log.info({ name: parsed.data.name, contactEmail: parsed.data.contactEmail }, 'csr corporate enrollment');
    return { ok: true, message: 'Enrollment received. Our team will reach out; we do not promise a reply time.' };
  });

  // Authenticated dashboard view of this corporate's matches.
  server.get('/me', { preHandler: [authenticateUser] }, async (request) => {
    const email = request.currentUser?.email;
    if (!email) return { sponsor: null, matches: [] };
    const sponsors = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT id, name, match_ratio, monthly_cap_inr, monthly_used_inr, reset_date, is_active
       FROM csr_corporate_accounts WHERE contact_email = $1 LIMIT 1`,
      email,
    );
    if (sponsors.length === 0) return { sponsor: null, matches: [] };
    const sponsor = sponsors[0] as { id: string };
    const matches = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT donation_id, gaushala_id, original_amount_inr, match_amount_inr, status, created_at, paid_at
       FROM csr_match_records WHERE corporate_id = $1::uuid ORDER BY created_at DESC LIMIT 100`,
      sponsor.id,
    );
    return { sponsor, matches };
  });

  // Admin: list / activate / deactivate corporate accounts
  // P0 — gate. Previously public — leaked corporate emails + GSTIN.
  const adminPreHandlers = [authenticateUser, requireRole('admin')];

  server.get('/admin/list', { preHandler: adminPreHandlers }, async () => {
    const rows = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT id, name, contact_email, gstin, match_ratio, monthly_cap_inr, monthly_used_inr,
       reset_date, is_active, created_at FROM csr_corporate_accounts ORDER BY created_at DESC`,
    );
    return { corporates: rows };
  });

  server.post<{ Params: { id: string }; Body: { is_active: boolean } }>(
    '/admin/:id/active',
    { preHandler: [...adminPreHandlers, uuidParamGuard('id')] },
    async (request) => {
      await prisma.$executeRawUnsafe(
        `UPDATE csr_corporate_accounts SET is_active = $1 WHERE id = $2::uuid`,
        request.body.is_active, request.params.id,
      );
      return { ok: true };
    },
  );
}
