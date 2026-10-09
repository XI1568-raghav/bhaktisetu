import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { clampDescription, clampTitle } from '../../lib/seo/clamp';

const APP = join(__dirname, '..', '..', 'app');

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) {
      if (n === '__tests__' || n === 'node_modules') continue;
      walk(p, out);
    } else if (/^(page|layout)\.tsx$/.test(n)) out.push(p);
  }
  return out;
}

const LITERAL = /(^|[^\w$.])(title|description)\s*:\s*(['"`])((?:\\.|(?!\3)[^\\])*)\3/gm;

function count() {
  let longDescriptions = 0;
  let longTitles = 0;
  for (const f of walk(APP)) {
    const src = readFileSync(f, 'utf8');
    // Only the first literal of each kind per file: the page's own metadata,
    // not nested openGraph/twitter copies or unrelated `title:` fields.
    const seen = new Set<string>();
    for (const m of src.matchAll(LITERAL)) {
      const kind = m[2];
      if (seen.has(kind) || m[4].includes('${')) continue;
      seen.add(kind);
      if (kind === 'description' && m[4].length > 160) longDescriptions++;
      if (kind === 'title' && m[4].length > 60) longTitles++;
    }
  }
  return { longDescriptions, longTitles };
}

// Ratchet: these may only go DOWN. Lower the numbers when you fix a page.
const BASELINE = { longDescriptions: 77, longTitles: 46 };

describe('snippet length ratchet', () => {
  it('static page descriptions >160 and titles >60 never increase', () => {
    const c = count();
    expect(c.longDescriptions).toBeLessThanOrEqual(BASELINE.longDescriptions);
    expect(c.longTitles).toBeLessThanOrEqual(BASELINE.longTitles);
  });

  it('clamp helpers cut on boundaries and stay within the limit', () => {
    const long = 'Book a puja online with video proof. '.repeat(10);
    const d = clampDescription(long);
    expect(d.length).toBeLessThanOrEqual(155);
    expect(d.endsWith('.')).toBe(true);
    expect(clampTitle('A very long title that keeps going well past the sixty character limit')).toMatch(/…$/);
    expect(clampDescription('short')).toBe('short');
  });
});
