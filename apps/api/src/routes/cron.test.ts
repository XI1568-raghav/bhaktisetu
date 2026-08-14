import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * NOTIF-11 — the only scheduled cron in the repo ran three hardcoded stubs and
 * reported ok:true every day.
 *
 *   refreshPanchang        -> { daysRefreshed: 0 }  ("Real implementation would…")
 *   sendFestivalReminders  -> { sent: 0 }           ("Stub for now — wire when
 *                                                    push subs land in Prisma",
 *                                                    which they did months ago)
 *   expireBookings         -> { expired: 0 }
 *
 * POST /cron/daily ran all three, computed `ok = results.every(r => r.ok)` and
 * returned 200; daily-cron.yml curls with `-fsS`, which only fails on non-2xx,
 * so the workflow went green every single day while /panchang sold "daily
 * panchang, shubh muhurat alerts, and festival reminders" and nobody had ever
 * received one. The green tick is the reason nobody noticed.
 */

const runDailyOps = vi.fn();
vi.mock('../jobs/master-cron.js', () => ({ runDailyOps: (...a: unknown[]) => runDailyOps(...a) }));

const sweepExpiredOffers = vi.fn();
vi.mock('../services/dispatch.service.js', () => ({
  dispatchService: { sweepExpiredOffers: (...a: unknown[]) => sweepExpiredOffers(...a) },
}));

const runAartiNotify = vi.fn();
vi.mock('../jobs/aarti-notify.js', () => ({
  runAartiNotify: (...a: unknown[]) => runAartiNotify(...a),
}));

vi.mock('../middlewares/cron-auth.js', () => ({
  requireCronBearer: async (request: any, reply: any) => {
    if (request.headers.authorization !== 'Bearer good') {
      reply.code(401).send({ error: 'cron_unauthorized' });
    }
  },
}));

import Fastify from 'fastify';
import { cronRoutes } from './cron.js';

async function buildApp() {
  const app = Fastify();
  await app.register(cronRoutes, { prefix: '/cron' });
  return app;
}

const AUTH = { authorization: 'Bearer good' };

const DAILY_OPS_RESULT = {
  outreach: { sent: 0, errors: 0 },
  panchang: { sent: 3 },
  aartiNotify: { templesChecked: 9, aartisMatched: 1, pushesSent: 2, expiredTokens: 0, invalidTokens: 0, failed: 0 },
  dispatchSweep: { expired: 1, rebroadcast: 1, escalated: 0 },
  ranAt: '2026-08-12T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  runDailyOps.mockResolvedValue(DAILY_OPS_RESULT);
  sweepExpiredOffers.mockResolvedValue({ expired: 2, rebroadcast: 1, escalated: 1 });
  runAartiNotify.mockResolvedValue({
    templesChecked: 9,
    aartisMatched: 0,
    pushesSent: 0,
    expiredTokens: 0,
    invalidTokens: 0,
    failed: 0,
  });
});

describe('POST /cron/daily runs the real work (NOTIF-11)', () => {
  it('drives runDailyOps, not three hardcoded stubs', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/cron/daily', headers: AUTH, payload: {} });

    expect(res.statusCode).toBe(200);
    expect(runDailyOps).toHaveBeenCalledTimes(1);
  });

  it('returns counters a workflow can assert on, not just ok:true', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/cron/daily', headers: AUTH, payload: {} });
    const body = res.json();

    expect(body.ok).toBe(true);
    expect(body.result.panchang.sent).toBe(3);
    expect(body.result.dispatchSweep.expired).toBe(1);
  });

  it('fails loudly (500) when the real work throws', async () => {
    runDailyOps.mockRejectedValue(new Error('DB down'));
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/cron/daily', headers: AUTH, payload: {} });

    expect(res.statusCode).toBe(500);
    expect(res.json().ok).toBe(false);
  });

  it('still requires the cron bearer', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/cron/daily', payload: {} });
    expect(res.statusCode).toBe(401);
  });
});

describe('named cron jobs are all real (NOTIF-11)', () => {
  it('exposes no stub jobs', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/cron/health' });
    const jobs: string[] = res.json().jobs;

    expect(jobs).not.toContain('refresh-panchang');
    expect(jobs).not.toContain('festival-reminders');
    expect(jobs).not.toContain('expire-bookings');
  });

  it('exposes the dispatch sweep so an external */1 scheduler can drive it (NOTIF-10)', async () => {
    const app = await buildApp();
    expect(res_jobs(await app.inject({ method: 'GET', url: '/cron/health' }))).toContain(
      'dispatch-sweep',
    );

    const run = await app.inject({
      method: 'POST',
      url: '/cron/run/dispatch-sweep',
      headers: AUTH,
      payload: {},
    });
    expect(run.statusCode).toBe(200);
    expect(sweepExpiredOffers).toHaveBeenCalledTimes(1);
    expect(run.json().detail).toMatchObject({ expired: 2, rebroadcast: 1 });
  });

  it('runs the aarti reminder job on demand', async () => {
    const app = await buildApp();
    const run = await app.inject({
      method: 'POST',
      url: '/cron/run/aarti-notify',
      headers: AUTH,
      payload: {},
    });
    expect(run.statusCode).toBe(200);
    expect(runAartiNotify).toHaveBeenCalledTimes(1);
  });

  it('404s an unknown job with the real list', async () => {
    const app = await buildApp();
    const run = await app.inject({
      method: 'POST',
      url: '/cron/run/festival-reminders',
      headers: AUTH,
      payload: {},
    });
    expect(run.statusCode).toBe(404);
  });
});

function res_jobs(res: { json: () => { jobs: string[] } }): string[] {
  return res.json().jobs;
}
