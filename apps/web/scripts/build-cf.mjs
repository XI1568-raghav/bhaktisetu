// Cloudflare build: pre-render OG cards, then run the OpenNext build with
// NEXT_PUBLIC_OG_STATIC=1 so metadata points at the static PNGs. The Render
// Docker path (`next build`) never runs this and keeps the dynamic routes.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const win = process.platform === 'win32';
function findBin(name) {
  let dir = process.cwd();
  for (;;) {
    const p = path.join(dir, 'node_modules', '.bin', name + (win ? '.cmd' : ''));
    if (fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if (up === dir) return name;
    dir = up;
  }
}
function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: win, env: { ...process.env, ...env } });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
run(findBin('tsx'), ['--tsconfig', 'scripts/tsconfig.prerender.json', 'scripts/prerender-og.mjs']);
if (process.argv.includes('--og-only')) process.exit(0);
run(findBin('opennextjs-cloudflare'), ['build'], { NEXT_PUBLIC_OG_STATIC: '1' });
