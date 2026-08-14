import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { redactError } from './error-redaction.js';

/**
 * AW-08 (prod sweep 2026-08-12, P1) — remaining half.
 *
 * The finding prescribed two fixes. The first (middlewares/auth.ts fails closed
 * on an unseeded demo account) shipped. The second did not:
 *
 *   "Independently, add a Fastify error handler that strips Prisma internals
 *    from 5xx bodies in all environments."
 *
 * Observed in the sweep, from a plain unauthenticated-ish call:
 *   {"statusCode":500,"code":"P2023","message":"Invalid `prisma.astrologerProfile
 *    .findUnique()` invocation in E:\\NewClaude\\bhaktisetu\\apps\\api\\src\\routes\\
 *    astrologer-portal.ts:53:52 ... Error creating UUID ..."}
 *   {"statusCode":500,"code":"P2010","message":"Raw query failed. Code: `22P02` ...
 *    invalid input syntax for type uuid: \"demo-astro\""}
 *
 * That body shape — `statusCode` + `code` + `error` + `message` — is Fastify's
 * DEFAULT error serializer, NOT the custom handler in server.ts. See the
 * encapsulation test at the bottom of this file: a handler registered after
 * `server.register(...)` never runs for the routes inside those plugins, which
 * is every route in this API. So the redaction that server.ts believed it was
 * doing in production was doing nothing, anywhere.
 */

const PRISMA_INVOCATION =
  'Invalid `prisma.astrologerProfile.findUnique()` invocation in ' +
  'E:\\NewClaude\\bhaktisetu\\apps\\api\\src\\routes\\astrologer-portal.ts:53:52\n' +
  'Error creating UUID, invalid character: expected an optional prefix of `urn:uuid:` ' +
  'followed by [0-9a-fA-F-], found `m` at 3';

const RAW_QUERY_FAILURE =
  'Raw query failed. Code: `22P02`. Message: `ERROR: invalid input syntax for type uuid: "demo-astro"`';

describe('AW-08 — Prisma internals never reach a 5xx response body', () => {
  for (const isProd of [true, false]) {
    const env = isProd ? 'production' : 'development';

    it(`redacts a PrismaClientKnownRequestError in ${env}`, () => {
      const body = redactError(
        {
          name: 'PrismaClientKnownRequestError',
          code: 'P2023',
          message: PRISMA_INVOCATION,
        },
        { isProd },
      );

      expect(body.statusCode).toBe(500);
      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain('prisma.');
      expect(serialized).not.toContain('astrologer-portal.ts');
      expect(serialized).not.toContain('E:\\');
      expect(serialized).not.toContain('P2023');
      // The ORM's own class name is itself an internal detail.
      expect(serialized).not.toContain('Prisma');
    });

    it(`redacts a raw-query failure carrying SQL in ${env}`, () => {
      const body = redactError(
        { name: 'PrismaClientUnknownRequestError', code: 'P2010', message: RAW_QUERY_FAILURE },
        { isProd },
      );

      const serialized = JSON.stringify(body);
      expect(serialized).not.toContain('22P02');
      expect(serialized).not.toContain('invalid input syntax');
      expect(serialized).not.toContain('demo-astro');
    });
  }

  it('redacts an anonymous error whose message merely quotes a prisma invocation', () => {
    // Some paths wrap the driver error and lose the class name / code. The
    // message text alone is enough to leak the file path and the query.
    const body = redactError({ message: PRISMA_INVOCATION }, { isProd: false });
    expect(JSON.stringify(body)).not.toContain('astrologer-portal.ts');
  });

  it('redacts an absolute Windows source path from any 5xx message', () => {
    const body = redactError(
      { message: 'boom at E:\\NewClaude\\bhaktisetu\\apps\\api\\src\\routes\\x.ts:9:1' },
      { isProd: false },
    );
    expect(JSON.stringify(body)).not.toContain('E:\\NewClaude');
  });

  it('redacts an absolute POSIX source path from any 5xx message', () => {
    const body = redactError(
      { message: 'boom at /opt/render/project/src/apps/api/src/routes/x.ts:9:1' },
      { isProd: false },
    );
    expect(JSON.stringify(body)).not.toContain('/opt/render/project');
  });
});

