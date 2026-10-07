/**
 * Static and early-exit guards of scripts/ops/prod-like-smoke.sh. The refusals happen before any
 * server boots, so they run with no database: a non-local host must exit 2 without starting anything.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SCRIPT = 'scripts/ops/prod-like-smoke.sh';
const src = readFileSync(SCRIPT, 'utf8');
const run = (env) =>
  spawnSync('bash', [SCRIPT], { env: { PATH: process.env.PATH, ...env }, encoding: 'utf8' });

describe('prod-like-smoke.sh guards', () => {
  it('refuses an empty or non-local database URL before booting anything', () => {
    for (const url of [
      '',
      'postgresql://u:***REMOVED***@db.example.supabase.co:5432/postgres',
      'postgresql://u:***REMOVED***@10.0.0.5:5432/x',
      'postgresql://u:***REMOVED***@127.0.0.1.evil.com:5432/x',
      'postgresql://127.0.0.1:***REMOVED***@evil.com/x',
    ]) {
      const r = run({ SMOKE_DATABASE_URL: url });
      expect(r.status, url).toBe(2);
      expect(`${r.stdout}${r.stderr}`, url).toMatch(/refusing to run/);
    }
  });

  it('refuses a non-numeric port', () => {
    const r = run({ SMOKE_DATABASE_URL: 'postgresql://u:***REMOVED***@127.0.0.1:55432/x', SMOKE_PORT: 'a;b' });
    expect(r.status).toBe(2);
  });

  it('runs in production mode with the dummy Sentry DSN that activates @fastify/otel', () => {
    expect(src).toContain('NODE_ENV=production');
    expect(src).toContain('SENTRY_DSN="https://abc123@o1.ingest.sentry.io/1"');
  });

  it('never references apps/api/.env and starts from an empty environment', () => {
    expect(src).not.toMatch(/apps\/api\/\.env/);
    expect(src).not.toMatch(/\bsource\s+\S*\.env|\.\s+\S*\.env/);
    expect(src).toContain('env -i');
  });

  it('stops its server by port, never by pattern', () => {
    expect(src).toContain('fuser -k');
    expect(src).not.toMatch(/pkill/);
  });

  it('checks the ten protected routes and the log patterns', () => {
    for (const p of ['/auth/me', '/admin/dashboard', '/admin/users', '/bookings/my', '/payouts/my',
      '/temple-portal/dashboard', '/astrologer-portal/dashboard', '/wellness-portal/dashboard',
      '/gaushala-portal/dashboard', '/store-admin/products']) expect(src).toContain(p);
    expect(src).toContain('fastify otel instance');
    expect(src).toContain('FST_ERR');
  });
});
