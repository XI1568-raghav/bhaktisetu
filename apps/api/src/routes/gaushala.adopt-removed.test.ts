import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

// Auth is stubbed to ALWAYS succeed. The point of these tests is that the
// endpoints are gone, not that they are guarded: a passing signed-in caller
// must still find nothing there.
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any) => {
    request.currentUser = { id: 'a2c1f0d4-1111-4222-8333-444455556666', email: 'd@demo.com' };
  },
}));

import Fastify from 'fastify';
import { gaushalaRoutes } from './gaushala.js';
import { GaushalaService } from '../services/gaushala.service.js';

// COM-19 (prod sweep 2026-08-12): the free-of-charge cow claim endpoint.
// A signed-in caller could POST cowId + planId and the handler flipped
// `cow.isAdopted = true` on a module-level fixture array — no payment, no DB
// row, no idempotency — and the mutation was visible to every other visitor of
// the process until the dyno restarted. Eight cows could be walked to
// "adopted" for zero rupees, after which the public page showed nothing
// available. The real adoption path is /donations with a planId prefill, and
// the web app stopped calling this in #230, so the route was orphaned.

function makeApp() {
  const app = Fastify();
  void app.register(gaushalaRoutes, { prefix: '/api/v1/gaushala' });
  return app;
}

describe('COM-19 — the free in-memory adoption endpoints are gone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.gaushalaProfile.findFirst.mockResolvedValue(null);
  });

  it('POST /gaushala/adopt is not routed', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/gaushala/adopt',
      payload: { cowId: 'cow_001', planId: 'plan_monthly' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('a signed-in caller cannot flip a cow to adopted for free', async () => {
    const app = makeApp();
    await app.inject({
      method: 'POST',
      url: '/api/v1/gaushala/adopt',
      payload: { cowId: 'cow_001', planId: 'plan_lifetime' },
    });

    // Shared process state must be untouched: cow_001 is still on the shelf
    // for the next visitor.
    const cow = new GaushalaService().getCowById('cow_001');
    expect(cow?.isAdopted).toBe(false);
  });

  it('GET /gaushala/my-adoptions is not routed', async () => {
    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/gaushala/my-adoptions' });
    expect(res.statusCode).toBe(404);
  });

  it('no adoption path is registered on the router at all', async () => {
    const app = makeApp();
    await app.ready();
    // The route table, not the response code: /adoptions/:id/updates answered
    // 404 even while it existed (there was never a matching record), so only
    // the registered-routes list can tell the two states apart.
    expect(app.printRoutes()).not.toMatch(/adopt/i);
  });

  it('the read-only gaushala surface still works', async () => {
    const app = makeApp();
    const plans = await app.inject({ method: 'GET', url: '/api/v1/gaushala/plans' });
    expect(plans.statusCode).toBe(200);
    expect(plans.json().plans.length).toBeGreaterThan(0);

    const cows = await app.inject({ method: 'GET', url: '/api/v1/gaushala/cows' });
    expect(cows.statusCode).toBe(200);
    expect(cows.json().total).toBeGreaterThan(0);
  });
});
