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
const isrPrefixes = [...cfg.isrStaticPrefixes.prefixes, ...(cfg.isrBuildDataPrefixes?.prefixes ?? [])];
const isrExact = new Set(cfg.isrStaticRoutes?.routes ?? []);
const underPrefix = (route, p) => route === p || route.startsWith(p + '/');
const isrPatterns = (cfg.isrBuildDataPatterns?.patterns ?? []).map((p) => new RegExp(p.match));

// Prerendered redirects (alias slugs: /tirth/somnath-jyotirlinga -> /tirth/somnath, /live -> /darshan,
// /festivals -> /festival, ...) are answered by the asset layer through `_redirects` instead of the
// Worker. Discovered from the prerender output, so each page's own alias map stays the single source.
const redirects = [];
for (const route of Object.keys(routes)) {
  if (excludedExact.has(route) || excludedPrefix.some((p) => route.startsWith(p))) continue;
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(path.join(nextDir, 'server/app', (route === '/' ? '/index' : route) + '.meta'), 'utf8'));
  } catch {
    continue;
  }
  const location = meta.headers?.location;
  if (
    [301, 302, 307, 308].includes(meta.status) &&
    typeof location === 'string' &&
    /^\/[^\s?#*:]*$/.test(location) &&
    /^\/[^\s*:?#]+$/.test(route) &&
    route !== location
  ) {
    redirects.push({ from: route, to: location, status: meta.status });
  }
}

const wanted = [];
const skipped = { excluded: 0, noHtml: 0, nonOk: 0, redirect: 0 };
for (const route of Object.keys(routes)) {
  const fullyStatic = isStatic(route);
  if (!fullyStatic && !isrExact.has(route) && !isrPrefixes.some((p) => underPrefix(route, p)) && !isrPatterns.some((rx) => rx.test(route))) continue;
  if (excludedExact.has(route) || excludedPrefix.some((p) => route.startsWith(p))) { skipped.excluded++; continue; }
  // The root page is prerendered as server/app/index.html and must land at assets/index.html.
  const file = route === '/' ? '/index' : route;
  const src = path.join(nextDir, 'server/app', file + '.html');
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
  const dest = path.join(assetsDir, (route === '/' ? '/index' : route) + '.html');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
// Append the discovered redirects to the assets' _redirects (copied there from public/). Rules already
// present for the same source path win; Workers assets accept up to 2000 static rules.
const redirectsFile = path.join(assetsDir, '_redirects');
const existingRules = fs.existsSync(redirectsFile) ? fs.readFileSync(redirectsFile, 'utf8') : '';
const haveFrom = new Set(
  existingRules.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l.split(/\s+/)[0]),
);
const newRules = redirects.filter((r) => !haveFrom.has(r.from));
if (newRules.length) {
  const block =
    '\n# Generated by scripts/static-pages-to-assets.mjs from the prerendered redirects (alias slugs).\n' +
    newRules.map((r) => `${r.from} ${r.to} ${r.status}`).join('\n') +
    '\n';
  fs.writeFileSync(redirectsFile, existingRules.replace(/\s*$/, '\n') + block);
}
const copied = new Set(wanted.map((w) => w.route));
const missing = (cfg.mustBeCopied?.routes ?? []).filter((r) => !copied.has(r));
if (missing.length) {
  console.error('static-pages-to-assets: these routes must be copied to assets but were not (no longer prerendered, excluded, or not a 200 page): ' + missing.join(', '));
  process.exit(1);
}
const isr = wanted.filter((w) => w.isr).length;
console.log(
  `static-pages-to-assets: ${wanted.length} prerendered pages copied to .open-next/assets (${wanted.length - isr} static, ${isr} ISR-static-data; served without the Worker). ` +
    `skipped: ${JSON.stringify(skipped)}; ${newRules.length} alias redirects added to _redirects.`,
);
