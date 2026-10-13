/**
 * POST /admin/temples with an invalid body answered 400 with a ZERO-length body:
 * validateBody() sends the reply, then the async handler returned undefined, so
 * the admin UI had no error to show. The handler must return the reply.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { adminRoutes } from './admin.js';
import { errorLocalizationPlugin } from '../plugins/error-localization.js';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = 'test';
  prismaMock.user.findUnique.mockResolvedValue({
    id: '80744ebd-f175-4b08-aa7a-30ea57ead7b7', email: 'admin@demo.com', phone: null,
    fullName: 'A', subscriptionTier: 'free', blocked: false,
  } as never);
});

describe('admin validateBody failures carry an error body', () => {
  it.each([
    ['POST', '/api/v1/admin/temples'],
    ['PATCH', '/api/v1/admin/priests/80744ebd-f175-4b08-aa7a-30ea57ead7b7/commission-rate'],
  ])('%s %s', async (method, url) => {
    const app = Fastify({ logger: false });
    // The real server installs this async onSend hook; without it inject() hides the bug.
    await errorLocalizationPlugin(app, { isProd: false, onError: () => {} });
    await app.register(async (i) => { await adminRoutes(i); }, { prefix: '/api/v1/admin' });
    const res = await app.inject({ method: method as 'POST', url, headers: { authorization: 'Bearer demo-admin' }, payload: {} });
    await app.close();
    expect(res.statusCode).toBe(400);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.json().error).toBe('Invalid body');
  });
});
