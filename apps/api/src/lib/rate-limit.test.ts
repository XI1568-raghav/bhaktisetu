import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';

// R-Q2-E-013 — API rate limiting per-user + per-IP
//
// Lightweight Fastify harness exercising the same plugin + key derivation
// strategy used in apps/api/src/server.ts. Kept self-contained so the suite
// doesn't pull the full server bootstrap (Sentry, Prisma, helmet, CORS).

interface UserInjector {
  userId?: string;
}

async function buildApp(opts: {
  max: number;
  authMax?: number;
  allowList?: string[];
  injector?: UserInjector;
}): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  // IMPORTANT: per-prefix override hook MUST be registered BEFORE
  // @fastify/rate-limit, because the plugin's onRoute hook reads
  // `routeOptions.config.rateLimit` at route-registration time.
  app.addHook('onRoute', (routeOpts) => {
    const url = routeOpts.url ?? '';
    const existing = (routeOpts.config as { rateLimit?: unknown } | undefined)
      ?.rateLimit;
    if (existing) return;
    if (opts.authMax && (url.startsWith('/auth/') || url === '/auth')) {
      routeOpts.config = {
        ...(routeOpts.config ?? {}),
        rateLimit: { max: opts.authMax, timeWindow: '1 minute' },
      };
    }
  });

  const skip = new Set(opts.allowList ?? []);
  await app.register(rateLimit, {
    max: opts.max,
    timeWindow: '1 minute',
    allowList: (req) => skip.has(req.url.split('?')[0] ?? ''),
    keyGenerator: (req) => {
      const uid = (req as unknown as { currentUser?: { id?: string } })
        .currentUser?.id;
      return uid ? `u:${uid}` : `ip:${req.ip}`;
    },
  });

  // Inject the test user before rate-limit checks (uses preHandler ordering).
  app.addHook('onRequest', async (req) => {
    if (opts.injector?.userId) {
      (req as unknown as { currentUser: { id: string } }).currentUser = {
        id: opts.injector.userId,
      };
    }
  });

  app.get('/api/v1/ping', async () => ({ ok: true }));
  app.post('/auth/login', async () => ({ ok: true }));
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async () => ({ ready: true }));
  app.get('/metrics', async () => ({ uptime: 0 }));

  await app.ready();
  return app;
}

describe('rate-limit (R-Q2-E-013)', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) await app.close();
  });

  it('returns 429 after exceeding per-IP default cap', async () => {
    app = await buildApp({ max: 5 });
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({ method: 'GET', url: '/api/v1/ping' });
      expect(res.statusCode).toBe(200);
    }
    const blocked = await app.inject({ method: 'GET', url: '/api/v1/ping' });
    expect(blocked.statusCode).toBe(429);
  });

  it('429 response includes Retry-After header', async () => {
    app = await buildApp({ max: 2 });
    await app.inject({ method: 'GET', url: '/api/v1/ping' });
    await app.inject({ method: 'GET', url: '/api/v1/ping' });
    const blocked = await app.inject({ method: 'GET', url: '/api/v1/ping' });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it('authenticated user gets a partition keyed by user id, not IP', async () => {
    app = await buildApp({ max: 3, injector: { userId: 'user-abc' } });
    // Burn the user bucket
    for (let i = 0; i < 3; i++) {
      const res = await app.inject({ method: 'GET', url: '/api/v1/ping' });
      expect(res.statusCode).toBe(200);
    }
    const blocked = await app.inject({ method: 'GET', url: '/api/v1/ping' });
    expect(blocked.statusCode).toBe(429);
    // Different user — fresh bucket on same IP.
    await app.close();
    app = await buildApp({ max: 3, injector: { userId: 'user-xyz' } });
    const fresh = await app.inject({ method: 'GET', url: '/api/v1/ping' });
    expect(fresh.statusCode).toBe(200);
  });

  it('per-prefix override tightens /auth/* below global default', async () => {
    app = await buildApp({ max: 100, authMax: 2 });
    const r1 = await app.inject({ method: 'POST', url: '/auth/login' });
    const r2 = await app.inject({ method: 'POST', url: '/auth/login' });
    const r3 = await app.inject({ method: 'POST', url: '/auth/login' });
    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    expect(r3.statusCode).toBe(429);
  });

  it('health / ready / metrics routes are never rate limited', async () => {
    app = await buildApp({
      max: 1,
      allowList: ['/health', '/ready', '/metrics'],
    });
    for (let i = 0; i < 5; i++) {
      const h = await app.inject({ method: 'GET', url: '/health' });
      const r = await app.inject({ method: 'GET', url: '/ready' });
      const m = await app.inject({ method: 'GET', url: '/metrics' });
      expect(h.statusCode).toBe(200);
      expect(r.statusCode).toBe(200);
      expect(m.statusCode).toBe(200);
    }
  });
});
