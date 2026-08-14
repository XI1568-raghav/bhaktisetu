import { prisma } from './prisma.js';

/**
 * notification-run-log.ts — a durable "did this notification already fire?" claim.
 *
 * WHY THIS EXISTS
 *
 * Two of the time-based notification jobs decide whether to send by looking at
 * the clock alone, and both are wrong for the same reason: the clock says
 * "we are inside the window", not "nobody has sent it yet".
 *
 *  - NOTIF-12 — tickPanchangBlast's only gate is `isFiveAmIstWindow(now)`, true
 *    for the WHOLE 05:00–05:59 IST hour. The ops scheduler ticks every 30
 *    minutes (jobs/scheduler.ts DEFAULT_INTERVAL_MS), so that hour contains two
 *    ticks and every subscriber got the identical "Today's Panchang" push twice
 *    each morning. A 10-minute tick makes it six.
 *  - NOTIF-08 — aarti reminders deduped through a module-level `Set`, which a
 *    Render restart empties and a second instance never shares.
 *
 * The weekly digest already got this right with a persisted WeeklyDigestRun row
 * and a cooldown; this generalises that to an arbitrary key.
 *
 * WHY THE TABLE IS CREATED HERE AND NOT BY A MIGRATION
 *
 * Same reason lib/ensure-schema.ts exists: Render's start command bypasses
 * `prisma migrate deploy`, so this repo already treats idempotent
 * `CREATE TABLE IF NOT EXISTS` DDL as the way a table reliably comes into being.
 * The DDL runs at most once per process, lazily, off the request path (only cron
 * jobs call this), and every failure degrades to the in-process Set that was
 * there before — this can make the dedupe stronger, never weaker.
 *
 * `run_key` is TEXT, deliberately. NOTIF-02 was a uuid column bound as text
 * raising Postgres 42804 on every call while the catch reported success; a log
 * table with no joins has nothing to gain from a uuid column and everything to
 * lose from that footgun.
 */

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS "notification_run_log" (
  "run_key"  TEXT PRIMARY KEY,
  "fired_at" TIMESTAMPTZ NOT NULL DEFAULT now()
)`;

/** Rows older than this are pruned — the keys are date-scoped and never re-read. */
const RETENTION_DAYS = 14;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

let tableReady: Promise<boolean> | null = null;
let lastPruneAt = 0;

/** Fallback when the table cannot be created (no DB, permissions, tests). */
const memoryClaims = new Set<string>();

async function ensureTable(): Promise<boolean> {
  if (!tableReady) {
    tableReady = prisma
      .$executeRawUnsafe(CREATE_TABLE_SQL)
      .then(() => true)
      .catch((err: unknown) => {
        console.warn(
          '[notification-run-log] table unavailable, falling back to in-process dedupe:',
          err instanceof Error ? err.message : String(err),
        );
        return false;
      });
  }
  return tableReady;
}

async function maybePrune(): Promise<void> {
  if (Date.now() - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = Date.now();
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "notification_run_log" WHERE "fired_at" < now() - INTERVAL '${RETENTION_DAYS} days'`,
    );
  } catch {
    // best-effort
  }
}

/**
 * Atomically claim one notification fire.
 *
 * Returns TRUE only for the caller that actually won the claim — that caller,
 * and only that caller, should send. Every later caller for the same key gets
 * FALSE. `INSERT … ON CONFLICT DO NOTHING` makes this safe across concurrent
 * instances, which an in-process Set never was.
 *
 * Never throws: on any DB error it falls back to the process-local Set, which
 * is exactly the guarantee the callers had before this existed.
 */
export async function claimRun(runKey: string): Promise<boolean> {
  const ok = await ensureTable();
  if (!ok) {
    if (memoryClaims.has(runKey)) return false;
    memoryClaims.add(runKey);
    return true;
  }
  void maybePrune();
  try {
    const rows = await prisma.$executeRawUnsafe(
      `INSERT INTO "notification_run_log" ("run_key") VALUES ($1) ON CONFLICT ("run_key") DO NOTHING`,
      runKey,
    );
    return rows > 0;
  } catch (err) {
    console.warn(
      '[notification-run-log] claim failed, falling back to in-process dedupe:',
      err instanceof Error ? err.message : String(err),
    );
    if (memoryClaims.has(runKey)) return false;
    memoryClaims.add(runKey);
    return true;
  }
}

/**
 * Give a claim back so the next tick retries.
 *
 * Call this only when the send the claim was taken for did not happen at all
 * (the job threw before fanning out). Releasing after a partial fan-out would
 * re-notify everyone who already got it.
 */
export async function releaseRun(runKey: string): Promise<void> {
  memoryClaims.delete(runKey);
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "notification_run_log" WHERE "run_key" = $1`, runKey);
  } catch {
    // best-effort
  }
}

/** Test seam — drops the memoised DDL promise and the fallback set. */
export function __resetRunLogForTests(): void {
  tableReady = null;
  lastPruneAt = 0;
  memoryClaims.clear();
}
