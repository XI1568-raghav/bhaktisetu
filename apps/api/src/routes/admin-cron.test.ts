import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the two job runners so the route is exercised without real I/O.
vi.mock('../jobs/youtube-discovery.js', () => ({
  discoverLiveStreams: vi.fn().mockResolvedValue({ discovered: 0 }),
}));
vi.mock('../jobs/apollo-refresh.js', () => ({
  refreshApolloLeads: vi.fn().mockResolvedValue({ refreshed: 0 }),
}));

import Fastify from 'fastify';
import { adminCronRoutes } from './admin-cron.js';
import { discoverLiveStreams } from '../jobs/youtube-discovery.js';
import { refreshApolloLeads } from '../jobs/apollo-refresh.js';

// P0 #PUB-03 (2026-07-10): the manual-trigger routes were migrated off the
// leaky `?token=` query param onto the Authorization: Bearer header. The
// token must never appear in the URL (access logs / CDN caches). These
// tests pin the new surface: 401 without the header, 200 with it, and a
// `?token=` in the URL is NOT honoured (it is ignored — bearer required).

const TOKEN = 'real-token-abcdef123456';

function makeApp() {
  const app = Fastify();
  void app.register(adminCronRoutes, { prefix: '/api/v1/admin/cron' });
  return app;
}

describe('admin-cron — Bearer header gate (PUB-03)', () => {
  const realEnv = process.env.CRON_AUTH_TOKEN;

  beforeEach(() => {
    process.env.CRON_AUTH_TOKEN = TOKEN;
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (realEnv === undefined) delete process.env.CRON_AUTH_TOKEN;
    else process.env.CRON_AUTH_TOKEN = realEnv;
  });

  it('401 when no Authorization header is sent', async () => {
    const app = makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/cron/youtube-discovery' });
    expect(res.statusCode).toBe(401);
    expect(discoverLiveStreams).not.toHaveBeenCalled();
    await app.close();
  });

  it('401 when the Bearer token is wrong', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/cron/youtube-discovery',
      headers: { authorization: 'Bearer wrong-token' },
    });
    expect(res.statusCode).toBe(401);
    expect(discoverLiveStreams).not.toHaveBeenCalled();
    await app.close();
  });

  it('200 + runs the job when the Bearer token matches env', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/cron/youtube-discovery',
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(res.statusCode).toBe(200);
    expect(discoverLiveStreams).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it('a ?token= query param is NOT honoured — bearer is required', async () => {
    // The legacy surface leaked the secret into the URL. Even with the correct
    // token in the query, the request must 401 because the header is absent.
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/cron/apollo-refresh?token=${TOKEN}`,
    });
    expect(res.statusCode).toBe(401);
    expect(refreshApolloLeads).not.toHaveBeenCalled();
    await app.close();
  });

  it('apollo-refresh passes with a valid Bearer header', async () => {
    const app = makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/cron/apollo-refresh',
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(res.statusCode).toBe(200);
    expect(refreshApolloLeads).toHaveBeenCalledTimes(1);
    await app.close();
  });
});
