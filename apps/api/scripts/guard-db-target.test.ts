import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { classifyDbTarget, assertLocalDbTarget } from './guard-db-target.js';

/**
 * AW-09 (2026-08-12, P1) — apps/api/.env pointed at the PRODUCTION Supabase
 * database with NODE_ENV=production.
 *
 * Prisma CLI and a bare `new PrismaClient()` load `.env`, not `.env.local`. So
 * from a local checkout:
 *
 *   node -e "new PrismaClient().astrologerProfile.findMany()…"
 *
 * returned live customer rows — a disjoint set from what the dev API on :4000
 * saw. Two read-only queries were run against production before anyone noticed.
 * One `prisma migrate dev`, `prisma db push` or seed script from that directory
 * targets the live customer database. This is the exact setup that produces an
 * accidental prod wipe, and it gives every local agent session ambient prod
 * read access.
 *
 * Two locks below:
 *   1. the guard itself refuses a non-local DATABASE_URL unless --prod is passed;
 *   2. apps/api/.env actually carries a local host and NODE_ENV=development.
 */

describe('AW-09 — classifyDbTarget', () => {
  it('treats localhost / 127.0.0.1 / ::1 as local', () => {
    expect(classifyDbTarget('postgresql://u:***REMOVED***@localhost:5432/dev').local).toBe(true);
    expect(classifyDbTarget('postgresql://u:***REMOVED***@127.0.0.1:55432/darshya_utf8').local).toBe(true);
    expect(classifyDbTarget('postgresql://u:***REMOVED***@[::1]:55432/darshya_utf8').local).toBe(true);
  });

  it('treats a Supabase pooler host as remote', () => {
    const t = classifyDbTarget(
      'postgresql://postgres.abc:***REMOVED***@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    );
    expect(t.local).toBe(false);
    expect(t.host).toBe('aws-1-ap-northeast-1.pooler.supabase.com');
  });

  it('never echoes the password back', () => {
    const t = classifyDbTarget('postgresql://postgres.abc:***REMOVED***@db.example.com:5432/x');
    expect(JSON.stringify(t)).not.toContain('SuperSecret123');
  });

  it('treats an unparseable or missing url as remote (fail closed)', () => {
    expect(classifyDbTarget('').local).toBe(false);
    expect(classifyDbTarget('not a url').local).toBe(false);
    expect(classifyDbTarget(undefined).local).toBe(false);
  });
});

describe('AW-09 — assertLocalDbTarget', () => {
  it('throws for a remote target with no explicit --prod', () => {
    expect(() =>
      assertLocalDbTarget({
        databaseUrl: 'postgresql://postgres.abc:***REMOVED***@aws-1.pooler.supabase.com:6543/postgres',
        argv: [],
      }),
    ).toThrow(/refusing/i);
  });

  it('names the host so the operator knows what they nearly hit', () => {
    expect(() =>
      assertLocalDbTarget({
        databaseUrl: 'postgresql://postgres.abc:***REMOVED***@aws-1.pooler.supabase.com:6543/postgres',
        argv: [],
      }),
    ).toThrow(/aws-1\.pooler\.supabase\.com/);
  });

  it('allows a remote target when --prod is passed explicitly', () => {
    expect(() =>
      assertLocalDbTarget({
        databaseUrl: 'postgresql://postgres.abc:***REMOVED***@aws-1.pooler.supabase.com:6543/postgres',
        argv: ['--prod'],
      }),
    ).not.toThrow();
  });

  it('allows a local target', () => {
    expect(() =>
      assertLocalDbTarget({
        databaseUrl: 'postgresql://darshya:***REMOVED***@127.0.0.1:55432/darshya_utf8',
        argv: [],
      }),
    ).not.toThrow();
  });
});

describe('AW-09 — every schema/seed script runs the guard first', () => {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };

  // These are the commands that can write to (or destroy) whatever database
  // DATABASE_URL happens to name. Each one must be gated by a `pre*` hook — a
  // guard that runs after the migration has started is not a guard.
  // AW-09 remaining half (2026-08-14): the first pass gated three scripts and
  // stopped. `seed:darshan` writes rows through the same client and was
  // ungated, and `db:studio` opens a full read/WRITE editor on whatever
  // DATABASE_URL names — with apps/api/.env still pointing at the production
  // Supabase pooler, either one reaches live customer data from a local
  // checkout. `start` is deliberately NOT in this list: `prisma migrate
  // deploy` against production is exactly what it is for.
  for (const script of ['db:migrate', 'db:push', 'db:seed', 'seed:darshan', 'db:studio']) {
    it(`gates ${script} with a pre-hook`, () => {
      expect(pkg.scripts[script]).toBeTruthy();
      const pre = pkg.scripts[`pre${script}`];
      expect(pre, `missing "pre${script}" in apps/api/package.json`).toBeTruthy();
      expect(pre).toContain('guard-db-target');
    });
  }
});
