// scripts/agents/roadmap-orchestrator.test.mjs
// Regression coverage for the orchestrator file-lock lifecycle (acquire /
// check / release). Extracted from the monolithic orchestrator into
// ./roadmap/_lock.mjs specifically so this could be tested.
//
// Covers the SIGTERM stale-lock fix: the signal handlers in
// roadmap-orchestrator.mjs call releaseLock() on cancel. These tests
// prove releaseLock is idempotent + that a released lock reads as "no
// lock" to checkLock — so a SIGTERM-killed cycle does NOT leave a lock
// that blocks the next tight-retry cron.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, rmSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLock } from './roadmap/_lock.mjs';

let tmpDir;
let lockPath;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'darshya-lock-test-'));
  lockPath = join(tmpDir, '_lock.json');
});

afterEach(() => {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
});

describe('orchestrator lock lifecycle', () => {
  it('checkLock returns null when no lock file exists', () => {
    const { checkLock } = createLock({ lockPath, ttlMs: 15 * 60 * 1000 });
    expect(checkLock()).toBeNull();
  });

  it('acquire then check returns the live lock with cycleId', () => {
    const { acquireLock, checkLock } = createLock({ lockPath, ttlMs: 15 * 60 * 1000 });
    acquireLock('C-test-1');
    const lock = checkLock();
    expect(lock).not.toBeNull();
    expect(lock.cycleId).toBe('C-test-1');
    expect(lock.acquiredAt).toBeTruthy();
    expect(typeof lock.pid).toBe('number');
  });

  it('releaseLock writes released:true and checkLock then reads as null (no lock)', () => {
    // This is the core SIGTERM-fix invariant: after the signal handler
    // calls releaseLock(), the next cron's checkLock must NOT see a live
    // lock — otherwise it exits clean at the lock check and the cycle is
    // blocked for up to LOCK_MAX_AGE_MS (15min).
    const { acquireLock, releaseLock, checkLock } = createLock({
      lockPath,
      ttlMs: 15 * 60 * 1000,
    });
    acquireLock('C-test-2');
    expect(checkLock()).not.toBeNull();
    releaseLock();
    expect(checkLock()).toBeNull();
  });

  it('releaseLock is idempotent — safe to call twice (signal handler may re-fire)', () => {
    const { acquireLock, releaseLock, checkLock } = createLock({
      lockPath,
      ttlMs: 15 * 60 * 1000,
    });
    acquireLock('C-test-3');
    expect(() => releaseLock()).not.toThrow();
    expect(() => releaseLock()).not.toThrow();
    expect(checkLock()).toBeNull();
  });

  it('releaseLock is a no-op (does not throw) when no lock file exists', () => {
    // A signal arriving before acquireLock must not crash the handler.
    const { releaseLock } = createLock({ lockPath, ttlMs: 15 * 60 * 1000 });
    expect(() => releaseLock()).not.toThrow();
  });

  it('checkLock overrides a stale lock (age > ttl) and returns null', () => {
    // Self-heal: a cycle killed WITHOUT a signal (silent Render kill) leaves
    // a lock with no released:true. checkLock must treat it as stale once
    // age > ttl so the next cycle reclaims instead of blocking for 15min.
    const { acquireLock, checkLock } = createLock({ lockPath, ttlMs: 50 });
    acquireLock('C-test-4');
    // Backdate the lock by 1000ms (ttl is 50ms) to simulate a stale lock.
    writeFileSync(
      lockPath,
      JSON.stringify(
        { cycleId: 'C-test-4', acquiredAt: new Date(Date.now() - 1000).toISOString(), pid: 1 },
        null,
        2,
      ),
    );
    expect(checkLock()).toBeNull();
  });

  it('checkLock treats a corrupt/unparseable lock file as no lock (returns null)', () => {
    const { checkLock } = createLock({ lockPath, ttlMs: 15 * 60 * 1000 });
    writeFileSync(lockPath, 'not-json{]]]');
    expect(checkLock()).toBeNull();
  });

  it('a fresh acquire after a release works (next cycle reclaims cleanly)', () => {
    const { acquireLock, releaseLock, checkLock } = createLock({
      lockPath,
      ttlMs: 15 * 60 * 1000,
    });
    acquireLock('C-a');
    releaseLock();
    acquireLock('C-b');
    const lock = checkLock();
    expect(lock).not.toBeNull();
    expect(lock.cycleId).toBe('C-b');
  });

  it('checkLock ignores a lock with released:true even if freshly written', () => {
    // Defensive: a released lock must never read as live, regardless of age.
    const { releaseLock, checkLock } = createLock({ lockPath, ttlMs: 15 * 60 * 1000 });
    releaseLock(); // writes {released:true}
    // Now write a stale-but-released lock directly and confirm checkLock skips it.
    writeFileSync(
      lockPath,
      JSON.stringify(
        { cycleId: 'C-stale', acquiredAt: new Date().toISOString(), released: true, pid: 1 },
        null,
        2,
      ),
    );
    expect(checkLock()).toBeNull();
  });
});
