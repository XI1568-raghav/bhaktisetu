// Shared helpers for scripts/agents/roadmap/_*.mjs utilities.
// Pure node ESM, single dependency: js-yaml.
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

export const ITEMS_ROOT = 'docs/roadmap/items';
export const ROADMAP_ROOT = 'docs/roadmap';

export function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (e.endsWith('.md')) out.push(p);
  }
  return out;
}

export function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
  if (!m) throw new Error("no frontmatter (expected '---\\n...\\n---' at file start)");
  return yaml.load(m[1]);
}

export function readItemFrontmatter(filepath) {
  return parseFrontmatter(readFileSync(filepath, 'utf8'));
}
