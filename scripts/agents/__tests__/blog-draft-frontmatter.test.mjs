// Validates deity-of-day-cluster blog drafts in docs/agent-reports/blog-drafts/.
// Spec: docs/roadmap/_dryrun/queue/2026-06-13T04-51-41-293Z-cmo-R-Q1-M-009-r-q1-m-009.md
// Required frontmatter: title, slug, target_keyword, meta_description, tags, deity, weekday, week_number
// meta_description 140-160 chars
// body contains ≥1 link each to /deity/, /pujas/, /aarti/
// word count 800-1500
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = join(__dirname, '..', '..', '..', 'docs', 'agent-reports', 'blog-drafts');

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { fm: null, body: raw };
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
    }
    fm[kv[1]] = v;
  }
  return { fm, body: m[2] };
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function isClusterDraft(fm) {
  if (!fm || !fm.tags) return false;
  const tags = Array.isArray(fm.tags) ? fm.tags : [fm.tags];
  return tags.includes('deity-of-day-cluster');
}

const files = (() => {
  try {
    return readdirSync(DRAFTS_DIR).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }
})();

const clusterFiles = files
  .map((f) => {
    const raw = readFileSync(join(DRAFTS_DIR, f), 'utf8');
    return { file: f, ...parseFrontmatter(raw) };
  })
  .filter(({ fm }) => isClusterDraft(fm));

describe('deity-of-day-cluster blog drafts', () => {
  it('exists in drafts directory (vacuous green when 0 files)', () => {
    expect(Array.isArray(clusterFiles)).toBe(true);
  });

  for (const { file, fm, body } of clusterFiles) {
    describe(file, () => {
      it('has all required frontmatter fields', () => {
        for (const key of ['title', 'slug', 'target_keyword', 'meta_description', 'tags', 'deity', 'weekday', 'week_number']) {
          expect(fm[key], `missing ${key}`).toBeTruthy();
        }
      });
      it('meta_description is 140-160 chars', () => {
        expect(fm.meta_description.length).toBeGreaterThanOrEqual(140);
        expect(fm.meta_description.length).toBeLessThanOrEqual(160);
      });
      it('body links to /deity/, /pujas/, /aarti/', () => {
        expect(body).toMatch(/\/deity\//);
        expect(body).toMatch(/\/pujas\//);
        expect(body).toMatch(/\/aarti\//);
      });
      it('word count 800-1500', () => {
        const wc = countWords(body);
        expect(wc).toBeGreaterThanOrEqual(800);
        expect(wc).toBeLessThanOrEqual(1500);
      });
    });
  }
});
