import type { FastifyInstance } from 'fastify';

/**
 * Postgres text columns cannot hold a NUL byte, so `GET /temples/%00` or a JSON
 * body containing "\u0000" reached the driver and came back as a 500. No real
 * client sends one; answer 400 before any handler runs.
 *
 * Callback-style hooks on purpose (see lib/stop-when-answered.ts).
 */
const BODY_MESSAGE = 'Request contains an invalid character.';

function hasNul(value: unknown, depth = 0): boolean {
  if (depth > 8) return false;
  if (typeof value === 'string') return value.includes('\u0000');
  if (Array.isArray(value)) return value.some((v) => hasNul(v, depth + 1));
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(
      ([k, v]) => k.includes('\u0000') || hasNul(v, depth + 1),
    );
  }
  return false;
}

export function registerNulByteGuard(server: FastifyInstance): void {
  server.addHook('onRequest', (request, reply, done) => {
    if (/%00/i.test(request.raw.url ?? '')) {
      reply.code(400).send({ error: 'BadRequest', message: BODY_MESSAGE });
      return;
    }
    done();
  });
  server.addHook('preValidation', (request, reply, done) => {
    if (hasNul(request.body)) {
      reply.code(400).send({ error: 'BadRequest', message: BODY_MESSAGE });
      return;
    }
    done();
  });
}
