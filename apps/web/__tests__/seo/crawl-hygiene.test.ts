import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import robots from '../../app/robots';
import { citySlugs } from '../../lib/cities';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

describe('crawl hygiene', () => {
  it('robots disallows account/checkout flows and the dead /sign-in is gone', () => {
    const rules = robots().rules;
    const r = Array.isArray(rules) ? rules[0] : rules;
    const dis = ([] as string[]).concat(r.disallow ?? []);
    for (const p of ['/search', '/account/', '/checkout/', '/consultation/', '/provider/', '/api/']) {
      expect(dis).toContain(p);
    }
    expect(dis).not.toContain('/sign-in');
    expect(dis).not.toContain('/_next/');
  });

  it('every city in the sitemap has panchang coordinates (no 404 /panchang/<city>)', () => {
    const src = read('app/panchang/[city]/page.tsx');
    for (const slug of citySlugs()) {
      expect(src, `missing coords for ${slug}`).toMatch(new RegExp(`\\b${slug}:\\s*\\{\\s*lat:`));
    }
  });

  it('sitemap does not list /feed.xml', () => {
    expect(read('app/sitemap.ts')).not.toContain("'/feed.xml'");
  });

  it('city page links only catalogue-resolved pujas', () => {
    const src = read('app/city/[slug]/page.tsx');
    expect(src).toContain('resolveContentPujas(c.popularPujas');
    expect(src).not.toMatch(/c\.popularPujas\.map/);
  });
});
