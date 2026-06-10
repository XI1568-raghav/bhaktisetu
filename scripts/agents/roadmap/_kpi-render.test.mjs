import { describe, it, expect } from 'vitest';
import { scrapeRender } from './_kpi-render.mjs';

describe('scrapeRender', () => {
  const items = [{ kpi: { source: 'render', metric: 'api_status', query: 'srv-abc123' } }];

  it('returns latest deploy status on successful API response', async () => {
    process.env.RENDER_API_KEY = 'rnd_test_key';
    const fakeFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ([{ status: 'live', finishedAt: '2026-06-10T12:00:00Z' }]),
    });
    const res = await scrapeRender(items, { fetch: fakeFetch });
    expect(res[0]).toMatchObject({ metric: 'api_status', value: 'live', stale: false });
    expect(res[0].fetchedAt).toBeDefined();
  });

  it('returns stale on HTTP 5xx', async () => {
    process.env.RENDER_API_KEY = 'rnd_test_key';
    const fakeFetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
    const res = await scrapeRender(items, { fetch: fakeFetch });
    expect(res[0]).toMatchObject({ metric: 'api_status', stale: true, error: expect.stringMatching(/503/) });
  });

  it('returns stale when RENDER_API_KEY missing', async () => {
    delete process.env.RENDER_API_KEY;
    const fakeFetch = async () => { throw new Error('should not be called'); };
    const res = await scrapeRender(items, { fetch: fakeFetch });
    expect(res[0]).toMatchObject({ metric: 'api_status', stale: true, error: expect.stringMatching(/RENDER_API_KEY/) });
  });
});
