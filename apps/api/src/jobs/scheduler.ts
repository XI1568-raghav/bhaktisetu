import type { FastifyBaseLogger } from 'fastify';
import { runDailyOps } from './master-cron.js';
import { inProcessJobsDisabled } from '../lib/inprocess-jobs.js';

// NOTIF-01 (P0) — nothing invoked runDailyOps, so every time-based feature was
// dead code: no panchang push, no aarti reminder, no weekly digest, no rebroadcast
// of an expired pandit offer, no auto-refund, no weekly settlement. A devotee whose
// pandit never accepted sat on a paid booking forever with no notification and no
// re-match. runDailyOps was reachable only from two admin endpoints that a
// repo-wide grep proved nothing calls.
//
// WHY IN-PROCESS AND NOT GITHUB ACTIONS. The finding proposed a `*/10` scheduled
// workflow, asserting "2000 free minutes/mo easily covers it". It does not. This
// repo is private, so Actions minutes are billed and every job rounds up to a
// full minute: */10 is 6/hr x 24 x 30 = 4,320 min/month against a 2,000 cap, and
// docs/free-tier-budgets.md already spends ~1,616 on 9 existing schedules. Even
// hourly (720) overruns. The API process is already running and already paid for,
// so a timer here costs zero minutes and zero dollars.
//
// This does not replace an external scheduler — Render free spins a service down
// when idle, and a spun-down process runs no timers. An external pinger
// (cron-job.org, Upstash QStash) both wakes the service AND drives the tick, which
// is strictly better. That needs an account only the owner can create, so it stays
// owner-gated; this closes the gap in the meantime and, crucially, makes a dead
// scheduler VISIBLE instead of silent — see getSchedulerStatus.

export interface TickRecord {
  at: string;
  ok: boolean;
  durationMs: number;
  error?: string;
}

export interface SchedulerStatus {
  enabled: boolean;
  /** True when timers are off because an external scheduler drives /cron/tick. */
  inProcessDisabled: boolean;
  startedAt: string | null;
  intervalMs: number;
  running: boolean;
  ticks: number;
  failures: number;
  lastTick: TickRecord | null;
  /** Seconds since the last completed tick, or null if none has run yet. */
  ageSeconds: number | null;
  /** True when no tick has landed in more than two intervals — the alarm. */
  stale: boolean;
}

export const DEFAULT_INTERVAL_MS = 30 * 60_000;
/** Wait before the first tick so boot, migrations and warmup finish first. */
export const FIRST_TICK_DELAY_MS = 60_000;

let timer: NodeJS.Timeout | null = null;
let firstTimer: NodeJS.Timeout | null = null;
let intervalMs = DEFAULT_INTERVAL_MS;
let startedAt: string | null = null;
let lastTick: TickRecord | null = null;
let running = false;
let ticks = 0;
let failures = 0;

function resolveIntervalMs(): number {
  const raw = Number(process.env.OPS_TICK_INTERVAL_MS);
  // Floor at a minute: a tighter loop would hammer the DB for no benefit, and a
  // typo'd env var should not become a self-inflicted denial of service.
  return Number.isFinite(raw) && raw >= 60_000 ? raw : DEFAULT_INTERVAL_MS;
}

export function isSchedulerEnabled(): boolean {
  // Cloud Run scale-to-zero: timers cannot be trusted; Cloud Scheduler drives
  // POST /api/v1/cron/tick instead. Wins over OPS_SCHEDULER_ENABLED.
  if (inProcessJobsDisabled()) return false;
  const flag = process.env.OPS_SCHEDULER_ENABLED;
  if (flag === '1' || flag === 'true') return true;
  if (flag === '0' || flag === 'false') return false;
  // Default on everywhere except tests, so a suite never fires real outreach.
  return process.env.NODE_ENV !== 'test';
}

export function getSchedulerStatus(): SchedulerStatus {
  const ageSeconds = lastTick
    ? Math.max(0, Math.floor((Date.now() - Date.parse(lastTick.at)) / 1000))
    : null;
  return {
    enabled: timer !== null,
    inProcessDisabled: inProcessJobsDisabled(),
    startedAt,
    intervalMs,
    running,
    ticks,
    failures,
    lastTick,
    ageSeconds,
    // Before the first tick lands, "stale" keys off uptime rather than tick age,
    // so a scheduler that starts and immediately wedges is still reported.
    stale: timer !== null && (ageSeconds === null
      ? Date.now() - Date.parse(startedAt ?? new Date().toISOString()) > intervalMs * 2 + FIRST_TICK_DELAY_MS
      : ageSeconds * 1000 > intervalMs * 2),
  };
}

/**
 * One tick. Never throws — runDailyOps isolates each of its 18 steps already,
 * but an unhandled rejection inside a timer would take the whole API down.
 */
export async function runTickOnce(log?: FastifyBaseLogger): Promise<TickRecord> {
  if (running) {
    // A slow tick must not overlap the next one: two concurrent settlement or
    // auto-refund passes could act on the same rows twice.
    log?.warn({ lastTick }, 'ops_tick_skipped_overlap');
    return lastTick ?? { at: new Date().toISOString(), ok: false, durationMs: 0, error: 'overlap' };
  }
  running = true;
  const startedMs = Date.now();
  let record: TickRecord;
  try {
    const result = await runDailyOps();
    record = { at: new Date().toISOString(), ok: true, durationMs: Date.now() - startedMs };
    log?.info({ durationMs: record.durationMs, result }, 'ops_tick_ok');
  } catch (err) {
    failures += 1;
    record = {
      at: new Date().toISOString(),
      ok: false,
      durationMs: Date.now() - startedMs,
      error: err instanceof Error ? err.message : String(err),
    };
    log?.error({ err, durationMs: record.durationMs }, 'ops_tick_failed');
  } finally {
    running = false;
  }
  ticks += 1;
  lastTick = record;
  return record;
}

export function startOpsScheduler(log?: FastifyBaseLogger): boolean {
  if (timer) return true;
  if (!isSchedulerEnabled()) {
    log?.info('ops_scheduler_disabled');
    return false;
  }
  intervalMs = resolveIntervalMs();
  startedAt = new Date().toISOString();

  timer = setInterval(() => {
    void runTickOnce(log);
  }, intervalMs);
  firstTimer = setTimeout(() => {
    void runTickOnce(log);
  }, FIRST_TICK_DELAY_MS);

  // unref so neither timer keeps the event loop alive during a graceful shutdown.
  timer.unref?.();
  firstTimer.unref?.();

  log?.info({ intervalMs, firstTickInMs: FIRST_TICK_DELAY_MS }, 'ops_scheduler_started');
  return true;
}

export function stopOpsScheduler(): void {
  if (timer) clearInterval(timer);
  if (firstTimer) clearTimeout(firstTimer);
  timer = null;
  firstTimer = null;
  startedAt = null;
}

/** Test-only reset so counters do not leak between cases. */
export function __resetSchedulerForTests(): void {
  stopOpsScheduler();
  lastTick = null;
  running = false;
  ticks = 0;
  failures = 0;
  intervalMs = DEFAULT_INTERVAL_MS;
}
