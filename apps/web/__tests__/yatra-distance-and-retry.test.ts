import { afterEach, describe, expect, it, vi } from 'vitest';
import { distanceHints, haversineKm, siteCoords } from '../lib/yatra-distance';
import { postJsonWithRetry } from '../lib/post-with-retry';
import { sacredSites } from '../lib/yatra-data';

const site = (id: string) => sacredSites.find((s) => s.id === id)!;

describe('yatra planner distance hints', () => {
  it('Ujjain to Varanasi is roughly 780 km in a straight line', () => {
    const km = haversineKm(siteCoords(site('mahakaleshwar'))!, siteCoords(site('kashi-vishwanath'))!);
    expect(km).toBeGreaterThan(700);
    expect(km).toBeLessThan(850);
  });
  it('gives no hint, and invents nothing, for a town missing from the city table', () => {
    expect(siteCoords(site('somnath'))).toBeNull(); // Veraval
    expect(distanceHints(site('somnath'), [site('kashi-vishwanath')])).toEqual([]);
  });
  it('returns the nearest chosen sites first and skips unknown towns', () => {
    const hints = distanceHints(site('ayodhya'), [site('kashi-vishwanath'), site('rameswaram'), site('somnath'), site('ayodhya')]);
    expect(hints.map((h) => h.fromId)).toEqual(['kashi-vishwanath', 'rameswaram']);
  });
});

describe('postJsonWithRetry (cold-start API)', () => {
  afterEach(() => vi.restoreAllMocks());
  it('retries a dropped connection and a 503, then returns the success', async () => {
    const f = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('network'))
      .mockResolvedValueOnce(new Response('x', { status: 503 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    const onRetry = vi.fn();
    const res = await postJsonWithRetry('http://x/y', { a: 1 }, { backoffMs: 1, onRetry });
    expect(res.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });
  it('does not retry a 4xx', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('no', { status: 400 }));
    const res = await postJsonWithRetry('http://x/y', {}, { backoffMs: 1 });
    expect(res.status).toBe(400);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('throws after the last failed attempt', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network'));
    await expect(postJsonWithRetry('http://x/y', {}, { attempts: 2, backoffMs: 1 })).rejects.toThrow('network');
  });
});
