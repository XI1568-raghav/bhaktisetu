import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { formatNumber, formatDateTime, APP_LOCALE } from '../../lib/format-locale';

/**
 * I-10 (prod sweep 2026-08-12, P3) — bare `toLocaleString()` takes whatever
 * locale the runtime has, which differs between the Render container and the
 * user's browser. On a server-rendered page that is a hydration mismatch, not a
 * cosmetic separator issue: the same node renders different text on each side.
 *
 * 21 call sites across 12 files were migrated to lib/format-locale. This ratchet
 * holds the count at zero rather than asserting a baseline, because unlike the
 * unbounded-findMany case there is no legitimate reason to write a bare one —
 * the helper is always available and always correct.
 */

const WEB = join(__dirname, '..', '..');
const SKIP_DIRS = new Set(['node_modules', '.next', '__tests__', 'coverage']);

/**
 * Comments are not code. Four guards in this sweep matched their own
 * documentation — including one held over baseline by a comment describing a
 * query the same commit had deleted. Strip first, always.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      sourceFiles(full, out);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry) || entry.includes('.test.')) continue;
    out.push(full);
  }
  return out;
}

describe('I-10 — no locale-dependent formatting', () => {
  it('has no bare toLocaleString() anywhere in apps/web', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(WEB)) {
      // The helper itself is the one place a locale is passed explicitly.
      if (file.endsWith(`lib${sep}format-locale.ts`)) continue;
      const src = stripComments(readFileSync(file, 'utf8'));
      const hits = src.match(/\.toLocaleString\(\s*\)/g);
      if (hits) offenders.push(`${relative(WEB, file)} (${hits.length})`);
    }
    expect(
      offenders,
      `Bare toLocaleString() resolves differently on server and client, so the ` +
        `same node hydrates with different text. Use formatNumber / ` +
        `formatDateTime from lib/format-locale instead:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });

  it('formats numbers with Indian grouping, which is the point of pinning en-IN', () => {
    // 1,00,000 not 100,000 — if this ever reads 100,000 the locale silently
    // fell back and the hydration hazard is back.
    expect(formatNumber(100000)).toBe('1,00,000');
    expect(APP_LOCALE).toBe('en-IN');
  });

  it('formats dates in the product timezone, not the container timezone', () => {
    // 2026-08-15T00:30:00Z is 06:00 on the 15th in IST. A UTC-rendered string
    // would say the 15th at 00:30, so this asserts the zone actually applied.
    const out = formatDateTime('2026-08-15T00:30:00.000Z');
    expect(out).toMatch(/15\/8\/2026/);
    expect(out).toMatch(/6:00/);
  });

  it('renders an em dash for an unparseable date rather than "Invalid Date"', () => {
    expect(formatDateTime('not-a-date')).toBe('—');
  });
});
