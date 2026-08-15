/**
 * HN-07 (prod sweep 2026-08-12, P2) — /content?tab= was read by nothing.
 *
 * Measured: /content, /content?tab=mantra, /content?tab=bhajan and
 * /content?tab=aarti all rendered the identical 1,376-character page — the
 * first 220 bytes were byte-identical across all four. The page's own filter
 * is `?type=`; the two footer links were written with `?tab=`, so both
 * "Mantra" and "Bhajan" landed on the unfiltered library and the user had to
 * re-filter by hand.
 *
 * Two separate defects live in that one URL:
 *   1. the wrong param name — a pure typo class, fixed by making the links use
 *      the param the page actually reads;
 *   2. `bhajan` is a real ContentType in the Prisma enum but is NOT one of the
 *      five chips, so even with the right param the heading fell through to
 *      "All Content" and the view was again indistinguishable from unfiltered.
 *
 * What is deliberately NOT done here: publishing bhajan content. The live
 * database holds 0 bhajan rows (mantra 6 / aarti 5 / article 5 / chalisa 4), so
 * the link now reaches a correctly-labelled Bhajan view with the page's real
 * empty state. Filling it is editorial.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { contentTypeLabel } from '../lib/content-type-labels';

/** Source with comments removed, so prose cannot satisfy a code guard. */
function codeOf(rel: string): string {
  return readFileSync(path.resolve(__dirname, '..', rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('HN-07 — footer links use the param the page reads', () => {
  const footer = codeOf('app/layout.tsx');

  it('no footer link carries the ignored ?tab= param', () => {
    expect(footer).not.toMatch(/\/content\?tab=/);
  });

  it('the Mantra link filters', () => {
    expect(footer).toContain('/content?type=mantra');
  });

  it('the Bhajan link filters', () => {
    expect(footer).toContain('/content?type=bhajan');
  });
});

describe('HN-07 — a filtered view is labelled as one', () => {
  it('labels the five chip types', () => {
    expect(contentTypeLabel('aarti')).toBe('Aarti');
    expect(contentTypeLabel('chalisa')).toBe('Chalisa');
    expect(contentTypeLabel('mantra')).toBe('Mantra');
    expect(contentTypeLabel('article')).toBe('Articles');
  });

  it('labels a valid type that has no chip, so the heading is not "All Content"', () => {
    expect(contentTypeLabel('bhajan')).toBe('Bhajan');
    expect(contentTypeLabel('bhajan')).not.toBe('All Content');
  });

  it('labels the remaining ContentType enum members rather than falling through', () => {
    expect(contentTypeLabel('story')).toBe('Stories');
    expect(contentTypeLabel('shloka')).toBe('Shlokas');
  });

  it('falls back for an unfiltered or unknown value', () => {
    expect(contentTypeLabel(undefined)).toBe('All Content');
    expect(contentTypeLabel('all')).toBe('All Content');
    expect(contentTypeLabel('not-a-type')).toBe('All Content');
  });

  it('the content page resolves its heading through the shared map', () => {
    const src = codeOf('app/content/page.tsx');
    expect(src).toContain('content-type-labels');
    expect(src).toContain('contentTypeLabel(');
  });
});
