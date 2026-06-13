// N+1 detector — scoped per-request via AsyncLocalStorage. Counts identical
// normalized SQL templates; emits warn when any template exceeds threshold.
// Pure logic; Fastify hook wiring lives in instrument-prisma.ts.

import { AsyncLocalStorage } from 'node:async_hooks';

const DEFAULT_NPLUSONE_THRESHOLD = 5; // > 5 → warn

interface Scope {
  counts: Map<string, number>;
}

const storage = new AsyncLocalStorage<Scope>();

export function runWithRequestScope<T>(fn: () => Promise<T> | T): Promise<T> | T {
  return storage.run({ counts: new Map() }, fn);
}

// Normalize SQL by replacing integer/string literal params with `?`.
// Conservative — does not parse SQL, just regex-strips obvious literals so
// that `SELECT * FROM x WHERE id = 1` and `... = 2` collapse to one template.
export function normalizeSql(sql: string): string {
  return sql
    // single-quoted strings (handles escaped '' inside)
    .replace(/'(?:[^']|'')*'/g, '?')
    // numeric literals (int + decimal)
    .replace(/\b\d+(\.\d+)?\b/g, '?')
    .replace(/\s+/g, ' ')
    .trim();
}

export function recordQueryForNPlusOne(sql: string): void {
  const scope = storage.getStore();
  if (!scope) return;
  const tpl = normalizeSql(sql);
  scope.counts.set(tpl, (scope.counts.get(tpl) ?? 0) + 1);
}

export interface NPlusOneLogger {
  warn: (
    obj: { route: string; template: string; count: number; timestamp: string },
    msg: string,
  ) => void;
}

export function getNPlusOneThreshold(): number {
  const raw = process.env.N_PLUS_ONE_THRESHOLD;
  if (!raw) return DEFAULT_NPLUSONE_THRESHOLD;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_NPLUSONE_THRESHOLD;
}

export function reportNPlusOne(route: string, logger: NPlusOneLogger): void {
  const scope = storage.getStore();
  if (!scope) return;
  const threshold = getNPlusOneThreshold();
  for (const [template, count] of scope.counts) {
    if (count > threshold) {
      logger.warn(
        {
          route,
          template,
          count,
          timestamp: new Date().toISOString(),
        },
        'n_plus_one_detected',
      );
    }
  }
}
