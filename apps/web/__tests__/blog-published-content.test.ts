import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLISHED_POSTS } from '../content/blog/published';

const lib = (f: string) => readFileSync(join(__dirname, '..', 'lib', f), 'utf8');
const has = (src: string, slug: string) => src.includes(`slug: '${slug}'`);

// Claims the product cannot back (see docs/audit and the honesty gates).
const BANNED = [
  /80\s?G/i, /tax[- ]deduct/i, /\bverified (pandit|priest|temple)/i, /\blive[- ]?stream/i,
  /tamper-proof/i, /samagri (is )?included/i, /free delivery/i, /guarantee/i, /\bblessed by\b/i,
  /\bMAU\b/, /\b\d+K? (bookings|users)\b/i,
];

describe('published blog posts', () => {
  it('has the expected evergreen set, unique slugs and a title each', () => {
    expect(PUBLISHED_POSTS.length).toBeGreaterThanOrEqual(8);
    expect(new Set(PUBLISHED_POSTS.map((p) => p.slug)).size).toBe(PUBLISHED_POSTS.length);
    for (const p of PUBLISHED_POSTS) {
      expect(p.body.startsWith('# '), p.slug).toBe(true);
      expect(p.body.split(/\s+/).length, p.slug).toBeGreaterThan(300);
    }
  });

  it('makes no claim the product cannot back', () => {
    for (const p of PUBLISHED_POSTS) {
      for (const re of BANNED) expect(p.body, `${p.slug} matches ${re}`).not.toMatch(re);
    }
  });

  it('every internal link resolves to a real page or data row', () => {
    const deities = lib('deities.ts'), aartis = lib('aartis.ts'), chalisas = lib('chalisas.ts');
    const vrats = lib('vrats.ts');
    const bookable = new Set(['rudrabhishek', 'ganesh-puja', 'lakshmi-puja', 'hanuman-chalisa-path', 'satyanarayan-katha', 'surya-puja']);
    const staticOk = new Set(['/panchang', '/pujas', '/ekadashi', '/aarti', '/muhurat']);
    for (const p of PUBLISHED_POSTS) {
      for (const m of p.body.matchAll(/\]\((\/[^)]*)\)/g)) {
        const href = m[1];
        if (staticOk.has(href)) continue;
        const [, section, slug] = href.split('/');
        const ok =
          (section === 'deity' && has(deities, slug)) ||
          (section === 'aarti' && has(aartis, slug)) ||
          (section === 'chalisa' && has(chalisas, slug)) ||
          (section === 'vrat' && has(vrats, slug)) ||
          (section === 'pujas' && bookable.has(slug)) ||
          (section === 'muhurat' && slug === 'griha-pravesh-muhurta');
        expect(ok, `${p.slug}: ${href}`).toBe(true);
      }
    }
  });
});
