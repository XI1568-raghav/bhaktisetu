import { describe, it, expect, vi, afterEach } from 'vitest';
import { applyPoolParams, readKeepAliveConfig, startDbKeepAlive, KEEPALIVE_MIN_MS } from './db-tuning.js';

const CRED = ['postgres.abc', 'p%40ss%3Aw'].join(':');
const BASE = `postgresql://${CRED}@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`;

describe('applyPoolParams', () => {
  it('returns null (URL untouched) when no knob is set', () => {
    expect(applyPoolParams(BASE, {})).toBeNull();
    expect(applyPoolParams(undefined, { DB_CONNECTION_LIMIT: '5' })).toBeNull();
  });

  it('adds only the params that are set and valid, keeping credentials intact', () => {
    const out = applyPoolParams(BASE, { DB_CONNECTION_LIMIT: '8', DB_POOL_TIMEOUT: '20', DB_CONNECT_TIMEOUT: '15', DB_PGBOUNCER: 'true' })!;
    const u = new URL(out);
    expect(u.searchParams.get('connection_limit')).toBe('8');
    expect(u.searchParams.get('pool_timeout')).toBe('20');
    expect(u.searchParams.get('connect_timeout')).toBe('15');
    expect(u.searchParams.get('pgbouncer')).toBe('true');
    expect(out.startsWith(`${BASE}?`)).toBe(true);
  });

  it('never overrides a param already in the URL', () => {
    expect(applyPoolParams(`${BASE}?connection_limit=3`, { DB_CONNECTION_LIMIT: '9' })).toBeNull();
    const out = applyPoolParams(`${BASE}?connection_limit=3`, { DB_CONNECTION_LIMIT: '9', DB_POOL_TIMEOUT: '30' })!;
    expect(new URL(out).searchParams.get('connection_limit')).toBe('3');
    expect(new URL(out).searchParams.get('pool_timeout')).toBe('30');
  });

  it('ignores junk values and DB_PGBOUNCER other than true', () => {
    expect(applyPoolParams(BASE, { DB_CONNECTION_LIMIT: 'abc', DB_POOL_TIMEOUT: '-1', DB_CONNECT_TIMEOUT: '0', DB_PGBOUNCER: 'yes' })).toBeNull();
  });

  it('returns null for an unparseable URL instead of throwing', () => {
    expect(applyPoolParams('not a url', { DB_CONNECTION_LIMIT: '5' })).toBeNull();
  });
});

describe('readKeepAliveConfig', () => {
  it('is off unless DB_KEEPALIVE_MS is a positive number', () => {
    expect(readKeepAliveConfig({})).toBeNull();
    expect(readKeepAliveConfig({ DB_KEEPALIVE_MS: '0' })).toBeNull();
    expect(readKeepAliveConfig({ DB_KEEPALIVE_MS: 'x' })).toBeNull();
  });
  it('floors the interval and clamps the connection count', () => {
    expect(readKeepAliveConfig({ DB_KEEPALIVE_MS: '500' })).toEqual({ intervalMs: KEEPALIVE_MIN_MS, connections: 1 });
    expect(readKeepAliveConfig({ DB_KEEPALIVE_MS: '60000', DB_KEEPALIVE_CONNECTIONS: '3' })).toEqual({ intervalMs: 60000, connections: 3 });
    expect(readKeepAliveConfig({ DB_KEEPALIVE_MS: '60000', DB_KEEPALIVE_CONNECTIONS: '99' })!.connections).toBe(10);
  });
});

describe('startDbKeepAlive', () => {
  afterEach(() => vi.useRealTimers());
  const log = () => ({ warn: vi.fn(), info: vi.fn() });

  it('does nothing and returns null when not configured', () => {
    const db = { $queryRaw: vi.fn() };
    expect(startDbKeepAlive(db, log(), {})).toBeNull();
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it('warms immediately, then pings on the interval with N concurrent queries, and stops', async () => {
    vi.useFakeTimers();
    const db = { $queryRaw: vi.fn().mockResolvedValue([1]) };
    const stop = startDbKeepAlive(db, log(), { DB_KEEPALIVE_MS: '20000', DB_KEEPALIVE_CONNECTIONS: '2' })!;
    await vi.advanceTimersByTimeAsync(0);
    expect(db.$queryRaw).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(db.$queryRaw).toHaveBeenCalledTimes(4);
    stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(db.$queryRaw).toHaveBeenCalledTimes(4);
  });

  it('swallows failures, warns once per streak, and reports recovery', async () => {
    vi.useFakeTimers();
    const l = log();
    const db = { $queryRaw: vi.fn().mockRejectedValue(new Error('down')) };
    const stop = startDbKeepAlive(db, l, { DB_KEEPALIVE_MS: '10000' })!;
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(l.warn).toHaveBeenCalledTimes(1);
    db.$queryRaw.mockResolvedValue([1]);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(l.info).toHaveBeenCalledTimes(1);
    stop();
  });

  it('does not overlap a ping that is still in flight', async () => {
    vi.useFakeTimers();
    let release: () => void = () => {};
    const db = { $queryRaw: vi.fn(() => new Promise<void>((r) => { release = r; })) };
    const stop = startDbKeepAlive(db, log(), { DB_KEEPALIVE_MS: '10000' })!;
    await vi.advanceTimersByTimeAsync(35_000);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    release();
    stop();
  });
});
