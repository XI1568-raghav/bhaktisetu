import { prisma } from '../lib/prisma.js';

/**
 * What Darshya owes each temple, and a record of what has been sent.
 *
 * Two kinds of money reach a temple, and until now neither had any way out:
 *
 *  - its share of puja bookings (`temple_payouts`, 5% of the puja price). Rows
 *    were written `pending` and nothing in the product ever set one `completed`,
 *    so the temple's "Pending settlement" figure could only grow;
 *  - donations made to it, collected into Darshya's own Razorpay account.
 *
 * Sending money is a manual bank transfer, so this module's job is to show the
 * admin what is owed and where to send it, take the transfer's reference, and
 * never let more be recorded than is owed. It moves no money.
 *
 * A puja share is payable only once the puja has been performed and proved. The row is
 * minted when the booking is CONFIRMED; paying it then would hand a temple 5% of
 * a booking that is still free to be cancelled and refunded.
 */

/**
 * Booking states in which the puja has been performed AND proved. Video proof
 * is mandatory, so `completed` alone does not release the share (the pandit's
 * earning is held on the same statuses).
 */
const PERFORMED = `('video_uploaded','delivered')`;

let tableReady: Promise<void> | null = null;

// Created lazily, like the gaushala and consultation tables: migrations are
// applied by hand in production, so a table this feature needs must not depend
// on one.
function ensureTable(): Promise<void> {
  tableReady ??= (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS temple_disbursements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        temple_id UUID NOT NULL,
        amount_inr NUMERIC(10,2) NOT NULL CHECK (amount_inr > 0),
        reference TEXT NOT NULL,
        note TEXT,
        disbursed_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (temple_id, reference)
      )`);
  })().catch((err) => {
    tableReady = null;
    throw err;
  });
  return tableReady;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface TempleBalance {
  templeId: string;
  name: string;
  /** Puja share the temple has earned for performed pujas and has not been sent. */
  pujaShareOwedInr: number;
  /** Puja share on confirmed bookings whose puja has not happened yet. */
  pujaShareHeldInr: number;
  pujaShareSentInr: number;
  donationsCount: number;
  donationsPaidInr: number;
  donationsSentInr: number;
  donationsOwedInr: number;
  payTo: { holderName: string | null; accountNumber: string; ifsc: string } | null;
}

export async function listTempleBalances(): Promise<TempleBalance[]> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      temple_id: string;
      name: string;
      share_owed: string | number;
      share_held: string | number;
      share_sent: string | number;
      donations_count: bigint | number;
      donations_paid: string | number;
      donations_sent: string | number;
      bank_account_number: string | null;
      bank_ifsc: string | null;
      bank_holder_name: string | null;
    }>
  >(`
    SELECT t.id AS temple_id, t.name,
           COALESCE(p.owed, 0) AS share_owed, COALESCE(p.held, 0) AS share_held, COALESCE(p.sent, 0) AS share_sent,
           COALESCE(d.cnt, 0) AS donations_count, COALESCE(d.paid, 0) AS donations_paid, COALESCE(x.sent, 0) AS donations_sent,
           k.bank_account_number, k.bank_ifsc, k.bank_holder_name
      FROM temples t
      LEFT JOIN (SELECT tp.temple_id,
                        SUM(CASE WHEN tp.status = 'pending' AND b.status::text IN ${PERFORMED} THEN tp.amount ELSE 0 END) AS owed,
                        SUM(CASE WHEN tp.status = 'pending' AND b.status::text NOT IN ${PERFORMED} THEN tp.amount ELSE 0 END) AS held,
                        SUM(CASE WHEN tp.status = 'completed' THEN tp.amount ELSE 0 END) AS sent
                   FROM temple_payouts tp JOIN puja_bookings b ON b.id = tp.booking_id
                  GROUP BY tp.temple_id) p ON p.temple_id = t.id
      LEFT JOIN (SELECT temple_id, SUM(amount_inr) AS paid, COUNT(*) AS cnt
                   FROM donations WHERE status = 'paid' AND temple_id IS NOT NULL
                  GROUP BY temple_id) d ON d.temple_id = t.id
      LEFT JOIN (SELECT temple_id, SUM(amount_inr) AS sent
                   FROM temple_disbursements GROUP BY temple_id) x ON x.temple_id = t.id
      LEFT JOIN provider_kyc k ON k.user_id = (
             SELECT tpf.user_id FROM temple_profiles tpf
              WHERE tpf.approved AND lower(btrim(tpf.temple_name)) = lower(btrim(t.name))
              ORDER BY tpf.created_at LIMIT 1)
     WHERE COALESCE(p.owed, 0) + COALESCE(p.held, 0) + COALESCE(p.sent, 0) > 0
        OR COALESCE(d.paid, 0) > 0 OR COALESCE(x.sent, 0) > 0
     ORDER BY (COALESCE(p.owed, 0) + COALESCE(d.paid, 0) - COALESCE(x.sent, 0)) DESC`);
  return rows.map((r) => {
    const paid = Number(r.donations_paid);
    const sent = Number(r.donations_sent);
    return {
      templeId: r.temple_id,
      name: r.name,
      pujaShareOwedInr: round2(Number(r.share_owed)),
      pujaShareHeldInr: round2(Number(r.share_held)),
      pujaShareSentInr: round2(Number(r.share_sent)),
      donationsCount: Number(r.donations_count),
      donationsPaidInr: paid,
      donationsSentInr: sent,
      donationsOwedInr: round2(paid - sent),
      payTo:
        r.bank_account_number && r.bank_ifsc
          ? { holderName: r.bank_holder_name, accountNumber: r.bank_account_number, ifsc: r.bank_ifsc }
          : null,
    };
  });
}

export type SettlementResult =
  | { ok: true; settled: number; owedInr: number }
  | { ok: false; code: 'exceeds_balance' | 'duplicate_reference' | 'amount_mismatch' | 'nothing_payable'; owedInr: number };

/**
 * Record that a temple's puja share has been sent. A share is made of one row per
 * booking, so a transfer settles ALL the rows that are payable now and the amount
 * must equal their total exactly; a part-payment would leave it unsaid which
 * bookings it covered.
 */
export async function recordPujaShareTransfer(input: {
  templeId: string;
  amountInr: number;
  reference: string;
}): Promise<SettlementResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, `temple-settle:${input.templeId}`);
    const rows = await tx.$queryRawUnsafe<Array<{ id: string; amount: string | number }>>(
      `SELECT tp.id, tp.amount
         FROM temple_payouts tp JOIN puja_bookings b ON b.id = tp.booking_id
        WHERE tp.temple_id = $1::uuid AND tp.status = 'pending' AND b.status::text IN ${PERFORMED}
        FOR UPDATE OF tp`,
      input.templeId,
    );
    const owed = round2(rows.reduce((s, r) => s + Number(r.amount), 0));
    if (rows.length === 0) return { ok: false, code: 'nothing_payable', owedInr: 0 } as const;
    if (Math.abs(input.amountInr - owed) > 0.005) {
      return { ok: false, code: 'amount_mismatch', owedInr: owed } as const;
    }
    const dup = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM temple_payouts WHERE temple_id = $1::uuid AND reference = $2 LIMIT 1`,
      input.templeId,
      input.reference,
    );
    if (dup.length > 0) return { ok: false, code: 'duplicate_reference', owedInr: owed } as const;
    await tx.$executeRawUnsafe(
      `UPDATE temple_payouts SET status = 'completed', reference = $2, processed_at = now()
        WHERE id = ANY($1::uuid[])`,
      rows.map((r) => r.id),
      input.reference,
    );
    return { ok: true, settled: rows.length, owedInr: 0 } as const;
  });
}

