/**
 * OPS-14 (`F456`) — the resolver that makes "--env-file .env.local silently
 * queried PRODUCTION" impossible rather than merely guarded.
 *
 * The defect being locked out, exactly as it happened on 2026-09-08:
 *
 *   1. `import { PrismaClient } from '@prisma/client'` is HOISTED, and the
 *      generated client calls dotenv on `apps/api/.env` at import time.
 *      `apps/api/.env` carries the PRODUCTION DATABASE_URL *and* DIRECT_URL
 *      (measured under AUTH-09, and re-measured for this test on 2026-09-08:
 *      both resolve to `aws-1-ap-northeast-1.pooler.supabase.com`).
 *   2. Only THEN does the script's own `--env-file` loop run. That loop writes
 *      `process.env[k] = v` for every key the named file contains.
 *   3. `.env.local` contains DATABASE_URL but NO DIRECT_URL. So after the loop
 *      `process.env` is a MIXTURE: DATABASE_URL from `.env.local`, DIRECT_URL
 *      still production.
 *   4. `const url = process.env.DIRECT_URL || process.env.DATABASE_URL`
 *      therefore selects PRODUCTION, while every line of the invocation says
 *      local.
 *
 * The fix is not a guard bolted onto step 4. It is that when the operator names
 * an env file, that file is the ONLY source of the connection string —
 * `process.env` is not consulted for it at all. There is then no mixture to be
 * wrong about.
 *
 * These tests are the executable form of that claim. Several of them fail
 * against the old expression; the assertions that do are marked `OLD-FAILS`.
 */
import { describe, it, expect } from 'vitest';
import {
  DbTargetError,
  LOCAL_HOSTS,
  hostOf,
  parseEnvFileText,
  resolveDbTarget,
  formatResolutionBanner,
} from './resolve-db-target.mjs';
import { classifyDbTarget } from '../guard-db-target';

const PROD = 'postgresql://postgres:password@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres';
const PROD_HOST = 'aws-1-ap-northeast-1.pooler.supabase.com';
const LOCAL = 'postgresql://postgres:password@localhost:5432/bhaktisetu';

/** The process env as it actually looks AFTER `@prisma/client` is imported. */
function ambientAfterPrismaImport(): Record<string, string> {
  return { DATABASE_URL: PROD, DIRECT_URL: PROD };
}

/** An injectable stand-in for reading a dotenv file off disk. */
function files(map: Record<string, string>) {
  return (path: string): string => {
    if (!(path in map)) {
      const err = new Error(`ENOENT: no such file or directory, open '${path}'`);
      (err as NodeJS.ErrnoException).code = 'ENOENT';
      throw err;
    }
    return map[path];
  };
}

describe('parseEnvFileText', () => {
  it('reads plain, quoted, exported and CRLF lines', () => {
    const vars = parseEnvFileText(
      [
        '# a comment',
        '',
        'DATABASE_URL=postgresql://u:password@localhost:5432/dev',
        'DIRECT_URL="postgresql://u:password@localhost:5432/dev"',
        "NODE_ENV='development'",
        'export API_PORT=4000',
      ].join('\r\n'),
    );
    expect(vars.DATABASE_URL).toBe('postgresql://u:password@localhost:5432/dev');
    expect(vars.DIRECT_URL).toBe('postgresql://u:password@localhost:5432/dev');
    expect(vars.NODE_ENV).toBe('development');
    expect(vars.API_PORT).toBe('4000');
  });

  it('keeps everything after the FIRST "=" — Postgres URLs and passwords contain more', () => {
    const vars = parseEnvFileText(
      'DATABASE_URL=postgresql://u:password@h:6543/postgres?pgbouncer=true&connection_limit=1\n',
    );
    expect(vars.DATABASE_URL).toBe(
      'postgresql://u:password@h:6543/postgres?pgbouncer=true&connection_limit=1',
    );
  });

  it('ignores comments and does not confuse SHADOW_DATABASE_URL for DATABASE_URL', () => {
    const vars = parseEnvFileText(
      ['#DATABASE_URL=postgresql://u:password@commented:5432/x', 'SHADOW_DATABASE_URL=postgresql://u:password@shadow:5432/x'].join(
        '\n',
      ),
    );
    expect(vars.DATABASE_URL).toBeUndefined();
    expect(vars.SHADOW_DATABASE_URL).toBe('postgresql://u:password@shadow:5432/x');
  });
});

