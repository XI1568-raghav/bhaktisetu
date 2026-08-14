import { describe, it, expect, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { wellnessRoutes } from './wellness.js';
import { wellnessSessionRoutes } from './wellness-sessions.js';

/**
 * COM-15 (prod sweep 2026-08-12, P2/trust) — `POST /api/v1/wellness/book` was a
 * second, fake booking rail sitting at the same prefix as the real one.
 *
 * It had no `preHandler`, so anyone on the internet could call it; it took no
 * payment; it persisted nothing; and it mutated a MODULE-LEVEL fixture array
 * (`session.spotsLeft -= 1`) that every visitor to the process shares. A loop
 * would have driven every advertised class to "fully booked" for real users,
 * and each call answered "Session booked successfully." for a ₹599 class that
 * was never charged and never recorded. The state reset whenever the dyno slept.
 *
 * Nothing called it — `grep -rn "wellness/book" apps/web apps/mobile` was empty
 * — and the real rail (`wellnessSessionRoutes`, registered at the SAME
 * `/api/v1/wellness` prefix) persists to `wellness_enrollments`, authenticates,
 * and charges. So the fake rail is deleted rather than patched: two booking
 * endpoints at one prefix is the defect.
 *
 * This test locks BOTH halves — the fake rail is gone AND the real rail is
 * still the authenticated one that replaced it.
 */

async function buildApp() {
  const app = Fastify();
  await app.register(wellnessRoutes, { prefix: '/api/v1/wellness' });
  await app.register(wellnessSessionRoutes, { prefix: '/api/v1/wellness' });
  await app.ready();
  return app;
}

describe('COM-15 — the unauthenticated in-memory /wellness/book rail is gone', () => {
  it('POST /api/v1/wellness/book no longer exists', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/wellness/book',
      payload: { sessionId: 'ses-001' },
    });
    // Before the fix this answered 400 ("sessionId is required") for an empty
    // body and 200 ("Session booked successfully.") for a valid one.
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('no wellness route accepts a booking without authentication', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/wellness/sessions/11111111-1111-1111-1111-111111111111/enroll',
      payload: {},
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('the read-only wellness catalogue endpoints still serve', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/wellness/instructors' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
