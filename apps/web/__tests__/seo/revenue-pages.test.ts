import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { organizationJsonLd } from '../../lib/jsonld';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

describe('revenue page SEO structure', () => {
  it('/nri-pujas is indexable and linked from the nav and /nri', () => {
    expect(read('app/nri-pujas/page.tsx')).not.toMatch(/robots:\s*\{\s*index:\s*false/);
    expect(read('components/MoreDropdown.tsx')).toContain("'/nri-pujas'");
    expect(read('app/nri/page.tsx')).toContain('href="/nri-pujas"');
  });

  it('/pujas/[slug] ships FAQPage and BreadcrumbList schema', () => {
    const src = read('app/pujas/[slug]/page.tsx');
    expect(src).toContain("'@type': 'FAQPage'");
    expect(src).toContain('breadcrumbJsonLd(');
  });

  it('/puja/[city]/[slug] has a catalogue-resolved Book CTA and FAQPage schema, no brand in h1', () => {
    const src = read('app/puja/[city]/[slug]/page.tsx');
    expect(src).toContain('resolveContentPujas([cp.puja]');
    expect(src).toContain("'@type': 'FAQPage'");
    expect(src).not.toMatch(/Book Pandits \| Darshya/);
    expect(src).not.toMatch(/\/temples\/\$\{cp\.city\}/);
  });

  it('city page links to its puja guides', () => {
    expect(read('app/city/[slug]/page.tsx')).toContain('/puja/${g.city}/${g.puja}');
  });

  it('temple pages emit BreadcrumbList', () => {
    expect(read('app/temples/[slug]/page.tsx')).toContain('breadcrumbJsonLd(');
  });

  it('organization schema names real founders, not a placeholder or github', () => {
    const o = organizationJsonLd as { founder: { name: string }[]; sameAs: string[] };
    expect(o.founder.map((f) => f.name)).toEqual(['Raghav Sindhwani', 'Atishey Jain']);
    expect(o.sameAs.join()).not.toMatch(/github/);
  });
});
