// Post-build step of `pnpm build:cf`: copy prerendered HTML into .open-next/assets so Cloudflare
// answers those paths from the asset layer and never starts the Worker (free plan: 10 ms CPU; a
// cold Worker spends ~0.9 s importing the server bundle on its first request = error 1102).
//
// Routes are DISCOVERED from .next/prerender-manifest.json, not hand-listed:
//   - every fully static route (initialRevalidateSeconds === false) with a 200 HTML file, and
//   - ISR routes under `isrStaticPrefixes` (committed in-repo data; the Workers cache is read-only),
// minus the `exclude` list in scripts/cf-static-pages.json (locale landings, 404 shell, OG, ...).
// Fails the build when a `mustBeStatic` route is missing/not static, or when a page under a portal
// prefix is neither static nor listed in `workerServed`.
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const cfg = JSON.parse(fs.readFileSync(path.join(cwd, 'scripts/cf-static-pages.json'), 'utf8'));
const nextDir = path.join(cwd, '.next');
const assetsDir = path.join(cwd, '.open-next/assets');

if (!fs.existsSync(assetsDir)) {
  console.error(`static-pages-to-assets: ${assetsDir} not found; run the OpenNext build first.`);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(path.join(nextDir, 'prerender-manifest.json'), 'utf8'));
const routes = manifest.routes ?? {};
const isStatic = (r) => routes[r] && routes[r].initialRevalidateSeconds === false;

// Page routes (not route handlers) the build produced, e.g. "/priest/bookings/[id]".
const appPaths = JSON.parse(fs.readFileSync(path.join(nextDir, 'server/app-paths-manifest.json'), 'utf8'));
const pageRoutes = Object.keys(appPaths).filter((k) => k.endsWith('/page')).map((k) => k.slice(0, -5) || '/');

const problems = [];
for (const route of cfg.mustBeStatic.routes) {
  if (!routes[route]) problems.push(`${route}: not prerendered (the page became dynamic or was removed)`);
  else if (!isStatic(route)) problems.push(`${route}: prerendered with revalidate=${routes[route].initialRevalidateSeconds}, must be fully static`);
}
for (const prefix of cfg.mustBeStatic.portalPrefixes) {
  for (const route of pageRoutes) {
    if (route !== prefix && !route.startsWith(prefix + '/')) continue;
    if (isStatic(route) || cfg.workerServed[route]) continue;
    problems.push(`${route}: under portal prefix ${prefix} but not fully static (reads cookies/headers/searchParams or has revalidate?). Fix the page or list it in workerServed with a reason`);
  }
}
if (problems.length) {
  console.error('static-pages-to-assets: these routes must be pure static for the Cloudflare free plan:\n  ' + problems.join('\n  '));
  process.exit(1);
}

const excludedExact = new Set(Object.keys(cfg.exclude.routes).filter((k) => !k.startsWith('_')));
const excludedPrefix = Object.keys(cfg.exclude.prefixes).filter((k) => !k.startsWith('_'));
const isrPrefixes = cfg.isrStaticPrefixes.prefixes;
const underPrefix = (route, p) => route === p || route.startsWith(p + '/');

const wanted = [];
const skipped = { excluded: 0, noHtml: 0, nonOk: 0, redirect: 0 };
for (const route of Object.keys(routes)) {
  if (route === '/') continue; // root redirects on the locale cookie (middleware)
  const fullyStatic = isStatic(route);
  if (!fullyStatic && !isrPrefixes.some((p) => underPrefix(route, p))) continue;
  if (excludedExact.has(route) || excludedPrefix.some((p) => route.startsWith(p))) { skipped.excluded++; continue; }
  const src = path.join(nextDir, 'server/app', route + '.html');
  if (!fs.existsSync(src)) { skipped.noHtml++; continue; }
  try {
    const meta = JSON.parse(fs.readFileSync(src.replace(/\.html$/, '.meta'), 'utf8'));
    if (meta.status && meta.status !== 200) { skipped.nonOk++; continue; }
  } catch {
    // no .meta: a plain 200 page
  }
  if (fs.readFileSync(src, 'utf8').includes('id="__next-page-redirect"')) { skipped.redirect++; continue; }
  wanted.push({ route, src, isr: !fullyStatic });
}

for (const { route, src } of wanted) {
  const dest = path.join(assetsDir, route + '.html');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
const isr = wanted.filter((w) => w.isr).length;
console.log(
  `static-pages-to-assets: ${wanted.length} prerendered pages copied to .open-next/assets (${wanted.length - isr} static, ${isr} ISR-static-data; served without the Worker). ` +
    `skipped: ${JSON.stringify(skipped)}`,
);
