// scripts/agents/roadmap/_lock.mjs
// File-based JSON lock for the roadmap orchestrator. Extracted from
// roadmap-orchestrator.mjs so the lock lifecycle (acquire / check / release)
// is unit-testable against a temp lock file.
//
// Semantics:
// - acquireLock(cycleId) writes {cycleId, acquiredAt, pid}.
// - checkLock() returns the live lock, or null if: no file, unparseable,
//   age > ttl (stale — overrides), or the lock has `released: true`.
// - releaseLock() overwrites the file with {released:true, releasedAt}.
//   Idempotent + safe to call from a signal handler (sync writeFileSync).
//
// The orchestrator uses the default 15min TTL + docs/roadmap/_lock.json path.
// Tests pass { lockPath, ttlMs } to point at a temp file with a tight TTL.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const DEFAULT_LOCK_PATH = 'docs/roadmap/_lock.json';
const DEFAULT_TTL_MS = 15 * 60 * 1000;

export function createLock({
  lockPath = DEFAULT_LOCK_PATH,
  ttlMs = DEFAULT_TTL_MS,
  pid = process.pid,
} = {}) {
  function checkLock() {
    if (!existsSync(lockPath)) return null;
    try {
      const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
      if (lock && lock.released) return null; // released lock == no lock
      const age = Date.now() - new Date(lock.acquiredAt).getTime();
      if (age > ttlMs) {
        console.warn(`[orchestrator] stale lock (age ${Math.round(age / 60000)}min) — overriding`);
        return null;
      }
      return lock;
    } catch {
      return null;
    }
  }

  function acquireLock(cycleId) {
    writeFileSync(
      lockPath,
      JSON.stringify({ cycleId, acquiredAt: new Date().toISOString(), pid }, null, 2),
    );
  }

  function releaseLock() {
    if (existsSync(lockPath)) {
      try {
        writeFileSync(
          lockPath,
          JSON.stringify({ released: true, releasedAt: new Date().toISOString() }, null, 2),
        );
      } catch {}
    }
  }

  return { checkLock, acquireLock, releaseLock, lockPath, ttlMs };
}
