import { z } from 'zod';
import { prisma } from './prisma.js';
import { HAS_80G } from './eighty-g.js';

/**
 * Donee tax identifiers (PAN + Section 80G registration) for donation receipts.
 *
 * Gaushala donees keep them on `gaushala_profiles.pan` / `.regn_80g`; temples on
 * `temples.pan` / `.regn_80g` (additive nullable columns, migration
 * 20261013010000_donee_tax_and_email_outbox). Both are read/written with raw
 * SQL so the Prisma client does not select a column that may not exist yet:
 * every reader here tolerates the column being absent (returns nulls) and a
 * writer adds it lazily with ADD COLUMN IF NOT EXISTS.
 *
 * Storing the numbers does NOT by itself make a receipt an 80G receipt. The
 * receipt asserts 80G only when BOTH numbers exist AND the platform-level flag
 * (`HAS_80G` in lib/eighty-g.ts) is true — see `is80GEligible` in pdf-receipt.ts.
 */

export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
/**
 * 80G unique registration number issued since 2021 (PAN + F + year + serial,
 * e.g. AAATS1234QF20214) OR the older order-number style which always carries
 * slashes and digits (e.g. CIT(E)/DEL/80G/2015-16/123).
 */
export const REGN_80G_NEW_RE = /^[A-Z]{5}[0-9]{4}[A-Z]F[0-9]{4,6}$/;
export const REGN_80G_LEGACY_RE = /^(?=.*\d)(?=.*\/)[A-Z0-9][A-Z0-9 ./()\-]{6,59}$/;

export function isValidRegn80G(v: string): boolean {
  return REGN_80G_NEW_RE.test(v) || REGN_80G_LEGACY_RE.test(v);
}

const panField = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => PAN_RE.test(v), 'PAN must look like ABCDE1234F');
const regnField = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine(isValidRegn80G, '80G registration must look like AAATS1234QF20214 or CIT(E)/DEL/80G/2015-16/123');

/** `null` clears a value; an absent key leaves it alone. */
export const doneeTaxSchema = z
  .object({
    pan: panField.nullable().optional(),
    regn80g: regnField.nullable().optional(),
  })
  .strict();

export type DoneeTaxInput = z.infer<typeof doneeTaxSchema>;

export type DoneeKind = 'temple' | 'gaushala';

const CONFIG: Record<DoneeKind, { table: string; key: string }> = {
  temple: { table: 'temples', key: 'id' },
  gaushala: { table: 'gaushala_profiles', key: 'user_id' },
};

export interface DoneeTax {
  pan: string | null;
  regn80g: string | null;
}

/** Never throws: an absent column / table / row means "nothing on file". */
export async function readDoneeTax(kind: DoneeKind, key: string): Promise<DoneeTax> {
  const { table, key: col } = CONFIG[kind];
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ pan: string | null; regn_80g: string | null }>>(
      `SELECT pan, regn_80g FROM ${table} WHERE ${col} = $1::uuid LIMIT 1`,
      key,
    );
    const r = Array.isArray(rows) ? rows[0] : undefined;
    return { pan: r?.pan?.trim() || null, regn80g: r?.regn_80g?.trim() || null };
  } catch {
    return { pan: null, regn80g: null };
  }
}

/** Mask all but the last 4 characters, for portal display. */
export function maskTaxId(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (s.length <= 4) return '*'.repeat(s.length);
  return `${'*'.repeat(s.length - 4)}${s.slice(-4)}`;
}

/**
 * Apply a validated patch. Returns false when no row matched. Adds the columns
 * on first use if the migration has not been applied.
 */
export async function writeDoneeTax(kind: DoneeKind, key: string, patch: DoneeTaxInput): Promise<boolean> {
  const { table, key: col } = CONFIG[kind];
  const sets: string[] = [];
  const vals: unknown[] = [key];
  if (patch.pan !== undefined) {
    vals.push(patch.pan);
    sets.push(`pan = $${vals.length}`);
  }
  if (patch.regn80g !== undefined) {
    vals.push(patch.regn80g);
    sets.push(`regn_80g = $${vals.length}`);
  }
  if (sets.length === 0) return true;
  await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS pan TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS regn_80g TEXT`);
  const n = await prisma.$executeRawUnsafe(
    `UPDATE ${table} SET ${sets.join(', ')} WHERE ${col} = $1::uuid`,
    ...vals,
  );
  return Number(n) > 0;
}

/** What a portal / admin screen shows: the stored values and what they will (not) do. */
export function taxInfoView(t: DoneeTax) {
  return {
    pan: t.pan,
    regn80g: t.regn80g,
    bothOnFile: !!(t.pan && t.regn80g),
    // Receipts assert Section 80G only with both numbers AND the platform flag.
    platformHas80G: HAS_80G,
    receiptsClaim80G: HAS_80G && !!(t.pan && t.regn80g),
  };
}
