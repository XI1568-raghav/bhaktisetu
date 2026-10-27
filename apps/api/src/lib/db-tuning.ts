/**
 * Database latency mitigations that need no schema or code-path change.
 *
 * Prod shape: API on Render (Singapore), Postgres behind the Supabase pooler
 * in Tokyo. Every cold connection pays TCP + TLS + pooler auth across that
 * link, and every query is at least one round trip. Two safe levers live in
 * code, and both are OFF unless an env var asks for them, so behaviour with no
 * env set is exactly what it was:
 *
 *   1. `applyPoolParams`: fills in connection-string parameters the operator
 *      has not already put in DATABASE_URL (the URL always wins).
 *   2. `startDbKeepAlive`: a periodic cheap query so the pool never goes cold.
 *
 * Env knobs (docs/env-vars.md):
 *   DB_CONNECTION_LIMIT   -> `connection_limit`
 *   DB_POOL_TIMEOUT       -> `pool_timeout` (seconds)
 *   DB_CONNECT_TIMEOUT    -> `connect_timeout` (seconds)
 *   DB_PGBOUNCER=true     -> `pgbouncer=true` (only for the transaction pooler, port 6543)
 *   DB_KEEPALIVE_MS       -> ping interval; unset/0 = off; floor 10 000
 *   DB_KEEPALIVE_CONNECTIONS -> how many pool connections each ping touches (default 1, max 10)
 */

type Env = Record<string, string | undefined>;

const POSITIVE_INT = /^[1-9]\d{0,5}$/;

/** URL with any missing tuning params filled from env, or null when nothing changes. */
export function applyPoolParams(url: string | undefined, env: Env = process.env): string | null {
  if (!url) return null;
  const wanted: Array<[string, string]> = [];
  const add = (param: string, raw: string | undefined) => {
    const v = raw?.trim();
    if (v && POSITIVE_INT.test(v)) wanted.push([param, v]);
  };
  add('connection_limit', env.DB_CONNECTION_LIMIT);
  add('pool_timeout', env.DB_POOL_TIMEOUT);
  add('connect_timeout', env.DB_CONNECT_TIMEOUT);
  if (env.DB_PGBOUNCER?.trim().toLowerCase() === 'true') wanted.push(['pgbouncer', 'true']);
  if (wanted.length === 0) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  let changed = false;
  for (const [k, v] of wanted) {
    if (!parsed.searchParams.has(k)) {
      parsed.searchParams.set(k, v);
      changed = true;
    }
  }
  return changed ? parsed.toString() : null;
}

export const KEEPALIVE_MIN_MS = 10_000;
const KEEPALIVE_MAX_CONNECTIONS = 10;

export interface KeepAliveConfig {
  intervalMs: number;
  connections: number;
}

/** null when keep-alive is not requested. */
export function readKeepAliveConfig(env: Env = process.env): KeepAliveConfig | null {
  const ms = Number(env.DB_KEEPALIVE_MS);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const n = Math.floor(Number(env.DB_KEEPALIVE_CONNECTIONS));
  const connections = Number.isFinite(n) && n >= 1 ? Math.min(n, KEEPALIVE_MAX_CONNECTIONS) : 1;
  return { intervalMs: Math.max(KEEPALIVE_MIN_MS, Math.floor(ms)), connections };
}

interface Pingable {
  $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
}
interface Logger {
  warn(obj: unknown, msg?: string): void;
  info(obj: unknown, msg?: string): void;
}

/**
 * Warm the pool now and then every `intervalMs`. Concurrent pings open (and so
 * keep) up to `connections` pooled connections. Never throws, never keeps the
 * process alive, and never overlaps itself.
 */
export function startDbKeepAlive(db: Pingable, log: Logger, env: Env = process.env): (() => void) | null {
  const cfg = readKeepAliveConfig(env);
  if (!cfg) return null;

  let running = false;
  let failing = false;
  const ping = async () => {
    if (running) return;
    running = true;
    try {
      await Promise.all(Array.from({ length: cfg.connections }, () => db.$queryRaw`SELECT 1`));
      if (failing) log.info({ event: 'db_keepalive_recovered' }, 'db keep-alive recovered');
      failing = false;
    } catch (err: any) {
      // Log the first failure of a streak only; the health probe owns alarming.
      if (!failing) log.warn({ event: 'db_keepalive_failed', err: err?.message }, 'db keep-alive ping failed');
      failing = true;
    } finally {
      running = false;
    }
  };

  void ping();
  const timer = setInterval(() => void ping(), cfg.intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
