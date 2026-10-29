/**
 * One-off generator (NOT run in the build, NOT run at request time) for
 * lib/yatra-road-distances.json.
 *
 *   cd apps/web && npx tsx scripts/gen-yatra-road-distances.ts
 *
 * Asks the public OSRM demo server (router.project-osrm.org, OpenStreetMap data,
 * no key, no card) for ONE driving distance/duration matrix between the towns of
 * the planner's sacred sites, then writes the result as data. One request, once,
 * well inside the demo server's "light use" policy (max ~1 request/second, no
 * systematic crawling); the site never calls OSRM itself, so visitors cannot
 * rate-limit it and it cannot go down under them. Re-run only if the site list
 * changes. Routing data (c) OpenStreetMap contributors, ODbL.
 *
 * A pair OSRM cannot route (no road between the snapped points) is left out: the
 * planner then shows only the straight-line hint. Nothing is estimated here.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sacredSites } from '../lib/yatra-data';
import { siteCoords } from '../lib/yatra-distance';

async function main() {
const towns = new Map<string, { lat: number; lng: number }>();
for (const s of sacredSites) {
  const c = siteCoords(s);
  if (c) towns.set(s.location.toLowerCase(), c);
}
const names = [...towns.keys()].sort();
const coords = names.map((n) => `${towns.get(n)!.lng},${towns.get(n)!.lat}`).join(';');

const url = `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance,duration`;
const res = await fetch(url, { headers: { 'User-Agent': 'darshya-yatra-planner-generator (support@darshya.online)' } });
if (!res.ok) throw new Error(`OSRM answered ${res.status}`);
const body = (await res.json()) as { code: string; distances: (number | null)[][]; durations: (number | null)[][] };
if (body.code !== 'Ok') throw new Error(`OSRM code ${body.code}`);

const pairs: Record<string, [number, number]> = {};
for (let i = 0; i < names.length; i++) {
  for (let j = i + 1; j < names.length; j++) {
    const d = body.distances[i]?.[j];
    const t = body.durations[i]?.[j];
    if (typeof d !== 'number' || typeof t !== 'number') continue;
    pairs[`${names[i]}|${names[j]}`] = [Math.round(d / 1000), Math.round((t / 3600) * 10) / 10];
  }
}

const out = {
  source: 'OSRM public demo (router.project-osrm.org), car profile, OpenStreetMap data (c) OpenStreetMap contributors, ODbL',
  generatedAt: new Date().toISOString().slice(0, 10),
  note: 'Approximate driving distance and time between town centres, free-flow, no traffic, no ghats/closure/season adjustment. Keys are "townA|townB" with lower-case names sorted; values are [km, hours].',
  pairs,
};
writeFileSync(join(process.cwd(), 'lib', 'yatra-road-distances.json'), JSON.stringify({ ...out, pairs: undefined }, null, 1).replace(/\n}$/, ',\n "pairs": ' + JSON.stringify(pairs).replace(/\],/g, '],\n  ') + '\n}') + '\n');
console.log(`towns ${names.length}, pairs ${Object.keys(pairs).length}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
