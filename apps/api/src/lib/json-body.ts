import type { FastifyInstance } from 'fastify';

/**
 * Fastify answers `Content-Type: application/json` with an empty body as
 * 400 "Body cannot be empty". Clients (axios, fetch wrappers) routinely send
 * that for body-less POSTs (cancel, enrol, checkout), so an empty body becomes
 * `{}`. A non-empty malformed body still 400s through the stock parser.
 */
export function registerTolerantJsonParser(server: FastifyInstance): void {
  const stock = server.getDefaultJsonParser(
    server.initialConfig.onProtoPoisoning ?? 'error',
    server.initialConfig.onConstructorPoisoning ?? 'error',
  );
  server.removeContentTypeParser('application/json');
  server.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    if (typeof body === 'string' && body.trim() === '') return done(null, {});
    stock(req, body as string, done);
  });
}
