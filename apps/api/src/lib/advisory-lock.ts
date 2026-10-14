import { prisma } from './prisma.js';

/**
 * Run `fn` while holding a transaction-scoped Postgres advisory lock on `key`.
 * Concurrent callers with the same key queue up, so a check-then-insert inside
 * `fn` (autocommitted on its own connection) is visible to the next waiter by
 * the time it gets the lock. If the lock cannot be taken the work still runs:
 * a lock outage must not block the money path.
 */
export async function withAdvisoryLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  let started = false;
  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', key);
        started = true;
        return fn();
      },
      { timeout: 45_000, maxWait: 10_000 },
    );
  } catch (err) {
    if (started) throw err;
    console.warn('[advisory-lock] unavailable, running unlocked:', err);
    return fn();
  }
}