/** Record a transfer of donations received for a temple. Never exceeds what was received. */
export async function recordDonationTransfer(input: {
  templeId: string;
  amountInr: number;
  reference: string;
  note?: string;
  adminId: string;
}): Promise<SettlementResult> {
  await ensureTable();
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, `temple-settle:${input.templeId}`);
    const [bal] = await tx.$queryRawUnsafe<Array<{ paid_inr: string | number; disbursed_inr: string | number }>>(
      `SELECT
         COALESCE((SELECT SUM(amount_inr) FROM donations WHERE status = 'paid' AND temple_id = $1::uuid), 0) AS paid_inr,
         COALESCE((SELECT SUM(amount_inr) FROM temple_disbursements WHERE temple_id = $1::uuid), 0) AS disbursed_inr`,
      input.templeId,
    );
    const owed = round2(Number(bal?.paid_inr ?? 0) - Number(bal?.disbursed_inr ?? 0));
    if (input.amountInr > owed + 0.001) return { ok: false, code: 'exceeds_balance', owedInr: owed } as const;
    const inserted = await tx.$queryRawUnsafe<Array<{ id: string }>>(
      `INSERT INTO temple_disbursements (temple_id, amount_inr, reference, note, disbursed_by)
       VALUES ($1::uuid, $2, $3, $4, $5)
       ON CONFLICT (temple_id, reference) DO NOTHING
       RETURNING id`,
      input.templeId,
      input.amountInr,
      input.reference,
      input.note ?? null,
      input.adminId,
    );
    if (!inserted[0]) return { ok: false, code: 'duplicate_reference', owedInr: owed } as const;
    return { ok: true, settled: 1, owedInr: round2(owed - input.amountInr) } as const;
  });
}
