import { describe, it, expect } from 'vitest';
import { scrapePosthog } from './_kpi-posthog.mjs';

describe('scrapePosthog', () => {
  const items = [{ kpi: { source: 'posthog', metric: 'wau', query: '1234' } }];

  it('returns numeric value on successful API response', async () => {
    const fakeFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ result: [{ count: 42 }] }),
    });
    const res = await scrapePosthog(items, { fetch: fakeFetch });
    expect(res[0]).toMatchObject({ metric: 'wau', value: 42, stale: false });
    expect(res[0].fetchedAt).toBeDefined();
  });

  it('returns stale on HTTP 5xx', async () => {
    const fakeFetch = async () => ({ ok: false, status: 502, json: async () => ({}) });
    const res = await scrapePosthog(items, { fetch: fakeFetch });
    expect(res[0]).toMatchObject({ metric: 'wau', stale: true, error: expect.stringMatching(/502/) });
  });

  it('returns stale on network timeout (AbortError)', async () => {
    const fakeFetch = async () => {
      const e = new Error('aborted');
      e.name = 'AbortError';
      throw e;
    };
    const res = await scrapePosthog(items, { fetch: fakeFetch });
    expect(res[0]).toMatchObject({ metric: 'wau', stale: true, error: expect.stringMatching(/aborted/i) });
  });
});
