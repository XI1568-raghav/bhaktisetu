import { describe, it, expect, beforeEach, afterAll } from 'vitest';

// Force noop mode for unit tests — REDIS_URL must not be set when this module loads.
delete process.env.REDIS_URL;
process.env.JOB_QUEUE_DISABLED = 'true';

const { enqueue, getQueueHealth, closeAllQueues, __INTERNAL } = await import('./job-queue.service.js');

describe('job-queue.service', () => {
  beforeEach(() => {
    // Reset warning suppression between asserts where useful — we re-import isn't free,
    // so we just trust the suite-wide noop mode.
  });

  afterAll(async () => {
    await closeAllQueues();
  });

  describe('enqueue (noop mode)', () => {
    it('returns synthetic id with noop:true when REDIS_URL absent', async () => {
      const result = await enqueue('email', 'welcome', { userId: 'u1' });
      expect(result.noop).toBe(true);
      expect(result.queue).toBe('email');
      expect(result.jobId).toMatch(/^noop-/);
    });

    it('does not throw on any of the 4 canonical queues', async () => {
      const queues = ['email', 'whatsapp', 'payout', 'notification'] as const;
      for (const q of queues) {
        const r = await enqueue(q, 'test', { hello: 'world' });
        expect(r.noop).toBe(true);
        expect(r.queue).toBe(q);
      }
    });
  });

  describe('getQueueHealth (noop mode)', () => {
    it('reports all 4 queues disabled when noop', async () => {
      const health = await getQueueHealth();
      expect(health).toHaveLength(4);
      for (const h of health) {
        expect(h.enabled).toBe(false);
        expect(h.counts).toBeUndefined();
      }
    });
  });

  describe('parseRedisUrl', () => {
    it('parses rediss URL with password', () => {
      const out = __INTERNAL.parseRedisUrl('rediss://default:abc123@cool-host.upstash.io:6379');
      expect(out.host).toBe('cool-host.upstash.io');
      expect(out.port).toBe(6379);
      expect(out.password).toBe('abc123');
      expect(out.tls).toBeDefined();
    });

    it('parses redis URL without tls', () => {
      const out = __INTERNAL.parseRedisUrl('redis://localhost:6380');
      expect(out.host).toBe('localhost');
      expect(out.port).toBe(6380);
      expect(out.tls).toBeUndefined();
    });

    it('falls back to localhost on garbage input', () => {
      const out = __INTERNAL.parseRedisUrl('not-a-url');
      expect(out.host).toBe('127.0.0.1');
      expect(out.port).toBe(6379);
    });

    it('decodes urlencoded password', () => {
      const out = __INTERNAL.parseRedisUrl('rediss://default:p%40ss%21@host:6379');
      expect(out.password).toBe('p@ss!');
    });
  });

  describe('QUEUE_DISABLED', () => {
    it('is true when JOB_QUEUE_DISABLED=true', () => {
      expect(__INTERNAL.QUEUE_DISABLED).toBe(true);
    });
  });
});
