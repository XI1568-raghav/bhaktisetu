// Verify every schema-validator probe URL resolves to a real Next route.
// Replaces the inline pr-checks.yml heredoc. Uses the route manifest so
// named dynamic params ([month], [chapter], [kanda], [parva], [pada], [slug],
// catch-alls) all resolve. Exit 1 with ::error:: on any unresolvable probe.
import fs from 'node:fs';
import { buildRouteManifest, resolveProbe } from './route-manifest.mjs';

const src = fs.readFileSync(new URL('./schema-validator.mjs', import.meta.url), 'utf8');
const urls = [...src.matchAll(/url:\s*'([^']+)'/g)].map((m) => m[1]);
const manifest = buildRouteManifest('apps/web/app');
const missing = urls.filter((u) => !resolveProbe(manifest, u));
if (missing.length) {
  console.error('::error::Probe URLs without matching route: ' + missing.join(', '));
  process.exit(1);
}
console.log('All ' + urls.length + ' probe URLs resolve to a route.');
