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
 * Read JSON-serialized value from cache. Returns null on miss, error, or no-op mode.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const c = getClient();
  if (!c) return null;
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
  if (!c) return;
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
  if (!c) return;
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
  if (!c) return;
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
