import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// NOTIF-01. runDailyOps owns 18 ticks — panchang push, aarti reminders, weekly
// digest, expired-offer rebroadcast, auto-refunds, weekly settlement — and a
// repo-wide grep proved NOTHING called it. Every one was dead code in production.
//
// These tests fail against the previous tree in the most direct way available:
// src/jobs/scheduler.ts did not exist, so the import throws.

vi.mock('./master-cron.js', () => ({ runDailyOps: vi.fn() }));

import { runDailyOps } from './master-cron.js';
import {
  DEFAULT_INTERVAL_MS,
  FIRST_TICK_DELAY_MS,
  getSchedulerStatus,
  isSchedulerEnabled,
  runTickOnce,
  startOpsScheduler,
  stopOpsScheduler,
  __resetSchedulerForTests,
} from './scheduler.js';

const mockRun = vi.mocked(runDailyOps);

describe('ops scheduler (NOTIF-01)', () => {
  beforeEach(() => {
    __resetSchedulerForTests();
    mockRun.mockReset();
    mockRun.mockResolvedValue({} as never);
    delete process.env.OPS_SCHEDULER_ENABLED;
    delete process.env.OPS_TICK_INTERVAL_MS;
  });

  afterEach(() => {
    __resetSchedulerForTests();
    vi.useRealTimers();
  });

  describe('enablement', () => {
    it('is off under NODE_ENV=test so a suite never fires real outreach', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(isSchedulerEnabled()).toBe(false);
    });

    it('an explicit flag overrides the environment default in both directions', () => {
      process.env.OPS_SCHEDULER_ENABLED = '1';
      expect(isSchedulerEnabled()).toBe(true);
      process.env.OPS_SCHEDULER_ENABLED = 'false';
      expect(isSchedulerEnabled()).toBe(false);
    });

    it('start is a no-op when disabled, and reports that it did not start', () => {
      process.env.OPS_SCHEDULER_ENABLED = '0';
      expect(startOpsScheduler()).toBe(false);
      expect(getSchedulerStatus().enabled).toBe(false);
    });
  });

  describe('ticking', () => {
    it('actually invokes runDailyOps — the whole point of the finding', async () => {
      await runTickOnce();
      expect(mockRun).toHaveBeenCalledTimes(1);
      expect(getSchedulerStatus().lastTick?.ok).toBe(true);
    });

    it('fires on the interval once started', async () => {
      vi.useFakeTimers();
      process.env.OPS_SCHEDULER_ENABLED = '1';
      expect(startOpsScheduler()).toBe(true);
      expect(mockRun).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(FIRST_TICK_DELAY_MS);
      expect(mockRun).toHaveBeenCalledTimes(1); // delayed first tick

      await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL_MS);
      expect(mockRun).toHaveBeenCalledTimes(2); // then every interval
    });

    it('a throwing tick is recorded, not propagated — a timer rejection would kill the API', async () => {
      mockRun.mockRejectedValueOnce(new Error('resend is down'));
      await expect(runTickOnce()).resolves.toBeDefined();
      const s = getSchedulerStatus();
      expect(s.lastTick?.ok).toBe(false);
      expect(s.lastTick?.error).toBe('resend is down');
      expect(s.failures).toBe(1);
    });

    it('refuses to overlap — two settlement passes must not run at once', async () => {
      let release!: () => void;
      mockRun.mockImplementationOnce(
        () => new Promise((res) => { release = () => res({} as never); }),
      );
      const first = runTickOnce();
      await Promise.resolve();
      await runTickOnce();               // second call while the first is in flight
      expect(mockRun).toHaveBeenCalledTimes(1);
      release();
      await first;
    });

    it('stop halts further ticks', async () => {
      vi.useFakeTimers();
      process.env.OPS_SCHEDULER_ENABLED = '1';
      startOpsScheduler();
      await vi.advanceTimersByTimeAsync(FIRST_TICK_DELAY_MS);
      stopOpsScheduler();
      await vi.advanceTimersByTimeAsync(DEFAULT_INTERVAL_MS * 3);
      expect(mockRun).toHaveBeenCalledTimes(1);
    });
  });

  describe('staleness — the part that makes a dead scheduler visible', () => {
    it('reports not-stale immediately after a tick', async () => {
      process.env.OPS_SCHEDULER_ENABLED = '1';
      startOpsScheduler();
      await runTickOnce();
      const s = getSchedulerStatus();
      expect(s.ageSeconds).toBeLessThan(5);
      expect(s.stale).toBe(false);
    });

    it('goes stale once more than two intervals pass with no tick', async () => {
      vi.useFakeTimers();
      process.env.OPS_SCHEDULER_ENABLED = '1';
      process.env.OPS_TICK_INTERVAL_MS = String(60_000);
      startOpsScheduler();
      await runTickOnce();
      expect(getSchedulerStatus().stale).toBe(false);
      vi.setSystemTime(Date.now() + 60_000 * 2 + 1_000);
      expect(getSchedulerStatus().stale).toBe(true);
    });

    it('a never-started scheduler is not reported as stale', () => {
      expect(getSchedulerStatus().enabled).toBe(false);
      expect(getSchedulerStatus().stale).toBe(false);
    });
  });

  describe('interval configuration', () => {
    it('floors the interval at a minute so a typo cannot self-DoS the database', () => {
      process.env.OPS_SCHEDULER_ENABLED = '1';
      process.env.OPS_TICK_INTERVAL_MS = '10';
      startOpsScheduler();
      expect(getSchedulerStatus().intervalMs).toBe(DEFAULT_INTERVAL_MS);
    });

    it('accepts a sane override', () => {
      process.env.OPS_SCHEDULER_ENABLED = '1';
      process.env.OPS_TICK_INTERVAL_MS = String(5 * 60_000);
      startOpsScheduler();
      expect(getSchedulerStatus().intervalMs).toBe(5 * 60_000);
    });
  });
});
