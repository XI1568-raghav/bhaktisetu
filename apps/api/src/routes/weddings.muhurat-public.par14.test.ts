import { describe, it, expect } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { rateLimitKey } from '../lib/rate-limit-key.js';
import { weddingRoutes } from './weddings.js';

// PAR-14 — the wedding muhurat finder is public lead-gen, and it was behind an
// auth gate.
//
// POST /api/v1/weddings/muhurat carried `preHandler: [authenticateUser]`, added
// to stop an attacker burning the mhah-panchang compute loop. Authentication is
// not a rate control — it costs an attacker one signup — and it broke the one
// journey the route exists for: routes/weddings.ts's /inquiry handler emails
// `https://darshya.online/weddings/muhurat` to a brand-new prospect, who is by
// definition signed out, and that link landed them on a sign-in wall.
//
// The compute concern is real, so it keeps a control — the one that actually
// caps compute. These tests pin BOTH halves: anonymous callers get an answer,
// AND an anonymous flood is capped per IP. Asserting only the 200 would let a
// future edit drop the limiter and stay green, which is how the wrong control
// got here in the first place.
//
// The route options are inspected via an onRoute hook rather than by reading
// the source file: a text scan has to strip comments to avoid matching the very
// paragraph above, and it still cannot tell a top-level preHandler from one
// nested in an unrelated object literal. The registration record cannot lie.

const VALID_INPUT = {
  brideDob: '1996-04-12',
  brideTob: '07:45',
  groomDob: '1994-11-03',
  groomTob: '21:10',
  fromDate: '2027-01-10',
  toDate: '2027-01-17',
  location: 'Gurugram',
};

interface CapturedRoute {
  method: string;
  url: string;
  preHandler: unknown;
  rateLimit: unknown;
}

async function buildApp(opts: { withLimiter: boolean } = { withLimiter: false }): Promise<{
  app: FastifyInstance;
  routes: CapturedRoute[];
}> {
  const app = Fastify({ logger: false });
  const routes: CapturedRoute[] = [];

  // Mirrors server.ts:224 — the per-prefix override hook is registered BEFORE
  // @fastify/rate-limit so the plugin's own onRoute hook sees the merged
  // config. It bails out when a route already declares a policy, which is
  // exactly the branch /muhurat now relies on.
  app.addHook('onRoute', (routeOpts) => {
    const existing = (routeOpts.config as { rateLimit?: unknown } | undefined)?.rateLimit;
    routes.push({
      method: String(routeOpts.method),
      url: routeOpts.url ?? '',
      preHandler: routeOpts.preHandler,
      rateLimit: existing,
    });
    if (existing) return;
    routeOpts.config = {
      ...(routeOpts.config ?? {}),
      rateLimit: { max: 100, timeWindow: '1 minute' },
    };
  });

  if (opts.withLimiter) {
    await app.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      keyGenerator: (req) => rateLimitKey(req),
    });
  }

  await app.register(weddingRoutes, { prefix: '/api/v1/weddings' });
  await app.ready();
  return { app, routes };
}

const post = (app: FastifyInstance, headers: Record<string, string> = {}) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/weddings/muhurat',
    payload: VALID_INPUT,
    headers,
  });

describe('PAR-14 — POST /weddings/muhurat is reachable signed out', () => {
  it('answers 200 with ranked muhurats to a request carrying no Authorization header', async () => {
    const { app } = await buildApp();
    const res = await post(app);

    expect(res.statusCode).toBe(200);
    const body = res.json() as { candidates?: unknown[] };
    expect(Array.isArray(body.candidates)).toBe(true);
    expect(body.candidates!.length).toBeGreaterThan(0);

    await app.close();
  });

  it('still validates the body — a bad payload is 400, not a silent 200', async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/weddings/muhurat',
      payload: { ...VALID_INPUT, brideTob: '25:99' },
    });

    expect(res.statusCode).toBe(400);
    expect((res.json() as { error?: string }).error).toBe('ValidationError');

    await app.close();
  });

  it('declares no preHandler and an explicit per-route rate limit', async () => {
    const { app, routes } = await buildApp();
    const muhurat = routes.find((r) => r.url === '/api/v1/weddings/muhurat');

    expect(muhurat).toBeDefined();
    // No auth chain at all — not an empty array, not a stripped-down one.
    expect(muhurat!.preHandler).toBeUndefined();
    // ...but the compute concern still has a control, and it is the route's
    // own, so server.ts's `if (existing) return` leaves it alone.
    expect(muhurat!.rateLimit).toEqual({ max: 10, timeWindow: '1 minute' });

    await app.close();
  });

  it('leaves POST /weddings/inquiry authenticated — opening one route did not open the other', async () => {
    const { app, routes } = await buildApp();

    const inquiry = routes.find((r) => r.url === '/api/v1/weddings/inquiry');
    expect(inquiry).toBeDefined();
    expect(inquiry!.preHandler).toBeDefined();

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/weddings/inquiry',
      payload: {
        fullName: 'Anon Prospect',
        email: 'anon@example.com',
        phone: '9990001111',
        city: 'Gurugram',
      },
    });
    expect(res.statusCode).toBe(401);

    await app.close();
  });
});

describe('PAR-14 — the compute loop is capped by rate, per IP', () => {
  it('serves 10 anonymous requests then 429s the 11th from the same IP', async () => {
    const { app } = await buildApp({ withLimiter: true });
    const ip = { 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '173.245.48.9' };

    const codes: number[] = [];
    for (let i = 0; i < 11; i += 1) {
      codes.push((await post(app, ip)).statusCode);
    }

    expect(codes.slice(0, 10)).toEqual(Array(10).fill(200));
    expect(codes[10]).toBe(429);

    await app.close();
  });

  it('buckets by IP, so one flooder does not lock out every other visitor', async () => {
    const { app } = await buildApp({ withLimiter: true });
    const flooder = { 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '173.245.48.9' };

    for (let i = 0; i < 11; i += 1) await post(app, flooder);
    expect((await post(app, flooder)).statusCode).toBe(429);

    const bystander = await post(app, { 'cf-connecting-ip': '198.51.100.4', 'x-forwarded-for': '173.245.48.9' });
    expect(bystander.statusCode).toBe(200);

    await app.close();
  });
});
