import { prisma } from '../lib/prisma.js';

/**
 * Gaushala donations are collected on the platform; sending them on is a manual
 * bank transfer. This records what was sent, so "owed" is always
 * paid donations minus disbursements, and never lets more be recorded than was
 * received.
 *
 * The table is created lazily (like the consultation tables): in production the
 * boot-time schema replay is off and migrations are applied by hand, so a table
 * this feature needs must not depend on either.
 */
let tableReady: Promise<void> | null = null;

function ensureTable(): Promise<void> {
  tableReady ??= (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS gaushala_disbursements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gaushala_user_id UUID NOT NULL,
        amount_inr NUMERIC(10,2) NOT NULL CHECK (amount_inr > 0),
        reference TEXT NOT NULL,
        note TEXT,
        disbursed_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (gaushala_user_id, reference)
      )`);
  })().catch((err) => {
    tableReady = null;
    throw err;
  });
  return tableReady;
}

export interface GaushalaBalance {
  gaushalaUserId: string;
  name: string;
  donationsCount: number;
  paidInr: number;
  disbursedInr: number;
  owedInr: number;
  payTo: { holderName: string | null; accountNumber: string; ifsc: string } | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function listGaushalaBalances(): Promise<GaushalaBalance[]> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      user_id: string;
      gaushala_name: string;
      donations_count: bigint | number;
      paid_inr: string | number;
      disbursed_inr: string | number;
      bank_account_number: string | null;
      bank_ifsc: string | null;
      bank_holder_name: string | null;
    }>
  >(`
    SELECT g.user_id, g.gaushala_name,
           COALESCE(d.cnt, 0) AS donations_count,
           COALESCE(d.paid, 0) AS paid_inr,
           COALESCE(x.sent, 0) AS disbursed_inr,
           k.bank_account_number, k.bank_ifsc, k.bank_holder_name
      FROM gaushala_profiles g
      LEFT JOIN (SELECT gaushala_id, SUM(amount_inr) AS paid, COUNT(*) AS cnt
                   FROM donations WHERE status = 'paid' AND gaushala_id IS NOT NULL
                  GROUP BY gaushala_id) d ON d.gaushala_id = g.user_id::text
      LEFT JOIN (SELECT gaushala_user_id, SUM(amount_inr) AS sent
                   FROM gaushala_disbursements GROUP BY gaushala_user_id) x ON x.gaushala_user_id = g.user_id
      LEFT JOIN provider_kyc k ON k.user_id = g.user_id
     WHERE COALESCE(d.paid, 0) > 0 OR COALESCE(x.sent, 0) > 0
     ORDER BY (COALESCE(d.paid, 0) - COALESCE(x.sent, 0)) DESC`);
  return rows.map((r) => {
    const paid = Number(r.paid_inr);
    const sent = Number(r.disbursed_inr);
    return {
      gaushalaUserId: r.user_id,
      name: r.gaushala_name,
      donationsCount: Number(r.donations_count),
      paidInr: paid,
      disbursedInr: sent,
      owedInr: round2(paid - sent),
      payTo:
        r.bank_account_number && r.bank_ifsc
          ? { holderName: r.bank_holder_name, accountNumber: r.bank_account_number, ifsc: r.bank_ifsc }
          : null,
    };
  });
}

export type DisbursementResult =
  | { ok: true; id: string; owedInr: number }
  | { ok: false; code: 'exceeds_balance' | 'duplicate_reference'; owedInr: number };

export async function recordDisbursement(input: {
  gaushalaUserId: string;
  amountInr: number;
  reference: string;
  note?: string;
  adminId: string;
}): Promise<DisbursementResult> {
  await ensureTable();
  return prisma.$transaction(async (tx) => {
    // One recorder per gaushala at a time: two admins cannot both spend the balance.
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, `gaushala-disb:${input.gaushalaUserId}`);
    const [bal] = await tx.$queryRawUnsafe<Array<{ paid_inr: string | number; disbursed_inr: string | number }>>(
      `SELECT
         COALESCE((SELECT SUM(amount_inr) FROM donations WHERE status = 'paid' AND gaushala_id = $1::text), 0) AS paid_inr,
         COALESCE((SELECT SUM(amount_inr) FROM gaushala_disbursements WHERE gaushala_user_id = $1::uuid), 0) AS disbursed_inr`,
      input.gaushalaUserId,
    );
    const owed = round2(Number(bal?.paid_inr ?? 0) - Number(bal?.disbursed_inr ?? 0));
    if (input.amountInr > owed + 0.001) return { ok: false, code: 'exceeds_balance', owedInr: owed } as const;
    const inserted = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO gaushala_disbursements (gaushala_user_id, amount_inr, reference, note, disbursed_by)
       VALUES ($1::uuid, $2, $3, $4, $5)
       ON CONFLICT (gaushala_user_id, reference) DO NOTHING
       RETURNING id`,
      input.gaushalaUserId,
      input.amountInr,
      input.reference,
      input.note ?? null,
      input.adminId,
    );
    if (!inserted[0]) return { ok: false, code: 'duplicate_reference', owedInr: owed } as const;
    return { ok: true, id: inserted[0].id, owedInr: round2(owed - input.amountInr) } as const;
  });
}
