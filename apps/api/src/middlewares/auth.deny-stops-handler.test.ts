import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { errorLocalizationPlugin } from '../plugins/error-localization.js';
import { authenticateUser, requireRole, requireAnyRole } from './auth.js';

// Role pass 2026-10-07 (P0). requireRole answered 403 but did not `return reply`
// from its async hook, so Fastify went on to run the route handler: a devotee
// token got "403 Forbidden" from PATCH /admin/users/:id and the approval was
// applied anyway. A denial must be terminal: the handler never runs.

const DEVOTEE = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'devotee@demo.com',
  phone: null,
  fullName: 'Demo Devotee',
  subscriptionTier: 'free',
  blocked: false,
};

async function makeApp(handler: () => unknown) {
  const app = Fastify();
  await app.register(helmet);
  await app.register(fastifyCookie);
  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 1000, timeWindow: '1 minute' });
  // The same plugin server.ts installs: its onSend hook awaits a language lookup
  // before the response is written, which is the window the handler ran in.
  await errorLocalizationPlugin(app, { isProd: false, loadPreferredLanguage: async () => { await new Promise((r) => setTimeout(r, 5)); return 'en'; } });
  app.patch('/admin-only', { preHandler: [authenticateUser, requireRole('admin')] }, async () => handler());
  app.patch('/astro-only', { preHandler: [authenticateUser, requireRole('ASTROLOGER')] }, async () => handler());
  app.patch('/any-only', { preHandler: [authenticateUser, requireAnyRole('ASTROLOGER', 'STORE_OWNER')] }, async () => handler());
  app.patch('/auth-only', { preHandler: [authenticateUser] }, async () => handler());
  await app.listen({ port: 0, host: '127.0.0.1' });
  return app;
}

// A real socket, not app.inject(): inject() resolves on a different tick and does
// not reproduce the window in which the handler used to run after a denial.
async function hit(app: Awaited<ReturnType<typeof makeApp>>, url: string, authorization?: string) {
  const addr = app.server.address() as { port: number };
  return fetch(`http://127.0.0.1:${addr.port}${url}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) },
    body: JSON.stringify({ approved: false }),
  });
}

describe('a denied request never reaches the route handler', () => {
  const apps: Array<{ close(): Promise<unknown> }> = [];
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((a) => a.close()));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEMO_TOKENS = 'true';
    prismaMock.user.findUnique.mockImplementation(async (args: any) =>
      args.where.email === 'devotee@demo.com' ? DEVOTEE : null,
    );
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
  });

  it.each(['/admin-only', '/astro-only', '/any-only'])('403 on %s and the handler does not run', async (url) => {
    const handler = vi.fn(() => ({ ok: true }));
    const app = await makeApp(handler);
    apps.push(app);
    const res = await hit(app, url, 'Bearer demo-devotee-token');
    // Let any wrongly-scheduled handler run before asserting it did not.
    await new Promise((r) => setTimeout(r, 25));
    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('401 without a token and the handler does not run', async () => {
    const handler = vi.fn(() => ({ ok: true }));
    const app = await makeApp(handler);
    apps.push(app);
    const res = await hit(app, '/auth-only');
    await new Promise((r) => setTimeout(r, 25));
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('an allowed caller still reaches the handler', async () => {
    const handler = vi.fn(() => ({ ok: true }));
    const app = await makeApp(handler);
    apps.push(app);
    const res = await hit(app, '/auth-only', 'Bearer demo-devotee-token');
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
