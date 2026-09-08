import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma } from '@prisma/client';
import { isUniqueViolation } from '../services/wallet.service.js';

/**
 * DI-06 (F367) — the three money guards a PLAIN unique index cannot express.
 *
 * Three earlier migrations closed seven money keys, and every one of them is
 * `CREATE UNIQUE INDEX ... ON t (col)` over a WHOLE table. That shape is the
 * only one those migrations could use, and `check-money-key-duplicates.mjs`
 * says so: the per-booking payment guard "is not expressible as a plain UNIQUE
 * (it is state-scoped)". True — and the conclusion drawn from it, that the guard
 * therefore gets no constraint, is false. A state-scoped invariant is exactly
 * what a PARTIAL unique index is for.
 *
 * `20260908000000_di06_inflight_and_pair_money_uniques` adds the three that
 * survived all three earlier passes because none of them is whole-table:
 *
 *   payments                    at most one LIVE payment per booking
 *   referral_claims             at most one claim per (referrer, referee) pair
 *   marketplace_subscriptions   at most one ACTIVE subscription per (user, role)
 *
 * What this file protects, which a .sql file alone cannot:
 *
 *   1. the WELD. Each partial index encodes a predicate copied from an
 *      application guard. If someone edits the guard's state list — adds a
 *      'pending' payment status, say — the index silently stops matching the
 *      rule it was created for, and no SQL file can notice. These tests read
 *      BOTH sides and fail when they diverge.
 *   2. the SAFETY SHAPE. An unguarded UNIQUE over a money table aborts
 *      `prisma migrate deploy`, which auto-runs on API boot (render.yaml ->
 *      `prisma migrate deploy && node dist/server.js`), so a dirty key would
 *      mean the API never starts.
 *   3. the DEBT. A constraint turns a silent double-write into a P2002. None of
 *      the three call sites translates P2002 into a domain outcome yet, so each
 *      is on an explicit allowlist below rather than in a comment nobody reads.
 */

const here = dirname(fileURLToPath(import.meta.url));
const apiRoot = join(here, '..', '..');
const migrationsDir = join(apiRoot, 'prisma', 'migrations');

const MIGRATION = '20260908000000_di06_inflight_and_pair_money_uniques';

