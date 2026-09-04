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
const seed = readFileSync(fileURLToPath(new URL('../../prisma/seed.ts', import.meta.url)), 'utf8');

/**
 * Strip `//` and block comments so a comment that RECORDS the old 0.70 defect
 * cannot fail these assertions, and — the direction that actually matters — so
 * a commented-out `commissionRate: 0.70` cannot satisfy one either.
 *
 * String literals are preserved: a `'0.70'` inside a string is still source
 * this file wants to see.
 */
function stripComments(src: string): string {
  let out = '';
  let i = 0;
  let mode: 'code' | 'line' | 'block' | 'str' = 'code';
  let quote = '';
  const BACKSLASH = String.fromCharCode(92);
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (mode === 'code') {
      if (c === '/' && d === '/') { mode = 'line'; i += 2; out += '  '; continue; }
      if (c === '/' && d === '*') { mode = 'block'; i += 2; out += '  '; continue; }
      if (c === '"' || c === "'" || c === '`') { mode = 'str'; quote = c; }
      out += c; i += 1; continue;
    }
    if (mode === 'line') {
      if (c === '\n') { mode = 'code'; out += c; } else { out += ' '; }
      i += 1; continue;
    }
    if (mode === 'block') {
      if (c === '*' && d === '/') { mode = 'code'; i += 2; out += '  '; continue; }
      out += c === '\n' ? '\n' : ' '; i += 1; continue;
    }
    // mode === 'str'
    if (c === BACKSLASH) { out += c + (d ?? ''); i += 2; continue; }
    if (c === quote) mode = 'code';
    out += c; i += 1; continue;
  }
  return out;
}

const seedCode = stripComments(seed);

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

/**
 * PM-03 — the seed is the LAST surviving writer of the pre-revamp 70% share.
 *
 * `prisma/seed.ts` upserts the three demo pandits, and its `create:` branch
 * passed `commissionRate: 0.70` explicitly — the only literal commissionRate
 * write at creation time anywhere in apps/api. On an EXISTING database that is
 * harmless (the `update:` branch does not touch the column), but on a fresh one
 * the ordering is fatal and permanent:
 *
 *   1. `prisma migrate deploy` runs first (package.json `start`, Dockerfile),
 *      so 20260812000000_priest_commission_rate_80's backfill UPDATE matches
 *      zero rows — the table is empty.
 *   2. The seed then INSERTS three pandits at 0.70, overriding the 0.80 column
 *      default.
 *   3. The migration is recorded applied and never runs again.
 *
 * `resolvePriestShare` (routes/bookings.ts) treats any stored value in (0,1] as
 * authoritative, and 0.70 is inside that range, so DEFAULT_PRIEST_SHARE never
 * fires for those pandits and they are billed a 30% platform take forever.
 *
 * The guard is written against the schema default rather than the literal 0.8
 * so that a future negotiated default cannot silently reopen the gap.
 */
describe('PM-03 — the seed does not re-introduce the pre-revamp 70% share', () => {
  it('writes no commissionRate below the schema default', () => {
    const written = [...seedCode.matchAll(/commissionRate\s*:\s*([\d.]+)/g)].map((m) =>
      Number(m[1]),
    );
    const schemaValue = Number(schemaDefault());
    expect(schemaValue).toBeGreaterThan(0);
    for (const value of written) {
      expect(value).toBeGreaterThanOrEqual(schemaValue);
    }
  });

  it('hardcodes no 0.70 pandit share at all', () => {
    expect(seedCode).not.toMatch(/commissionRate\s*:\s*0\.70?\b/);
  });

  it('the comment-stripper cannot be fooled by a commented-out write', () => {
    // Eight guards in this audit scanned raw source and were satisfied (or
    // tripped) by a comment. Prove the stripper on both directions before
    // trusting it above: a commented write must vanish, a real one must stay.
    expect(stripComments('// commissionRate: 0.70\n')).not.toMatch(/commissionRate/);
    expect(stripComments('/* commissionRate: 0.70 */')).not.toMatch(/commissionRate/);
    expect(stripComments('const a = { commissionRate: 0.70 };')).toMatch(
      /commissionRate\s*:\s*0\.70/,
    );
    // A string literal survives, and line numbering is preserved.
    expect(stripComments("const s = 'commissionRate: 0.70';")).toMatch(/commissionRate/);
    expect(stripComments('a\n// x\nb').split('\n')).toHaveLength(3);
  });
});
