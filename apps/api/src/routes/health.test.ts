import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import {
  createHealthProbe,
  healthStatusCode,
  healthRoutes,
  type HealthSnapshot,
} from './health.js';

/**
 * OPS-04 — Render's health check pointed at a stub.
 *
 * `render.yaml:22` sets `healthCheckPath: /health`, and `/health` answered
 * `{status:'ok', timestamp}` unconditionally: a literal, database-free 200 for
 * as long as the Node process had a heartbeat. Every uptime monitor pointed at
 * it. A health check that cannot go red is decoration — it reports that the
 * container is running, which is the one thing an operator can already see.
 *
 * Meanwhile `/ready` DID do the real work (`SELECT 1`, Redis ping, queue state)
 * and nothing pointed at it. Both halves existed; the wiring did not.
 *
 * What is asserted here:
 *   1. `/health` performs a real database round-trip and reports the result.
 *   2. It answers 503 when the database is unreachable — the whole point.
 *   3. It is still cheap enough to be polled: a burst of probes inside the
 *      cache window issues ONE query, and a hung database is bounded by a
 *      timeout rather than holding the probe open.
 *   4. It does not flap. A single failed round-trip does not take the service
 *      out of the load balancer; only sustained failure does. Render restarts a
 *      container whose health check fails, and the API's start command runs
 *      `prisma migrate deploy` — so a hair-trigger probe would turn a two-second
 *      database blip into a restart loop.
 */

const ok = () => Promise.resolve([{ '?column?': 1 }]);
const boom = () => Promise.reject(new Error('P1001: cannot reach database server'));
const hang = () => new Promise<never>(() => {});

describe('OPS-04 — /health asserts the database, not just the process', () => {
  it('maps a healthy snapshot to 200 and a degraded one to 503', () => {
    expect(healthStatusCode('ok')).toBe(200);
    expect(healthStatusCode('degraded')).toBe(503);
  });

  it('reports db ok, with a measured latency, when the round-trip succeeds', async () => {
    const query = vi.fn(ok);
    const probe = createHealthProbe({ query, ttlMs: 0 });
    const snap = await probe.check();

    expect(query).toHaveBeenCalledTimes(1);
    expect(snap.db).toBe('ok');
    expect(snap.status).toBe('ok');
    expect(typeof snap.latencyMs).toBe('number');
    expect(snap.latencyMs).toBeGreaterThanOrEqual(0);
    expect(snap.consecutiveFailures).toBe(0);
  });

  it('reports db fail when the round-trip throws', async () => {
    const probe = createHealthProbe({ query: boom, ttlMs: 0, failureThreshold: 1 });
    const snap = await probe.check();
    expect(snap.db).toBe('fail');
    expect(snap.status).toBe('degraded');
  });

  it('bounds a hung database with a timeout instead of holding the probe open', async () => {
    const probe = createHealthProbe({ query: hang, ttlMs: 0, timeoutMs: 15, failureThreshold: 1 });
    const started = Date.now();
    const snap = await probe.check();
    expect(snap.db).toBe('fail');
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it('issues ONE query for a burst of concurrent probes', async () => {
    const query = vi.fn(ok);
    const probe = createHealthProbe({ query, ttlMs: 5_000 });
    const snaps = await Promise.all([
      probe.check(),
      probe.check(),
      probe.check(),
      probe.check(),
      probe.check(),
    ]);
    expect(query).toHaveBeenCalledTimes(1);
    expect(snaps.every((s: HealthSnapshot) => s.db === 'ok')).toBe(true);
  });

  it('serves a cached answer inside the TTL and re-probes once it lapses', async () => {
    const query = vi.fn(ok);
    let clock = 1_000;
    const probe = createHealthProbe({ query, ttlMs: 5_000, now: () => clock });

    const first = await probe.check();
    expect(first.cached).toBe(false);
    expect(query).toHaveBeenCalledTimes(1);

    clock += 4_999;
    const second = await probe.check();
    expect(second.cached).toBe(true);
    expect(query).toHaveBeenCalledTimes(1);

    clock += 2;
    const third = await probe.check();
    expect(third.cached).toBe(false);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('does not flap: one failed round-trip is not yet degraded, three are', async () => {
    let clock = 0;
    const probe = createHealthProbe({
      query: boom,
      ttlMs: 0,
      now: () => (clock += 1_000),
      failureThreshold: 3,
    });

    const one = await probe.check();
    expect(one.db).toBe('fail');
    expect(one.status).toBe('ok');
    expect(healthStatusCode(one.status)).toBe(200);

    const two = await probe.check();
    expect(two.status).toBe('ok');

    const three = await probe.check();
    expect(three.db).toBe('fail');
    expect(three.status).toBe('degraded');
    expect(healthStatusCode(three.status)).toBe(503);
  });

  it('clears the failure streak as soon as the database answers again', async () => {
    let fail = true;
    const probe = createHealthProbe({
      query: () => (fail ? boom() : ok()),
      ttlMs: 0,
      failureThreshold: 2,
    });

    await probe.check();
    const degraded = await probe.check();
    expect(degraded.status).toBe('degraded');

    fail = false;
    const recovered = await probe.check();
    expect(recovered.db).toBe('ok');
    expect(recovered.status).toBe('ok');
    expect(recovered.consecutiveFailures).toBe(0);
  });

  it('GET /health answers 200 with db:ok when the database is reachable', async () => {
    const app = Fastify({ logger: false });
    await app.register(healthRoutes, {
      probe: createHealthProbe({ query: ok, ttlMs: 0 }),
    });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
    await app.close();
  });

  it('the stub it replaces answered 200 with the database unreachable', async () => {
    // Frozen reproduction of `apps/api/src/server.ts` as of HEAD:
    //   server.get('/health', async () => ({ status: 'ok', timestamp: ... }));
    // No dependency is consulted, so there is no input that makes it go red.
    // This is what Render's healthCheckPath and every uptime monitor were
    // reading while the database was unreachable.
    const app = Fastify({ logger: false });
    app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
    // ...and it never touched the database at all.
    expect(res.json().db).toBeUndefined();
    await app.close();
  });

  it('GET /health answers 503 when the database is unreachable — it used to answer 200', async () => {
    const app = Fastify({ logger: false });
    await app.register(healthRoutes, {
      probe: createHealthProbe({ query: boom, ttlMs: 0, failureThreshold: 1 }),
    });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.status).toBe('degraded');
    expect(body.db).toBe('fail');
    await app.close();
  });
});
