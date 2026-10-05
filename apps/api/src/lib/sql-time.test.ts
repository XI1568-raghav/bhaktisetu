import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { SQL_UTC_NOW } from './sql-time.js';

/**
 * TZ-01 - raw SQL must not depend on the database SESSION time zone.
 *
 * `timestamp` (without tz) columns written with a bare `now()` / `NOW()` /
 * column DEFAULT CURRENT_TIMESTAMP store session-local wall-clock. On a local
 * Postgres set to Asia/Kolkata `donations.created_at` came out 5.5 h ahead of
 * UTC while Prisma-written rows (and `timestamptz` tables like bookings) were
 * correct. Every raw write to a `timestamp` column must go through
 * SQL_UTC_NOW (`now() AT TIME ZONE 'UTC'`).
 *
 * This is a source-level guard: it pins the exact SQL fragments so a future
 * edit that reverts to `now()` fails here instead of in a tester's IST DB.
 */
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

// [file, column, statement-owning-table] - every one of these columns is
// `timestamp(3)` WITHOUT time zone (see the PR table / prisma baseline).
const TIMESTAMP_COLUMN_WRITES: Array<[string, string]> = [
  ['routes/donations.ts', 'paid_at'],
  ['routes/ratings.ts', 'created_at'],
  ['routes/provider-kyc.ts', 'updated_at'],
  ['routes/admin-bookings.ts', 'verified_at'],
  ['routes/admin-bookings.ts', 'updated_at'],
  ['jobs/content-auto-post.ts', 'posted_at'],
  ['routes/digest.ts', 'opted_out_at'],
  ['services/temple-settlement.service.ts', 'processed_at'],
  ['services/recurring.service.ts', 'updated_at'],
];

describe('SQL_UTC_NOW', () => {
  it('is a UTC-pinned timestamp (not a timestamptz)', () => {
    expect(SQL_UTC_NOW).toBe(`(now() AT TIME ZONE 'UTC')`);
  });
});

describe('raw SQL writes to timestamp-without-tz columns are session-timezone safe', () => {
  it.each(TIMESTAMP_COLUMN_WRITES)('%s: %s is never assigned a bare now()/NOW()', (file, col) => {
    const src = read(file);
    const bare = new RegExp(`\\b${col}"?\\s*=\\s*(now\\(\\)|NOW\\(\\)|CURRENT_TIMESTAMP)`);
    expect(src).not.toMatch(bare);
    expect(src).toMatch(new RegExp(`\\b${col}"?\\s*=\\s*\\$\\{SQL_UTC_NOW\\}`));
  });

  it('donations INSERTs set created_at explicitly instead of relying on DEFAULT CURRENT_TIMESTAMP', () => {
    const src = read('routes/donations.ts');
    const inserts = src.match(/INSERT INTO donations \([^)]*\)\s*VALUES \([^`]*\)`/g) ?? [];
    expect(inserts).toHaveLength(2);
    for (const stmt of inserts) {
      expect(stmt).toContain('created_at');
      expect(stmt).toContain('${SQL_UTC_NOW}');
    }
  });

  it('INSERT statements into timestamp tables pass SQL_UTC_NOW positionally', () => {
    expect(read('routes/provider-kyc.ts')).toMatch(/false, NULL, \$\{SQL_UTC_NOW\}\)/);
    expect(read('routes/ratings.ts')).toMatch(/\$4, \$5, \$\{SQL_UTC_NOW\}\)/);
    expect(read('jobs/weekly-digest.ts')).toMatch(/VALUES \(1, \$\{SQL_UTC_NOW\}/);
    expect(read('routes/digest.ts')).toMatch(/VALUES \(\$1::uuid, \$\{SQL_UTC_NOW\}/);
    expect(read('routes/admin-donations-export.ts')).toMatch(/\$4, \$5, \$\{SQL_UTC_NOW\}\)/);
    expect(read('services/recurring.service.ts')).toMatch(/\$9, \$\{SQL_UTC_NOW\}, \$\{SQL_UTC_NOW\}\)/);
  });

  it('timestamptz writes are left alone (plain now() is already correct there)', () => {
    // users.deleted_at / deletion_requested_at are timestamptz; wrapping them in
    // AT TIME ZONE 'UTC' would REINTRODUCE the skew by casting back through the
    // session zone.
    const src = read('services/account-deletion.service.ts');
    expect(src).toMatch(/"deleted_at" = now\(\)/);
    expect(src).toMatch(/"deletion_requested_at" = now\(\)/);
    expect(src).toMatch(/"users"[\s\S]{0,200}"updated_at" = \$\{SQL_UTC_NOW\}/);
  });
});
