// Build a route manifest from apps/web/app by scanning for page.tsx files.
// Each dynamic segment [param] -> regex capture group; [...slug] -> greedy.
// Static — derived from the filesystem, so it can never drift when new
// named params ([id], [slug], catch-alls) are added.
import fs from 'node:fs';
import path from 'node:path';

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.name === 'page.tsx') yield full;
  }
}

// Convert a route dir pattern to a RegExp matching concrete URLs.
// 'calendar/[month]' -> /^\/calendar\/[^/]+\/?$/
function patternToRegex(routePattern) {
  const segs = routePattern.split('/').filter(Boolean);
  const parts = segs.map((s) => {
    const catchAll = s.match(/^\[\.\.\.(.+)\]$/);
    if (catchAll) return '(?:[^/]+/)*[^/]+';
    const dyn = s.match(/^\[(.+)\]$/);
    if (dyn) return '[^/]+';
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  return new RegExp('^/' + parts.join('/') + '/?$');
}

export function buildRouteManifest(appDir) {
  const manifest = [];
  for (const pagePath of walk(appDir)) {
    const rel = path.relative(appDir, path.dirname(pagePath));
    const routePattern = rel.split(path.sep).join('/');
    manifest.push({ pattern: routePattern, regex: patternToRegex(routePattern) });
  }
  return manifest;
}

export function resolveProbe(manifest, url) {
  const clean = url.replace(/^\//, '').replace(/\/$/, '');
  const target = '/' + clean;
  return manifest.some((m) => m.regex.test(target));
}
