import type { preHandlerHookHandler } from 'fastify';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `value` can be bound to a Postgres uuid column without a P2023. */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * Callback-style hook (see lib/stop-when-answered.ts) that answers 404 when any
 * named path param is present but not a uuid. Without it a mistyped id reaches
 * Prisma, which raises P2023 and the route answers 500 instead of "not found".
 */
export function uuidParamGuard(...names: string[]): preHandlerHookHandler {
  return (request, reply, done) => {
    const params = (request.params ?? {}) as Record<string, unknown>;
    for (const name of names) {
      if (params[name] !== undefined && !isUuid(params[name])) {
        reply.code(404).send({ error: 'NotFound', message: 'Not found.' });
        return;
      }
    }
    done();
  };
}
