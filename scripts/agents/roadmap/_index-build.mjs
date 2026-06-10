// Build compact _index.json from docs/roadmap/items/**/*.md frontmatter.
// Drops verbose fields (body, agent_brief.prompt_skeleton) to keep Orchestrator context tight.
// Usage: node scripts/agents/roadmap/_index-build.mjs
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { walk, parseFrontmatter, ITEMS_ROOT } from './_lib.mjs';

export function buildIndex(itemsRoot = ITEMS_ROOT) {
  const items = [];
  for (const file of walk(itemsRoot)) {
    const content = readFileSync(file, 'utf8');
    let fm;
    try { fm = parseFrontmatter(content); } catch (e) {
      console.warn(`[index-build] skipping ${file}: ${e.message}`);
      continue;
    }
    // Drop verbose body + prompt_skeleton from index; keep context_files for filtering
    const compact = { ...fm };
    if (compact.agent_brief?.prompt_skeleton) {
      compact.agent_brief = { context_files: compact.agent_brief.context_files || [] };
    }
    compact._file = file.replaceAll('\\', '/');
    items.push(compact);
  }
  return { generatedAt: new Date().toISOString(), items };
}

const isCli = (() => {
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch { return false; }
})();
if (isCli) {
  const idx = buildIndex();
  writeFileSync('docs/roadmap/_index.json', JSON.stringify(idx, null, 2));
  console.log(`Wrote _index.json with ${idx.items.length} items.`);
}
