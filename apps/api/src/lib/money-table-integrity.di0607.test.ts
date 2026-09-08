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
 *   DI-06 — every idempotency guard in the product is application-level. Eight
 *   writers (payment.service.ts, store-commission.service.ts,
 *   wellness-sessions.ts, consultation.ts, provider-earning-mint.ts,
 *   booking.service.ts, bookings.ts reassignment, temple-payout.service.ts) all
 *   ran findFirst-then-create with NOTHING behind them at the database layer.
 *
 *   (2026-09-01, F367: all eight now insert through
 *   `createMany({ skipDuplicates })` so the UNIQUE indexes this migration
 *   creates are load-bearing rather than decorative — and, critically, so the
 *   loser of a race gets ON CONFLICT DO NOTHING instead of a P2002 that would
 *   abort the enclosing payment transaction. That enumeration is pinned by
 *   `money-ledger-insert-conflict.di06.test.ts`; this file stays about the
 *   SCHEMA half.) They
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
const paymentBlock = modelBlock(schema, 'Payment');
const commission = stripComments(commissionBlock);
const templePayout = stripComments(templePayoutBlock);
const payment = stripComments(paymentBlock);

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

  /**
   * DI-06/DI-07 (2026-09-02) — `payments`, which both earlier passes skipped
   * as a whole table on the strength of one correct sentence about ONE of its
   * guards (the state-scoped "at most one ACTIVE payment per booking", which
   * genuinely does need a partial unique index Prisma cannot declare).
   *
   * Measured at HEAD before this change: model Payment declared exactly four
   * @@index entries — gatewayPaymentId, userId, status, and
   * [status, createdAt(sort: Desc)] — and zero @@unique. So:
   *
   *   gateway_order_id  no index at all, though verifyPayment
   *                     (payment.service.ts:875) resolves the Payment row by it
   *                     on every successful checkout, and three webhook
   *                     branches plus jobs/reconcile-payments.ts do the same;
   *   booking_id        no index at all, though the createOrder idempotency
   *                     guard (payment.service.ts:770) filters on it INSIDE the
   *                     payment path and the admin refund rail
   *                     (routes/admin-bookings.ts:634) does too.
   */
  it('DI-07: Payment indexes gatewayOrderId — verifyPayment resolves by it on every checkout', () => {
    expect(payment).toMatch(/@@index\(\[gatewayOrderId\]\)/);
  });

  it('DI-07: Payment indexes bookingId — the createOrder guard filters on it inside the payment path', () => {
    expect(payment).toMatch(/@@index\(\[bookingId\]\)/);
  });

  it('the Payment block really is Payment, so the two assertions above are not reading another model', () => {
    expect(payment).toMatch(/^model Payment \{/);
    expect(payment).toMatch(/@map\("payments"\)/);
    expect(payment).not.toMatch(/model (Commission|TemplePayout|PriestPayout)/);
  });
});

/**
 * DI-07 (the half that is a REFUSAL, now enforced instead of merely commented).
 *
 * `commissions.booking_id` is a bare `String?` with no `@db.Uuid` and no
 * `@relation`, and it must stay that way until a product decision is taken. It
 * is POLYMORPHIC across two booking tables:
 *
 *   · `puja_bookings` — Prisma model PujaBooking, written by
 *     payment.service.ts writePujaCommissionOnConfirm;
 *   · `astrologer_consultations` — a raw-SQL table created at runtime by
 *     routes/consultation.ts `ensureConsultationTables` (line 42,
 *     `id UUID PRIMARY KEY`), which does not appear in schema.prisma at all.
 *     consultation.ts writes `bookingId: row.id` from it.
 *
 * Re-verified against HEAD on 2026-08-28: both writers are still there, and
 * `astrologer_consultations` is still absent from schema.prisma. So there is no
 * single referent, and a foreign key is not "harder, later" — it is impossible
 * without a `bookingKind` discriminator or a column split, which changes every
 * writer and is not a schema decision.
 *
 * The `@db.Uuid` half is worse than impossible, it is an outage: Prisma emits
 * `ALTER COLUMN ... USING booking_id::uuid`, which rewrites a money table and
 * aborts on the first non-uuid legacy value — and migrations auto-apply on API
 * boot. An earlier audit note read the consultation-backed rows as "orphans" to
 * be deleted first; they are not orphans, they are the second legitimate kind,
 * and acting on that note would have deleted real astrologer payables.
 *
 * This block exists because the reasoning above currently lives only in a
 * comment above the field, and a comment does not stop the next person tidying
 * a bare String into an outage. The detector is proved against synthetic bad
 * input first, so it cannot pass green having matched nothing.
 */
