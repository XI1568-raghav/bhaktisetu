import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  WIKIPEDIA_TEXT_LICENSE,
  parseWikipediaSources,
  requiresShareAlikeNotice,
  wikipediaAttribution,
} from '../lib/encyclopedia-attribution';

// CI-15 — 63 published articles cite Wikipedia in their `sources` frontmatter
// and not one of them carries a CC BY-SA notice. Attribution is a CONDITION of
// that licence, so this is a licensing obligation, not a nicety.
//
// This file locks down the derivation half (lib/encyclopedia-attribution.ts):
// given whatever a `sources` array actually contains today, the helper must
// find every Wikipedia citation and produce a linkable attribution. The
// RENDERING half lives in components/CategoryArticle.tsx and app/credits,
// which are outside this lane — see the corpus test at the bottom, which
// measures exactly how much is still unattributed on screen.

const CONTENT_ROOT = join(__dirname, '..', 'content');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.mdx')) out.push(p);
  }
  return out;
}

/**
 * Pull the `sources:` block out of MDX frontmatter. Handles both shapes the
 * corpus uses: a JSON-ish inline array and a YAML `- item` list.
 */
function sourcesOf(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return [];
  const body = fm[1];

  const inline = body.match(/^sources:\s*\[([\s\S]*?)\]\s*$/m);
  if (inline) {
    return [...inline[1].matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2] ?? '');
  }

  const block = body.match(/^sources:\s*\r?\n((?:[ \t]+-[ \t]*.+\r?\n?)+)/m);
  if (block) {
    return block[1]
      .split(/\r?\n/)
      .map((l) => l.replace(/^[ \t]*-[ \t]*/, '').trim())
      .filter(Boolean);
  }
  return [];
}

describe('CI-15 — Wikipedia citations resolve to a linkable CC BY-SA attribution', () => {
  it('parses the "Wikipedia: Title" form the /ved corpus uses', () => {
    const parsed = parseWikipediaSources([
      'Olivelle — Early Upanishads 1998',
      "Shankara's Isavasyopanishad Bhashya",
      'Wikipedia: Isha Upanishad',
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      title: 'Isha Upanishad',
      url: 'https://en.wikipedia.org/wiki/Isha_Upanishad',
      raw: 'Wikipedia: Isha Upanishad',
    });
  });

  it('parses the bare-URL form the /sanatan and /sanskrit corpora use', () => {
    const parsed = parseWikipediaSources([
      'https://en.wikipedia.org/wiki/Bhakti_yoga',
      'https://www.britannica.com/topic/bhakti',
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      title: 'Bhakti yoga',
      url: 'https://en.wikipedia.org/wiki/Bhakti_yoga',
    });
  });

  it('keeps non-Wikipedia sources out — they carry different obligations', () => {
    expect(
      parseWikipediaSources([
        'Britannica — Bhakti',
        'Olivelle — Early Upanishads 1998',
        'https://www.wikidata.org/wiki/Q12345',
        'Wikipedia',
        'Wikipedia: ',
      ]),
    ).toEqual([]);
  });

  it('handles a non-English and a mobile Wikipedia host', () => {
    const parsed = parseWikipediaSources([
      'https://hi.wikipedia.org/wiki/%E0%A4%97%E0%A5%80%E0%A4%A4%E0%A4%BE',
      'https://en.m.wikipedia.org/wiki/Rigveda',
    ]);
    expect(parsed.map((p) => p.url)).toEqual([
      'https://hi.wikipedia.org/wiki/%E0%A4%97%E0%A5%80%E0%A4%A4%E0%A4%BE',
      'https://en.wikipedia.org/wiki/Rigveda',
    ]);
  });

  it('deduplicates the same article cited twice in two forms', () => {
    expect(
      parseWikipediaSources(['Wikipedia: Rigveda', 'https://en.wikipedia.org/wiki/Rigveda']),
    ).toHaveLength(1);
  });

  it('produces a notice that names and links the licence', () => {
    const a = wikipediaAttribution(['Wikipedia: Isha Upanishad'])!;
    expect(a).not.toBeNull();
    expect(a.license.url).toBe('https://creativecommons.org/licenses/by-sa/4.0/');
    expect(a.notice).toContain(WIKIPEDIA_TEXT_LICENSE.name);
    // Share-alike is the half a bare "source: Wikipedia" bullet always omits.
    expect(a.notice).toMatch(/same licence/i);
    expect(a.sources[0].url).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
  });

  it('pluralises rather than mis-stating the count', () => {
    const one = wikipediaAttribution(['Wikipedia: Rigveda'])!;
    const two = wikipediaAttribution(['Wikipedia: Rigveda', 'Wikipedia: Samaveda'])!;
    expect(one.notice).toContain('the Wikipedia article linked below');
    expect(two.notice).toContain('the 2 Wikipedia articles linked below');
  });

  it('returns null — and no notice — for an article that cites no Wikipedia', () => {
    expect(wikipediaAttribution(['Olivelle — Early Upanishads 1998'])).toBeNull();
    expect(wikipediaAttribution([])).toBeNull();
    expect(wikipediaAttribution(undefined)).toBeNull();
    expect(requiresShareAlikeNotice(['Britannica'])).toBe(false);
  });

  it('finds every Wikipedia-sourced article in the published corpus', () => {
    const files = walk(CONTENT_ROOT);
    expect(files.length).toBeGreaterThan(100);

    const obligated = files.filter((f) => requiresShareAlikeNotice(sourcesOf(f)));

    // Measured 2026-08-21: 63 of 120 published MDX articles cite Wikipedia —
    // 45 in content/ved via "Wikipedia: <Title>", 18 in content/sanatan and
    // content/sanskrit via a bare article URL. The helper must see ALL of
    // them; a parser that silently missed one would leave that article's
    // licence obligation undischarged.
    expect(obligated.length).toBe(63);
    expect(obligated.filter((f) => /[\\/]ved[\\/]/.test(f))).toHaveLength(45);

    // And every one of them yields a real, linkable attribution.
    for (const f of obligated) {
      const a = wikipediaAttribution(sourcesOf(f))!;
      expect(a, f).not.toBeNull();
      expect(a.sources.length, f).toBeGreaterThan(0);
      for (const s of a.sources) {
        expect(s.title.length, `${f}: empty title`).toBeGreaterThan(0);
        expect(s.url, f).toMatch(/^https:\/\/[a-z-]+\.wikipedia\.org\/wiki\/.+/);
      }
    }
  });
});
