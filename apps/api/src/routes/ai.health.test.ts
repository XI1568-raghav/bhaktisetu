import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
const { probeAiProvider } = vi.hoisted(() => ({ probeAiProvider: vi.fn() }));
vi.mock('../integrations/claude.js', async (orig) => ({
  ...((await orig()) as Record<string, unknown>),
  probeAiProvider,
}));

import Fastify from 'fastify';
import { aiRoutes } from './ai.js';

/**
 * The AI chats were silently answering from canned fallbacks and nothing could
 * say why. GET /ai/health reports what the provider call really does (status and
 * error code only, never a key), cached briefly so it cannot be used to burn
 * the provider's free quota.
 */
async function get() {
  const app = Fastify({ logger: false });
  await app.register(aiRoutes, { prefix: '/api/v1/ai' });
  const res = await app.inject({ method: 'GET', url: '/api/v1/ai/health' });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('GET /ai/health', () => {
  it('is public and reports the provider state', async () => {
    probeAiProvider.mockResolvedValue({ provider: 'groq', ok: false, status: 401, code: 'invalid_api_key' });
    const res = await get();
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ provider: 'groq', ok: false, status: 401, code: 'invalid_api_key' });
  });

  it('caches the probe so repeated calls make one provider call', async () => {
    probeAiProvider.mockResolvedValue({ provider: 'groq', ok: true });
    await get();
    await get();
    await get();
    expect(probeAiProvider.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it('never leaks anything beyond provider, ok, status, code', async () => {
    probeAiProvider.mockResolvedValue({ provider: 'groq', ok: true, secret: 'gsk_x' } as never);
    const keys = Object.keys((await get()).json()).sort();
    expect(keys.every((k) => ['provider', 'ok', 'status', 'code', 'checkedAt'].includes(k))).toBe(true);
  });
});
