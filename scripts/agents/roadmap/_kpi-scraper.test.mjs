import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeAllKpis } from './_kpi-scraper.mjs';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let cachePath;
beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), 'kpi-cache-'));
  cachePath = join(dir, '_kpi-cache.json');
  writeFileSync(cachePath, '{"lastFullRefresh":null,"entries":{}}');
});

describe('scrapeAllKpis', () => {
  it('routes manual source to manual scraper + writes cache', async () => {
    const items = [{ kpi: { source: 'manual', metric: 'foo', query: 'foo' } }];
    const res = await scrapeAllKpis(items, {
      cachePath,
      forceRefresh: true,
      scrapeManualFn: vi.fn().mockResolvedValue([{ metric: 'foo', value: 42, stale: false, fetchedAt: '2026-06-10T00:00:00Z' }]),
    });
    expect(res[0]).toMatchObject({ metric: 'foo', value: 42 });
  });

  it('serves from cache when within TTL', async () => {
    const items = [{ kpi: { source: 'manual', metric: 'foo', query: 'foo' } }];
    writeFileSync(cachePath, JSON.stringify({
      lastFullRefresh: '2026-06-10T00:00:00Z',
      entries: { 'manual:foo': { value: 99, stale: false, fetchedAt: new Date().toISOString() } },
    }));
    const scrapeManualFn = vi.fn();
    const res = await scrapeAllKpis(items, { cachePath, scrapeManualFn });
    expect(res[0].value).toBe(99);
    expect(res[0].cached).toBe(true);
    expect(scrapeManualFn).not.toHaveBeenCalled();
  });

  it('forces refresh w/ forceRefresh=true', async () => {
    const items = [{ kpi: { source: 'manual', metric: 'foo', query: 'foo' } }];
    writeFileSync(cachePath, JSON.stringify({
      lastFullRefresh: '2026-06-10T00:00:00Z',
      entries: { 'manual:foo': { value: 99, stale: false, fetchedAt: new Date().toISOString() } },
    }));
    const scrapeManualFn = vi.fn().mockResolvedValue([{ metric: 'foo', value: 42, stale: false, fetchedAt: '2026-06-10T00:01:00Z' }]);
    const res = await scrapeAllKpis(items, { cachePath, forceRefresh: true, scrapeManualFn });
    expect(res[0].value).toBe(42);
    expect(scrapeManualFn).toHaveBeenCalled();
  });

  it('refreshes when entry is older than TTL', async () => {
    const items = [{ kpi: { source: 'manual', metric: 'foo', query: 'foo' } }];
    const oldTs = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    writeFileSync(cachePath, JSON.stringify({
      lastFullRefresh: oldTs,
      entries: { 'manual:foo': { value: 99, stale: false, fetchedAt: oldTs } },
    }));
    const scrapeManualFn = vi.fn().mockResolvedValue([{ metric: 'foo', value: 100, stale: false, fetchedAt: new Date().toISOString() }]);
    const res = await scrapeAllKpis(items, { cachePath, scrapeManualFn });
    expect(res[0].value).toBe(100);
    expect(scrapeManualFn).toHaveBeenCalled();
  });

  it('uses 24h TTL for cf_analytics source', async () => {
    const items = [{ kpi: { source: 'cf_analytics', metric: 'traffic', query: 'query' } }];
    const ts6hAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
    writeFileSync(cachePath, JSON.stringify({
      lastFullRefresh: ts6hAgo,
      entries: { 'cf_analytics:traffic': { value: 500, stale: false, fetchedAt: ts6hAgo } },
    }));
    const scrapeCfFn = vi.fn();
    const res = await scrapeAllKpis(items, { cachePath, scrapeCfFn });
    expect(res[0].value).toBe(500);
    expect(res[0].cached).toBe(true);
    expect(scrapeCfFn).not.toHaveBeenCalled();
  });

  it('partial failure: one source down does not block others', async () => {
    const items = [
      { kpi: { source: 'manual', metric: 'foo', query: 'foo' } },
      { kpi: { source: 'supabase', metric: 'bar', query: 'SELECT 1' } },
    ];
    const res = await scrapeAllKpis(items, {
      cachePath,
      forceRefresh: true,
      scrapeManualFn: vi.fn().mockResolvedValue([{ metric: 'foo', value: 42, stale: false, fetchedAt: 'now' }]),
      scrapeSupabaseFn: vi.fn().mockRejectedValue(new Error('boom')),
    });
    expect(res.find(r => r.metric === 'foo').value).toBe(42);
  });
});
