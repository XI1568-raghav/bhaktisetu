import { describe, it, expect } from 'vitest';
import ROAD from '../lib/yatra-road-distances.json';
import { distanceHints, haversineKm, roadHint, siteCoords } from '../lib/yatra-distance';
import { sacredSites } from '../lib/yatra-data';

const site = (id: string) => sacredSites.find((s) => s.id === id)!;

describe('yatra road distances (published table, no runtime call)', () => {
  it('cites its source and is dated', () => {
    expect(ROAD.source).toMatch(/OpenStreetMap/);
    expect(ROAD.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('every pair is plausible against the straight-line distance (never shorter, at most 3x)', () => {
    const towns = new Map(sacredSites.map((s) => [s.location.toLowerCase(), s]));
    let checked = 0;
    for (const [key, [km, hours]] of Object.entries(ROAD.pairs as Record<string, [number, number]>)) {
      const [a, b] = key.split('|');
      const sa = towns.get(a!)!;
      const sb = towns.get(b!)!;
      expect(sa && sb, key).toBeTruthy();
      const straight = haversineKm(siteCoords(sa)!, siteCoords(sb)!);
      expect(km, key).toBeGreaterThanOrEqual(Math.floor(straight * 0.97));
      expect(km, key).toBeLessThanOrEqual(Math.max(straight * 3, straight + 60));
      expect(hours, key).toBeGreaterThan(0);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(400);
  });

  it('is symmetric in use and rounds honestly', () => {
    const a = roadHint(site('ayodhya'), site('kashi-vishwanath'));
    const b = roadHint(site('kashi-vishwanath'), site('ayodhya'));
    expect(a).toEqual(b);
    expect(a!.km % 10).toBe(0);
    expect((a!.hours * 2) % 1).toBe(0);
  });

  it('same town and unknown towns give no road figure (nothing invented)', () => {
    expect(roadHint({ location: 'Varanasi' }, { location: 'Varanasi' })).toBeNull();
    expect(roadHint({ location: 'Ghost' }, { location: 'Varanasi' })).toBeNull();
  });

  it('hints carry the road figure next to the straight-line one', () => {
    const [h] = distanceHints(site('ayodhya'), [site('kashi-vishwanath')]);
    expect(h!.km).toBeGreaterThan(0);
    expect(h!.road!.km).toBeGreaterThanOrEqual(h!.km - 10);
  });
});