describe('hostOf', () => {
  it('extracts the host and never the credentials', () => {
    expect(hostOf(PROD)).toBe(PROD_HOST);
    expect(hostOf(LOCAL)).toBe('localhost');
  });

  it('normalises the IPv6 bracket form', () => {
    expect(hostOf('postgresql://u:password@[::1]:5432/dev')).toBe('::1');
  });

  it('fails closed on an unparseable value', () => {
    expect(hostOf('not-a-url')).toBeNull();
    expect(hostOf('')).toBeNull();
    expect(hostOf(undefined)).toBeNull();
  });
});

describe('resolveDbTarget — the F456 scenario', () => {
  /**
   * OLD-FAILS. This is the finding itself. Against
   * `process.env.DIRECT_URL || process.env.DATABASE_URL` the resolved host is
   * PROD_HOST; the whole point of the fix is that it is now 'localhost'.
   */
  it('a named env file with only DATABASE_URL resolves LOCAL even though ambient DIRECT_URL is production', () => {
    const r = resolveDbTarget({
      argv: ['--env-file', '.env.local'],
      env: ambientAfterPrismaImport(),
      readFile: files({ '.env.local': `DATABASE_URL=${LOCAL}\nNODE_ENV=development\n` }),
    });
    expect(r.host).toBe('localhost');
    expect(r.local).toBe(true);
    expect(r.url).toBe(LOCAL);
    expect(r.key).toBe('DATABASE_URL');
    expect(r.envFile).toBe('.env.local');
  });

  /**
   * OLD-FAILS. Resolving correctly is half of it; the operator has to be TOLD
   * that a production URL was sitting in the ambient env and was discarded,
   * because next time it may be the one that is right.
   */
  it('reports the divergence and names the production host it ignored', () => {
    const r = resolveDbTarget({
      argv: ['--env-file', '.env.local'],
      env: ambientAfterPrismaImport(),
      readFile: files({ '.env.local': `DATABASE_URL=${LOCAL}\n` }),
    });
    expect(r.diverged).toBe(true);
    expect(r.ambient).toEqual({ key: 'DIRECT_URL', host: PROD_HOST });
    expect(r.notes.join(' ')).toContain(PROD_HOST);
    expect(r.notes.join(' ')).toContain('.env.local');
  });

  /**
   * OLD-FAILS, and this is the loudest one. When the named file supplies
   * NEITHER key the old expression fell straight through to the ambient
   * production DIRECT_URL and connected. There is no reading of the operator's
   * intent under which that is correct, so it must refuse.
   */
  it('REFUSES when the named env file supplies no connection string at all', () => {
    const call = () =>
      resolveDbTarget({
        argv: ['--env-file', '.env.local'],
        env: ambientAfterPrismaImport(),
        readFile: files({ '.env.local': 'NODE_ENV=development\nAPI_PORT=4000\n' }),
      });
    expect(call).toThrow(DbTargetError);
    // The error must name BOTH databases: the one it would have used, and the
    // file the operator actually named.
    expect(call).toThrow(/\.env\.local/);
    expect(call).toThrow(new RegExp(PROD_HOST.replace(/\./g, '\\.')));
  });

  /**
   * OLD-FAILS. The operator named `.env.local`; if what comes back is not a
   * local database then the file and the invocation contradict each other and
   * the honest move is to stop, not to connect to whatever won.
   */
  it('REFUSES when a file named ".env.local" resolves to a remote host', () => {
    const call = () =>
      resolveDbTarget({
        argv: ['--env-file', '.env.local'],
        env: {},
        readFile: files({ '.env.local': `DIRECT_URL=${PROD}\n` }),
      });
    expect(call).toThrow(DbTargetError);
    expect(call).toThrow(new RegExp(PROD_HOST.replace(/\./g, '\\.')));
    expect(call).toThrow(/local/i);
  });

  it('does not apply the local-name rule to .env.production', () => {
    const r = resolveDbTarget({
      argv: ['--env-file', '.env.production'],
      env: {},
      readFile: files({ '.env.production': `DIRECT_URL=${PROD}\nDATABASE_URL=${PROD}\n` }),
    });
    expect(r.host).toBe(PROD_HOST);
    expect(r.local).toBe(false);
  });

  it('prefers DIRECT_URL over DATABASE_URL within the named file', () => {
    const r = resolveDbTarget({
      argv: ['--env-file', '.env.production'],
      env: {},
      readFile: files({
        '.env.production': `DATABASE_URL=postgresql://u:password@pooled.example.com:6543/postgres\nDIRECT_URL=${PROD}\n`,
      }),
    });
    expect(r.key).toBe('DIRECT_URL');
    expect(r.host).toBe(PROD_HOST);
  });
});

