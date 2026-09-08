/**
 * AUTH-07 (F454, 2026-09-08) — the auth reason has to survive CORS, or it never
 * happened.
 *
 * `X-Auth-Reason` is stamped by apps/api/src/middlewares/auth.ts and read by
 * apps/web/lib/api-config.ts. Between the two sits the browser, which drops any
 * response header not named in `Access-Control-Expose-Headers` on a
 * cross-origin request — and darshya.online and api.darshya.online ARE
 * different origins.
 *
 * @fastify/cors is registered at src/server.ts:214 with `origin`, `credentials`,
 * `methods` and `allowedHeaders`, and NO `exposedHeaders`. Probed against
 * production 2026-09-08: neither the 401 nor the OPTIONS preflight carried an
 * `access-control-expose-headers` at all. So without the hook these tests pin,
 * the header would be stamped correctly, asserted green by every server-side
 * test, and still be invisible to the code with the bug — the discriminator
 * would be dead on arrival for the second time.
 *
 * This is also why the exposure lives in the error-localization plugin rather
 * than the auth middleware: this onSend hook is the one place every error
 * response in the API already passes through, including the ones routes build
 * by hand.
 */

import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';

import { errorLocalizationPlugin } from './error-localization.js';
import { AUTH_REASON_HEADER, AUTH_REASON_BODY_FIELD } from '../lib/auth-reason.js';

vi.mock('../lib/prisma.js', () => ({ prisma: { user: { findUnique: vi.fn() } } }));

const EXPOSE = 'access-control-expose-headers';

async function buildServer() {
  const server = Fastify();
  await errorLocalizationPlugin(server, { isProd: false, loadPreferredLanguage: async () => null });
  return server;
}

describe('AUTH-07 — Access-Control-Expose-Headers', () => {
  it('exposes X-Auth-Reason when the middleware stamped it', async () => {
    const server = await buildServer();
    server.get('/denied', async (_req, reply) => {
      reply.header(AUTH_REASON_HEADER, 'verify_unavailable');
      return reply
        .code(401)
        .send({ error: 'Unauthorized', message: 'Could not validate session.', authReason: 'verify_unavailable' });
    });

    const res = await server.inject({ method: 'GET', url: '/denied' });

    expect(res.statusCode).toBe(401);
    expect(res.headers[AUTH_REASON_HEADER.toLowerCase()]).toBe('verify_unavailable');
    expect(String(res.headers[EXPOSE]).toLowerCase()).toContain('x-auth-reason');
    await server.close();
  });

  it('mirrors a body-only authReason into the header, so the two carriers agree', async () => {
    const server = await buildServer();
    server.get('/body-only', async (_req, reply) =>
      // A route that hand-builds the body and never thinks about headers.
      reply.code(401).send({ error: 'Unauthorized', message: 'nope', authReason: 'no_credentials' }),
    );

    const res = await server.inject({ method: 'GET', url: '/body-only' });

    expect(res.headers[AUTH_REASON_HEADER.toLowerCase()]).toBe('no_credentials');
    expect(String(res.headers[EXPOSE]).toLowerCase()).toContain('x-auth-reason');
    await server.close();
  });

  it('appends rather than clobbers an existing expose list', async () => {
    const server = await buildServer();
    server.get('/existing', async (_req, reply) => {
      reply.header('Access-Control-Expose-Headers', 'X-Request-Id');
      reply.header(AUTH_REASON_HEADER, 'session_expired');
      return reply.code(401).send({ error: 'Unauthorized', message: 'x' });
    });

    const res = await server.inject({ method: 'GET', url: '/existing' });
    const exposed = String(res.headers[EXPOSE]).toLowerCase();

    expect(exposed).toContain('x-request-id');
    expect(exposed).toContain('x-auth-reason');
    await server.close();
  });

  it('does not add itself twice', async () => {
    const server = await buildServer();
    server.get('/dup', async (_req, reply) => {
      reply.header('Access-Control-Expose-Headers', 'X-Auth-Reason');
      reply.header(AUTH_REASON_HEADER, 'session_expired');
      return reply.code(401).send({ error: 'Unauthorized', message: 'x' });
    });

    const res = await server.inject({ method: 'GET', url: '/dup' });
    const count = String(res.headers[EXPOSE]).toLowerCase().split('x-auth-reason').length - 1;

    expect(count).toBe(1);
    await server.close();
  });
});

