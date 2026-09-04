import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  pujaCardBlurb,
  CARD_BLURB_MAX,
  HERO_BLURB_MAX,
} from '../lib/puja-blurb';

/**
 * CM-10 (P1) — card and hero copy is no longer the whole detail-page essay.
 *
 * The half of this finding that stayed open after four passes: an earlier fix
 * put `line-clamp-2` on the catalogue card and `line-clamp-3` on the detail
 * hero. A clamp is a CSS `max-height` with an ellipsis — it hides text from a
 * sighted reader and ships every character of it regardless, into the DOM, the
 * accessibility tree and the JSON-LD `description` a search engine quotes.
 * `pujaCardBlurb` cuts the string instead of hiding it, on sentence and word
 * boundaries so a storefront never shows "...performed as prescr".
 *
 * The excerpt below is a real shape from `puja_types.description` — a single
 * long opening sentence followed by scripture citation, the pattern that made
 * the average row 1,144 characters.
 */
const REAL_SHAPE =
  'Rudrabhishek is the ceremonial bathing of the Shiva lingam with sacred substances ' +
  'while the Rudram is chanted. It is performed to remove obstacles and to bring peace ' +
  'to the household. The rite is prescribed in the Shiva Purana, Vidyeshwara Samhita, ' +
  'which sets out the eleven substances used in the abhishekam and the order in which ' +
  'each is offered, together with the Namakam and Chamakam recitations drawn from the ' +
  'Krishna Yajurveda that accompany them throughout the ceremony.';

describe('CM-10 — pujaCardBlurb', () => {
  it('the fixture really is the oversized shape this finding is about', () => {
    // Guards every assertion below against a fixture that is short enough to
    // pass trivially.
    expect(REAL_SHAPE.length).toBeGreaterThan(400);
  });

  it('returns whole sentences within the card budget', () => {
    const out = pujaCardBlurb(REAL_SHAPE);
    expect(out.length).toBeLessThanOrEqual(CARD_BLURB_MAX);
    expect(out.endsWith('.')).toBe(true);
    expect(out).toBe(
      'Rudrabhishek is the ceremonial bathing of the Shiva lingam with sacred substances while the Rudram is chanted.',
    );
  });

  it('takes more sentences when given the hero budget', () => {
    const hero = pujaCardBlurb(REAL_SHAPE, HERO_BLURB_MAX);
    const card = pujaCardBlurb(REAL_SHAPE);
    expect(hero.length).toBeGreaterThan(card.length);
    expect(hero.length).toBeLessThanOrEqual(HERO_BLURB_MAX);
    expect(hero).toContain('to bring peace to the household.');
    // And it still stops before the scripture citation that made the row long.
    expect(hero).not.toContain('Vidyeshwara Samhita');
  });

  it('never cuts a word in half when one sentence is over budget', () => {
    const oneLongSentence =
      'This puja is performed as prescribed in the Shiva Purana with eleven substances ' +
      'offered in a fixed order by a pandit at the temple you choose on the date you pick';
    const out = pujaCardBlurb(oneLongSentence);
    expect(out.length).toBeLessThanOrEqual(CARD_BLURB_MAX + 1); // +1 for the ellipsis
    expect(out.endsWith('…')).toBe(true);
    // The naive slice(0, 140) produced exactly this kind of fragment.
    const naive = oneLongSentence.slice(0, CARD_BLURB_MAX);
    expect(naive).toMatch(/\w$/);
    expect(naive.endsWith('the')).toBe(false);
    const body = out.slice(0, -1);
    expect(oneLongSentence.startsWith(body)).toBe(true);
    // Every word in the output is a complete word from the source.
    const words = oneLongSentence.split(' ');
    for (const w of body.split(' ')) expect(words).toContain(w);
  });

  it('collapses newlines so a paragraph break cannot land in a card', () => {
    const out = pujaCardBlurb('First line.\n\nSecond paragraph starts here.', 200);
    expect(out).not.toMatch(/\n/);
    expect(out).toBe('First line. Second paragraph starts here.');
  });

  it('passes short copy through untouched', () => {
    expect(pujaCardBlurb('Short and complete.')).toBe('Short and complete.');
  });

  it('returns empty string for absent copy so the element can be skipped', () => {
    expect(pujaCardBlurb(null)).toBe('');
    expect(pujaCardBlurb(undefined)).toBe('');
    expect(pujaCardBlurb('   ')).toBe('');
  });
});

describe('CM-10 — the catalogue surfaces use it instead of a clamp', () => {
  const WEB = path.resolve(__dirname, '..');
  const read = (rel: string) => fs.readFileSync(path.join(WEB, rel), 'utf8');

  it('/pujas renders the blurb, not the clamped full description', () => {
    const src = read('app/pujas/page.tsx');
    expect(src).toMatch(/\{pujaCardBlurb\(puja\.description\)\}/);
    expect(src).not.toMatch(/line-clamp-2">\s*\n?\s*\{puja\.description\}/);
  });

  it('/pujas/[slug] uses it for the hero, the JSON-LD and the meta description', () => {
    const src = read('app/pujas/[slug]/page.tsx');
    // Hero + JSON-LD + <meta>: three call sites, none of them a raw slice.
    expect((src.match(/pujaCardBlurb\(/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(src).not.toMatch(/description:\s*puja\.description,/);
    expect(src).not.toMatch(/puja\.description\.slice\(0, 140\)/);
    // The full text still has a home on the page.
    expect(src).toMatch(/puja\.longDescription \|\| puja\.description/);
  });
});
