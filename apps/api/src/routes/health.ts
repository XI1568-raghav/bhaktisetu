import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

/**
 * OPS-04 — a liveness probe that can actually go red.
 *
 * `render.yaml` sets `healthCheckPath: /health` for the API service, and every
 * uptime monitor points at the same URL. Until now that path answered
 * `{status:'ok', timestamp}` unconditionally — a database-free 200 for as long
 * as the Node process had a heartbeat. It reported the one fact an operator can
 * already see (the container is running) and stayed silent about the only
 * dependency whose loss makes the API useless. The DB-aware probe existed all
 * along at `/ready`, and nothing pointed at it.
 *
 * So `/health` now performs a real `SELECT 1`. Three properties keep that safe
 * to poll every few seconds:
 *
 *   - **Cached.** One round-trip per `ttlMs` window (default 5s), shared by all
 *     callers. A burst of probes issues a single query; an in-flight probe is
 *     joined rather than duplicated.
 *   - **Bounded.** A hung connection is abandoned after `timeoutMs` (default
 *     2s) so the probe can never outlive the load balancer's own patience.
 *   - **Anti-flap.** `db:'fail'` is reported immediately, but `status` only
 *     turns `degraded` after `failureThreshold` consecutive failures (default
 *     3 ≈ 15s of sustained unreachability). This matters more here than it
 *     looks: Render restarts a container whose health check fails, and the API
 *     start command is `prisma migrate deploy && node dist/server.js`, so a
 *     hair-trigger probe would convert a two-second database blip into a
 *     restart loop that also re-runs migrations.
 *
 * The distinction between `db` and `status` is deliberate and is the honest
 * shape: `db` is the last measurement, `status` is the verdict drawn from a
 * streak of them. A single failure shows up in the payload (so a monitor that
 * reads JSON can alarm early) without ejecting the node.
 */

export const HEALTH_DB_TIMEOUT_MS = Number(process.env.HEALTH_DB_TIMEOUT_MS) || 2_000;
export const HEALTH_CACHE_TTL_MS = Number(process.env.HEALTH_CACHE_TTL_MS) || 5_000;
export const HEALTH_FAILURE_THRESHOLD = Number(process.env.HEALTH_DB_FAILURE_THRESHOLD) || 3;

export type HealthStatus = 'ok' | 'degraded';
export type DbState = 'ok' | 'fail';

export interface HealthSnapshot {
  /** Verdict a load balancer should act on. */
  status: HealthStatus;
  /** Result of the most recent round-trip. */
  db: DbState;
  /** How many consecutive round-trips have failed. Zero after any success. */
  consecutiveFailures: number;
  /** Round-trip time of the last real probe, in milliseconds. */
  latencyMs: number;
  /** When the underlying probe ran (not when this response was served). */
  checkedAt: string;
  /** True when this answer came from the TTL cache rather than a fresh query. */
  cached: boolean;
  /** Present only when the last round-trip failed. Never includes a DSN. */
  error?: string;
}

export interface HealthProbeOptions {
  /** The round-trip. Defaults to `SELECT 1` on the shared Prisma client. */
  query?: () => Promise<unknown>;
  timeoutMs?: number;
  ttlMs?: number;
  failureThreshold?: number;
  now?: () => number;
}

export interface HealthProbe {
  check(): Promise<HealthSnapshot>;
  /** Drop the cache + failure streak. Test seam; not used in production. */
  reset(): void;
}

/** 503 is the only code a load balancer reads as "take me out". */
export function healthStatusCode(status: HealthStatus): 200 | 503 {
  return status === 'degraded' ? 503 : 200;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`health db probe exceeded ${ms}ms`)),
      ms,
    );
    // Never hold the event loop open on account of the probe.
    (timer as unknown as { unref?: () => void }).unref?.();
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** Trim a driver error to a single safe line — never leak a connection string. */
function safeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.split('\n')[0]!.slice(0, 200);
}

export function createHealthProbe(options: HealthProbeOptions = {}): HealthProbe {
  const query = options.query ?? (() => prisma.$queryRaw`SELECT 1`);
  const timeoutMs = options.timeoutMs ?? HEALTH_DB_TIMEOUT_MS;
  const ttlMs = options.ttlMs ?? HEALTH_CACHE_TTL_MS;
  const failureThreshold = options.failureThreshold ?? HEALTH_FAILURE_THRESHOLD;
  const now = options.now ?? (() => Date.now());

  let cached: HealthSnapshot | null = null;
  let cachedAt = 0;
  let inFlight: Promise<HealthSnapshot> | null = null;
  let consecutiveFailures = 0;

  async function probe(): Promise<HealthSnapshot> {
    const startedAt = Date.now();
    let db: DbState = 'ok';
    let error: string | undefined;

    try {
      await withTimeout(Promise.resolve().then(query), timeoutMs);
      consecutiveFailures = 0;
    } catch (err) {
      db = 'fail';
      error = safeError(err);
      consecutiveFailures += 1;
    }

    const snapshot: HealthSnapshot = {
      status: consecutiveFailures >= failureThreshold ? 'degraded' : 'ok',
      db,
      consecutiveFailures,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
      cached: false,
      ...(error ? { error } : {}),
    };

    cached = snapshot;
    cachedAt = now();
    return snapshot;
  }

  return {
    async check(): Promise<HealthSnapshot> {
      if (cached && ttlMs > 0 && now() - cachedAt < ttlMs) {
        return { ...cached, cached: true };
      }
      // Join an already-running probe rather than opening a second connection.
      if (inFlight) return inFlight;
      inFlight = probe().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },
    reset(): void {
      cached = null;
      cachedAt = 0;
      consecutiveFailures = 0;
    },
  };
}

/** The process-wide probe used by the registered route. */
export const defaultHealthProbe = createHealthProbe();

export interface HealthRoutesOptions {
  probe?: HealthProbe;
}

/**
 * Registers `GET /health`.
 *
 * Register at the ROOT (no prefix) — `render.yaml` polls `/health` exactly, and
 * `healthChannelRoutes` is already mounted at the `/health` prefix for
 * `/health/channels`, which does not collide with this bare path.
 */
export async function healthRoutes(
  server: FastifyInstance,
  options: HealthRoutesOptions = {},
): Promise<void> {
  const probe = options.probe ?? defaultHealthProbe;

  server.get('/health', async (_request, reply) => {
    const snapshot = await probe.check();
    if (snapshot.db === 'fail') {
      server.log.warn(
        { db: snapshot.db, consecutiveFailures: snapshot.consecutiveFailures },
        'health db probe failed',
      );
    }
    return reply.code(healthStatusCode(snapshot.status)).send({
      ...snapshot,
      timestamp: new Date().toISOString(),
    });
  });
}
