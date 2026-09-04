import { FastifyInstance } from 'fastify';
import { requireCronBearer } from '../middlewares/cron-auth.js';
import { runDailyOps } from '../jobs/master-cron.js';
import { runAartiNotify } from '../jobs/aarti-notify.js';
import { dispatchService } from '../services/dispatch.service.js';
import { accountDeletionService } from '../services/account-deletion.service.js';

/**
 * Cron endpoints, invoked by GitHub Actions and/or an external pinger because
 * Render's free tier has no cron.
 *
 *   POST /api/v1/cron/daily      → runs the full daily ops chain
 *   POST /api/v1/cron/run/:job   → runs a single named job (ad-hoc / tight loop)
 *   GET  /api/v1/cron/health     → token config + the real job list
 *
 * Auth: requireCronBearer middleware. Fail-loud if CRON_AUTH_TOKEN unset
 * (returns 401 + 'cron_auth_misconfigured' body code so log search picks
 * up server-side misconfig vs client bad-token). See R-Q1-IT-002 +
 * apps/api/src/middlewares/cron-auth.ts.
 *
 * NOTIF-11 (2026-08-12): every job registered here USED TO BE A LITERAL STUB.
 *
 *   refreshPanchang       returned {daysRefreshed: 0} — "Real implementation
 *                         would call mhah-panchang…" (jobs/daily-panchang-
 *                         compute-cron.ts had been doing it for months)
 *   sendFestivalReminders returned {sent: 0} — "Stub for now — wire when push
 *                         subs land in Prisma" (push_subscriptions landed
 *                         months ago)
 *   expireBookings        returned {expired: 0}
 *
 * POST /daily ran all three, computed `ok = results.every(r => r.ok)` — three
 * stubs never fail — and returned 200. daily-cron.yml curls with `-fsS`, which
 * only fails on a non-2xx, so the single scheduled workflow in the repo went
 * GREEN every day for months while /panchang sold "daily panchang, shubh
 * muhurat alerts, and festival reminders" and nobody had ever received one. A
 * green tick over three `return 0`s is worse than a red one: it is the reason
 * nobody looked.
 *
 * The stubs are deleted. /daily now drives the real runDailyOps chain and
 * returns its counters, so the workflow can assert on WORK DONE rather than on
 * an HTTP status that three no-ops could always satisfy.
 *
 * Jobs are intentionally idempotent so re-runs after a failed GH Action
 * don't double-send notifications — see the per-day claim in
 * lib/notification-run-log.ts.
 */

interface JobResult {
  job: string;
  ok: boolean;
  durationMs: number;
  detail?: unknown;
  error?: string;
}

async function runJob(name: string, fn: () => Promise<unknown>): Promise<JobResult> {
  const t0 = Date.now();
  try {
    const detail = await fn();
    return { job: name, ok: true, durationMs: Date.now() - t0, detail };
  } catch (err) {
    return {
      job: name,
      ok: false,
      durationMs: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ── Job definitions ──────────────────────────────────────────────────
//
// Every entry here does real work. If a job cannot be implemented, it does not
// belong in this map: a registered no-op is indistinguishable from a working
// feature at every layer above it.

const JOBS: Record<string, () => Promise<unknown>> = {
  /** The full chain — the same one the in-process scheduler ticks. */
  'daily-ops': () => runDailyOps(),
  /**
   * NOTIF-10: the instant tier promises a 60-second accept window. broadcast()
   * arms a per-booking timer for exactly that, but timers die with the process,
   * so this endpoint exists for a tight external schedule — cron-job.org at
   * one-minute granularity, which is free and already the documented scheduler
   * — to drive the sweep without dragging the other 17 ticks of the daily chain
   * along with it.
   */
  'dispatch-sweep': () => dispatchService.sweepExpiredOffers(),
  /** Pre-aarti reminders — cheap, and worth running more often than daily. */
  'aarti-notify': () => runAartiNotify(),
  /**
   * LC-DEL: anonymise accounts whose 30-day deletion grace period has elapsed.
   *
   * The grace window is what makes a one-tap wipe safe on a product with no
   * password — but a grace period nobody ever sweeps is just a deletion that
   * never happens, which is the store violation this feature exists to fix. This
   * job is the other half of the promise. Idempotent per account, and one
   * account's failure never stops the rest of the batch.
   */
  'account-purge': () => accountDeletionService.runPurgeSweep(),
};

// ── Routes ──────────────────────────────────────────────────────────

export async function cronRoutes(server: FastifyInstance) {
  server.post('/daily', { preHandler: requireCronBearer }, async (request, reply) => {
    const t0 = Date.now();
    try {
      const result = await runDailyOps();
      return reply.code(200).send({ ok: true, durationMs: Date.now() - t0, result });
    } catch (err) {
      // Loud on purpose. `-fsS` in daily-cron.yml turns a non-2xx into a red
      // workflow, which is the only signal anyone was ever going to see.
      request.log.error({ err }, 'daily cron failed');
      return reply.code(500).send({
        ok: false,
        durationMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  server.post<{ Params: { job: string } }>('/run/:job', { preHandler: requireCronBearer }, async (request, reply) => {
    const fn = JOBS[request.params.job];
    if (!fn) {
      return reply.code(404).send({ error: `Unknown job: ${request.params.job}`, available: Object.keys(JOBS) });
    }
    const result = await runJob(request.params.job, fn);
    return reply.code(result.ok ? 200 : 500).send(result);
  });

  server.get('/health', async (_request, reply) => {
    return reply.send({
      ok: true,
      tokenConfigured: !!(process.env.CRON_AUTH_TOKEN ?? ''),
      jobs: Object.keys(JOBS),
    });
  });
}
