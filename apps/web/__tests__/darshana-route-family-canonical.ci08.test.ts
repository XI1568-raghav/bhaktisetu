/**
 * CI-08 — the darshana family, the last of the three CI-08 duplications.
 *
 * The fourteen Upanishads were settled by `canonicalUpanishadUrl`
 * (lib/upanishads.ts) and the four Vedas by `canonicalVedaUrl`
 * (app/ved/canonical.ts). The six orthodox darshanas were the hard one, because
 * they are published under THREE route families rather than two, and the slugs
 * do not agree:
 *
 *   /darshanas/<slug>            lib/darshanas.ts — 20 fields per school:
 *                                number, iast, founding text in Sanskrit,
 *                                approxDate, pair, centralThesis, a long
 *                                summary, keyConcepts, pramanas,
 *                                liberationPath, keyTexts, modernRelevance,
 *                                bestKnownFor.
 *   /hindu-philosophies/<slug>   lib/hindu-philosophies.ts — 13 fields, largely
 *                                the same prose, PLUS four Vedanta sub-schools
 *                                that exist nowhere else.
 *   /sanatan/<slug>-darshana     content/sanatan/*.mdx — a prose article each.
 *
 * Every one of the three declared itself canonical, so the site competed with
 * itself for the same six queries three ways over.
 *
 * THE RULING, and it is the same one CI-08 already made twice: the richest
 * curated dataset survives, and that is DARSHANAS. It is not a deletion —
 * nothing is unpublished, the other two families keep their pages and their
 * traffic, they simply stop claiming to be the original. The four Vedanta
 * sub-schools have no twin anywhere, so /hindu-philosophies stays canonical
 * for those, which is why the resolver has to answer "no twin" as cleanly as
 * it answers "here is the twin".
 *
 * WHY THERE IS AN ALIAS TABLE, when the Veda fix pointedly refused one: the
 * three families genuinely disagree on two of the six slugs — `samkhya` vs
 * `sankhya`, and `mimamsa` vs `purva-mimamsa` — and one MDX article is named
 * `yoga-darshana-patanjali` rather than `yoga-darshana`. Suffix-stripping
 * alone resolves 4 of 6 and silently drops the other two, which is worse than
 * a table because the failure is invisible. So the mapping is derived by
 * default and tabulated ONLY for the three genuine exceptions, and the test
 * below pins that no alias points at a school that does not exist.
 */

import { describe, it, expect } from 'vitest';
import { DARSHANAS, getDarshana, canonicalDarshanaUrl } from '../lib/darshanas';
import { HINDU_PHILOSOPHIES } from '../lib/hindu-philosophies';
import { getAllSlugs } from '../lib/content';
import { generateMetadata as hinduPhilosophyMetadata } from '../app/hindu-philosophies/[slug]/page';
import { generateMetadata as sanatanMetadata } from '../app/sanatan/[slug]/page';

const BASE_URL = 'https://darshya.online';

function canonicalOf(meta: { alternates?: { canonical?: unknown } }): string {
  return String(meta.alternates?.canonical ?? '');
}

describe('CI-08 — the darshana duplication is real', () => {
  it('all six orthodox schools are published by all three families', () => {
    const sanatanSlugs = new Set(getAllSlugs('sanatan'));
    const orthodox = HINDU_PHILOSOPHIES.filter((p) => p.category === 'orthodox-darshana');

    expect(DARSHANAS).toHaveLength(6);
    expect(orthodox).toHaveLength(6);

    // Each /hindu-philosophies orthodox school resolves to a /darshanas twin…
    for (const p of orthodox) {
      expect(canonicalDarshanaUrl(p.slug), `${p.slug} has no /darshanas twin`).toBeDefined();
    }
    // …and so does each content/sanatan darshana article.
    const sanatanDarshanaArticles = [...sanatanSlugs].filter((s) => /darshana/.test(s));
    expect(sanatanDarshanaArticles).toHaveLength(6);
    for (const s of sanatanDarshanaArticles) {
      expect(canonicalDarshanaUrl(s), `${s} has no /darshanas twin`).toBeDefined();
    }
  });
});

