import { describe, it, expect } from 'vitest';
import {
  FESTIVALS,
  FESTIVAL_ALIASES,
  getFestival,
  resolveFestivalSlug,
} from '../lib/festivals';

// CI-03 — the site published Hartalika Teej on two different 2026 dates at two
// live URLs (/festival/teej-hartalika = 2026-08-15, /festival/hartalika-teej =
// 2026-09-14) and Narasimha Jayanti twice in May, 11 days apart, under ONE slug
// (so the second record was unreachable but still on the index grid).
//
// A devotee planning a nirjala fast around the wrong date is real harm, so the
// invariant is: one festival, one page, one date.

/**
 * Consonant skeleton of a festival name. Collapses the transliteration
 * variants that let one festival ship as two records — Purnima/Poornima,
 * Anant/Ananta — which an exact-string comparison walks straight past.
 */
function nameKey(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '').replace(/[aeiou]/g, '');
}

function dayBefore(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

describe('CI-03 — one festival, one page, one date', () => {
  it('no two festivals are the same festival under different spellings', () => {
    const byKey = new Map<string, string[]>();
    for (const f of FESTIVALS) {
      const k = nameKey(f.name);
      byKey.set(k, [...(byKey.get(k) ?? []), `${f.name} (${f.slug} @ ${f.date2026})`]);
    }
    const collisions = [...byKey.values()].filter((v) => v.length > 1);
    expect(collisions, JSON.stringify(collisions, null, 2)).toEqual([]);
  });

  it('Hartalika Teej sits on Bhadrapada Shukla Tritiya — the day before this dataset dates Ganesh Chaturthi', () => {
    const teej = getFestival('hartalika-teej');
    const ganesh = getFestival('ganesh-chaturthi');
    expect(teej).toBeDefined();
    expect(ganesh).toBeDefined();
    // Tritiya immediately precedes Chaturthi. Anchoring on the dataset's own
    // Ganesh Chaturthi date is what makes 2026-09-14 the internally correct
    // answer and 2026-08-15 (the retired teej-hartalika record) the wrong one.
    expect(teej!.date2026).toBe(dayBefore(ganesh!.date2026));
  });

  it('the retired duplicate slugs no longer resolve to a second record', () => {
    for (const retired of ['teej-hartalika', 'guru-poornima', 'ananta-chaturdashi']) {
      expect(FESTIVALS.some((f) => f.slug === retired), retired).toBe(false);
    }
  });

  it('every retired slug still resolves — to the surviving festival', () => {
    expect(resolveFestivalSlug('teej-hartalika')).toBe('hartalika-teej');
    expect(resolveFestivalSlug('guru-poornima')).toBe('guru-purnima');
    expect(resolveFestivalSlug('ananta-chaturdashi')).toBe('anant-chaturdashi');
  });

  it('no alias shadows a real festival and every alias target exists', () => {
    const slugs = new Set(FESTIVALS.map((f) => f.slug));
    for (const [from, to] of Object.entries(FESTIVAL_ALIASES)) {
      expect(slugs.has(from), `${from} is both an alias and a real slug`).toBe(false);
      expect(slugs.has(to), `${from} -> ${to} points at nothing`).toBe(true);
    }
  });

  it('an unknown slug is left alone rather than silently rewritten', () => {
    expect(resolveFestivalSlug('not-a-festival')).toBe('not-a-festival');
  });

  it('Narasimha Jayanti appears exactly once', () => {
    const rows = FESTIVALS.filter((f) => nameKey(f.name) === nameKey('Narasimha Jayanti'));
    expect(rows.map((r) => `${r.slug} @ ${r.date2026}`)).toHaveLength(1);
  });
});
