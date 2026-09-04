import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * DI-06 (F367) — EVERY money-ledger insert must be ON CONFLICT DO NOTHING, not
 * just the one that was converted first.
 *
 * Migration 20260824000000 adds four UNIQUE indexes:
 *
 *   commissions_booking_id_key
 *   commissions_store_order_id_key
 *   commissions_wellness_enrollment_id_key
 *   temple_payouts_booking_id_key
 *
 * That constraint changes what the LOSER of a race experiences. Before it, a
 * racing writer wrote a duplicate payable; after it, a bare `create` raises
 * 23505 -> P2002. Six of the eight writers run inside the caller's
 * `$transaction` (the payment capture, the confirm flip, the reassignment), and
 * in Postgres a statement error aborts the whole transaction — Prisma issues no
 * per-query savepoint, so catching P2002 in JavaScript does not recover it. The
 * capture, the booking confirm and the temple share would roll back together
 * and the API would answer 500 for money Razorpay has already taken.
 *
 * So adding the constraint without converting the writers turns a latent
 * duplicate into a live outage. `createMany({ skipDuplicates: true })` compiles
 * to INSERT ... ON CONFLICT DO NOTHING, which is not an error: the loser writes
 * nothing and the transaction survives.
 *
 * WHY A REPO-WIDE SCAN AND NOT A UNIT TEST PER WRITER. The first pass of this
 * fix converted payment.service.ts alone, and SIX other writers of the same
 * keys were left on `create` — a per-writer test proves nothing about the ones
 * nobody remembered. This enumerates them from the source and fails on the
 * seventh that gets added.
 */

const API_SRC = fileURLToPath(new URL('..', import.meta.url));

/** Every non-test .ts file under apps/api/src. */
function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '__mocks__') continue;
      sourceFiles(full, acc);
      continue;
    }
    if (!entry.endsWith('.ts')) continue;
    if (entry.includes('.test.')) continue;
    acc.push(full);
  }
  return acc;
}

const FILES = sourceFiles(API_SRC).map((f) => ({
  rel: path.relative(API_SRC, f).replace(/\\/g, '/'),
  // Comments stripped: several of these files describe the OLD `create` call in
  // prose, and that record must stay readable without tripping the scan.
  code: readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\n)\s*\/\/[^\n]*/g, '$1'),
}));

/** `tx.commission.create({`, `prisma.commission.create({`, … but never `createMany`. */
const bareInsert = (model: string) => new RegExp(`\\.${model}\\.create\\s*\\(`);
const conflictInsert = (model: string) => new RegExp(`\\.${model}\\.createMany\\s*\\(`);

function filesWith(re: RegExp): string[] {
  return FILES.filter((f) => re.test(f.code)).map((f) => f.rel).sort();
}

describe('DI-06 — the scan itself', () => {
  it('reads a meaningful number of source files', () => {
    // A broken walker returning [] would make every assertion below vacuous.
    expect(FILES.length).toBeGreaterThan(100);
    expect(FILES.some((f) => f.rel === 'services/payment.service.ts')).toBe(true);
  });

  it('the bare-insert detector matches a bare insert and not a guarded one', () => {
    expect(bareInsert('commission').test('await tx.commission.create({ data: {} })')).toBe(true);
    expect(bareInsert('commission').test('await tx.commission.createMany({ data: [] })')).toBe(
      false,
    );
  });

  it('the comment stripper does not hide a real call site', () => {
    const payment = FILES.find((f) => f.rel === 'services/payment.service.ts')!;
    expect(payment.code).toContain('createMany');
    // payment.service.ts documents the old `create` in prose; that prose is gone
    // from the scanned text, which is exactly what lets the assertion below be
    // about code rather than about comments.
    expect(payment.code).not.toContain('a bare `create`');
  });
});

describe('DI-06 — no money-ledger writer inserts without ON CONFLICT DO NOTHING', () => {
  it('no file inserts a Commission with a bare create', () => {
    expect(filesWith(bareInsert('commission'))).toEqual([]);
  });

  it('no file inserts a TemplePayout with a bare create', () => {
    expect(filesWith(bareInsert('templePayout'))).toEqual([]);
  });

  /**
   * The enumeration, pinned by name.
   *
   * This is the list the migration's own comments name as the writers relying on
   * the four keys. Pinning it (rather than a count) is what makes a NEW writer
   * visible: adding one fails here and forces the author to read this file.
   */
  it('every known writer is present and uses the guarded insert', () => {
    expect(filesWith(conflictInsert('commission'))).toEqual([
      'routes/bookings.ts',
      'routes/consultation.ts',
      'routes/wellness-sessions.ts',
      'services/booking.service.ts',
      'services/payment.service.ts',
      'services/provider-earning-mint.ts',
      'services/store-commission.service.ts',
    ]);
    expect(filesWith(conflictInsert('templePayout'))).toEqual([
      'services/temple-payout.service.ts',
    ]);
  });

  it('each of those inserts actually passes skipDuplicates', () => {
    // `createMany` without the flag is a plain multi-row INSERT and raises
    // P2002 exactly like `create` — the flag is the whole fix.
    for (const f of FILES) {
      const calls = f.code.match(
        /\.(commission|templePayout)\.createMany\s*\(\s*\{[\s\S]*?\}\s*\)/g,
      );
      if (!calls) continue;
      for (const call of calls) {
        expect(call, `${f.rel}: createMany without skipDuplicates`).toContain(
          'skipDuplicates: true',
        );
      }
    }
  });
});
