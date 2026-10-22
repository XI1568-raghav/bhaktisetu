import { afterEach, describe, expect, it, vi } from 'vitest';
import { distanceHints, haversineKm, siteCoords } from '../lib/yatra-distance';
import { postJsonWithRetry } from '../lib/post-with-retry';
import { sacredSites } from '../lib/yatra-data';
import { YATRA_TOWN_COORDS } from '../lib/yatra-town-coords';

const site = (id: string) => sacredSites.find((s) => s.id === id)!;

describe('yatra planner distance hints', () => {
  it('Ujjain to Varanasi is roughly 780 km in a straight line', () => {
    const km = haversineKm(siteCoords(site('mahakaleshwar'))!, siteCoords(site('kashi-vishwanath'))!);
    expect(km).toBeGreaterThan(700);
    expect(km).toBeLessThan(850);
  });
  it('gives no hint, and invents nothing, for a town missing from the city table', () => {
    const ghost = { id: 'ghost', name: 'Ghost', location: 'Nowhereville' };
    expect(siteCoords(ghost)).toBeNull();
    expect(distanceHints(ghost, [site('kashi-vishwanath')])).toEqual([]);
    expect(distanceHints(site('kashi-vishwanath'), [ghost])).toEqual([]);
  });
  it('returns the nearest chosen sites first and skips unknown towns', () => {
    const hints = distanceHints(site('ayodhya'), [site('kashi-vishwanath'), site('rameswaram'), site('ayodhya')]);
    expect(hints.map((h) => h.fromId)).toEqual(['kashi-vishwanath', 'rameswaram']);
  });
});

describe('yatra planner town coverage', () => {
  it('every planner site now resolves to coordinates', () => {
    expect(sacredSites.filter((s) => !siteCoords(s)).map((s) => s.location)).toEqual([]);
  });
  it('every added town cites a Wikipedia source and sits inside India', () => {
    for (const [k, v] of Object.entries(YATRA_TOWN_COORDS)) {
      expect(v.source, k).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
      expect(v.lat).toBeGreaterThan(6);
      expect(v.lat).toBeLessThan(37);
      expect(v.lng).toBeGreaterThan(68);
      expect(v.lng).toBeLessThan(98);
    }
  });
  it('previously missing towns give plausible straight-line distances', () => {
    const d = (a: string, b: string) => haversineKm(siteCoords(site(a))!, siteCoords(site(b))!);
    expect(d('somnath', 'dwarka')).toBeGreaterThan(150); // Veraval-Dwarka ~ 200 km
    expect(d('somnath', 'dwarka')).toBeLessThan(260);
    expect(d('kedarnath', 'badrinath')).toBeGreaterThan(25); // Rudraprayag-Chamoli ~ 36 km straight line
    expect(d('kedarnath', 'badrinath')).toBeLessThan(60);
    expect(d('tirupati', 'mallikarjuna')).toBeGreaterThan(240); // ~272 km straight line (road is ~400)
    expect(d('tirupati', 'mallikarjuna')).toBeLessThan(310);
    expect(d('mookambika', 'udupi')).toBeLessThan(80);
  });
  it('rounds hints to 10 km and labels nothing more precise', () => {
    const [h] = distanceHints(site('somnath'), [site('dwarka')]);
    expect(h.km % 10).toBe(0);
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