describe('AW-08 — redaction does not swallow the messages users need', () => {
  it('keeps a 4xx validation message verbatim in production', () => {
    const body = redactError(
      { statusCode: 400, name: 'ValidationError', message: 'pageSize must be <= 100', code: 'FST_ERR_VALIDATION' },
      { isProd: true },
    );
    expect(body.statusCode).toBe(400);
    expect(body.message).toBe('pageSize must be <= 100');
  });

  it('keeps a 429 rate-limit message verbatim in production', () => {
    const body = redactError(
      { statusCode: 429, name: 'TooManyRequests', message: 'Rate limit exceeded, retry in 1 minute' },
      { isProd: true },
    );
    expect(body.message).toBe('Rate limit exceeded, retry in 1 minute');
  });

  it('still echoes a NON-Prisma 5xx in development so debugging survives', () => {
    const body = redactError({ message: 'upstream ElevenLabs timeout' }, { isProd: false });
    expect(body.message).toBe('upstream ElevenLabs timeout');
  });

  it('never echoes a non-Prisma 5xx in production', () => {
    const body = redactError({ message: 'upstream ElevenLabs timeout' }, { isProd: true });
    expect(body.message).toBe('Internal server error');
  });

  it('refuses to echo a 4xx that is really a Prisma error wearing a 4xx status', () => {
    const body = redactError(
      { statusCode: 400, code: 'P2023', message: PRISMA_INVOCATION },
      { isProd: false },
    );
    expect(body.statusCode).toBe(400);
    expect(JSON.stringify(body)).not.toContain('astrologer-portal.ts');
  });
});

/**
 * The encapsulation bug this finding actually turned on.
 *
 * Fastify resolves a route's error handler from the encapsulation context the
 * route was registered in. `setErrorHandler` called on the ROOT instance AFTER
 * `server.register(routes, { prefix })` therefore never reaches those routes —
 * and every route in this API is registered that way. src/server.ts had its
 * handler at :449, after ~90 registers, so the custom redaction was dead code
 * and Fastify's default serializer answered instead, echoing `code` and the
 * full driver message in EVERY environment including production.
 */
describe('AW-08 — the error handler must be installed before any route plugin', () => {
  async function boom(s: import('fastify').FastifyInstance) {
    s.get('/boom', async () => {
      const e = new Error(PRISMA_INVOCATION) as Error & { code?: string };
      e.code = 'P2023';
      throw e;
    });
  }

  it('does NOT run when registered after the route plugin (the shipped bug)', async () => {
    const app = Fastify({ logger: false });
    await app.register(boom, { prefix: '/api/v1/x' });
    app.setErrorHandler((_e, _r, reply) => {
      void reply.code(500).send({ error: 'HANDLER_RAN', message: 'redacted' });
    });
    const res = await app.inject({ method: 'GET', url: '/api/v1/x/boom' });
    await app.close();

    expect(res.json().error).not.toBe('HANDLER_RAN');
    // And this is exactly the leak the sweep captured.
    expect(res.body).toContain('P2023');
    expect(res.body).toContain('prisma.astrologerProfile.findUnique');
  });

  it('runs, and redacts, when registered before the route plugin', async () => {
    const app = Fastify({ logger: false });
    app.setErrorHandler((err, _r, reply) => {
      const body = redactError(err as Record<string, unknown>, { isProd: false });
      void reply.code(body.statusCode).send(body);
    });
    await app.register(boom, { prefix: '/api/v1/x' });
    const res = await app.inject({ method: 'GET', url: '/api/v1/x/boom' });
    await app.close();

    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('P2023');
    expect(res.body).not.toContain('prisma.');
    expect(res.body).not.toContain('astrologer-portal.ts');
  });
});
