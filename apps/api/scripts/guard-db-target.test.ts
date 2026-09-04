import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  classifyDbTarget,
  assertLocalDbTarget,
  databaseUrlFromEnvFile,
  REMOTE_DB_OVERRIDE_ENV,
} from './guard-db-target.js';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
  // AUTH-09 (2026-09-01): `dev` joins the list, and it is the one that was
  // missing. The first two passes gated every command that writes SCHEMA and
  // left the command a developer actually runs — `tsx watch src/server.ts`,
  // which boots the whole API, with whatever SUPABASE_SERVICE_ROLE_KEY and
  // JWT_SECRET .env holds, against whatever DATABASE_URL names. Measured on
  // 2026-09-01: apps/api/.env's DATABASE_URL, DIRECT_URL, SUPABASE_URL,
  // SUPABASE_SERVICE_ROLE_KEY and JWT_SECRET are all byte-identical to
  // apps/api/.env.production, and .env sets NODE_ENV=production. So `pnpm dev`
  // put every write endpoint in the product one local HTTP request away from
  // live customer data, and let a locally minted JWT verify in production.
  for (const script of ['dev', 'db:migrate', 'db:push', 'db:seed', 'seed:darshan', 'db:studio']) {
    it(`gates ${script} with a pre-hook`, () => {
      expect(pkg.scripts[script]).toBeTruthy();
      const pre = pkg.scripts[`pre${script}`];
      expect(pre, `missing "pre${script}" in apps/api/package.json`).toBeTruthy();
      expect(pre).toContain('guard-db-target');
    });
  }
});

describe('AUTH-09 — the override an npm pre-hook can actually reach', () => {
  const REMOTE = 'postgresql://u:***REMOVED***@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';

  it('still refuses a remote target with no override at all', () => {
    expect(() =>
      assertLocalDbTarget({ databaseUrl: REMOTE, argv: [], env: {} }),
    ).toThrow(/not a local database/);
  });

  it('names the host, and never the credentials, in the refusal', () => {
    let message = '';
    try {
      assertLocalDbTarget({ databaseUrl: REMOTE, argv: [], env: {} });
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toContain('aws-1-ap-northeast-1.pooler.supabase.com');
    expect(message).not.toContain('u:p');
    expect(message).not.toContain(':p@');
  });

  it('lets ALLOW_REMOTE_DB=1 through, because `pnpm dev --prod` cannot', () => {
    // npm does not forward a command's argv to its pre-hook: `pnpm dev --prod`
    // runs `predev` with argv [] and passes --prod to `dev` only. Without this
    // variable, gating `dev` would leave no way to deliberately point a local
    // API at a remote database.
    expect(() =>
      assertLocalDbTarget({
        databaseUrl: REMOTE,
        argv: [],
        env: { [REMOTE_DB_OVERRIDE_ENV]: '1' },
      }),
    ).not.toThrow();
  });

  it('requires exactly "1" — a truthy-looking value is not consent', () => {
    for (const value of ['0', 'true', 'yes', '']) {
      expect(() =>
        assertLocalDbTarget({
          databaseUrl: REMOTE,
          argv: [],
          env: { [REMOTE_DB_OVERRIDE_ENV]: value },
        }),
      ).toThrow(/not a local database/);
    }
  });

  it('reads DATABASE_URL out of the injected env, not the ambient process', () => {
    // The guard runs as its own process under a pre-hook, where the only thing
    // it can see is the environment it was handed. If it read process.env
    // directly the injected case below would pass for the wrong reason.
    expect(() =>
      assertLocalDbTarget({ argv: [], env: { DATABASE_URL: REMOTE } }),
    ).toThrow(/pooler\.supabase\.com/);
    expect(() =>
      assertLocalDbTarget({
        argv: [],
        env: { DATABASE_URL: 'postgresql://u:***REMOVED***@localhost:5432/dev' },
      }),
    ).not.toThrow();
  });
});

describe('AUTH-09 — the guard reads the .env file the app itself will load', () => {
  /**
   * Before this, the CLI entry classified `process.env.DATABASE_URL` only.
   * Nothing in apps/api calls dotenv.config() — `.env` reaches the app through
   * @prisma/client at import time, which this standalone script never triggers
   * — so the variable was always undefined, `classifyDbTarget` always answered
   * `(unparseable)`, and every gated command was refused no matter where it
   * pointed. Reproduced before the fix by running the script; it printed
   * `points at "(unparseable)"` with the production pooler sitting in .env.
   */
  const NL = String.fromCharCode(10);

  function envFile(contents: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'guard-db-'));
    const file = join(dir, '.env');
    writeFileSync(file, contents, 'utf8');
    return file;
  }

  it('extracts DATABASE_URL from a realistic .env', () => {
    const file = envFile(
      [
        '# Darshya API',
        '',
        'DIRECT_URL=postgresql://u:***REMOVED***@direct.example.com:5432/postgres',
        'DATABASE_URL=postgresql://u:***REMOVED***@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
        'NODE_ENV=production',
      ].join(NL),
    );
    const url = databaseUrlFromEnvFile(file);
    expect(classifyDbTarget(url).host).toBe('aws-1-ap-northeast-1.pooler.supabase.com');
    expect(classifyDbTarget(url).local).toBe(false);
  });

  it('does not mistake DIRECT_URL or a commented line for DATABASE_URL', () => {
    const file = envFile(
      [
        '#DATABASE_URL=postgresql://u:***REMOVED***@commented.example.com:5432/x',
        'SHADOW_DATABASE_URL=postgresql://u:***REMOVED***@shadow.example.com:5432/x',
        'DATABASE_URL=postgresql://u:***REMOVED***@localhost:5432/dev',
      ].join(NL),
    );
    expect(classifyDbTarget(databaseUrlFromEnvFile(file)).host).toBe('localhost');
  });

  it('strips surrounding quotes', () => {
    const file = envFile(`DATABASE_URL="postgresql://u:***REMOVED***@localhost:5432/dev"${NL}`);
    expect(classifyDbTarget(databaseUrlFromEnvFile(file)).local).toBe(true);
  });

  it('returns undefined for a missing file, so the guard still fails closed', () => {
    const url = databaseUrlFromEnvFile(join(tmpdir(), 'definitely-not-here', '.env'));
    expect(url).toBeUndefined();
    expect(() => assertLocalDbTarget({ databaseUrl: url, argv: [], env: {} })).toThrow(
      /not a local database/,
    );
  });
});
