import { CITIES } from './indian-cities';
import { YATRA_TOWN_COORDS } from './yatra-town-coords';
import type { SacredSite } from './yatra-data';
import ROAD from './yatra-road-distances.json';

/**
 * Straight-line (great-circle) distance hints for the custom yatra planner.
 *
 * Honest by construction: coordinates come only from cited tables in the repo
 * (lib/indian-cities.ts, plus lib/yatra-town-coords.ts with a source URL per
 * town), matched by the site's `location` town. A site whose town is in neither
 * simply gets no hint; nothing is guessed. The figure is the distance as the crow
 * flies and the UI labels it so; road/rail distance is always longer.
 */

type Pt = { lat: number; lng: number };

const byName = new Map(CITIES.map((c) => [c.name.toLowerCase(), c]));

export function siteCoords(site: Pick<SacredSite, 'location'>): Pt | null {
  const key = site.location.toLowerCase();
  const c = byName.get(key) ?? YATRA_TOWN_COORDS[key];
  return c ? { lat: c.lat, lng: c.lng } : null;
}

export function haversineKm(a: Pt, b: Pt): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface RoadHint {
  /** Driving distance, rounded to 10 km. */
  km: number;
  /** Driving time in hours, rounded to the nearest half hour. */
  hours: number;
}

export interface DistanceHint {
  fromId: string;
  fromName: string;
  km: number;
  /** Present only when the published table has this town pair; never estimated. */
  road?: RoadHint;
}

/**
 * Driving distance/time between two towns from lib/yatra-road-distances.json, a
 * table generated once from OpenStreetMap routing (see
 * scripts/gen-yatra-road-distances.ts). Absent pair or same town: null, and the
 * caller shows the straight-line figure alone. It is a free-flow estimate between
 * town centres, so callers must call it approximate.
 */
export function roadHint(a: Pick<SacredSite, 'location'>, b: Pick<SacredSite, 'location'>): RoadHint | null {
  const x = a.location.toLowerCase();
  const y = b.location.toLowerCase();
  if (x === y) return null;
  const row = (ROAD.pairs as unknown as Record<string, [number, number]>)[x < y ? `${x}|${y}` : `${y}|${x}`];
  if (!row) return null;
  return { km: Math.round(row[0] / 10) * 10, hours: Math.round(row[1] * 2) / 2 };
}

/** The `max` nearest already-chosen sites to `added`, nearest first. */
export function distanceHints(
  added: Pick<SacredSite, 'id' | 'location'>,
  others: Pick<SacredSite, 'id' | 'name' | 'location'>[],
  max = 2,
): DistanceHint[] {
  const a = siteCoords(added);
  if (!a) return [];
  const out: DistanceHint[] = [];
  for (const o of others) {
    if (o.id === added.id) continue;
    const b = siteCoords(o);
    if (!b) continue;
    const km = Math.round(haversineKm(a, b) / 10) * 10;
    // Two sites in the same town (Mathura/Vrindavan) are ~0 km apart: say so as "same town" in the UI.
    const road = roadHint(added, o);
    out.push({ fromId: o.id, fromName: o.name, km, ...(road ? { road } : {}) });
  }
  return out.sort((x, y) => x.km - y.km).slice(0, max);
}
