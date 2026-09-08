import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * DI-08 (F452) — the wallet's two tables exist in schema.prisma and in no
 * migration, so they exist in no database that was not bootstrapped from the
 * baseline.
 *
 * Measured read-only against production 2026-09-08, for the four names the
 * reward rail is discussed in terms of:
 *
 *   tables present of (user_credits, credit_ledger_entries, referral_claims, wallets):
 *     referral_claims        <- only this one
 *
 * `UserCredit` (schema.prisma:2205) and `CreditLedgerEntry` (:2227) were added
 * by editing schema.prisma alone. Every generated Prisma client believes in
 * them; production does not have them. `services/wallet.service.ts` queries
 * both on every call, so the whole wallet raises Postgres 42P01 there — and the
 * consumer that hurts is not the referral rail (which degrades: a 503 on the
 * route, a swallowed console.warn on the booking hook) but
 * `account-deletion.service.ts`, which reads `userCredit` at :488 with no guard
 * at all and again at :1252 INSIDE the purge `$transaction`, where 42P01
 * poisons the transaction and rolls the entire account purge back.
 *
 * This file is the weld between the four things that must agree: schema.prisma,
 * the new migration, the baseline (which already had it right), and the exact
 * lookup wallet.service.ts performs. It is a static test on purpose — there is
 * no database in this suite, and the failure being defended against is
 * precisely a datamodel that no test ever executed.
 */

const here = dirname(fileURLToPath(import.meta.url));
const apiRoot = join(here, '..', '..');
const migrationsDir = join(apiRoot, 'prisma', 'migrations');

const MIGRATION = '20260908010000_di08_wallet_credit_tables';

const sql = (): string => {
  const path = join(migrationsDir, MIGRATION, 'migration.sql');
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
};
/**
 * The EXECUTABLE half. The migration explains at length why it must never use
 * CONCURRENTLY, so a naive scan of the file finds the word in the prose that
 * forbids it — which would make the ban untestable and, worse, punish
 * documenting it.
 */
const executableSql = (): string => sql().replace(/^\s*--.*$/gm, '');
const flat = (s: string): string => s.replace(/\s+/g, ' ').trim();
const schema = (): string => readFileSync(join(apiRoot, 'prisma', 'schema.prisma'), 'utf8');
const baseline = (): string =>
  readFileSync(join(apiRoot, 'prisma', 'baseline', '0_init.sql'), 'utf8');
const walletService = (): string =>
  readFileSync(join(apiRoot, 'src', 'services', 'wallet.service.ts'), 'utf8');

