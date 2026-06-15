/**
 * Background job queue — BullMQ + Upstash Redis (R-Q2-E-012)
 *
 * Env-or-noop pattern:
 *   - When REDIS_URL is unset (local dev, CI, founder hasn't pasted Upstash creds),
 *     enqueue() returns a synthetic job id and logs a warning. Producers can keep
 *     dispatching without crashing the request path.
 *   - When REDIS_URL is set, BullMQ Queue is constructed lazily on first use and
 *     cached per queue name. Producers get real BullMQ Job ids back.
 *
 * Worker process (separate Render service) is NOT started here — that lives in
 * apps/api/src/workers/job-worker.ts and is documented in
 * docs/engineering/R-Q2-E-012-handoff.md.
 *
 * Upstash free tier: 10k commands/day + 256 MB. Sufficient for email/wa/payout
 * baseline. See docs/free-tier-budgets.md before raising throughput.
 */

import type { Queue as BullQueue, JobsOptions } from 'bullmq';

export type JobQueueName = 'email' | 'whatsapp' | 'payout' | 'notification';

interface EnqueueResult {
  jobId: string;
  queue: JobQueueName;
  noop: boolean;
}

const REDIS_URL = process.env.REDIS_URL ?? '';
const QUEUE_DISABLED = !REDIS_URL || process.env.JOB_QUEUE_DISABLED === 'true';

const queueCache = new Map<JobQueueName, BullQueue>();
let warnedNoop = false;

function warnNoopOnce(name: JobQueueName, jobName: string) {
  if (warnedNoop) return;
  warnedNoop = true;
  // eslint-disable-next-line no-console
  console.warn(
    `[job-queue] REDIS_URL not set — job ${name}:${jobName} dropped (noop). ` +
      `Paste Upstash REDIS_URL on Render to activate BullMQ workers.`
  );
}

async function getQueue(name: JobQueueName): Promise<BullQueue | null> {
  if (QUEUE_DISABLED) return null;
  const cached = queueCache.get(name);
  if (cached) return cached;

  try {
    // Lazy dynamic import so the unattended path doesn't pay the ioredis cost.
    const { Queue } = await import('bullmq');
    // Upstash REST URL = `redis://default:<token>@<host>:6379`
    // BullMQ takes either a connection options object or a URL through ioredis.
    const queue = new Queue(name, {
      connection: {
        // ioredis accepts `url` as first-class field via its connect signature,
        // but BullMQ's ConnectionOptions doesn't expose it — we pass parsed parts.
        ...parseRedisUrl(REDIS_URL),
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 24 * 3600 },
      },
    });
    queueCache.set(name, queue);
    return queue;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[job-queue] failed to construct BullMQ Queue, falling back to noop', err);
    return null;
  }
}

function parseRedisUrl(url: string): { host: string; port: number; password?: string; username?: string; tls?: object } {
  try {
    const u = new URL(url);
    const out: ReturnType<typeof parseRedisUrl> = {
      host: u.hostname,
      port: u.port ? Number(u.port) : 6379,
    };
    if (u.password) out.password = decodeURIComponent(u.password);
    if (u.username && u.username !== 'default') out.username = u.username;
    if (u.protocol === 'rediss:') out.tls = {};
    return out;
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

/**
 * Enqueue a background job. Safe to call without REDIS_URL — returns
 * `{ noop: true }` and logs a warning rather than throwing.
 */
export async function enqueue<TData extends Record<string, unknown>>(
  queueName: JobQueueName,
  jobName: string,
  data: TData,
  opts: JobsOptions = {}
): Promise<EnqueueResult> {
  if (QUEUE_DISABLED) {
    warnNoopOnce(queueName, jobName);
    return { jobId: `noop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, queue: queueName, noop: true };
  }
  const queue = await getQueue(queueName);
  if (!queue) {
    return { jobId: `noop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, queue: queueName, noop: true };
  }
  const job = await queue.add(jobName, data, opts);
  return { jobId: String(job.id ?? `unknown-${Date.now()}`), queue: queueName, noop: false };
}

export interface QueueHealth {
  queue: JobQueueName;
  enabled: boolean;
  counts?: { active: number; waiting: number; delayed: number; failed: number; completed: number };
  error?: string;
}

/**
 * Lightweight health probe for /api/v1/admin/ops dashboards. Returns counts per
 * queue or `enabled:false` when REDIS_URL is missing.
 */
export async function getQueueHealth(): Promise<QueueHealth[]> {
  const names: JobQueueName[] = ['email', 'whatsapp', 'payout', 'notification'];
  const out: QueueHealth[] = [];
  for (const name of names) {
    if (QUEUE_DISABLED) {
      out.push({ queue: name, enabled: false });
      continue;
    }
    try {
      const queue = await getQueue(name);
      if (!queue) {
        out.push({ queue: name, enabled: false, error: 'queue construct failed' });
        continue;
      }
      const counts = await queue.getJobCounts('active', 'waiting', 'delayed', 'failed', 'completed');
      out.push({
        queue: name,
        enabled: true,
        counts: {
          active: counts.active ?? 0,
          waiting: counts.waiting ?? 0,
          delayed: counts.delayed ?? 0,
          failed: counts.failed ?? 0,
          completed: counts.completed ?? 0,
        },
      });
    } catch (err) {
      out.push({ queue: name, enabled: true, error: err instanceof Error ? err.message : 'unknown' });
    }
  }
  return out;
}

/**
 * Close all open queue connections — call from server graceful shutdown hook.
 */
export async function closeAllQueues(): Promise<void> {
  for (const [name, queue] of queueCache.entries()) {
    try {
      await queue.close();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[job-queue] error closing ${name}`, err);
    }
  }
  queueCache.clear();
}

// Re-export for consumers who want to construct BullMQ Worker themselves.
export const __INTERNAL = { parseRedisUrl, QUEUE_DISABLED, REDIS_URL };
