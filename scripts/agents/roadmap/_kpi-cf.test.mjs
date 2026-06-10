import { describe, it, expect } from 'vitest';
import { scrapeCfAnalytics } from './_kpi-cf.mjs';

describe('scrapeCfAnalytics', () => {
  const items = [{ kpi: { source: 'cf', metric: 'pages_builds', query: '{ viewer { accounts { ... } } }' } }];

  it('returns numeric value on successful GraphQL response', async () => {
    process.env.CF_ANALYTICS_TOKEN = 'cf_test_token';
    const fakeFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: { viewer: { accounts: [{ count: 32 }] } } }),
    });
    const res = await scrapeCfAnalytics(items, { fetch: fakeFetch });
    expect(res[0]).toMatchObject({ metric: 'pages_builds', value: 32, stale: false });
    expect(res[0].fetchedAt).toBeDefined();
  });

  it('returns stale when CF_ANALYTICS_TOKEN missing', async () => {
    delete process.env.CF_ANALYTICS_TOKEN;
    const fakeFetch = async () => { throw new Error('should not be called'); };
    const res = await scrapeCfAnalytics(items, { fetch: fakeFetch });
    expect(res[0]).toMatchObject({ metric: 'pages_builds', stale: true, error: expect.stringMatching(/CF_ANALYTICS_TOKEN/) });
  });

  it('returns stale on malformed response shape', async () => {
    process.env.CF_ANALYTICS_TOKEN = 'cf_test_token';
    const fakeFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ errors: [{ message: 'bad query' }] }),
    });
    const res = await scrapeCfAnalytics(items, { fetch: fakeFetch });
    expect(res[0]).toMatchObject({ metric: 'pages_builds', stale: true });
    expect(res[0].error).toBeDefined();
  });
});