describe('CI-08 — canonicalDarshanaUrl resolves every spelling of the six', () => {
  it('maps the /hindu-philosophies slugs, including the two that disagree', () => {
    expect(canonicalDarshanaUrl('nyaya')).toBe('/darshanas/nyaya');
    expect(canonicalDarshanaUrl('vaisheshika')).toBe('/darshanas/vaisheshika');
    expect(canonicalDarshanaUrl('yoga')).toBe('/darshanas/yoga');
    expect(canonicalDarshanaUrl('vedanta')).toBe('/darshanas/vedanta');
    // The disagreements. These are the two a naive suffix-strip loses.
    expect(canonicalDarshanaUrl('samkhya')).toBe('/darshanas/sankhya');
    expect(canonicalDarshanaUrl('mimamsa')).toBe('/darshanas/purva-mimamsa');
  });

  it('maps the content/sanatan article slugs', () => {
    expect(canonicalDarshanaUrl('nyaya-darshana')).toBe('/darshanas/nyaya');
    expect(canonicalDarshanaUrl('vaisheshika-darshana')).toBe('/darshanas/vaisheshika');
    expect(canonicalDarshanaUrl('sankhya-darshana')).toBe('/darshanas/sankhya');
    expect(canonicalDarshanaUrl('vedanta-darshana')).toBe('/darshanas/vedanta');
    expect(canonicalDarshanaUrl('mimamsa-darshana')).toBe('/darshanas/purva-mimamsa');
    // The one that is not named "<school>-darshana" at all.
    expect(canonicalDarshanaUrl('yoga-darshana-patanjali')).toBe('/darshanas/yoga');
  });

  it('answers "no twin" for the four Vedanta sub-schools', () => {
    const subSchools = HINDU_PHILOSOPHIES.filter((p) => p.category === 'vedanta-sub-school');
    expect(subSchools.length).toBeGreaterThan(0);
    for (const p of subSchools) {
      expect(canonicalDarshanaUrl(p.slug), `${p.slug} must stay self-canonical`).toBeUndefined();
    }
  });

  it('does not capture the yoga PATH articles, which are a different subject', () => {
    // raja/bhakti/jnana/karma yoga are the four margas, not the Yoga darshana.
    for (const s of ['raja-yoga-path', 'bhakti-yoga-path', 'jnana-yoga-path', 'karma-yoga-path']) {
      expect(canonicalDarshanaUrl(s), s).toBeUndefined();
    }
    // …nor any other Sanatan article.
    for (const s of ['karma-law', 'moksha-liberation', 'brahman-absolute', 'shudra-varna']) {
      expect(canonicalDarshanaUrl(s), s).toBeUndefined();
    }
  });

  it('every resolved target is a real school — no alias points at nothing', () => {
    const inputs = [
      ...HINDU_PHILOSOPHIES.map((p) => p.slug),
      ...getAllSlugs('sanatan'),
      ...DARSHANAS.map((d) => d.slug),
    ];
    for (const slug of inputs) {
      const url = canonicalDarshanaUrl(slug);
      if (url === undefined) continue;
      const target = url.replace('/darshanas/', '');
      expect(getDarshana(target), `${slug} -> ${url} is a dead link`).toBeDefined();
    }
  });
});

describe('CI-08 — the competing routes stop claiming to be the original', () => {
  const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

  it('/hindu-philosophies/samkhya points its canonical at /darshanas/sankhya', async () => {
    const meta = await hinduPhilosophyMetadata(params('samkhya'));
    expect(canonicalOf(meta)).toBe(`${BASE_URL}/darshanas/sankhya`);
  });

  it('/hindu-philosophies/mimamsa points at /darshanas/purva-mimamsa', async () => {
    const meta = await hinduPhilosophyMetadata(params('mimamsa'));
    expect(canonicalOf(meta)).toBe(`${BASE_URL}/darshanas/purva-mimamsa`);
  });

  it('a Vedanta sub-school still claims itself — it is published nowhere else', async () => {
    const meta = await hinduPhilosophyMetadata(params('advaita-vedanta-shankara'));
    expect(canonicalOf(meta)).toBe(`${BASE_URL}/hindu-philosophies/advaita-vedanta-shankara`);
  });

  it('/sanatan/mimamsa-darshana points at /darshanas/purva-mimamsa', async () => {
    const meta = await sanatanMetadata(params('mimamsa-darshana'));
    expect(canonicalOf(meta)).toBe(`${BASE_URL}/darshanas/purva-mimamsa`);
  });

  it('/sanatan/yoga-darshana-patanjali points at /darshanas/yoga', async () => {
    const meta = await sanatanMetadata(params('yoga-darshana-patanjali'));
    expect(canonicalOf(meta)).toBe(`${BASE_URL}/darshanas/yoga`);
  });

  it('a Sanatan article with no darshana twin still claims itself', async () => {
    const meta = await sanatanMetadata(params('karma-law'));
    expect(canonicalOf(meta)).toBe(`${BASE_URL}/sanatan/karma-law`);
  });

  it('the surviving family keeps claiming itself', async () => {
    const { generateMetadata } = await import('../app/darshanas/[slug]/page');
    const meta = await generateMetadata(params('sankhya'));
    expect(canonicalOf(meta)).toBe(`${BASE_URL}/darshanas/sankhya`);
  });
});
