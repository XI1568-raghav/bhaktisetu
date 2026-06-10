// scripts/agents/roadmap/cxo/run-all.mjs
import { execFileSync } from 'node:child_process';
import { writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isoWeek } from './_cxo-lib.mjs';

const ROLES = ['cto', 'cfo', 'cmo', 'cpo', 'sales', 'talent', 'cs', 'legal', 'it', 'hr'];
const errors = [];

for (const role of ROLES) {
  try {
    execFileSync('node', [join('scripts/agents/roadmap/cxo', `${role}.mjs`)], { stdio: 'inherit' });
  } catch (e) {
    errors.push({ role, err: e.message });
    console.warn(`[cxo:run-all] ${role} failed: ${e.message}`);
  }
}

// Write index
const week = isoWeek();
const dir = `docs/roadmap/advisory/${week}`;
if (existsSync(dir)) {
  const files = readdirSync(dir).filter(f => f.endsWith('.md') && f !== 'index.md').sort();
  const index = `# Advisory ${week}\n\n${files.map(f => `- [${f.replace('.md', '').toUpperCase()}](./${f})`).join('\n')}\n\nGenerated ${new Date().toISOString()}\n`;
  writeFileSync(`${dir}/index.md`, index);
}

console.log(`[cxo:run-all] done. ${ROLES.length - errors.length}/${ROLES.length} succeeded.`);
if (errors.length) process.exit(1);
