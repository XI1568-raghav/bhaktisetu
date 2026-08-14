import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PRIEST_SHARE, DEFAULT_PLATFORM_SHARE } from './booking.service.js';

/**
 * PJ-03 — the doctrine comment must not outlive the defect it describes.
 *
 * The code half of PJ-03 is closed: schema.prisma defaults
 * `Priest.commissionRate` to 0.80, migration
 * 20260812000000_priest_commission_rate_80 backfills the 0.70 rows, and
 * PATCH /admin/priests/:id/commission-rate is the owner-authenticated write
 * path for a negotiated rate. All three are locked by
 * routes/admin.priest-commission.test.ts.
 *
 * What was left behind is the 20-line block above DEFAULT_PRIEST_SHARE, which
 * still read "⚠ OPEN SCHEMA MISMATCH ... prisma/schema.prisma still carries
 * @default(0.70) ... Not changed unilaterally here because the direction is an
 * owner call", and offered option (a) "set the Prisma default to 0.80" as
 * future work that had in fact already shipped.
 *
 * That is not cosmetic in this file. It is the money doctrine comment for the
 * pandit split, it names a decision as still open, and it tells the next reader
 * that the schema disagrees with the constant three lines below it. Acting on
 * it means re-opening a closed P1 about how much a pandit is paid.
 *
 * So the two are pinned to each other: whatever the schema says, this file must
 * not claim the opposite.
 */

const schema = readFileSync(
  fileURLToPath(new URL('../../prisma/schema.prisma', import.meta.url)),
  'utf8',
);
const source = readFileSync(fileURLToPath(new URL('./booking.service.ts', import.meta.url)), 'utf8');

function schemaDefault(): string {
  const line = schema
    .split(/\r?\n/)
    .find((l) => /^\s*commissionRate\s+Float/.test(l));
  const m = /@default\(([\d.]+)\)/.exec(line ?? '');
  return m?.[1] ?? '';
}

describe('PJ-03 — booking.service agrees with the schema about the pandit share', () => {
  it('the schema really does default to the 80% share', () => {
    expect(Number(schemaDefault())).toBe(0.8);
  });

  it('the constants state the uniform 20/80 split', () => {
    expect(DEFAULT_PRIEST_SHARE).toBe(0.8);
    expect(DEFAULT_PLATFORM_SHARE).toBe(0.2);
    expect(DEFAULT_PRIEST_SHARE + DEFAULT_PLATFORM_SHARE).toBeCloseTo(1, 10);
  });

  it('does not still describe the schema default as 0.70', () => {
    expect(source).not.toMatch(/still carries `@default\(0\.70\)`/);
    expect(source).not.toMatch(/OPEN SCHEMA MISMATCH/);
  });

  it('does not still propose changing the default as unshipped work', () => {
    // Option (a) of the old comment. Reading it as a to-do now means writing a
    // migration that already exists, on a column that already holds 0.8.
    expect(source).not.toMatch(/set the Prisma default to 0\.80 plus an additive/);
  });

  it('still records WHY the rate is 20/80, so the reasoning is not lost', () => {
    expect(source).toMatch(/20%/);
    expect(source).toMatch(/Priest\.commissionRate/);
  });
});
