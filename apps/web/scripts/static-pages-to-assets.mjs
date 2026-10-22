// Post-build step of `pnpm build:cf`: copy the prerendered HTML of the routes listed in
// scripts/cf-static-pages.json into .open-next/assets, so Cloudflare answers them from the
// asset layer and never starts the Worker (free plan: 10 ms CPU; a cold Worker spends ~0.9 s
// importing the server bundle on its first request, which surfaces as error 1102).
//
// Fails the build when a listed `legal` or `exact` route is missing or not fully static
// (initialRevalidateSeconds !== false), so a page cannot silently become dynamic again.
// `prefixes` take every FULLY STATIC route under them and skip ISR ones (e.g. /darshan/*/replay).
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

function isStatic(route) {
  return routes[route] && routes[route].initialRevalidateSeconds === false;
}

const required = [...cfg.legal, ...cfg.exact];
const wanted = new Set(required);
for (const prefix of cfg.prefixes) {
  for (const route of Object.keys(routes)) {
    if ((route === prefix || route.startsWith(prefix + '/')) && isStatic(route)) wanted.add(route);
  }
}

const problems = [];
for (const route of required) {
  if (!routes[route]) problems.push(`${route}: not prerendered (the page became dynamic or was removed)`);
  else if (!isStatic(route)) problems.push(`${route}: prerendered with revalidate=${routes[route].initialRevalidateSeconds}, must be fully static`);
}
if (problems.length) {
  console.error('static-pages-to-assets: these routes must be pure static for the Cloudflare free plan:\n  ' + problems.join('\n  '));
  process.exit(1);
}

let copied = 0;
for (const route of [...wanted].sort()) {
  const src = path.join(nextDir, 'server/app', route + '.html');
  if (!fs.existsSync(src)) {
    console.error(`static-pages-to-assets: missing ${src}`);
    process.exit(1);
  }
  try {
    const meta = JSON.parse(fs.readFileSync(src.replace(/\.html$/, '.meta'), 'utf8'));
    if (meta.status && meta.status !== 200) continue;
  } catch {
    // no .meta: a plain 200 page
  }
  const dest = path.join(assetsDir, route + '.html');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  copied++;
}
console.log(`static-pages-to-assets: ${copied} prerendered pages copied to .open-next/assets (served without the Worker)`);
