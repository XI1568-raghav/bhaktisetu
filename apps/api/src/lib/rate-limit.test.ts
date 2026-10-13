import { afterEach, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { clientIp, isCloudflareEdgeIp, rateLimitKey } from './rate-limit-key.js';

const CF_HOP = '173.245.48.9';

// R-Q2-E-013 — API rate limiting per-user + per-IP
// SCAL-01 — the partition was broken; these tests now prove it isn't.
//
// The harness imports the REAL rateLimitKey from server.ts's own module. The
// previous version of this file re-implemented the key derivation inline, so
// every assertion tested its own copy: the server could (and did) share one
// bucket across the entire platform while this suite stayed green.
//
// It also asserted "different user gets a fresh bucket" by closing the app and
// building a new one — a new rate-limit store — which passes even if the key
// is a constant. Both users now hit the SAME instance.

async function buildApp(opts: {
  max: number;
  authMax?: number;
  allowList?: string[];
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
    keyGenerator: (req) => rateLimitKey(req),
  });

  // Mirrors production: auth is a per-route preHandler, so it runs AFTER the
  // limiter's onRequest hook. Anything the limiter needs must come off the
  // raw request, not off currentUser.
  const authenticateUser = async (req: { headers: Record<string, unknown> }) => {
    const raw = req.headers['authorization'];
    if (typeof raw === 'string') {
      (req as { currentUser?: { id: string } }).currentUser = {
        id: raw.replace(/^Bearer /i, ''),
      };
    }
  };

  app.get('/api/v1/ping', { preHandler: [authenticateUser] }, async () => ({ ok: true }));
  app.post('/auth/login', async () => ({ ok: true }));
  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/ready', async () => ({ ready: true }));
  app.get('/metrics', async () => ({ uptime: 0 }));

  await app.ready();
  return app;
}

const asReq = (headers: Record<string, string>, ip = '10.0.0.1') => ({ ip, headers });

