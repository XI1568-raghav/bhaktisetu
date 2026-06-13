// Wires Prisma's `$on('query')` event into the slow-query logger + N+1
// detector. Idempotent — calling twice is a noop. Env gate
// `DB_QUERY_INSTRUMENTATION=off` disables both instrumentations entirely
// (escape hatch for incidents where event-emission noise is suspected).

import type { FastifyInstance } from 'fastify';
import { recordQuery } from './slow-query-log.js';
import {
  recordQueryForNPlusOne,
  reportNPlusOne,
  runWithRequestScope,
} from './n-plus-one-detector.js';

let wired = false;

interface PrismaWithEvents {
  $on: (event: 'query', cb: (e: { query: string; params?: string; duration: number }) => void) => void;
}

// Tracks the route the in-flight Prisma query was made under. Set by the
// onRequest hook; read inside the Prisma query event callback.
import { AsyncLocalStorage } from 'node:async_hooks';
const routeStorage = new AsyncLocalStorage<{ route: string }>();

export function instrumentPrisma(
  prisma: unknown,
  logger: { warn: (obj: unknown, msg?: string) => void },
): void {
  if (wired) return;
  if (process.env.DB_QUERY_INSTRUMENTATION === 'off') return;
  const p = prisma as PrismaWithEvents;
  if (typeof p.$on !== 'function') return;

  try {
    p.$on('query', (e) => {
      const route = routeStorage.getStore()?.route ?? 'unknown';
      // Slow-query: log if over threshold.
      recordQuery({
        sql: e.query,
        durationMs: e.duration,
        route,
        params: e.params,
        logger: logger as never,
      });
      // N+1: bump count for this request scope (noop if no active scope).
      recordQueryForNPlusOne(e.query);
    });
    wired = true;
  } catch (err) {
    // Prisma client may not have query events enabled (log option). Surface
    // once at info level; instrumentation just stays inactive.
    logger.warn?.({ err: String(err) }, 'prisma_query_event_unavailable');
  }
}

export function registerNPlusOneRequestScope(
  server: FastifyInstance,
  logger: { warn: (obj: unknown, msg?: string) => void },
): void {
  // Wrap each request lifecycle in an ALS scope so the N+1 detector can
  // attribute queries to a single inbound request. Using preHandler + onResponse
  // pair keeps the scope active for the entire handler chain.
  server.addHook('onRequest', async (request, _reply) => {
    const route = request.routeOptions?.url ?? request.url.split('?')[0] ?? 'unknown';
    // Stash route on the request so onResponse can re-use it.
    (request as unknown as { _route?: string })._route = route;
  });

  server.addHook('preHandler', async (request, _reply) => {
    const route = (request as unknown as { _route?: string })._route ?? 'unknown';
    // Bind both stores so the in-flight Prisma callback can read `route` AND
    // the N+1 detector can attribute query templates to this request.
    routeStorage.enterWith({ route });
    return new Promise<void>((resolve) => {
      runWithRequestScope(async () => {
        resolve();
      });
    });
  });

  server.addHook('onResponse', async (request, _reply) => {
    const route = (request as unknown as { _route?: string })._route ?? 'unknown';
    try {
      reportNPlusOne(route, logger as never);
    } catch {
      // never block response on detector failure
    }
  });
}
