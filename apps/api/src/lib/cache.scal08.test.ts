import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * SCAL-08 — with no Redis configured, `cached()` must still cache.
 *
 * `getClient()` returns null whenever REDIS_URL and UPSTASH_REDIS_URL are both
 * empty, which made cacheGet/cacheSet no-ops — so the three endpoints written to
 * be served from cache (temple list 300 s, temple detail 600 s, panchang 6 h)
 * hit Postgres on every single request. Neither variable is set in apps/api/.env
 * and nothing listens on 127.0.0.1:6379, so that is the deployed reality: the
 * code reads as if caching is on and it never was.
 *
 * An in-process cache is not a distributed cache — but on a single Render
 * instance it removes the same query load, costs nothing, and needs no service.
 */

vi.mock('ioredis', () => ({ default: class {} }));

beforeEach(() => {
  vi.resetModules();
  delete process.env.REDIS_URL;
  delete process.env.UPSTASH_REDIS_URL;
});

afterEach(() => {
  vi.useRealTimers();
});

async function loadCache() {
  return import('./cache.js');
}

describe('SCAL-08 — in-process cache fallback', () => {
  it('calls the loader once for repeat reads inside the TTL', async () => {
    const { cached } = await loadCache();
    const loader = vi.fn().mockResolvedValue({ temples: [{ id: 't1' }] });

    const first = await cached('temples:list', 300, loader);
    const second = await cached('temples:list', 300, loader);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('reloads once the TTL has expired rather than serving stale forever', async () => {
    vi.useFakeTimers();
    const { cached } = await loadCache();
    const loader = vi.fn().mockResolvedValueOnce({ n: 1 }).mockResolvedValueOnce({ n: 2 });

    await cached('panchang:2026-08-13', 300, loader);
    vi.advanceTimersByTime(301_000);
    const after = await cached('panchang:2026-08-13', 300, loader);

    expect(loader).toHaveBeenCalledTimes(2);
    expect(after).toEqual({ n: 2 });
  });

  it('serves a hit in the same shape Redis would have', async () => {
    // Redis stores JSON, so a cached Date comes back as an ISO string (the
    // module already documents this). The memory fallback must match that, or
    // code that works against the fallback breaks the day REDIS_URL is set.
    // The MISS still returns the loader's own object in both modes.
    const { cached } = await loadCache();
    const loader = vi.fn().mockResolvedValue({ at: new Date('2026-08-13T00:00:00.000Z') });

    const miss = await cached('k:date', 60, loader);
    const hit = await cached('k:date', 60, loader);

    expect((miss as { at: unknown }).at).toBeInstanceOf(Date);
    expect(typeof (hit as { at: unknown }).at).toBe('string');
    expect((hit as { at: string }).at).toBe('2026-08-13T00:00:00.000Z');
  });

  it('does not cache a null result — a miss stays a miss', async () => {
    const { cached } = await loadCache();
    const loader = vi.fn().mockResolvedValue(null);

    await cached('k:null', 60, loader);
    await cached('k:null', 60, loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('honours cacheDel so a mutation can invalidate its entity', async () => {
    const { cached, cacheDel } = await loadCache();
    const loader = vi.fn().mockResolvedValueOnce({ n: 1 }).mockResolvedValueOnce({ n: 2 });

    await cached('temple:kashi', 600, loader);
    await cacheDel('temple:kashi');
    const after = await cached('temple:kashi', 600, loader);

    expect(after).toEqual({ n: 2 });
  });

  it('honours cacheDelPattern for list invalidation', async () => {
    const { cached, cacheDelPattern } = await loadCache();
    const listLoader = vi.fn().mockResolvedValueOnce({ n: 1 }).mockResolvedValueOnce({ n: 2 });
    const otherLoader = vi.fn().mockResolvedValue({ keep: true });

    await cached('temples:list:page1', 300, listLoader);
    await cached('pujas:list:page1', 300, otherLoader);
    await cacheDelPattern('temples:*');

    expect(await cached('temples:list:page1', 300, listLoader)).toEqual({ n: 2 });
    expect(otherLoader).toHaveBeenCalledTimes(1); // untouched by the pattern
  });

  it('bounds itself so a hot keyspace cannot grow without limit', async () => {
    const { cached, __memoryCacheSize, MEMORY_CACHE_MAX_ENTRIES } = await loadCache();

    for (let i = 0; i < MEMORY_CACHE_MAX_ENTRIES + 250; i++) {
      await cached(`k:${i}`, 300, async () => ({ i }));
    }

    expect(__memoryCacheSize()).toBeLessThanOrEqual(MEMORY_CACHE_MAX_ENTRIES);
  });
});