const migrationDirs = (): string[] =>
  readdirSync(migrationsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

describe('DI-08 — the migration exists and is safely stamped', () => {
  it('is present on disk with a migration.sql', () => {
    expect(existsSync(join(migrationsDir, MIGRATION, 'migration.sql'))).toBe(true);
  });

  it('sorts after every migration that predates it', () => {
    const dirs = migrationDirs();
    const idx = dirs.indexOf(MIGRATION);
    expect(idx).toBeGreaterThan(-1);
    const stamp = MIGRATION.slice(0, 14);
    expect(dirs.slice(0, idx).filter((d) => d.slice(0, 14) > stamp)).toEqual([]);
  });

  it('introduces no NEW timestamp collision', () => {
    // Two migrations already share `20260902000000`. Prisma keys on the full
    // directory name so both coexist, but a second colliding pair is an
    // ordering coin-flip, so the set may not grow.
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

  it('never uses CONCURRENTLY — it raises 25001 inside migrate deploy and blocks every later migration', () => {
    // Measured 2026-09-02: CONCURRENTLY raises 25001 in a transaction even when
    // the index already exists, so it cannot be defused by pre-creating. This
    // project lost two months to exactly that.
    expect(executableSql()).not.toMatch(/CONCURRENTLY/i);
    // ...and the migration must still SAY why, or the next author re-derives it.
    expect(sql()).toMatch(/CONCURRENTLY/);
  });

  it('is additive only — it alters nothing and destroys nothing', () => {
    const bare = executableSql();
    expect(bare).not.toMatch(/\bDROP\s+(TABLE|COLUMN|SCHEMA|TYPE|INDEX)\b/i);
    expect(bare).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(bare).not.toMatch(/\bTRUNCATE\b/i);
    expect(bare).not.toMatch(/\bUPDATE\s+"?(user_credits|credit_ledger_entries)"?\b/i);
    // The only ALTERs permitted are the three FK adds.
    const alters = [...bare.matchAll(/\bALTER\s+TABLE\s+"([^"]+)"\s+(\w+)\s+(\w+)/gi)].map(
      (m) => `${m[2]} ${m[3]}`.toUpperCase(),
    );
    expect([...new Set(alters)]).toEqual(['ADD CONSTRAINT']);
  });

  it('every statement is re-runnable, because the baseline already created all of it', () => {
    // scripts/bootstrap-fresh-db.mjs replays every migration onto a database
    // that prisma/baseline/0_init.sql has ALREADY fully built. Every CREATE
    // here must therefore be a no-op rather than a duplicate-object error.
    const s = sql();
    const creates = [...s.matchAll(/^\s*CREATE\s+(?:UNIQUE\s+)?(TABLE|INDEX)\b[^;]*/gim)];
    expect(creates.length).toBeGreaterThan(0);
    for (const c of creates) {
      expect(flat(c[0]), 'a CREATE without IF NOT EXISTS breaks the bootstrap replay').toMatch(
        /IF NOT EXISTS/i,
      );
    }
    // CREATE TYPE and ADD CONSTRAINT have no IF NOT EXISTS in PostgreSQL, so
    // they must be guarded on the catalogue instead.
    expect(s).toMatch(/pg_type/);
    expect(s).toMatch(/pg_constraint/);
  });
});

describe('DI-08 — the migration creates exactly what schema.prisma declares', () => {
  it('creates both tables the datamodel maps', () => {
    expect(schema()).toContain('@@map("user_credits")');
    expect(schema()).toContain('@@map("credit_ledger_entries")');
    expect(flat(sql())).toContain('CREATE TABLE IF NOT EXISTS "user_credits"');
    expect(flat(sql())).toContain('CREATE TABLE IF NOT EXISTS "credit_ledger_entries"');
  });

  it('declares the CreditLedgerReason enum with the same labels, in the same order', () => {
    // Order fixes the enum's sort order and cannot be reproduced later by
    // ALTER TYPE ... ADD VALUE.
    const labels = "'referral_reward', 'refund_to_credit', 'promo_grant', 'redemption_debit', 'adjustment'";
    expect(flat(sql())).toContain(`CREATE TYPE "CreditLedgerReason" AS ENUM ( ${labels} )`);
    expect(flat(baseline())).toContain(
      `CREATE TYPE "CreditLedgerReason" AS ENUM (${labels});`.replace('( ', '('),
    );
  });

  it.each([
    ['user_credits', '"id" UUID NOT NULL'],
    ['user_credits', '"user_id" UUID NOT NULL'],
    ['user_credits', '"balance_paise" INTEGER NOT NULL DEFAULT 0'],
    ['user_credits', `"currency" TEXT NOT NULL DEFAULT 'INR'`],
    ['credit_ledger_entries', '"credit_id" UUID NOT NULL'],
    ['credit_ledger_entries', '"delta_paise" INTEGER NOT NULL'],
    ['credit_ledger_entries', '"reason" "CreditLedgerReason" NOT NULL'],
    ['credit_ledger_entries', '"idempotency_key" TEXT NOT NULL'],
  ])('%s carries the column %s, byte-identical to the baseline', (_table, column) => {
    // PAISE, not rupees. `balance_paise INTEGER` is the whole reason this table
    // exists — the wallet must never touch a Decimal or a float
    // (schema.prisma:2199-2203).
    expect(flat(sql())).toContain(column);
    expect(flat(baseline())).toContain(column);
  });

  it.each([
    'user_credits_user_id_key',
    'credit_ledger_entries_user_id_idempotency_key_key',
    'credit_ledger_entries_user_id_created_at_idx',
    'credit_ledger_entries_reason_idx',
  ])('creates the index %s, under the name the baseline uses', (index) => {
    expect(sql()).toContain(`"${index}"`);
    expect(baseline()).toContain(`"${index}"`);
  });

  it.each([
    'user_credits_user_id_fkey',
    'credit_ledger_entries_user_id_fkey',
    'credit_ledger_entries_credit_id_fkey',
  ])('adds the foreign key %s with ON DELETE CASCADE', (fk) => {
    const s = flat(sql());
    const at = s.indexOf(`ADD CONSTRAINT "${fk}"`);
    expect(at, `${fk} is not added`).toBeGreaterThan(-1);
    // The cascade is load-bearing for the account purge: the balance is zeroed
    // with a matching ledger entry and then the user row goes, taking both
    // wallet rows with it.
    expect(s.slice(at, at + 220)).toMatch(/ON DELETE CASCADE ON UPDATE CASCADE/);
  });
});

describe('DI-08 — the UNIQUE the wallet actually reads through is created', () => {
  it('wallet.service.ts looks the ledger up by the compound unique', () => {
    // If this lookup ever changes shape, the index below stops being the one
    // the code depends on and this whole file stops meaning anything.
    expect(walletService()).toContain('userId_idempotencyKey: { userId, idempotencyKey }');
    expect(schema()).toContain('@@unique([userId, idempotencyKey])');
  });

  it('the index name is the one Prisma derives from that @@unique', () => {
    // Prisma resolves `where: { userId_idempotencyKey: … }` against the
    // constraint it names `<table>_<col>_<col>_key`. A different name here and
    // the client's findUnique has no unique behind it.
    expect(flat(sql())).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS "credit_ledger_entries_user_id_idempotency_key_key" ' +
        'ON "credit_ledger_entries" ("user_id", "idempotency_key")',
    );
  });

  it('a dirty key degrades to a warning, never to a failed migration', () => {
    // Migrations auto-apply on API boot (render.yaml -> apps/api/package.json,
    // `prisma migrate deploy && node dist/server.js`), so an aborted migration
    // is a crash-loop, not a failed constraint. Both UNIQUEs pre-count
    // duplicates and skip loudly rather than aborting — the same shape the four
    // earlier DI-06/DI-07 migrations use.
    const s = sql();
    expect(s).toMatch(/RAISE WARNING[\s\S]*user_credits_user_id_key/);
    expect(s).toMatch(/RAISE WARNING[\s\S]*credit_ledger_entries_user_id_idempotency_key_key/);
    // And the warning has to say what it costs, because losing this one silently
    // means a webhook retry double-credits a referrer.
    expect(s).toMatch(/WALLET HAS NO IDEMPOTENCY/i);
  });
});
