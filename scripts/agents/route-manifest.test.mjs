import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRouteManifest, resolveProbe } from './route-manifest.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function mk(root, rel) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, 'export default function Page(){}');
}

test('resolves static + named dynamic + catch-all routes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-'));
  mk(root, 'page.tsx'); // /
  mk(root, 'pujas/page.tsx'); // /pujas
  mk(root, 'calendar/[month]/page.tsx'); // /calendar/:month
  mk(root, 'gita/[chapter]/page.tsx'); // /gita/:chapter
  mk(root, 'docs/[...rest]/page.tsx'); // /docs/*
  const manifest = buildRouteManifest(root);
  assert.equal(resolveProbe(manifest, '/'), true);
  assert.equal(resolveProbe(manifest, '/pujas'), true);
  assert.equal(resolveProbe(manifest, '/calendar/march'), true);
  assert.equal(resolveProbe(manifest, '/gita/karma-yoga'), true);
  assert.equal(resolveProbe(manifest, '/docs/a/b/c'), true);
  assert.equal(resolveProbe(manifest, '/nope/missing'), false);
});

test('route groups do not appear in the URL', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'routes-group-'));
  mk(root, 'pujas/(index)/page.tsx'); // serves /pujas, NOT /pujas/(index)
  mk(root, 'temples/(index)/page.tsx'); // serves /temples
  mk(root, 'pujas/[slug]/page.tsx'); // /pujas/:slug still resolves alongside
  mk(root, '(marketing)/about/page.tsx'); // a leading group serves /about
  const manifest = buildRouteManifest(root);
  assert.equal(resolveProbe(manifest, '/pujas'), true);
  assert.equal(resolveProbe(manifest, '/temples'), true);
  assert.equal(resolveProbe(manifest, '/pujas/ganesh'), true);
  assert.equal(resolveProbe(manifest, '/about'), true);
  // The group name itself is not a URL segment.
  assert.equal(manifest.some((m) => m.pattern.includes('(')), false);
});
