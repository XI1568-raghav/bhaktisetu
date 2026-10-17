import { describe, it, expect, afterEach } from 'vitest';
import { inProcessJobsDisabled } from './inprocess-jobs.js';
import { isSchedulerEnabled, startOpsScheduler, stopOpsScheduler } from '../jobs/scheduler.js';
import { dispatchService } from '../services/dispatch.service.js';
import { settleBounded } from './background.js';

describe('inProcessJobsDisabled', () => {
  it('is off by default and on for DISABLE_INPROCESS_JOBS=true', () => {
    expect(inProcessJobsDisabled({})).toBe(false);
    expect(inProcessJobsDisabled({ DISABLE_INPROCESS_JOBS: 'true' })).toBe(true);
    expect(inProcessJobsDisabled({ DISABLE_INPROCESS_JOBS: '1' })).toBe(true);
  });
  it('defaults to disabled on Cloud Run (K_SERVICE) unless explicitly overridden', () => {
    expect(inProcessJobsDisabled({ K_SERVICE: 'darshya-api' })).toBe(true);
    expect(inProcessJobsDisabled({ K_SERVICE: 'darshya-api', DISABLE_INPROCESS_JOBS: 'false' })).toBe(false);
  });
});

describe('timers honour DISABLE_INPROCESS_JOBS', () => {
  const saved = { d: process.env.DISABLE_INPROCESS_JOBS, e: process.env.OPS_SCHEDULER_ENABLED };
  afterEach(() => {
    stopOpsScheduler();
    if (saved.d === undefined) delete process.env.DISABLE_INPROCESS_JOBS; else process.env.DISABLE_INPROCESS_JOBS = saved.d;
    if (saved.e === undefined) delete process.env.OPS_SCHEDULER_ENABLED; else process.env.OPS_SCHEDULER_ENABLED = saved.e;
  });

  it('scheduler never starts, even when OPS_SCHEDULER_ENABLED=true', () => {
    process.env.OPS_SCHEDULER_ENABLED = 'true';
    process.env.DISABLE_INPROCESS_JOBS = 'true';
    expect(isSchedulerEnabled()).toBe(false);
    expect(startOpsScheduler()).toBe(false);
  });

  it('scheduler still starts when jobs are not disabled', () => {
    process.env.OPS_SCHEDULER_ENABLED = 'true';
    delete process.env.DISABLE_INPROCESS_JOBS;
    expect(startOpsScheduler()).toBe(true);
  });

  it('offer timeouts are not armed when disabled', () => {
    process.env.DISABLE_INPROCESS_JOBS = 'true';
    // Would throw/hang the process if a real timer were created and never cleared.
    expect(() => dispatchService.armOfferTimeout('b-1', 60)).not.toThrow();
  });
});

describe('settleBounded', () => {
  it('awaits work, swallows rejections, and never exceeds its budget', async () => {
    process.env.BACKGROUND_AWAIT_MS = '50';
    let done = false;
    await settleBounded(new Promise((r) => setTimeout(() => { done = true; r(1); }, 10)));
    expect(done).toBe(true);
    await expect(settleBounded(Promise.reject(new Error('x')))).resolves.toBeUndefined();
    const t0 = Date.now();
    await settleBounded(new Promise((r) => setTimeout(r, 500)));
    expect(Date.now() - t0).toBeLessThan(300);
    delete process.env.BACKGROUND_AWAIT_MS;
  });
});
