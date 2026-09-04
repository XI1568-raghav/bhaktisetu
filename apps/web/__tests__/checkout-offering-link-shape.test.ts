/**
 * The offering checkout link must be a QUERY, not a path segment.
 *
 * Live bug this locks out: `app/pandits/[id]/page.tsx` linked "Book This Puja"
 * to `/checkout/offering/${offering.id}`, but `app/checkout/offering/` has no
 * `[id]` dynamic segment — its page reads the id from `useSearchParams()` as
 * `sp.get('id')`. So every book button on every pandit profile 404'd, on the
 * live site, on the marketplace's conversion point.
 *
 * The structural assertion is the one that matters: it derives the expected
 * shape from what actually exists on disk (is there an `[id]` directory?)
 * rather than hard-coding a string, so if someone later adds a real `[id]`
 * segment this test tells them to update the callers instead of silently
 * passing.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const APP = join(__dirname, '..', 'app');
const OFFERING_ROUTE = join(APP, 'checkout', 'offering');

/** Every .tsx under app/ that references the offering checkout route. */
function callers(): { file: string; line: number; href: string }[] {
  const out: { file: string; line: number; href: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.tsx')) continue;
      // Skip the route's own implementation — it doesn't link to itself.
      if (full.startsWith(OFFERING_ROUTE)) continue;
      readFileSync(full, 'utf8')
        .split('\n')
        .forEach((text, i) => {
          if (text.includes('/checkout/offering')) {
            out.push({ file: full.slice(APP.length + 1), line: i + 1, href: text.trim() });
          }
        });
    }
  };
  walk(APP);
  return out;
}

describe('offering checkout link shape', () => {
  it('the route reads its id from the query string, not a path segment', () => {
    const page = readFileSync(join(OFFERING_ROUTE, 'page.tsx'), 'utf8');
    expect(page).toMatch(/useSearchParams/);
    expect(page).toMatch(/\bsp\.get\(['"]id['"]\)/);

    // No dynamic segment directory exists under checkout/offering.
    const dynamicSegments = readdirSync(OFFERING_ROUTE, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith('['))
      .map((e) => e.name);
    expect(dynamicSegments).toEqual([]);
  });

  it('no caller links to a path-segment form that would 404', () => {
    // `/checkout/offering/<something>` — the broken shape. Allowed: a bare
    // `/checkout/offering` optionally followed by `?`, a quote, or a backtick.
    const broken = callers().filter((c) =>
      /\/checkout\/offering\/[^'"`\s)]/.test(c.href),
    );

    expect(
      broken,
      `these link to a path segment but the route reads ?id= :\n${broken
        .map((b) => `  ${b.file}:${b.line}  ${b.href}`)
        .join('\n')}`,
    ).toEqual([]);
  });

  it('the pandit profile book button passes the offering id as ?id=', () => {
    const file = join(APP, 'pandits', '[id]', 'page.tsx');
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf8')).toContain('/checkout/offering?id=${offering.id}');
  });
});
