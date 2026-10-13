import { prisma } from './prisma.js';

/**
 * Donor name / email / phone as typed on the donation form.
 *
 * The portal lists and the admin export used to show the paying USER's account
 * name and email, which is not who the donor said they were (gifting, family
 * accounts, a different receipt name). The values live in additive nullable
 * columns on `donations` (migration 20261013010000_donee_tax_and_email_outbox),
 * written with a separate best-effort UPDATE after the order row exists and read
 * back with raw SQL, so a database where the migration has not been applied
 * behaves exactly as before: the columns are added lazily on first write
 * (ADD COLUMN IF NOT EXISTS) and every read tolerates their absence.
 */

export interface DonorContact {
  name: string | null;
  email: string | null;
  phone: string | null;
}

let columnsReady = false;

async function ensureColumns(): Promise<void> {
  if (columnsReady) return;
  await prisma.$executeRawUnsafe(`ALTER TABLE donations ADD COLUMN IF NOT EXISTS donor_name TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE donations ADD COLUMN IF NOT EXISTS donor_email TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE donations ADD COLUMN IF NOT EXISTS donor_phone TEXT`);
  columnsReady = true;
}

const UPDATE_SQL = `UPDATE donations
     SET donor_name = COALESCE($2, donor_name),
         donor_email = COALESCE($3, donor_email),
         donor_phone = COALESCE($4, donor_phone)
   WHERE id = $1 AND status = 'created'`;

/** Never throws. Only an unpaid ('created') row can be changed. */
export async function saveDonorContact(
  donationId: string,
  c: { name?: string | undefined; email?: string | undefined; phone?: string | undefined },
): Promise<boolean> {
  if (!c.name && !c.email && !c.phone) return false;
  const args = [donationId, c.name ?? null, c.email?.toLowerCase() ?? null, c.phone ?? null];
  try {
    await prisma.$executeRawUnsafe(UPDATE_SQL, ...args);
    return true;
  } catch {
    try {
      await ensureColumns();
      await prisma.$executeRawUnsafe(UPDATE_SQL, ...args);
      return true;
    } catch {
      return false;
    }
  }
}

/** donationId -> contact. Never throws; empty when the columns do not exist. */
export async function donorContactMap(ids: string[]): Promise<Map<string, DonorContact>> {
  const out = new Map<string, DonorContact>();
  if (ids.length === 0) return out;
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ id: string; donor_name: string | null; donor_email: string | null; donor_phone: string | null }>
    >(`SELECT id, donor_name, donor_email, donor_phone FROM donations WHERE id = ANY($1::text[])`, ids);
    if (!Array.isArray(rows)) return out;
    for (const r of rows) {
      out.set(r.id, {
        name: r.donor_name?.trim() || null,
        email: r.donor_email?.trim() || null,
        phone: r.donor_phone?.trim() || null,
      });
    }
  } catch {
    // columns absent: callers fall back to the account name / email
  }
  return out;
}

export function __resetDonationContactForTests(): void {
  columnsReady = false;
}