function migrationDirs(): string[] {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/**
 * Returns '' rather than throwing when the migration is absent. A missing file
 * must surface as a wall of failed ASSERTIONS naming the constraints that went
 * with it — a collect-time ENOENT reports "no tests" and hides which invariant
 * was lost, which is the opposite of what this file is for.
 */
function migrationSql(name: string): string {
  const path = join(migrationsDir, name, 'migration.sql');
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

/** Collapse whitespace so assertions survive re-indentation of the .sql file. */
function flat(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Source of an application file, read from disk (never imported — these
 *  modules construct Prisma clients and route servers at module scope). */
function source(relative: string): string {
  const path = join(apiRoot, 'src', relative);
  expect(existsSync(path), `${relative} has moved or been deleted`).toBe(true);
  return readFileSync(path, 'utf8');
}

/**
 * The three constraints, each welded to the guard it replaces.
 *
 * `createSql` and `dupPredicate` are compared against the migration; `guard`
 * is compared against the live application source. A change on either side
 * that is not mirrored on the other fails a test here.
 */
const CONSTRAINTS = [
  {
    index: 'payments_booking_id_inflight_key',
    table: 'payments',
    createSql:
      'CREATE UNIQUE INDEX IF NOT EXISTS "payments_booking_id_inflight_key" ON "payments" ("booking_id") ' +
      'WHERE "booking_id" IS NOT NULL AND "status" IN (\'initiated\'::"PaymentStatus", \'authorized\'::"PaymentStatus")',
    partial: true,
    dupPredicate:
      'WHERE "booking_id" IS NOT NULL AND "status" IN (\'initiated\'::"PaymentStatus", \'authorized\'::"PaymentStatus")',
    rule: 'at most one live (initiated|authorized) Payment per booking',
    guard: {
      file: 'services/payment.service.ts',
      check: 'const existingPayment = await prisma.payment.findFirst({',
      // The exact state list the index predicate mirrors. This is the weld.
      shape: ["bookingId: booking.id,", "status: { in: ['initiated', 'authorized'] },"],
      write: 'const payment = await prisma.payment.create({',
    },
  },
  {
    index: 'referral_claims_referrer_id_referee_id_key',
    table: 'referral_claims',
    createSql:
      'CREATE UNIQUE INDEX IF NOT EXISTS "referral_claims_referrer_id_referee_id_key" ' +
      'ON "referral_claims" ("referrer_id", "referee_id")',
    partial: false,
    // Not a partial index: referee_id is nullable and NULLS DISTINCT is the
    // Postgres default, so NULL rows never collide. The dup pre-check still has
    // to exclude them, or it would report duplicates the index would not create.
    dupPredicate: 'WHERE "referee_id" IS NOT NULL',
    rule: 'at most one ReferralClaim per (referrer, referee) pair',
    guard: {
      file: 'routes/referrals.ts',
      check: '}).referralClaim.findFirst({',
      shape: ['where: { referrerId: codeRow.userId, refereeId: referee.id },'],
      write: '}).referralClaim.create({',
    },
  },
  {
    index: 'marketplace_subscriptions_user_id_role_active_key',
    table: 'marketplace_subscriptions',
    createSql:
      'CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_subscriptions_user_id_role_active_key" ' +
      'ON "marketplace_subscriptions" ("user_id", "role") ' +
      'WHERE "status" = \'ACTIVE\'::"MarketplaceSubscriptionStatus"',
    partial: true,
    dupPredicate: 'WHERE "status" = \'ACTIVE\'::"MarketplaceSubscriptionStatus"',
    rule: 'at most one ACTIVE MarketplaceSubscription per (user, role)',
    guard: {
      file: 'services/subscription.service.ts',
      // Shape (b): claim-by-updateMany, then create.
      check: 'await prisma.marketplaceSubscription.updateMany({',
      shape: ["data: { status: 'CANCELLED' },"],
      write: 'const subscription = await prisma.marketplaceSubscription.create({',
    },
  },
] as const;

describe('DI-06 — the migration exists and is safely stamped', () => {
  it('is present on disk with a migration.sql', () => {
    expect(existsSync(join(migrationsDir, MIGRATION, 'migration.sql'))).toBe(true);
  });

  it('sorts after every other migration, so migrate deploy runs it last', () => {
    const dirs = migrationDirs();
    expect(dirs[dirs.length - 1]).toBe(MIGRATION);
  });

  it('introduces no NEW timestamp collision', () => {
    // Two migrations already share `20260902000000`. Prisma keys on the full
    // directory name so both can coexist, but a second colliding pair is a
    // review smell and an ordering coin-flip, so the set may not grow.
    const collisions = [
      ...new Set(
        migrationDirs()
          .map((d) => d.slice(0, 14))
          .filter((stamp, i, all) => all.indexOf(stamp) !== i),
      ),
    ].sort();
    expect(collisions).toEqual(['20260902000000']);
    expect(collisions).not.toContain(MIGRATION.slice(0, 14));
  });
});

describe('DI-06 — each partial/pair UNIQUE is created, and created safely', () => {
  const sql = migrationSql(MIGRATION);
  const flatSql = flat(sql);

  it.each(CONSTRAINTS)('creates $index — $rule', ({ createSql }) => {
    expect(flatSql).toContain(flat(createSql));
  });

  it.each(CONSTRAINTS)(
    '$index is created only after a duplicate pre-check using the SAME predicate',
    ({ index, dupPredicate }) => {
      // Pre-check and index must agree, or the migration can "prove clean" over
      // a different row set than the one the index will actually cover.
      const block = flatSql.slice(
        flatSql.indexOf('SELECT count(*) INTO dupes', indexBlockStart(flatSql, index)),
        flatSql.indexOf(`"${index}"`, indexBlockStart(flatSql, index) + 1),
      );
      expect(block, `${index}: dup pre-check does not use its own predicate`).toContain(
        flat(dupPredicate),
      );
    },
  );

  it.each(CONSTRAINTS)(
    '$index skips loudly instead of aborting the migration',
    ({ index }) => {
      // migrate deploy runs on API boot; an aborting migration is an outage.
      expect(flatSql).toMatch(new RegExp(`RAISE WARNING[^;]*${index}`));
      expect(sql).toContain('EXCEPTION WHEN OTHERS THEN');
    },
  );

  it('two of the three are genuinely PARTIAL, which is the whole point', () => {
    const partials = CONSTRAINTS.filter((c) => c.partial).map((c) => c.index);
    expect(partials.length).toBe(2);
    for (const index of partials) {
      const stmt = flatSql.slice(flatSql.indexOf(`IF NOT EXISTS "${index}"`));
      expect(stmt.slice(0, stmt.indexOf(';'))).toContain('WHERE');
    }
  });

  it('never uses CONCURRENTLY — it fails 25001 in migrate deploy and blocks every later migration', () => {
    const withoutComments = sql.replace(/--[^\n]*/g, '');
    expect(withoutComments).not.toMatch(/\bCONCURRENTLY\b/i);
  });

  it('is additive only — no ALTER, no DELETE, no UPDATE on a money table', () => {
    const withoutComments = sql.replace(/--[^\n]*/g, '');
    expect(withoutComments).not.toMatch(/\bALTER\s+TABLE\b/i);
    expect(withoutComments).not.toMatch(/\bDROP\b/i);
    expect(withoutComments).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(withoutComments).not.toMatch(/\bUPDATE\s+"/i);
  });

  it('every statement is re-runnable after a partial apply', () => {
    // Comments stripped: the header discusses `CREATE UNIQUE INDEX` in prose,
    // and counting those would make this assertion meaningless.
    const executable = sql.replace(/--[^\n]*/g, '');
    const creates = executable.match(/CREATE UNIQUE INDEX[^\n]*/g) ?? [];
    expect(creates.length).toBe(CONSTRAINTS.length);
    for (const c of creates) expect(c).toContain('IF NOT EXISTS');
  });
});

/** Start offset of the DO block that creates `index`, in the flattened SQL. */
function indexBlockStart(flatSql: string, index: string): number {
  // Each block is: DO $di06$ ... SELECT count(*) INTO dupes ... "<index>" ...
  // Walk back from the index name to the DO that owns it.
  const at = flatSql.indexOf(`${index} holds`) >= 0
    ? flatSql.indexOf(`${index} holds`)
    : flatSql.indexOf(`"${index}"`);
  return flatSql.lastIndexOf('DO $di06$', at);
}

describe('DI-06 — the weld: each index still matches the guard it replaces', () => {
  it.each(CONSTRAINTS)('$index — the guard at $guard.file still exists', ({ guard }) => {
    const src = source(guard.file);
    expect(src, 'the check half of the guard has moved').toContain(guard.check);
    expect(src, 'the write half of the guard has moved').toContain(guard.write);
  });

  it.each(CONSTRAINTS)(
    '$index — the guard still keys on exactly what the index constrains',
    ({ guard }) => {
      const src = source(guard.file);
      for (const fragment of guard.shape) {
        expect(
          src,
          `the guard no longer reads \`${fragment}\` — the index predicate was copied from it and must be updated to match`,
        ).toContain(fragment);
      }
    },
  );

  it('the payments index predicate lists exactly the states the guard treats as live', () => {
    // The single most likely silent drift: someone adds a payment state to the
    // guard's `in:` list and the partial index keeps covering only the old two.
    const src = source('services/payment.service.ts');
    // Anchor to the createOrder guard: `status: { in: [...] }` appears several
    // times in this file (the referral rail uses one too), and matching the
    // wrong one would make this test assert nothing about payments.
    const guardAt = src.indexOf('const existingPayment = await prisma.payment.findFirst({');
    expect(guardAt, 'the createOrder guard has moved').toBeGreaterThan(-1);
    const guardStates = src
      .slice(guardAt, guardAt + 400)
      .match(/status: \{ in: \[([^\]]+)\] \}/)![1]!
      .split(',')
      .map((s) => s.trim().replace(/'/g, ''))
      .sort();
    const indexStates = [
      ...migrationSql(MIGRATION)
        .replace(/--[^\n]*/g, '')
        .matchAll(/'(\w+)'::"PaymentStatus"/g),
    ]
      .map((m) => m[1]!)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();

    expect(guardStates).toEqual(['authorized', 'initiated']);
    expect(indexStates).toEqual(guardStates);
  });
});

/**
 * The debt a constraint creates, tracked as an allowlist rather than a comment.
 *
 * Adding a UNIQUE converts a silent double-write into a Prisma P2002. That is
 * strictly better — one request failing loudly beats two live checkout sessions
 * or a referrer paid twice — but it is not FINISHED until the loser of the race
 * is turned into the same answer the check-then-write guard already produces
 * (return the existing order / `alreadyClaimed: true` / the existing
 * subscription), instead of a 500.
 *
 * All three call sites are in service and route files outside this change's
 * lane, so each is listed here. When a handler is added, the entry must be
 * removed — and the second test makes that mandatory, so the list cannot
 * quietly outlive the debt.
 */
const PENDING_P2002_TRANSLATION = [
  'routes/referrals.ts',
  'services/payment.service.ts',
  'services/subscription.service.ts',
] as const;

describe('DI-06 — P2002 translation debt is tracked, not buried', () => {
  const handles = (src: string) =>
    /code\s*===\s*'P2002'/.test(src) || /isUniqueViolation\s*\(/.test(src);

  it('every constrained guard file is either handled or listed', () => {
    const unlisted = CONSTRAINTS.map((c) => c.guard.file).filter(
      (f) =>
        !handles(source(f)) &&
        !(PENDING_P2002_TRANSLATION as readonly string[]).includes(f),
    );
    expect(
      unlisted,
      'a guard now has a DB constraint behind it but neither translates P2002 nor admits it here',
    ).toEqual([]);
  });

  it('the allowlist has not outlived its entries', () => {
    // Reverse direction: an entry that HAS gained a handler must be removed, so
    // the list shrinks to nothing as the debt is paid.
    const stale = PENDING_P2002_TRANSLATION.filter((f) => handles(source(f)));
    expect(
      stale,
      'these files now translate P2002 — delete them from PENDING_P2002_TRANSLATION',
    ).toEqual([]);
  });

  it('the allowlist has not silently grown', () => {
    expect([...PENDING_P2002_TRANSLATION].sort()).toEqual(
      [...new Set(CONSTRAINTS.map((c) => c.guard.file))].sort(),
    );
  });

  it('the writes these constraints now guard are bare creates, not skipDuplicates', () => {
    // `createMany({ skipDuplicates: true })` -> ON CONFLICT DO NOTHING is how
    // the seven earlier money keys absorb their own duplicates, and it is why
    // they needed no P2002 handler. None of these three uses it, which is
    // precisely why they are on the list above.
    for (const c of CONSTRAINTS) {
      const src = source(c.guard.file);
      const write = src.indexOf(c.guard.write);
      expect(write, `${c.guard.write} not found`).toBeGreaterThan(-1);
      expect(
        src.slice(write, write + 400),
        `${c.index}: the write now uses skipDuplicates — it may no longer need a P2002 handler`,
      ).not.toContain('skipDuplicates');
    }
  });
});

/**
 * The helper the three pending call sites should use, tested so that whoever
 * pays the debt above has something proven to reach for.
 *
 * `isUniqueViolation` is exported from wallet.service.ts:155 and has ZERO call
 * sites anywhere in apps/api/src — it is correct, dead, and undefended.
 */
describe('DI-06 — isUniqueViolation narrows exactly the error a UNIQUE index raises', () => {
  const known = (code: string) =>
    new Prisma.PrismaClientKnownRequestError('boom', {
      code,
      clientVersion: 'test',
    });

  it('is true for P2002, the unique-constraint violation', () => {
    expect(isUniqueViolation(known('P2002'))).toBe(true);
  });

  it('is false for other Prisma known errors', () => {
    // P2003 = FK violation, P2025 = record not found. Neither is a duplicate,
    // and treating them as one would swallow a real fault on a money path.
    expect(isUniqueViolation(known('P2003'))).toBe(false);
    expect(isUniqueViolation(known('P2025'))).toBe(false);
  });

  it('is false for a plain Error, a raw 23505 string, and nullish input', () => {
    expect(isUniqueViolation(new Error('duplicate key value violates unique constraint'))).toBe(
      false,
    );
    expect(isUniqueViolation('23505')).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });
});
