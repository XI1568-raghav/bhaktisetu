// Slow query logger — emits structured warn entries when a DB query exceeds
// SLOW_QUERY_MS (default 100). Pure logger; the Prisma `$on('query')` wire-up
// lives in instrument-prisma.ts so this file stays trivially testable.

export interface SlowQueryEntry {
  sql: string;
  durationMs: number;
  route: string;
  timestamp: string;
  params?: string;
}

export interface SlowQueryLogger {
  warn: (obj: SlowQueryEntry, msg: string) => void;
}

const DEFAULT_THRESHOLD_MS = 100;

// Last N entries kept in-memory for /admin/metrics surface (separate PR).
const RING_SIZE = 500;
const ring: SlowQueryEntry[] = [];

export function getSlowQueryThreshold(): number {
  const raw = process.env.SLOW_QUERY_MS;
  if (!raw) return DEFAULT_THRESHOLD_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_THRESHOLD_MS;
}

export interface RecordQueryInput {
  sql: string;
  durationMs: number;
  route: string;
  params?: string;
  logger: SlowQueryLogger;
}

export function recordQuery(input: RecordQueryInput): void {
  const threshold = getSlowQueryThreshold();
  if (input.durationMs < threshold) return;
  const entry: SlowQueryEntry = {
    sql: input.sql,
    durationMs: input.durationMs,
    route: input.route,
    timestamp: new Date().toISOString(),
    ...(input.params ? { params: input.params } : {}),
  };
  ring.push(entry);
  if (ring.length > RING_SIZE) ring.shift();
  input.logger.warn(entry, 'slow_query');
}

export function resetSlowQueryLog(): void {
  ring.length = 0;
}

export function __testGetEntries(): readonly SlowQueryEntry[] {
  return ring;
}

export function snapshotSlowQueries(): readonly SlowQueryEntry[] {
  return [...ring];
}