describe('AUTH-07 — the hook stays out of everything else', () => {
  it('touches nothing on an error with no auth reason', async () => {
    const server = await buildServer();
    server.get('/plain', async (_req, reply) =>
      reply.code(404).send({ error: 'Temple not found' }),
    );

    const res = await server.inject({ method: 'GET', url: '/plain' });

    expect(res.headers[EXPOSE]).toBeUndefined();
    expect(res.headers[AUTH_REASON_HEADER.toLowerCase()]).toBeUndefined();
    await server.close();
  });

  it('touches nothing on a 2xx', async () => {
    const server = await buildServer();
    server.get('/ok', async (_req, reply) => reply.send({ ok: true }));

    const res = await server.inject({ method: 'GET', url: '/ok' });

    expect(res.headers[EXPOSE]).toBeUndefined();
    await server.close();
  });

  it('ignores an authReason value it does not recognise', async () => {
    const server = await buildServer();
    server.get('/bogus', async (_req, reply) =>
      reply.code(401).send({ error: 'Unauthorized', message: 'x', authReason: 'made_up' }),
    );

    const res = await server.inject({ method: 'GET', url: '/bogus' });

    expect(res.headers[AUTH_REASON_HEADER.toLowerCase()]).toBeUndefined();
    expect(res.headers[EXPOSE]).toBeUndefined();
    await server.close();
  });

  /**
   * A 403 must never acquire an auth reason. apps/web consults it for 401 only,
   * but defence in depth: the plugin has no rule that could add one, and this
   * pins that it does not grow one later.
   */
  it('never invents a reason for a 403', async () => {
    const server = await buildServer();
    server.get('/suspended', async (_req, reply) =>
      reply.code(403).send({
        error: 'Forbidden',
        message: 'Account suspended. Contact support@darshya.online.',
      }),
    );

    const res = await server.inject({ method: 'GET', url: '/suspended' });

    expect(res.statusCode).toBe(403);
    expect(res.headers[AUTH_REASON_HEADER.toLowerCase()]).toBeUndefined();
    expect(res.headers[EXPOSE]).toBeUndefined();
    expect(JSON.parse(res.body)[AUTH_REASON_BODY_FIELD]).toBeUndefined();
    await server.close();
  });
});

describe('AUTH-07 — the reason survives localization', () => {
  /**
   * The onSend localizer REWRITES error bodies (I-04): it can replace `message`
   * and add `code`. `authReason` must come out the other side untouched, or the
   * body carrier is broken for every Hindi/Tamil/Telugu/Kannada caller — which
   * would be a silent, language-dependent failure of exactly the kind this
   * finding is about.
   */
  it('keeps authReason through a body the localizer rewrites', async () => {
    const server = await buildServer();
    server.get('/localized', async (_req, reply) => {
      reply.header(AUTH_REASON_HEADER, 'registration_incomplete');
      return reply.code(401).send({
        error: 'Unauthorized',
        // A sentence the catalogue owns, so rule 3 fires and the body IS rewritten.
        message: 'Invalid email or password.',
        authReason: 'registration_incomplete',
      });
    });

    const res = await server.inject({
      method: 'GET',
      url: '/localized',
      headers: { 'accept-language': 'hi' },
    });
    const body = JSON.parse(res.body);

    // Proof the localizer actually ran on this body.
    expect(body.code).toBe('INVALID_CREDENTIALS');
    expect(body.message).not.toBe('Invalid email or password.');
    // ...and the reason came through both carriers regardless.
    expect(body[AUTH_REASON_BODY_FIELD]).toBe('registration_incomplete');
    expect(res.headers[AUTH_REASON_HEADER.toLowerCase()]).toBe('registration_incomplete');
    await server.close();
  });
});
