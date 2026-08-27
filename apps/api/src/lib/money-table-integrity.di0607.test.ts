/**
 * DI-06 / DI-07 — the money tables have no database-level key integrity.
 *
 * Measured at HEAD before this fix:
 *   apps/api/prisma/schema.prisma model Commission (line 1095) declared SEVEN
 *   @@index entries and ZERO @@unique of any kind. model TemplePayout (line
 *   556) declared @@index([templeId, status]) + @@index([status]) and no
 *   @@unique. Neither declared an index on booking_id at all.
 *
 * Consequences, both real:
 *
 *   DI-06 — every idempotency guard in the product is application-level. Ten
 *   writers (payment.service.ts:266/497, store-commission.service.ts:27,
 *   wellness-sessions.ts:84, consultation.ts:178, provider-earning-mint.ts:112,
 *   booking.service.ts:874, temple-payout.service.ts:76, ...) all run
 *   findFirst-then-create with NOTHING behind them at the database layer. They
 *   hold under normal load because the enclosing transaction's first statement
 *   takes a row lock and racers serialise — a duplicate could not be forced in
 *   6 concurrent verify-payment calls, 3 replays and 6 race rounds. That makes
 *   it a latent hazard, not a live bug, and the hazard is worst precisely when
 *   it fires: a duplicate row on a MONEY ledger is a double payable.
 *
 *   DI-07 — commissions.booking_id carries no index, and it is the single
 *   column the confirm-path guard (payment.service.ts:266) queries on every
 *   payment. That is a sequential scan of the whole commission ledger inside
 *   the payment transaction.
 *
 * These tests lock the two properties that make the fix real rather than
 * declared, plus the three that stop it taking production down:
 *   - the confirm-path lookup columns are indexed, under the exact names
 *     Prisma generates, so schema.prisma and the database cannot drift;
 *   - every polymorphic commission key, and the temple ledger key, gets a
 *     DB-level UNIQUE index;
 *   - the UNIQUE creation is duplicate-tolerant, because migrations auto-apply
 *     on API boot and a UNIQUE index over existing duplicates aborts the
 *     migration and takes the API down;
 *   - no CREATE INDEX CONCURRENTLY (25001 inside migrate deploy's transaction
 *     blocked this repo's migrations for two months);
 *   - the migration is additive only.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const schemaPath = fileURLToPath(new URL('../../prisma/schema.prisma', import.meta.url));
const migrationsDir = fileURLToPath(new URL('../../prisma/migrations', import.meta.url));

/** The top-level body of one `model X { ... }` block — never the whole schema. */
function modelBlock(schema: string, modelName: string): string {
  const start = schema.indexOf(`model ${modelName} {`);
  expect(start, `model ${modelName} not found in schema.prisma`).toBeGreaterThan(-1);
  const open = schema.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < schema.length; i += 1) {
    if (schema[i] === '{') depth += 1;
    if (schema[i] === '}') {
      depth -= 1;
      if (depth === 0) return schema.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated model block: ${modelName}`);
}

/** Comments stripped. Both blocks document their own rules in prose, and the
 *  prose names the very attributes these tests look for. */
const stripComments = (s: string) => s.replace(/\/\/[^\n]*/g, ' ');

const schema = readFileSync(schemaPath, 'utf8');
const commissionBlock = modelBlock(schema, 'Commission');
const templePayoutBlock = modelBlock(schema, 'TemplePayout');
const commission = stripComments(commissionBlock);
const templePayout = stripComments(templePayoutBlock);

describe('DI-06/DI-07 — schema.prisma money key declarations', () => {
  it('the comment stripper is actually doing something', () => {
    expect(commissionBlock).toMatch(/\/\//);
    expect(commission).not.toMatch(/\/\//);
    expect(templePayoutBlock).toMatch(/\/\//);
    expect(templePayout).not.toMatch(/\/\//);
  });

  it('the block extractor returns one model, not the whole schema', () => {
    expect(commission).toMatch(/^model Commission \{/);
    expect(commission).not.toMatch(/model TemplePayout/);
    expect(templePayout).not.toMatch(/model Commission/);
  });

  it('DI-07: Commission indexes bookingId — the confirm-path guard column', () => {
    expect(commission).toMatch(/@@index\(\[bookingId\]\)/);
  });

  it('DI-07: TemplePayout indexes bookingId — Postgres does not index the referencing side of a FK', () => {
    expect(templePayout).toMatch(/@@index\(\[bookingId\]\)/);
  });
});

describe('DI-06/DI-07 — the migration that ships the indexes', () => {
  const dirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const dir = dirs.find((d) => /di0607_money_key_indexes$/.test(d));

  it('the migration exists', () => {
    expect(dir, `no *_di0607_money_key_indexes migration in ${migrationsDir}`).toBeTruthy();
  });

  const sqlRaw = dir ? readFileSync(`${migrationsDir}/${dir}/migration.sql`, 'utf8') : '';
  /** SQL line comments stripped: this file explains the 25001 ban in prose. */
  const sql = sqlRaw.replace(/--[^\n]*/g, ' ');

  it('the SQL comment stripper is actually doing something', () => {
    expect(sqlRaw).toMatch(/--/);
    expect(sql).not.toMatch(/--/);
  });

  it('DI-07: creates the plain lookup indexes under Prisma default names', () => {
    expect(sql).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+"commissions_booking_id_idx"/i);
    expect(sql).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+"temple_payouts_booking_id_idx"/i);
  });

  it('DI-06: creates a UNIQUE index for every polymorphic commission key and the temple key', () => {
    for (const name of [
      'commissions_booking_id_key',
      'commissions_store_order_id_key',
      'commissions_wellness_enrollment_id_key',
      'temple_payouts_booking_id_key',
    ]) {
      expect(sql, `missing UNIQUE index ${name}`).toMatch(
        new RegExp(String.raw`CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+"${name}"`, 'i'),
      );
    }
  });

  it('DI-06: every UNIQUE index is duplicate-tolerant — a live table with dupes must not abort API boot', () => {
    // Two independent guards are required, because either alone can still take
    // the API down: the pre-check can be raced by a writer that commits between
    // the count and the lock, and a bare exception handler without the
    // pre-check would swallow real errors while still doing the wrong thing on
    // a table that is known-dirty.
    const uniqueStatements = sql.match(/CREATE\s+UNIQUE\s+INDEX[^;]*/gi) ?? [];
    expect(uniqueStatements.length).toBe(4);
    expect(sql).toMatch(/HAVING\s+count\(\*\)\s*>\s*1/i);
    expect(sql).toMatch(/EXCEPTION\s+WHEN\s+OTHERS\s+THEN/i);
    // A skipped constraint must be announced, not silent.
    expect((sql.match(/RAISE\s+WARNING/gi) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('never CONCURRENTLY — 25001 inside migrate deploy blocks every later migration', () => {
    expect(sql).not.toMatch(/CONCURRENTLY/i);
  });

  it('additive only — no destructive DDL and no data rewrite on a money table', () => {
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN|CONSTRAINT|INDEX)\b/i);
    expect(sql).not.toMatch(/\bALTER\s+COLUMN\b/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(sql).not.toMatch(/\bUPDATE\s+"?(commissions|temple_payouts)"?\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
  });
});
