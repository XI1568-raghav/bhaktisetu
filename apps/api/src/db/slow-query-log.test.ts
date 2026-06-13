// RED: slow-query-log threshold + emit shape.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  recordQuery,
  resetSlowQueryLog,
  getSlowQueryThreshold,
  __testGetEntries,
} from './slow-query-log.js';

describe('slow-query-log', () => {
  beforeEach(() => {
    resetSlowQueryLog();
    delete process.env.SLOW_QUERY_MS;
  });

  it('default threshold is 100ms', () => {
    expect(getSlowQueryThreshold()).toBe(100);
  });

  it('env SLOW_QUERY_MS overrides threshold', () => {
    process.env.SLOW_QUERY_MS = '50';
    expect(getSlowQueryThreshold()).toBe(50);
  });

  it('does NOT log when duration below threshold', () => {
    const warn = vi.fn();
    recordQuery({
      sql: 'SELECT 1',
      durationMs: 10,
      route: '/api/v1/foo',
      logger: { warn },
    });
    expect(warn).not.toHaveBeenCalled();
    expect(__testGetEntries()).toHaveLength(0);
  });

  it('logs warn entry with shape { sql, durationMs, route, timestamp } when over threshold', () => {
    const warn = vi.fn();
    recordQuery({
      sql: 'SELECT pg_sleep(1)',
      durationMs: 250,
      route: '/api/v1/bar',
      logger: { warn },
    });
    expect(warn).toHaveBeenCalledTimes(1);
    const [obj, msg] = warn.mock.calls[0]!;
    expect(msg).toBe('slow_query');
    expect(obj).toMatchObject({
      sql: 'SELECT pg_sleep(1)',
      durationMs: 250,
      route: '/api/v1/bar',
    });
    expect(typeof obj.timestamp).toBe('string');
    expect(new Date(obj.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('respects custom threshold from env on recordQuery', () => {
    process.env.SLOW_QUERY_MS = '500';
    const warn = vi.fn();
    recordQuery({
      sql: 'SELECT 1',
      durationMs: 250,
      route: '/x',
      logger: { warn },
    });
    expect(warn).not.toHaveBeenCalled();
  });
});
