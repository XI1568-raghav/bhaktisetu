import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Cloud Run scale-to-zero: Cloud Scheduler drives POST /cron/tick. Real
// cron-auth middleware and real @fastify/rate-limit are used on purpose — the
// point is that the endpoint is authenticated, throttled and fails closed.

const runDailyOps = vi.fn();
vi.mock('../jobs/master-cron.js', () => ({ runDailyOps: (...a: unknown[]) => runDailyOps(...a) }));
vi.mock('../services/dispatch.service.js', () => ({ dispatchService: { sweepExpiredOffers: vi.fn() } }));
vi.mock('../jobs/aarti-notify.js', () => ({ runAartiNotify: vi.fn() }));
const runPurgeSweep = vi.fn();
vi.mock('../services/account-deletion.service.js', () => ({
  accountDeletionService: { runPurgeSweep: (...a: unknown[]) => runPurgeSweep(...a) },
}));

import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { cronRoutes } from './cron.js';
import { __resetSchedulerForTests, getSchedulerStatus } from '../jobs/scheduler.js';

async function buildApp() {
  const app = Fastify();
  await app.register(rateLimit, { global: false });
  await app.register(cronRoutes, { prefix: '/api/v1/cron' });
  return app;
}

const SECRET = 'a-long-random-cron-secret';
const AUTH = { authorization: `Bearer ${SECRET}` };
const savedToken = process.env.CRON_AUTH_TOKEN;

beforeEach(() => {
  vi.clearAllMocks();
  __resetSchedulerForTests();
  process.env.CRON_AUTH_TOKEN = SECRET;
  runDailyOps.mockResolvedValue({ emailOutbox: { sent: 1 }, ranAt: 'now' });
  runPurgeSweep.mockResolvedValue({ purged: 0 });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  if (savedToken === undefined) delete process.env.CRON_AUTH_TOKEN;
  else process.env.CRON_AUTH_TOKEN = savedToken;
});

describe('POST /api/v1/cron/tick', () => {
  it('runs one tick (daily ops chain + account purge) with the bearer', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/cron/tick', headers: AUTH });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    expect(runDailyOps).toHaveBeenCalledTimes(1);
    expect(runPurgeSweep).toHaveBeenCalledTimes(1);
    expect(getSchedulerStatus().ticks).toBe(1);
  });

  it('fails closed (401, no work) when CRON_AUTH_TOKEN is unset', async () => {
    delete process.env.CRON_AUTH_TOKEN;
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/cron/tick', headers: { authorization: 'Bearer ' } });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('cron_auth_misconfigured');
    expect(runDailyOps).not.toHaveBeenCalled();
  });

  it('rejects a missing or wrong bearer without running anything', async () => {
    const app = await buildApp();
    const none = await app.inject({ method: 'POST', url: '/api/v1/cron/tick' });
    const wrong = await app.inject({ method: 'POST', url: '/api/v1/cron/tick', headers: { authorization: 'Bearer nope' } });
    expect(none.statusCode).toBe(401);
    expect(wrong.statusCode).toBe(401);
    expect(runDailyOps).not.toHaveBeenCalled();
  });

  it('returns 500 when the tick throws, so the scheduler retries/alerts', async () => {
    runDailyOps.mockRejectedValue(new Error('DB down'));
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/cron/tick', headers: AUTH });
    expect(res.statusCode).toBe(500);
    expect(res.json().ok).toBe(false);
  });

  it('is rate limited, including wrong-token guesses', async () => {
    const app = await buildApp();
    const codes: number[] = [];
    for (let i = 0; i < 25; i++) {
      const r = await app.inject({ method: 'POST', url: '/api/v1/cron/tick', headers: { authorization: 'Bearer guess' } });
      codes.push(r.statusCode);
    }
    expect(codes).toContain(429);
    expect(codes.slice(0, 20).every((c) => c === 401)).toBe(true);
  });
});
