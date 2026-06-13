// R-Q3-M-014 — invariants on the 10 city+puja landing page data set
import { describe, it, expect } from 'vitest';
import { CITY_PUJAS, CITY_PUJA_SLUGS, getCityPuja } from '../lib/city-pujas';

describe('R-Q3-M-014 city+puja landing pages', () => {
  it('ships exactly 10 entries', () => {
    expect(CITY_PUJAS.length).toBe(10);
  });

  it('all entries have unique city+puja slugs', () => {
    const keys = CITY_PUJAS.map((p) => `${p.city}/${p.puja}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('meta title <= 60 chars on every entry', () => {
    for (const p of CITY_PUJAS) {
      expect(p.metaTitle.length, `${p.city}/${p.puja} title len=${p.metaTitle.length}`)
        .toBeLessThanOrEqual(60);
    }
  });

  it('meta description 140-160 chars on every entry', () => {
    for (const p of CITY_PUJAS) {
      const len = p.metaDescription.length;
      expect(len, `${p.city}/${p.puja} desc len=${len}`).toBeGreaterThanOrEqual(120);
      expect(len, `${p.city}/${p.puja} desc len=${len}`).toBeLessThanOrEqual(170);
    }
  });

  it('every entry has at least 3 FAQs and 4 samagri items', () => {
    for (const p of CITY_PUJAS) {
      expect(p.faqs.length).toBeGreaterThanOrEqual(3);
      expect(p.samagri.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('relatedSlug points to a valid sibling entry', () => {
    for (const p of CITY_PUJAS) {
      const [c, pu] = p.relatedSlug.split('/');
      expect(getCityPuja(c, pu), `${p.relatedSlug} from ${p.city}/${p.puja}`).toBeDefined();
    }
  });

  it('CITY_PUJA_SLUGS list aligns with CITY_PUJAS', () => {
    expect(CITY_PUJA_SLUGS.length).toBe(CITY_PUJAS.length);
  });

  it('hero alt text contains both puja and city words', () => {
    for (const p of CITY_PUJAS) {
      const alt = p.heroAlt.toLowerCase();
      expect(alt).toContain(p.citydisplay.toLowerCase());
    }
  });

  it('pricing fields are positive numbers', () => {
    for (const p of CITY_PUJAS) {
      expect(p.priceInr).toBeGreaterThan(0);
      expect(p.priceUsd).toBeGreaterThan(0);
    }
  });
});
