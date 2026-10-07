import { describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { stopWhenAnswered, wrapRouteGuards } from './stop-when-answered.js';

vi.mock('./prisma.js', () => ({ prisma: {} }));

/**
 * 2026-10-07 role pass: a pandit (or any signed-in user) got `403 Forbidden`
 * from an admin route while the handler behind it still ran. Cause: guards
 * answer with `reply.send(); return;` and Fastify only stops when `reply.sent`
 * is true, which an async preSerialization hook (added in #322) delays.
 */
async function build(opts: { wrap: boolean; asyncSerializer: boolean; naive?: boolean }) {
  const app = Fastify();
  if (opts.wrap) app.addHook('onRoute', (r) => wrapRouteGuards(r as Parameters<typeof wrapRouteGuards>[0]));
  if (opts.asyncSerializer) {
    app.addHook('preSerialization', async (_rq, _rp, payload) => payload);
    app.addHook('onSend', async (_rq, _rp, payload) => payload);
  }
  const ran = vi.fn();
  const asDevotee = async (request: FastifyRequest) => {
    (request as unknown as { currentUser: unknown }).currentUser = {
      id: 'u1',
      email: 'devotee@example.com',
      roles: ['DEVOTEE'],
    };
  };
  // The pre-fix guard style used all over the codebase: answer, then `return;`.
  const naiveAdminGuard = async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.code(403).send({ error: 'Forbidden' });
  };
  app.post(
    '/admin/thing',
    { preHandler: [asDevotee, opts.naive ? naiveAdminGuard : requireRole('admin')] },
    async () => {
      ran();
      return { ok: true };
    },
  );
  await app.ready();
  return { app, ran };
}

const settle = () => new Promise((r) => setTimeout(r, 25));

describe('guard answers must stop the handler', () => {
  it('control: unwrapped guard + async serializer lets the handler run behind the 403', async () => {
    const { app, ran } = await build({ wrap: false, asyncSerializer: true, naive: true });
    const res = await app.inject({ method: 'POST', url: '/admin/thing' });
    await settle();
    expect(res.statusCode).toBe(403);
    expect(ran).toHaveBeenCalled();
    await app.close();
  });

  it('a naive guard is made safe by the route wrapper', async () => {
    const { app, ran } = await build({ wrap: true, asyncSerializer: true, naive: true });
    const res = await app.inject({ method: 'POST', url: '/admin/thing' });
    await settle();
    expect(res.statusCode).toBe(403);
    expect(ran).not.toHaveBeenCalled();
    await app.close();
  });

  it('requireRole itself is safe with no wrapper at all', async () => {
    const { app, ran } = await build({ wrap: false, asyncSerializer: true });
    const res = await app.inject({ method: 'POST', url: '/admin/thing' });
    await settle();
    expect(res.statusCode).toBe(403);
    expect(ran).not.toHaveBeenCalled();
    await app.close();
  });

  it('wrapped guard + async serializer: 403 and the handler never runs', async () => {
    const { app, ran } = await build({ wrap: true, asyncSerializer: true });
    const res = await app.inject({ method: 'POST', url: '/admin/thing' });
    await settle();
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: 'Forbidden' });
    expect(ran).not.toHaveBeenCalled();
    await app.close();
  });

  it('authenticateUser used as a PLUGIN-level hook (no route wrapper) also stops the handler', async () => {
    const app = Fastify();
    app.addHook('preSerialization', async (_rq, _rp, payload) => payload);
    app.addHook('onSend', async (_rq, _rp, payload) => payload);
    const ran = vi.fn();
    await app.register(async (scope) => {
      scope.addHook('preHandler', authenticateUser);
      scope.post('/thing', async () => {
        ran();
        return { ok: true };
      });
    });
    const res = await app.inject({ method: 'POST', url: '/thing' });
    await settle();
    expect(res.statusCode).toBe(401);
    expect(ran).not.toHaveBeenCalled();
    await app.close();
  });

  it('wrapped guard still lets an allowed caller through', async () => {
    const app = Fastify();
    app.addHook('onRoute', (r) => wrapRouteGuards(r as Parameters<typeof wrapRouteGuards>[0]));
    const ran = vi.fn();
    const asAdmin = async (request: FastifyRequest) => {
      (request as unknown as { currentUser: unknown }).currentUser = {
        id: 'a1',
        email: 'admin@example.com',
        roles: ['ADMIN'],
      };
    };
    app.post('/admin/thing', { preHandler: [asAdmin, requireRole('admin')] }, async () => {
      ran();
      return { ok: true };
    });
    const res = await app.inject({ method: 'POST', url: '/admin/thing' });
    expect(res.statusCode).toBe(200);
    expect(ran).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it('leaves callback-style hooks and non-answering hooks alone', async () => {
    const cb = (_rq: FastifyRequest, _rp: FastifyReply, done: () => void) => done();
    const opts = { preHandler: [cb] as unknown[] };
    wrapRouteGuards(opts);
    expect(opts.preHandler[0]).toBe(cb);

    const reply = { statusCode: 200 } as FastifyReply;
    const pass = stopWhenAnswered(async (_rq: FastifyRequest, _rp: FastifyReply) => undefined);
    expect(await pass({} as FastifyRequest, reply)).toBeUndefined();
  });
});

describe('stopWhenAnswered keeps the hook\'s `this`', () => {
  it('forwards `this` (Fastify binds the server; @fastify/otel reads it when SENTRY_DSN is set)', async () => {
    const seen: unknown[] = [];
    const hook = async function (this: unknown) {
      seen.push(this);
    };
    const wrapped = stopWhenAnswered(hook);
    const instance = { name: 'fastify-instance' };
    const reply = { statusCode: 200 };
    await (wrapped as unknown as (this: unknown, req: unknown, rep: unknown) => Promise<unknown>).call(instance, {}, reply);
    expect(seen[0]).toBe(instance);
  });

  it('still hands the reply back when the hook answered 4xx, with `this` intact', async () => {
    let boundThis: unknown;
    const hook = async function (this: unknown, _req: unknown, rep: { statusCode: number }) {
      boundThis = this;
      rep.statusCode = 401;
    };
    const wrapped = stopWhenAnswered(hook as never);
    const instance = {};
    const reply = { statusCode: 200 };
    const out = await (wrapped as unknown as (this: unknown, req: unknown, rep: unknown) => Promise<unknown>).call(instance, {}, reply);
    expect(boundThis).toBe(instance);
    expect(out).toBe(reply);
  });
});
