/**
 * I18N-05, catalog half — the mechanical fill, swept rather than listed.
 *
 * WHY THIS FILE EXISTS ALONGSIDE __tests__/i18n-hi-duplicate-slots.test.ts.
 * That file encodes the same rule — "a slot whose English is byte-identical to
 * an already-translated slot may not be left in English" — as a HAND-WRITTEN
 * LIST of fifteen pairs. A list can only fail for the fifteen entries somebody
 * thought to add. It cannot fail when a sixteenth appears, which is exactly
 * what happened: `pujas.deity` ("Deity") sat untranslated while the identical
 * English in `content.deity` and `nav.deity` had carried 'देवता' the whole
 * time, and the list-driven guard stayed green through it.
 *
 * This test derives the pairs from en.json + hi.json instead, so a new
 * untranslated twin fails the suite the moment the key is added.
 *
 * NOTHING HERE IS A TRANSLATION and nothing here is a judgement call. Two slots
 * whose English bytes are equal say the same sentence, so they take the same
 * Hindi; near-enough matches ('कथाएँ' onto content.tabArticle, 'आज का विशेष'
 * onto content.featured) were refused in i18n-hi-catalog.test.ts and are still
 * refused here, because equality is the only comparison this file makes.
 *
 * COMMENT HAZARD — none. Every input below is PARSED JSON, never source text,
 * so no assertion here can be satisfied or broken by a comment. It also
 * compares LEAF STRING VALUES, never a whole namespace object: an earlier
 * generation of ratchet in this repo marked an unbounded parent "covered"
 * because one nested child was.
 */

import { describe, it, expect } from 'vitest';

import en from '../../lib/i18n/en.json';
import hi from '../../lib/i18n/hi.json';
import { t } from '../../lib/t';

const enDict = en as unknown as Record<string, Record<string, string>>;
const hiDict = hi as unknown as Record<string, Record<string, string>>;

interface Slot {
  ns: string;
  key: string;
  english: string;
  hindi: string | undefined;
}

/** Every leaf string slot in en.json, paired with whatever Hindi it has. */
function slots(): Slot[] {
  const out: Slot[] = [];
  for (const [ns, entries] of Object.entries(enDict)) {
    for (const [key, english] of Object.entries(entries)) {
      if (typeof english !== 'string') continue;
      const hindi = hiDict[ns]?.[key];
      out.push({ ns, key, english, hindi: typeof hindi === 'string' && hindi ? hindi : undefined });
    }
  }
  return out;
}

/** English string -> the Hindi some slot already carries for it. */
function translatedByEnglish(all: Slot[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of all) if (s.hindi) map.set(s.english, s.hindi);
  return map;
}

describe('I18N-05 — no slot stays English when its own English twin is translated', () => {
  it('leaves zero mechanically fillable gaps in hi.json', () => {
    const all = slots();
    const known = translatedByEnglish(all);

    const gaps = all
      .filter((s) => !s.hindi && known.has(s.english))
      .map((s) => `${s.ns}.${s.key} (${JSON.stringify(s.english)} is already ${known.get(s.english)})`);

    expect(gaps).toEqual([]);
  });

  it('serves every such slot through the translator without falling back', () => {
    const all = slots();
    const known = translatedByEnglish(all);

    for (const s of all) {
      const expected = known.get(s.english);
      if (!expected) continue;
      const tr = t(s.ns as Parameters<typeof t>[0], 'hi');
      const entry = tr.entry(s.key as never);
      expect(entry.text, `${s.ns}.${s.key}`).toBe(expected);
      expect(entry.fallback, `${s.ns}.${s.key} still falls back to English`).toBe(false);
      expect(entry.lang, `${s.ns}.${s.key}`).toBe('hi');
    }
  });

  it('has something to sweep — the derivation is not vacuously green', () => {
    const all = slots();
    const known = translatedByEnglish(all);
    const shared = all.filter((s) => known.has(s.english));
    // If this ever drops to a handful the sweep has stopped covering anything.
    expect(shared.length).toBeGreaterThan(20);
  });
});