describe('resolveDbTarget — inputs and failure modes', () => {
  it('falls back to the ambient env when no --env-file is named', () => {
    const r = resolveDbTarget({ argv: [], env: ambientAfterPrismaImport(), readFile: files({}) });
    expect(r.host).toBe(PROD_HOST);
    expect(r.envFile).toBeNull();
    expect(r.key).toBe('DIRECT_URL');
    expect(r.diverged).toBe(false);
  });

  it('throws when --env-file is given without a path', () => {
    expect(() => resolveDbTarget({ argv: ['--env-file'], env: {}, readFile: files({}) })).toThrow(
      DbTargetError,
    );
  });

  it('throws, naming the path, when the named env file cannot be read', () => {
    expect(() =>
      resolveDbTarget({ argv: ['--env-file', '.env.missing'], env: {}, readFile: files({}) }),
    ).toThrow(/\.env\.missing/);
  });

  it('throws when nothing anywhere supplies a connection string', () => {
    expect(() => resolveDbTarget({ argv: [], env: {}, readFile: files({}) })).toThrow(DbTargetError);
  });

  it('fails CLOSED on an unparseable connection string instead of handing it to a client', () => {
    expect(() =>
      resolveDbTarget({
        argv: ['--env-file', '.env.production'],
        env: {},
        readFile: files({ '.env.production': 'DIRECT_URL=this-is-not-a-url\n' }),
      }),
    ).toThrow(DbTargetError);
  });

  it('never puts the password in an error message or in the banner', () => {
    const r = resolveDbTarget({
      argv: ['--env-file', '.env.production'],
      env: {},
      readFile: files({ '.env.production': `DIRECT_URL=${PROD}\n` }),
    });
    expect(formatResolutionBanner(r)).toContain(PROD_HOST);
    expect(formatResolutionBanner(r)).not.toContain('sup3rs3cr3t');
    expect(r.notes.join(' ')).not.toContain('sup3rs3cr3t');

    let message = '';
    try {
      resolveDbTarget({
        argv: ['--env-file', '.env.local'],
        env: { DIRECT_URL: PROD },
        readFile: files({ '.env.local': 'NODE_ENV=development\n' }),
      });
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toContain(PROD_HOST);
    expect(message).not.toContain('sup3rs3cr3t');
  });
});

describe('formatResolutionBanner', () => {
  it('names the resolved host and where it came from, so no run is silent', () => {
    const r = resolveDbTarget({
      argv: ['--env-file', '.env.local'],
      env: ambientAfterPrismaImport(),
      readFile: files({ '.env.local': `DATABASE_URL=${LOCAL}\n` }),
    });
    const banner = formatResolutionBanner(r);
    expect(banner).toContain('localhost');
    expect(banner).toContain('.env.local');
    expect(banner).toContain('DATABASE_URL');
    // and it surfaces the ignored production host on the same breath
    expect(banner).toContain(PROD_HOST);
  });
});

describe('anti-drift: this resolver and guard-db-target must agree on "local"', () => {
  it('classifies every LOCAL_HOSTS entry the same way guard-db-target does', () => {
    for (const host of LOCAL_HOSTS) {
      const url = host.includes(':')
        ? `postgresql://u:password@[${host}]:5432/dev`
        : `postgresql://u:password@${host}:5432/dev`;
      expect(classifyDbTarget(url).local, `${host} must be local in BOTH modules`).toBe(true);
      const r = resolveDbTarget({
        argv: ['--env-file', '.env.dev'],
        env: {},
        readFile: files({ '.env.dev': `DIRECT_URL=${url}\n` }),
      });
      expect(r.local, `${host} must be local in BOTH modules`).toBe(true);
    }
  });

  it('agrees that the production pooler is NOT local', () => {
    expect(classifyDbTarget(PROD).local).toBe(false);
    const r = resolveDbTarget({
      argv: ['--env-file', '.env.production'],
      env: {},
      readFile: files({ '.env.production': `DIRECT_URL=${PROD}\n` }),
    });
    expect(r.local).toBe(false);
  });
});
