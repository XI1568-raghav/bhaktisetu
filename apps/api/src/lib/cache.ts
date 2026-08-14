import Redis from 'ioredis';

// Env-or-noop cache. When REDIS_URL absent, every call is a passthrough —
// production keeps working without Redis, just hits DB harder. Upstash REST
// URLs work via the standard redis:// (TLS) protocol they expose.
//
// Why a singleton lazy connect: ioredis connects on first command anyway,
// but reusing one client avoids EMFILE on serverless/Render free tier where
// fd budget is small.

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || '';

let client: Redis | null = null;
let connectionFailed = false;

function getClient(): Redis | null {
  if (!REDIS_URL || connectionFailed) return null;
  if (client) return client;

  try {
    client = new Redis(REDIS_URL, {
      // Don't queue commands while disconnected — fall through to DB instead
      enableOfflineQueue: false,
      // 1 retry, then give up. Cache must never block a request path.
      maxRetriesPerRequest: 1,
      // Short connect timeout so cold-start cache miss doesn't blow request budget
      connectTimeout: 2000,
      lazyConnect: false,
    });

    client.on('error', (err) => {
      // Log once, then suppress — a flaky Redis must not flood logs
      if (!connectionFailed) {
        console.warn('[cache] redis error, falling back to DB:', err.message);
        connectionFailed = true;
      }
    });
  } catch (err) {
    connectionFailed = true;
    console.warn('[cache] redis init failed, disabled for session');
    return null;
  }

  return client;
}

/**
 * SCAL-08 (2026-08-13): in-process fallback so `cached()` is not a no-op.
 *
 * REDIS_URL and UPSTASH_REDIS_URL are both unset in apps/api/.env and nothing
 * listens on 6379, so `getClient()` returned null and every cacheGet/cacheSet
 * silently did nothing. The three endpoints written to be cache-served — temple
 * list (300 s), temple detail (600 s), panchang (6 h) — went to Postgres in
 * ap-northeast-1 on every request, which is both the homepage latency users
 * feel and Supabase egress against a 5 GB/month allowance.
 *
 * What this is NOT: a distributed cache. Entries live in one container, so a
 * second instance keeps its own copy and `cacheDel` only invalidates locally.
 * That is acceptable for read-mostly catalog data with short TTLs on a
 * single-instance free-tier deployment, and it is strictly better than nothing.
 * Setting REDIS_URL still takes precedence — Redis is authoritative when present
 * and this store is not consulted at all.
 *
 * Values are stored JSON-serialised exactly as Redis stores them, so a hit has
 * the same shape either way (a Date comes back as an ISO string in both). A
 * memory cache handing back live objects would be a shape difference that only
 * shows up in production.
 */
export const MEMORY_CACHE_MAX_ENTRIES = 1000;

type MemoryEntry = { raw: string; expiresAt: number };
const memoryStore = new Map<string, MemoryEntry>();

function memoryGet(key: string): string | null {
  const hit = memoryStore.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  // Refresh recency so the eviction below drops the coldest key, not the oldest.
  memoryStore.delete(key);
  memoryStore.set(key, hit);
  return hit.raw;
}

function memorySet(key: string, raw: string, ttlSeconds: number): void {
  memoryStore.delete(key);
  memoryStore.set(key, { raw, expiresAt: Date.now() + ttlSeconds * 1000 });
  while (memoryStore.size > MEMORY_CACHE_MAX_ENTRIES) {
    const oldest = memoryStore.keys().next();
    if (oldest.done) break;
    memoryStore.delete(oldest.value);
  }
}

/** Test seam — asserts the store stays bounded. Not used by application code. */
export function __memoryCacheSize(): number {
  return memoryStore.size;
}

/**
 * Test seam — drops every in-process entry.
 *
 * Unit suites that assert on the query a service issues must start from a cold
 * cache, or the second test with the same filters is served from the first
 * test's entry and never touches the mock. Before SCAL-08 that could not happen
 * because caching was a no-op with no Redis, which is precisely the bug.
 */
export function __memoryCacheClear(): void {
  memoryStore.clear();
}

/**
 * Read JSON-serialized value from cache. Returns null on miss or error.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const c = getClient();
  if (!c) {
    const local = memoryGet(key);
    return local === null ? null : (JSON.parse(local) as T);
  }
  try {
    const raw = await c.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Write JSON-serialized value with TTL (seconds). No-op on cache miss.
 * Date instances survive the round-trip as ISO strings — callers that need
 * Date objects must reconstruct (most read-only API responses don't).
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const c = getClient();
  if (!c) {
    try {
      memorySet(key, JSON.stringify(value), ttlSeconds);
    } catch {
      // Unserialisable value — skip it rather than poison the store.
    }
    return;
  }
  try {
    await c.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Swallow — cache writes must never affect request outcome
  }
}

/**
 * Convenience wrapper: read-through cache. Calls `loader` on miss, caches result.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const fresh = await loader();
  // Don't cache nulls/undefined — keeps the "miss" semantics simple
  if (fresh !== null && fresh !== undefined) {
    await cacheSet(key, fresh, ttlSeconds);
  }
  return fresh;
}

/**
 * Invalidate one key. Useful after mutations on cached entities.
 */
export async function cacheDel(key: string): Promise<void> {
  const c = getClient();
  if (!c) {
    memoryStore.delete(key);
    return;
  }
  try {
    await c.del(key);
  } catch {
    // ignore
  }
}

/**
 * Pattern-based invalidation. Upstash supports SCAN; KEYS is safe on small
 * keyspaces but we use SCAN to be safe at scale.
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  const c = getClient();
  if (!c) {
    // Same glob semantics Redis MATCH gives: * spans any run of characters,
    // ? one character. Everything else is literal.
    const rx = new RegExp(
      `^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`,
    );
    for (const key of Array.from(memoryStore.keys())) {
      if (rx.test(key)) memoryStore.delete(key);
    }
    return;
  }
  try {
    const stream = c.scanStream({ match: pattern, count: 100 });
    for await (const keys of stream) {
      if (keys.length) await c.del(...keys);
    }
  } catch {
    // ignore
  }
}

export const CACHE_TTL = {
  PANCHANG_DAY: 6 * 60 * 60,      // 6h — panchang is fixed for a calendar day
  TEMPLE_LIST: 5 * 60,             // 5min — list page hot path
  TEMPLE_DETAIL: 10 * 60,          // 10min
  PUJA_LIST: 5 * 60,
  PUJA_DETAIL: 10 * 60,
  FESTIVALS: 60 * 60,              // 1h — upcoming festivals refresh hourly
} as const;