describe('DI-07 — commissions.booking_id stays polymorphic until a discriminator exists', () => {
  /** The one declaration line for a field inside an already-extracted model block. */
  function fieldLine(block: string, field: string): string {
    const line = block
      .split('\n')
      .find((l) => new RegExp(`^\\s{2}${field}\\s`).test(l));
    if (!line) throw new Error(`field ${field} not found in the given model block`);
    return line;
  }

  /** What must NOT be on that line, and why. */
  function violations(line: string): string[] {
    const found: string[] = [];
    if (/@db\.Uuid/.test(line)) found.push('@db.Uuid');
    if (/@relation/.test(line)) found.push('@relation');
    return found;
  }

  it('the detector rejects the two changes it exists to prevent', () => {
    // Proved against synthetic input, because the real schema is (correctly) in
    // the passing state — a guard only asserted against the good case has never
    // been shown to be able to fail.
    expect(violations('  bookingId             String?          @map("booking_id") @db.Uuid')).toEqual([
      '@db.Uuid',
    ]);
    expect(
      violations(
        '  booking               PujaBooking?     @relation(fields: [bookingId], references: [id])',
      ),
    ).toEqual(['@relation']);
    expect(violations('  bookingId             String?          @map("booking_id")')).toEqual([]);
  });

  it('the field it reads is the top-level Commission.bookingId, not some nested one', () => {
    const line = fieldLine(commission, 'bookingId');
    expect(line).toMatch(/@map\("booking_id"\)/);
    // Comments are already stripped from `commission`, so the prose above the
    // field — which names both `@db.Uuid` and `@relation` — cannot trip this.
    expect(line).not.toMatch(/\/\//);
  });

  it('carries neither @db.Uuid nor @relation', () => {
    expect(
      violations(fieldLine(commission, 'bookingId')),
      'commissions.booking_id is polymorphic across puja_bookings and the raw-SQL ' +
        'astrologer_consultations table; a foreign key needs a bookingKind discriminator ' +
        'first, and @db.Uuid emits an ALTER COLUMN that aborts API boot on legacy values',
    ).toEqual([]);
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

/**
 * DI-06/DI-07 (2026-09-02) — the migration that closes `payments`.
 *
 * Separate file, separate describe: `_prisma_migrations` stores a checksum per
 * migration, and editing one that any environment has already applied is a
 * checksum mismatch on that environment. Migrations auto-apply on API boot
 * here, so that mismatch is an outage. Additive, never retroactive.
 */
describe('DI-06/DI-07 — the migration that closes the payments table', () => {
  const dirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const dir = dirs.find((d) => /di0607_payment_gateway_key_indexes$/.test(d));

  it('the migration exists', () => {
    expect(
      dir,
      `no *_di0607_payment_gateway_key_indexes migration in ${migrationsDir}`,
    ).toBeTruthy();
  });

  it('it sorts AFTER every migration that already existed when it was written', () => {
    // `prisma migrate deploy` applies in lexicographic directory order. A new
    // migration that sorts BEFORE an applied one is never executed on an
    // environment that is already ahead of it.
    // Bounded to migrations that existed when this was written, which is what
    // the title says. Comparing against ALL others made the assertion
    // "this migration is permanently the newest in the repo" — so it failed on
    // the NEXT migration anyone added, for any reason. It duly did, on
    // 20260908000000 (DI-06 partial uniques). A guard whose only possible
    // future is a false positive teaches people to ignore it.
    const others = dirs.filter((d) => d !== dir && d.slice(0, 14) <= '20260904000000');
    expect(others.length).toBeGreaterThan(0);
    expect(dir! > others.sort().at(-1)!).toBe(true);
  });

  const sqlRaw = dir ? readFileSync(`${migrationsDir}/${dir}/migration.sql`, 'utf8') : '';
  const sql = sqlRaw.replace(/--[^\n]*/g, ' ');

  it('the SQL comment stripper is actually doing something', () => {
    expect(sqlRaw).toMatch(/--/);
    expect(sql).not.toMatch(/--/);
  });

  it('DI-07: creates the two missing lookup indexes under Prisma default names', () => {
    // The names are Prisma's own, so the @@index entries added to model Payment
    // in the same change do not read as drift on the next `migrate dev`.
    expect(sql).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+"payments_gateway_order_id_idx"/i);
    expect(sql).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+"payments_booking_id_idx"/i);
  });

  it('DI-06: creates a UNIQUE index for both 1:1 gateway keys', () => {
    for (const name of ['payments_gateway_order_id_key', 'payments_gateway_payment_id_key']) {
      expect(sql, `missing UNIQUE index ${name}`).toMatch(
        new RegExp(String.raw`CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+"${name}"`, 'i'),
      );
    }
  });

  it('DI-06: every UNIQUE index is duplicate-tolerant — a dirty table must not abort API boot', () => {
    const uniqueStatements = sql.match(/CREATE\s+UNIQUE\s+INDEX[^;]*/gi) ?? [];
    expect(uniqueStatements.length).toBe(2);
    // Two independent guards per key: the pre-check can be raced by a writer
    // that commits between the count and the index taking its lock, and a bare
    // handler without the pre-check would swallow real errors on a table that
    // is known-dirty.
    expect((sql.match(/HAVING\s+count\(\*\)\s*>\s*1/gi) ?? []).length).toBe(2);
    expect((sql.match(/EXCEPTION\s+WHEN\s+OTHERS\s+THEN/gi) ?? []).length).toBe(2);
    // A skipped constraint is announced, never silent: one warning for the
    // dirty-key branch and one for the raced-CREATE branch, per key.
    expect((sql.match(/RAISE\s+WARNING/gi) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('the UNIQUE keys exclude NULLs from the duplicate pre-check', () => {
    // Both columns are nullable and a Payment row legitimately carries NULL
    // gateway ids before the order is opened. Postgres treats NULLs as distinct
    // in a unique index (NULLS DISTINCT), so counting them would skip a
    // constraint that would in fact have been created without incident.
    expect((sql.match(/IS\s+NOT\s+NULL/gi) ?? []).length).toBe(2);
  });

  it('never CONCURRENTLY — 25001 inside migrate deploy blocks every later migration', () => {
    expect(sql).not.toMatch(/CONCURRENTLY/i);
    // Including in the prose: the checker script prints a copy-pasteable
    // CONCURRENTLY line for hand-running in psql, and pasting it into a
    // migration is the exact route by which this repo lost two months.
    expect(sqlRaw).not.toMatch(/CREATE\s+(UNIQUE\s+)?INDEX\s+CONCURRENTLY/i);
  });

  it('additive only — no destructive DDL and no data rewrite on the payments table', () => {
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|COLUMN|CONSTRAINT|INDEX)\b/i);
    expect(sql).not.toMatch(/\bALTER\s+COLUMN\b/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(sql).not.toMatch(/\bUPDATE\s+"?payments"?\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
  });
});
