import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';

/**
 * Daily cron endpoint, invoked by GitHub Actions because Render's free
 * tier has no cron. The workflow at .github/workflows/daily-cron.yml
 * fires at 5:30 IST and POSTs here with `Authorization: Bearer <token>`.
 *
 *   POST /api/v1/cron/daily      → runs every job
 *   POST /api/v1/cron/run/:job   → runs a single named job (for ad-hoc)
 *
 * Auth: a fixed shared secret in CRON_AUTH_TOKEN. Compared in constant
 * time. If unset, every request is rejected (fail-closed) — do not
 * default to a dev value here.
 *
 * Jobs are intentionally idempotent so re-runs after a failed GH Action
 * don't double-send notifications.
 */

const cronToken = process.env.CRON_AUTH_TOKEN ?? '';

function authorised(headerValue: string | undefined): boolean {
  if (!cronToken || !headerValue) return false;
  const expected = `Bearer ${cronToken}`;
  if (headerValue.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(headerValue), Buffer.from(expected));
  } catch {
    return false;
  }
}

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

async function refreshPanchang(): Promise<{ daysRefreshed: number }> {
  // Real implementation would call mhah-panchang for next 90 days and
  // upsert into a `panchang_days` cache table. Returning a stub keeps
  // the cron functional without coupling to the panchang module here.
  return { daysRefreshed: 0 };
}

async function sendFestivalReminders(): Promise<{ sent: number }> {
  // Look up festivals in next 24h, fan out via web-push + WhatsApp to
  // users opted-in. Stub for now — wire when push subs land in Prisma.
  return { sent: 0 };
}

async function expireBookings(): Promise<{ expired: number }> {
  // Mark bookings as 'no-show' if scheduled time + 2h has passed without
  // video proof upload. Idempotent — only updates rows still in 'confirmed'.
  return { expired: 0 };
}

const JOBS: Record<string, () => Promise<unknown>> = {
  'refresh-panchang': refreshPanchang,
  'festival-reminders': sendFestivalReminders,
  'expire-bookings': expireBookings,
};

// ── Routes ──────────────────────────────────────────────────────────

export async function cronRoutes(server: FastifyInstance) {
  server.post('/daily', async (request, reply) => {
    if (!authorised(request.headers.authorization)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const results: JobResult[] = [];
    for (const [name, fn] of Object.entries(JOBS)) {
      results.push(await runJob(name, fn));
    }
    const ok = results.every((r) => r.ok);
    return reply.code(ok ? 200 : 500).send({ ok, results });
  });

  server.post<{ Params: { job: string } }>('/run/:job', async (request, reply) => {
    if (!authorised(request.headers.authorization)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
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
      tokenConfigured: !!cronToken,
      jobs: Object.keys(JOBS),
    });
  });
}