describe('rate-limit key derivation (SCAL-01)', () => {
  it('partitions two bearer tokens into different buckets', () => {
    const a = rateLimitKey(asReq({ authorization: 'Bearer alice-token' }));
    const b = rateLimitKey(asReq({ authorization: 'Bearer bob-token' }));
    expect(a).not.toBe(b);
    expect(a.startsWith('u:')).toBe(true);
  });

  it('gives the same caller a stable bucket across requests', () => {
    const h = { authorization: 'Bearer alice-token' };
    expect(rateLimitKey(asReq(h, '10.0.0.1'))).toBe(rateLimitKey(asReq(h, '10.0.0.9')));
  });

  it('never leaks the raw credential into the key', () => {
    const key = rateLimitKey(asReq({ authorization: 'Bearer super-secret-jwt' }));
    expect(key).not.toContain('super-secret-jwt');
  });

  it('partitions by the darshya_session cookie when no Authorization header', () => {
    const a = rateLimitKey(asReq({ cookie: 'foo=1; darshya_session=sess-alice; bar=2' }));
    const b = rateLimitKey(asReq({ cookie: 'darshya_session=sess-bob' }));
    expect(a).not.toBe(b);
    expect(a.startsWith('u:')).toBe(true);
  });

  it('falls back to the client IP for anonymous traffic', () => {
    expect(rateLimitKey(asReq({}, '203.0.113.7'))).toBe('ip:203.0.113.7');
  });

  it('separates anonymous callers behind a proxy via CF-Connecting-IP', () => {
    const a = rateLimitKey(asReq({ 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': CF_HOP }, '10.0.0.1'));
    const b = rateLimitKey(asReq({ 'cf-connecting-ip': '2.2.2.2', 'x-forwarded-for': CF_HOP }, '10.0.0.1'));
    expect(a).toBe('ip:1.1.1.1');
    expect(b).toBe('ip:2.2.2.2');
  });

  it('ignores client-supplied X-Forwarded-For — it is forgeable', () => {
    // Honouring raw XFF would let one caller mint unlimited buckets.
    expect(clientIp(asReq({ 'x-forwarded-for': '9.9.9.9' }, '10.0.0.1'))).toBe('10.0.0.1');
  });

  it('ignores CF-Connecting-IP when the request did not come through Cloudflare (direct origin hit)', () => {
    const rotate = (ip: string) => clientIp(asReq({ 'cf-connecting-ip': ip }, '10.0.0.1'));
    expect(rotate('1.1.1.1')).toBe('10.0.0.1');
    expect(rotate('2.2.2.2')).toBe('10.0.0.1');
    // A forged XFF whose LAST hop is not Cloudflare (Render appends the real peer) does not help.
    expect(clientIp(asReq({ 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': '173.245.48.9, 198.51.100.9' }, '10.0.0.1'))).toBe('10.0.0.1');
  });

  it('honours CF-Connecting-IP when the last XFF hop is a Cloudflare edge', () => {
    expect(clientIp(asReq({ 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': '9.9.9.9, 104.16.5.5' }, '10.0.0.1'))).toBe('1.1.1.1');
    expect(isCloudflareEdgeIp('2606:4700::1')).toBe(true);
    expect(isCloudflareEdgeIp('8.8.8.8')).toBe(false);
  });

  it('RATE_LIMIT_TRUST_CF_HEADER=true restores unconditional trust (rollback lever)', () => {
    process.env.RATE_LIMIT_TRUST_CF_HEADER = 'true';
    try {
      expect(clientIp(asReq({ 'cf-connecting-ip': '1.1.1.1' }, '10.0.0.1'))).toBe('1.1.1.1');
    } finally {
      delete process.env.RATE_LIMIT_TRUST_CF_HEADER;
    }
  });

  it('with CF_ORIGIN_SECRET set, only the shared-secret header proves Cloudflare', () => {
    process.env.CF_ORIGIN_SECRET = 's3cret';
    try {
      expect(clientIp(asReq({ 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': CF_HOP }, '10.0.0.1'))).toBe('10.0.0.1');
      expect(clientIp(asReq({ 'cf-connecting-ip': '1.1.1.1', 'x-origin-secret': 's3cret' }, '10.0.0.1'))).toBe('1.1.1.1');
    } finally {
      delete process.env.CF_ORIGIN_SECRET;
    }
  });

  it('keys /auth/* by IP even when a rotating Bearer token is sent', () => {
    const a = rateLimitKey({ ...asReq({ authorization: 'Bearer junk1' }, '10.0.0.1'), url: '/api/v1/auth/login' });
    const b = rateLimitKey({ ...asReq({ authorization: 'Bearer junk2' }, '10.0.0.1'), url: '/api/v1/auth/login?x=1' });
    expect(a).toBe('ip:10.0.0.1');
    expect(b).toBe(a);
  });

  it('treats a blank Authorization header as anonymous, not as a shared bucket', () => {
    expect(rateLimitKey(asReq({ authorization: '   ' }, '198.51.100.4'))).toBe('ip:198.51.100.4');
  });
});

describe('rate-limit enforcement (R-Q2-E-013)', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    if (app) await app.close();
  });

  const ping = (headers: Record<string, string> = {}) =>
    app.inject({ method: 'GET', url: '/api/v1/ping', headers });

  it('returns 429 after exceeding the anonymous per-IP cap', async () => {
    app = await buildApp({ max: 5 });
    for (let i = 0; i < 5; i++) expect((await ping()).statusCode).toBe(200);
    expect((await ping()).statusCode).toBe(429);
  });

  it('429 response includes Retry-After header', async () => {
    app = await buildApp({ max: 2 });
    await ping();
    await ping();
    const blocked = await ping();
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  // The regression test for SCAL-01. Against the old keyGenerator (which read
  // currentUser — always undefined in onRequest) bob's FIRST request was a 429.
  it('one user burning their quota does not throttle a different user', async () => {
    app = await buildApp({ max: 3 });
    const alice = { authorization: 'Bearer alice-token' };
    const bob = { authorization: 'Bearer bob-token' };

    for (let i = 0; i < 3; i++) expect((await ping(alice)).statusCode).toBe(200);
    expect((await ping(alice)).statusCode).toBe(429);

    // Same app, same socket IP, same instant — bob must be untouched.
    for (let i = 0; i < 3; i++) expect((await ping(bob)).statusCode).toBe(200);
    expect((await ping(bob)).statusCode).toBe(429);
  });

  it('anonymous callers behind the proxy get independent buckets', async () => {
    app = await buildApp({ max: 2 });
    const one = { 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': CF_HOP };
    const two = { 'cf-connecting-ip': '2.2.2.2', 'x-forwarded-for': CF_HOP };
    expect((await ping(one)).statusCode).toBe(200);
    expect((await ping(one)).statusCode).toBe(200);
    expect((await ping(one)).statusCode).toBe(429);
    expect((await ping(two)).statusCode).toBe(200);
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
    app = await buildApp({ max: 1, allowList: ['/health', '/ready', '/metrics'] });
    for (let i = 0; i < 5; i++) {
      expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
      expect((await app.inject({ method: 'GET', url: '/ready' })).statusCode).toBe(200);
      expect((await app.inject({ method: 'GET', url: '/metrics' })).statusCode).toBe(200);
    }
  });
});
